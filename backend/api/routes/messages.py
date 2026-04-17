from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from db.postgres_conn import get_db
from models.postgres.user import User
from api.middleware.auth import get_current_user
from schemas.message import MessageCreate, MessageResponse
import services.message_service as message_service

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await message_service.send_message(
        db, current_user,
        message_data.listing_id, message_data.receiver_id, message_data.content,
    )


# NOTE: /chat-list and all /listing/... routes must be declared BEFORE /{chat_id}
# so FastAPI does not swallow them with the parameterised route.

@router.get("/chat-list")
async def get_chat_list(current_user: User = Depends(get_current_user)):
    return await message_service.get_chat_list(current_user)


@router.get("/listing/{listing_id}/unread-count")
async def get_listing_unread_count(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await message_service.get_listing_unread_count(db, listing_id, current_user)


@router.get("/listing/{listing_id}/conversations")
async def get_listing_conversations(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await message_service.get_listing_conversations(db, listing_id, current_user)


@router.get("/listing/{listing_id}")
async def get_listing_messages(
    listing_id: UUID,
    buyer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await message_service.get_listing_messages(db, listing_id, current_user, buyer_id)


@router.get("/{chat_id}")
async def get_chat_messages(
    chat_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await message_service.get_chat_by_id(chat_id, limit)


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await message_service.manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        message_service.manager.disconnect(user_id)
