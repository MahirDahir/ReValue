from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models.postgres.conversation import Conversation, ConversationStatus
from models.postgres.conversation_event import ConversationEvent
from models.postgres.listing import Listing, ListingStatus
from models.postgres.user import User
from schemas.conversation import ConversationAction
from services.sse_bus import notify as _notify


VALID_ACTIONS = {
    "suggest_price",
    "accept_price",
    "decline_price",
    "suggest_pickup",
    "accept_pickup",
    "reveal_contact",
    "cancel",
    "reopen",
}


def _log(db: Session, conv: Conversation, actor: User, event_type: str, value: str = None):
    db.add(ConversationEvent(
        conversation_id=conv.id,
        actor_id=actor.id,
        actor_name=actor.name,
        event_type=event_type,
        value=value,
    ))


def _events(db: Session, conv_id: UUID) -> list:
    rows = (
        db.query(ConversationEvent)
        .filter(ConversationEvent.conversation_id == conv_id)
        .order_by(ConversationEvent.created_at)
        .all()
    )
    return [
        {
            "event_type": e.event_type,
            "actor_name": e.actor_name,
            "value":      e.value,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]


def _to_dict(conv: Conversation, db: Session, include_events: bool = True) -> dict:
    listing = db.query(Listing).filter(Listing.id == conv.listing_id).first()
    buyer   = db.query(User).filter(User.id == conv.buyer_id).first()
    seller  = db.query(User).filter(User.id == conv.seller_id).first()
    return {
        "id":                    str(conv.id),
        "listing_id":            str(conv.listing_id),
        "buyer_id":              str(conv.buyer_id),
        "seller_id":             str(conv.seller_id),
        "status":                conv.status,
        "suggested_price":       conv.suggested_price,
        "agreed_price":          conv.agreed_price,
        "suggested_pickup":      conv.suggested_pickup,
        "agreed_pickup":         conv.agreed_pickup,
        "pickup_suggested_by":   str(conv.pickup_suggested_by) if conv.pickup_suggested_by else None,
        "price_suggested_by":    str(conv.price_suggested_by) if conv.price_suggested_by else None,
        "listing_title":         listing.title if listing else None,
        "listing_has_price":     listing.estimated_price is not None if listing else False,
        "listing_pickup_slots":  listing.pickup_slots or [] if listing else [],
        "listing_status":        listing.status if listing else None,
        "actual_buyer_id":       str(listing.actual_buyer_id) if listing and listing.actual_buyer_id else None,
        "buyer_name":            buyer.name if buyer else None,
        "seller_name":           seller.name if seller else None,
        "events":                _events(db, conv.id) if include_events else [],
        "seen_by_buyer":         conv.seen_by_buyer,
        "seen_by_seller":        conv.seen_by_seller,
        "cancelled_by":          str(conv.cancelled_by) if conv.cancelled_by else None,
        "updated_at":            conv.updated_at.isoformat() if conv.updated_at else (conv.created_at.isoformat() if conv.created_at else None),
    }


def _validate_listing_for_negotiation(db: Session, listing_id: UUID, current_user: User) -> Listing:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Listing is not available")
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot negotiate on your own listing")
    return listing


def start_with_price(db: Session, current_user: User, listing_id: UUID, price: float) -> dict:
    if price <= 0:
        raise HTTPException(status_code=400, detail="Price must be a positive number")

    listing = _validate_listing_for_negotiation(db, listing_id, current_user)

    existing = db.query(Conversation).filter(
        Conversation.listing_id == listing_id,
        Conversation.buyer_id == current_user.id,
    ).first()

    if existing:
        can_update = existing.status == ConversationStatus.PRICE_PENDING or (
            existing.status == ConversationStatus.PRICE_SUGGESTED
            and str(existing.price_suggested_by) == str(current_user.id)
        )
        if can_update:
            existing.suggested_price    = price
            existing.price_suggested_by = current_user.id
            existing.status             = ConversationStatus.PRICE_SUGGESTED
            existing.seen_by_seller     = False
            _log(db, existing, current_user, "price_suggested", str(price))
            db.commit()
            db.refresh(existing)
            result = _to_dict(existing, db)
            _push_conv_update(db, existing, result)
            return result
        return _to_dict(existing, db)

    if listing.estimated_price is not None:
        conv = Conversation(
            listing_id=listing_id,
            buyer_id=current_user.id,
            seller_id=listing.seller_id,
            status=ConversationStatus.PRICE_AGREED,
            agreed_price=listing.estimated_price,
            seen_by_seller=False,
        )
        db.add(conv)
        db.flush()
        _log(db, conv, current_user, "negotiation_started", None)
        _log(db, conv, current_user, "price_agreed", str(listing.estimated_price))
    else:
        conv = Conversation(
            listing_id=listing_id,
            buyer_id=current_user.id,
            seller_id=listing.seller_id,
            status=ConversationStatus.PRICE_SUGGESTED,
            suggested_price=price,
            price_suggested_by=current_user.id,
            seen_by_seller=False,
        )
        db.add(conv)
        db.flush()
        _log(db, conv, current_user, "negotiation_started", None)
        _log(db, conv, current_user, "price_suggested", str(price))

    db.commit()
    db.refresh(conv)
    result = _to_dict(conv, db)
    _push_conv_update(db, conv, result)
    return result


def get_conversation(db: Session, conv_id: UUID, current_user: User) -> dict:
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in (conv.buyer_id, conv.seller_id):
        raise HTTPException(status_code=403, detail="Not your conversation")
    return _to_dict(conv, db)


def mark_seen(db: Session, conv_id: UUID, current_user: User) -> dict:
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in (conv.buyer_id, conv.seller_id):
        raise HTTPException(status_code=403, detail="Not your conversation")
    if current_user.id == conv.buyer_id:
        conv.seen_by_buyer = True
    else:
        conv.seen_by_seller = True
    db.commit()
    db.refresh(conv)
    return _to_dict(conv, db)


def get_my_conversations(db: Session, current_user: User) -> list:
    convs = db.query(Conversation).filter(
        (Conversation.buyer_id == current_user.id) |
        (Conversation.seller_id == current_user.id)
    ).all()
    return [_to_dict(c, db) for c in convs]


def get_my_listing_conversation(db: Session, listing_id: UUID, current_user: User):
    conv = db.query(Conversation).filter(
        Conversation.listing_id == listing_id,
        Conversation.buyer_id == current_user.id,
    ).first()
    return _to_dict(conv, db) if conv else None


def get_listing_conversations(db: Session, listing_id: UUID, current_user: User) -> list:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the seller can view all conversations")
    convs = db.query(Conversation).filter(Conversation.listing_id == listing_id).all()
    return [_to_dict(c, db) for c in convs]


def do_action(db: Session, conv_id: UUID, current_user: User, action_data: ConversationAction) -> dict:
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in (conv.buyer_id, conv.seller_id):
        raise HTTPException(status_code=403, detail="Not your conversation")
    action = action_data.action
    if action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {sorted(VALID_ACTIONS)}")

    if conv.status == ConversationStatus.CANCELLED and action != "reopen":
        raise HTTPException(status_code=400, detail="This negotiation has been cancelled")

    is_buyer  = current_user.id == conv.buyer_id
    is_seller = current_user.id == conv.seller_id

    # ── PRICE NEGOTIATION ─────────────────────────────────────────────
    if action == "suggest_price":
        # Allow re-suggesting when price_pending OR when you are the one waiting (your own suggestion)
        can_suggest = conv.status == ConversationStatus.PRICE_PENDING or (
            conv.status == ConversationStatus.PRICE_SUGGESTED
            and str(conv.price_suggested_by) == str(current_user.id)
        )
        if not can_suggest:
            raise HTTPException(status_code=400, detail=f"Cannot suggest price in state: {conv.status}")
        try:
            price = float(action_data.value)
            if price <= 0:
                raise ValueError
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="value must be a positive number")
        conv.suggested_price    = price
        conv.price_suggested_by = current_user.id
        conv.status             = ConversationStatus.PRICE_SUGGESTED
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "price_suggested", str(price))

    elif action == "accept_price":
        if conv.status != ConversationStatus.PRICE_SUGGESTED:
            raise HTTPException(status_code=400, detail=f"No price to accept in state: {conv.status}")
        if str(conv.price_suggested_by) == str(current_user.id):
            raise HTTPException(status_code=403, detail="You cannot accept your own offer")
        conv.agreed_price = conv.suggested_price
        conv.status       = ConversationStatus.PRICE_AGREED
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "price_accepted", str(conv.agreed_price))

    elif action == "decline_price":
        if conv.status != ConversationStatus.PRICE_SUGGESTED:
            raise HTTPException(status_code=400, detail=f"No price to decline in state: {conv.status}")
        if str(conv.price_suggested_by) == str(current_user.id):
            raise HTTPException(status_code=403, detail="You cannot decline your own offer")
        old_price = conv.suggested_price
        conv.suggested_price    = None
        conv.price_suggested_by = None
        conv.status             = ConversationStatus.PRICE_PENDING
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "price_declined", str(old_price))

    # ── PICKUP NEGOTIATION ────────────────────────────────────────────
    elif action == "suggest_pickup":
        # Allowed when: price agreed (first suggestion), OR updating your own pending suggestion, OR countering the other party
        if conv.status not in (ConversationStatus.PRICE_AGREED, ConversationStatus.PICKUP_SUGGESTED):
            raise HTTPException(status_code=400, detail=f"Cannot suggest pickup in state: {conv.status}")
        if not action_data.value:
            raise HTTPException(status_code=400, detail="value must be a datetime string")
        conv.suggested_pickup    = action_data.value
        conv.pickup_suggested_by = current_user.id
        conv.status              = ConversationStatus.PICKUP_SUGGESTED
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "pickup_suggested", action_data.value)

    elif action == "accept_pickup":
        if conv.status != ConversationStatus.PICKUP_SUGGESTED:
            raise HTTPException(status_code=400, detail=f"No pickup to accept in state: {conv.status}")
        if str(conv.pickup_suggested_by) == str(current_user.id):
            raise HTTPException(status_code=403, detail="You cannot accept your own suggestion")
        conv.agreed_pickup = conv.suggested_pickup
        conv.status        = ConversationStatus.PICKUP_AGREED
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "pickup_accepted", conv.agreed_pickup)

    # ── CONTACT REVEAL ────────────────────────────────────────────────
    elif action == "reveal_contact":
        if not is_seller:
            raise HTTPException(status_code=403, detail="Only the seller can reveal contact")
        if conv.status != ConversationStatus.PICKUP_AGREED:
            raise HTTPException(status_code=400, detail="Pickup must be agreed before revealing contact")
        conv.status        = ConversationStatus.CONTACT_REVEALED
        conv.seen_by_buyer = False
        _log(db, conv, current_user, "contact_revealed", None)

    # ── CANCEL ────────────────────────────────────────────────────────
    elif action == "cancel":
        if conv.status in (ConversationStatus.CONTACT_REVEALED, ConversationStatus.CANCELLED):
            raise HTTPException(status_code=400, detail=f"Cannot cancel in state: {conv.status}")
        conv.status       = ConversationStatus.CANCELLED
        conv.cancelled_by = current_user.id
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "cancelled", None)

    # ── REOPEN ───────────────────────────────────────────────────────
    elif action == "reopen":
        if conv.status != ConversationStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Only cancelled negotiations can be reopened")
        if conv.cancelled_by and str(conv.cancelled_by) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the person who cancelled can reopen")
        listing = db.query(Listing).filter(Listing.id == conv.listing_id).first()
        if listing and listing.status != ListingStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail="Cannot reopen — listing is no longer available")
        conv.status          = ConversationStatus.PRICE_PENDING
        conv.cancelled_by    = None
        conv.suggested_price    = None
        conv.price_suggested_by = None
        if is_buyer:
            conv.seen_by_seller = False
        else:
            conv.seen_by_buyer = False
        _log(db, conv, current_user, "reopened", None)

    db.commit()
    db.refresh(conv)
    result = _to_dict(conv, db)
    _push_conv_update(db, conv, result)
    return result


