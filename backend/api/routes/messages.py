from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
import asyncio
from datetime import datetime

from db.postgres_conn import get_db
from db.mongo_conn import get_mongo_db
from models.postgres.user import User
from models.postgres.listing import Listing
from models.mongodb.message import Message
from api.middleware.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


# Schemas
class MessageCreate(BaseModel):
    listing_id: str
    receiver_id: str
    content: str


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    receiver_id: str
    listing_id: str
    content: str
    timestamp: str
    read: bool


# In-memory connection manager for WebSocket (for POC - use Redis in production)
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


def generate_chat_id(listing_id: str, user1_id: str, user2_id: str) -> str:
    """Generate a unique chat ID for a conversation — normalize IDs to strip dashes"""
    listing_id = str(listing_id).replace("-", "")
    user1_id = str(user1_id).replace("-", "")
    user2_id = str(user2_id).replace("-", "")
    sorted_users = sorted([user1_id, user2_id])
    return f"{listing_id}_{sorted_users[0]}_{sorted_users[1]}"


@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to another user about a listing"""
    # Verify listing exists
    listing = db.query(Listing).filter(Listing.id == UUID(message_data.listing_id)).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Generate chat ID
    chat_id = generate_chat_id(message_data.listing_id, str(current_user.id), message_data.receiver_id)

    # Save to MongoDB
    message_service = Message()
    message = await message_service.create_message(
        chat_id=chat_id,
        sender_id=str(current_user.id),
        receiver_id=message_data.receiver_id,
        content=message_data.content,
        listing_id=message_data.listing_id,
    )

    # Send via WebSocket if recipient is online
    await manager.send_personal_message(message, message_data.receiver_id)

    return message


@router.get("/{chat_id}")
async def get_chat_messages(
    chat_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a chat"""
    message_service = Message()
    messages = await message_service.get_messages(chat_id, limit)
    return messages


@router.get("/chat-list")
async def get_chat_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of all chats for current user"""
    message_service = Message()
    chats = await message_service.get_chat_list(str(current_user.id))
    return chats


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive, handle ping/pong automatically
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# Simple chat endpoint for POC (without WebSocket)
@router.get("/listing/{listing_id}/conversations")
async def get_listing_conversations(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all unique buyers who have chatted about a listing (for the seller)"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can view all conversations")

    message_service = Message()
    buyer_ids = await message_service.get_conversation_buyers(str(listing_id), str(current_user.id))

    # Fetch buyer info from PostgreSQL
    conversations = []
    for buyer_id in buyer_ids:
        try:
            buyer = db.query(User).filter(User.id == UUID(buyer_id)).first()
            if buyer:
                conversations.append({
                    "buyer_id": str(buyer.id),
                    "buyer_name": buyer.name,
                    "buyer_phone": buyer.phone,
                })
        except Exception:
            pass

    return conversations


@router.get("/listing/{listing_id}")
async def get_listing_messages(
    listing_id: UUID,
    buyer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages for a listing.
    - Buyer: omit buyer_id — chat is between buyer (current user) and seller.
    - Seller: pass buyer_id to view a specific buyer's conversation.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    is_seller = listing.seller_id == current_user.id

    if is_seller:
        if not buyer_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="buyer_id required for seller")
        other_id = buyer_id
    else:
        other_id = str(listing.seller_id)

    chat_id = generate_chat_id(str(listing_id), str(current_user.id), other_id)

    message_service = Message()
    messages = await message_service.get_messages(chat_id)
    return messages
