from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.session import get_db
from models.postgres.user import User
from api.deps import get_current_user
from schemas.conversation import ConversationStartWithPrice, ConversationAction, MarkSoldRequest
import services.conversation_service as conversation_service

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("/start", status_code=status.HTTP_201_CREATED)
def start_with_price(
    data: ConversationStartWithPrice,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.start_with_price(db, current_user, data.listing_id, data.price)


@router.get("/pending-counts")
def get_pending_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_pending_counts(db, current_user)


@router.get("/buyer-pending-counts")
def get_buyer_pending_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_buyer_pending_counts(db, current_user)


@router.get("/mine")
def get_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_my_conversations(db, current_user)


@router.get("/my-for-listing/{listing_id}")
def get_my_listing_conversation(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_my_listing_conversation(db, listing_id, current_user)


@router.get("/listing/{listing_id}")
def get_listing_conversations(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_listing_conversations(db, listing_id, current_user)


@router.get("/contacts-revealed/{listing_id}")
def get_contacts_revealed(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_contacts_revealed_for_listing(db, listing_id, current_user)


@router.get("/{conv_id}")
def get_conversation(
    conv_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_conversation(db, conv_id, current_user)


@router.post("/{conv_id}/seen")
def mark_seen(
    conv_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.mark_seen(db, conv_id, current_user)


@router.post("/{conv_id}/action")
def do_action(
    conv_id: UUID,
    action_data: ConversationAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.do_action(db, conv_id, current_user, action_data)


@router.get("/{conv_id}/contact")
def get_contact(
    conv_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.get_contact(db, conv_id, current_user)


@router.post("/listing/{listing_id}/mark-sold")
def mark_sold_to_buyer(
    listing_id: UUID,
    data: MarkSoldRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return conversation_service.mark_sold_to_buyer(db, listing_id, data.conversation_id, current_user)