def _push_conv_update(db: Session, conv: Conversation, conv_dict: dict):
    """Push SSE updates to both parties after any conversation state change."""
    seller = db.query(User).filter(User.id == conv.seller_id).first()
    buyer  = db.query(User).filter(User.id == conv.buyer_id).first()
    if seller:
        seller_counts = get_pending_counts(db, seller)
        _notify(str(conv.seller_id), {"kind": "seller_counts", "data": seller_counts})
        _notify(str(conv.seller_id), {"kind": "conversation",  "data": conv_dict})
    if buyer:
        buyer_counts = get_buyer_pending_counts(db, buyer)
        _notify(str(conv.buyer_id), {"kind": "buyer_counts", "data": buyer_counts})
        _notify(str(conv.buyer_id), {"kind": "conversation", "data": conv_dict})


def get_pending_counts(db: Session, current_user: User) -> dict:
    convs = db.query(Conversation).filter(
        Conversation.seller_id == current_user.id
    ).all()

    # unseen = notification badge (disappears once opened)
    # your_turn = persistent action indicator (stays until seller acts)
    unseen_counts    = {}
    your_turn_counts = {}

    for conv in convs:
        lid = str(conv.listing_id)
        s   = conv.status
        uid = str(current_user.id)

        your_turn = (
            s == ConversationStatus.CANCELLED or
            s == ConversationStatus.PRICE_PENDING or
            (s == ConversationStatus.PRICE_SUGGESTED and conv.price_suggested_by and str(conv.price_suggested_by) != uid) or
            (s == ConversationStatus.PICKUP_SUGGESTED and conv.pickup_suggested_by and str(conv.pickup_suggested_by) != uid) or
            s == ConversationStatus.PICKUP_AGREED
        )

        if your_turn:
            your_turn_counts[lid] = your_turn_counts.get(lid, 0) + 1
        if your_turn and not conv.seen_by_seller:
            unseen_counts[lid] = unseen_counts.get(lid, 0) + 1

    # Return combined structure: {listing_id: {unseen, your_turn}}
    all_listings = set(list(unseen_counts.keys()) + list(your_turn_counts.keys()))
    return {lid: {"unseen": unseen_counts.get(lid, 0), "your_turn": your_turn_counts.get(lid, 0)} for lid in all_listings}


