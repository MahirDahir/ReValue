from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import uuid as _uuid

from models.postgres.listing import Listing, ListingStatus
from models.postgres.user import User
from models.postgres.conversation import Conversation, ConversationStatus
from models.postgres.conversation_event import ConversationEvent
from services.image_service import save_upload_file, get_image_url, safe_delete_upload
from services.sse_bus import notify as _notify
from schemas.listing import ListingUpdate


VALID_WASTE_CATEGORIES = ["plastic", "glass", "metal", "electronics", "other"]
VALID_UNITS = ["kg", "pieces"]
VALID_STATUSES = [
    ListingStatus.AVAILABLE,
    ListingStatus.PENDING,
    ListingStatus.SOLD,
    ListingStatus.CANCELLED,
]


def _listing_to_dict(listing: Listing, seller: User) -> dict:
    return {
        "id": str(listing.id),
        "seller_id": str(listing.seller_id),
        "seller_name": seller.name,
        "title": listing.title,
        "description": listing.description,
        "waste_category": listing.waste_category,
        "quantity": listing.quantity,
        "unit": listing.unit,
        "status": listing.status,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "address": listing.address,
        "images": listing.images,
        "estimated_price": listing.estimated_price,
        "seller_rating": seller.seller_rating,
        "pickup_slots": listing.pickup_slots or [],
    }


def get_listings(
    db: Session,
    status_filter: Optional[str] = None,
    seller_id: Optional[str] = None,
    waste_category: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: Optional[float] = None,
) -> List[dict]:
    query = db.query(Listing).join(User, Listing.seller_id == User.id)

    if seller_id:
        try:
            query = query.filter(Listing.seller_id == _uuid.UUID(seller_id))
        except ValueError:
            return []
    if status_filter:
        query = query.filter(Listing.status == status_filter)
    if waste_category:
        query = query.filter(Listing.waste_category == waste_category.lower())

    if not status_filter and not seller_id:
        query = query.filter(Listing.status.in_([ListingStatus.AVAILABLE, ListingStatus.SOLD]))

    listings = query.all()

    if latitude and longitude and max_distance_km:
        filtered = []
        for listing in listings:
            dist = ((listing.latitude - latitude) ** 2 + (listing.longitude - longitude) ** 2) ** 0.5
            if dist * 111 <= max_distance_km:
                filtered.append(listing)
        listings = filtered

    return [_listing_to_dict(l, l.seller) for l in listings]


def get_my_listings(db: Session, user: User) -> List[dict]:
    listings = (
        db.query(Listing)
        .join(User, Listing.seller_id == User.id)
        .filter(Listing.seller_id == user.id)
        .all()
    )
    return [_listing_to_dict(l, user) for l in listings]


def get_listing(db: Session, listing_id: UUID) -> dict:
    listing = (
        db.query(Listing)
        .join(User, Listing.seller_id == User.id)
        .filter(Listing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return _listing_to_dict(listing, listing.seller)


def create_listing(
    db: Session,
    current_user: User,
    title: str,
    description: Optional[str],
    waste_category: str,
    quantity: int,
    unit: str,
    latitude: float,
    longitude: float,
    address: Optional[str],
    estimated_price: Optional[float],
    image_files,
    pickup_slots: Optional[list] = None,
) -> dict:
    if waste_category.lower() not in VALID_WASTE_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid waste category. Must be one of: {VALID_WASTE_CATEGORIES}",
        )
    if unit.lower() not in VALID_UNITS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid unit. Must be one of: {VALID_UNITS}",
        )

    image_urls = []
    saved_paths = []
    for img in image_files:
        if img.filename:
            filepath = save_upload_file(img)
            saved_paths.append(filepath)
            image_urls.append(get_image_url(filepath))

    new_listing = Listing(
        seller_id=current_user.id,
        title=title,
        description=description,
        waste_category=waste_category.lower(),
        quantity=quantity,
        unit=unit.lower(),
        latitude=latitude,
        longitude=longitude,
        address=address,
        estimated_price=estimated_price,
        images=image_urls,
        pickup_slots=pickup_slots or [],
    )

    try:
        db.add(new_listing)
        db.commit()
        db.refresh(new_listing)
    except Exception:
        db.rollback()
        for path in saved_paths:
            safe_delete_upload(path)
        raise

    return _listing_to_dict(new_listing, current_user)


def update_listing(
    db: Session,
    listing_id: UUID,
    listing_data: ListingUpdate,
    current_user: User,
) -> dict:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can update this listing",
        )

    for field, value in listing_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(listing, field, value)

    db.commit()
    db.refresh(listing)

    return _listing_to_dict(listing, current_user)


def update_listing_status(
    db: Session,
    listing_id: UUID,
    new_status: str,
    current_user: User,
) -> dict:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to update this listing",
        )
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {VALID_STATUSES}",
        )

    listing.status = new_status
    db.commit()
    db.refresh(listing)

    return {"message": f"Listing status updated to {new_status}", "status": new_status}


def delete_listing(db: Session, listing_id: UUID, current_user: User, force: bool = False) -> dict:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can delete this listing",
        )

    active_statuses = [
        ConversationStatus.PRICE_PENDING, ConversationStatus.PRICE_SUGGESTED,
        ConversationStatus.PRICE_AGREED, ConversationStatus.PICKUP_SUGGESTED,
        ConversationStatus.PICKUP_AGREED,
    ]
    active_convs = db.query(Conversation).filter(
        Conversation.listing_id == listing_id,
        Conversation.status.in_(active_statuses),
    ).all()

    if active_convs and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"active_negotiations:{len(active_convs)}",
        )

    # Mark active conversations as listing_removed (keeps buyer history)
    for conv in active_convs:
        conv.listing_removed        = True
        conv.listing_title_snapshot = listing.title
        conv.seen_by_buyer          = False
        conv.status                 = ConversationStatus.CANCELLED
        conv.cancelled_by           = current_user.id

    for img_url in listing.images:
        safe_delete_upload(img_url)

    db.delete(listing)
    db.commit()

    # Notify active buyers via SSE after commit
    for conv in active_convs:
        _notify(str(conv.buyer_id), {
            "kind":       "notification",
            "message":    f'"{listing.title}" has been removed by the seller.',
            "listing_id": str(listing_id),
        })

    return {"message": "Listing deleted successfully"}