def get_buyer_pending_counts(db: Session, current_user: User) -> dict:
    convs = db.query(Conversation).filter(
        Conversation.buyer_id == current_user.id
    ).all()

    terminal = {ConversationStatus.CANCELLED, ConversationStatus.CONTACT_REVEALED}

    counts = {}
    for conv in convs:
        needs_action = False
        if conv.status == ConversationStatus.PRICE_PENDING:
            needs_action = True
        elif conv.status == ConversationStatus.PRICE_AGREED:
            # price accepted — buyer should suggest pickup
            needs_action = True
        elif conv.status == ConversationStatus.PRICE_SUGGESTED:
            if conv.price_suggested_by and str(conv.price_suggested_by) != str(current_user.id):
                needs_action = True
        elif conv.status == ConversationStatus.PICKUP_SUGGESTED:
            if conv.pickup_suggested_by and str(conv.pickup_suggested_by) != str(current_user.id):
                needs_action = True
        elif conv.status == ConversationStatus.CONTACT_REVEALED:
            needs_action = True
        elif conv.status == ConversationStatus.CANCELLED:
            needs_action = True
        elif conv.status not in terminal:
            listing = db.query(Listing).filter(Listing.id == conv.listing_id).first()
            if listing and listing.status == ListingStatus.SOLD:
                needs_action = True
        if needs_action and not conv.seen_by_buyer:
            lid = str(conv.listing_id)
            counts[lid] = counts.get(lid, 0) + 1

    return counts


def get_contact(db: Session, conv_id: UUID, current_user: User) -> dict:
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id != conv.buyer_id:
        raise HTTPException(status_code=403, detail="Only the buyer can view contact details")
    if conv.status != ConversationStatus.CONTACT_REVEALED:
        raise HTTPException(status_code=403, detail="Seller has not shared contact yet")
    seller  = db.query(User).filter(User.id == conv.seller_id).first()
    listing = db.query(Listing).filter(Listing.id == conv.listing_id).first()
    # Mark seen for buyer once they fetch contact
    conv.seen_by_buyer = True
    db.commit()
    return {
        "phone":     seller.phone,
        "name":      seller.name,
        "address":   listing.address if listing else None,
        "latitude":  listing.latitude if listing else None,
        "longitude": listing.longitude if listing else None,
    }


def get_contacts_revealed_for_listing(db: Session, listing_id: UUID, current_user: User) -> list:
    """Return buyers who reached contact_revealed for this listing (for mark-sold selector)."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the seller can view this")
    convs = db.query(Conversation).filter(
        Conversation.listing_id == listing_id,
        Conversation.status == ConversationStatus.CONTACT_REVEALED,
    ).all()
    result = []
    for conv in convs:
        buyer = db.query(User).filter(User.id == conv.buyer_id).first()
        result.append({
            "conversation_id": str(conv.id),
            "buyer_id":        str(conv.buyer_id),
            "buyer_name":      buyer.name if buyer else None,
            "agreed_price":    conv.agreed_price,
            "agreed_pickup":   conv.agreed_pickup,
        })
    return result


def mark_sold_to_buyer(db: Session, listing_id: UUID, buyer_conv_id: UUID, current_user: User) -> dict:
    """Seller confirms which buyer actually bought — marks listing sold, cancels others."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the seller can mark a listing sold")

    winning_conv = db.query(Conversation).filter(Conversation.id == buyer_conv_id).first()
    if not winning_conv or str(winning_conv.listing_id) != str(listing_id):
        raise HTTPException(status_code=400, detail="Conversation does not belong to this listing")
    if winning_conv.status != ConversationStatus.CONTACT_REVEALED:
        raise HTTPException(status_code=400, detail="Can only confirm a buyer whose contact was already shared")

    # Mark listing sold with the actual buyer
    listing.status          = ListingStatus.SOLD
    listing.actual_buyer_id = winning_conv.buyer_id

    # Cancel all other active conversations for this listing
    other_convs = db.query(Conversation).filter(
        Conversation.listing_id == listing_id,
        Conversation.id != buyer_conv_id,
        Conversation.status.notin_([ConversationStatus.CANCELLED, ConversationStatus.CONTACT_REVEALED]),
    ).all()
    for c in other_convs:
        c.status        = ConversationStatus.CANCELLED
        c.cancelled_by  = current_user.id
        c.seen_by_buyer = False
        _log(db, c, current_user, "cancelled", "Item sold to another buyer")

    db.commit()
    db.refresh(listing)
    db.refresh(winning_conv)

    # Notify winner
    winner_dict = _to_dict(winning_conv, db)
    _push_conv_update(db, winning_conv, winner_dict)

    # Notify each cancelled buyer
    db.expire_all()
    for c in other_convs:
        db.refresh(c)
        _push_conv_update(db, c, _to_dict(c, db))

    return {"message": "Listing marked as sold", "actual_buyer_id": str(winning_conv.buyer_id)}
