"""
Business logic for messages.
Routes call these functions; no HTTP concerns here.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models.postgres.listing import Listing
from models.postgres.user import User
from models.mongodb.message import Message
from fastapi import WebSocket


def generate_chat_id(listing_id: str, user1_id: str, user2_id: str) -> str:
    """Generate a stable, normalized chat ID for a conversation."""
    listing_id = str(listing_id).replace("-", "")
    user1_id = str(user1_id).replace("-", "")
    user2_id = str(user2_id).replace("-", "")
    sorted_users = sorted([user1_id, user2_id])
    return f"{listing_id}_{sorted_users[0]}_{sorted_users[1]}"


class ConnectionManager:
    """In-memory WebSocket connection manager (use Redis in production)."""

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


async def send_message(
    db: Session,
    current_user: User,
    listing_id: str,
    receiver_id: str,
    content: str,
) -> dict:
    listing = db.query(Listing).filter(Listing.id == UUID(listing_id)).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    chat_id = generate_chat_id(listing_id, str(current_user.id), receiver_id)

    message = await Message().create_message(
        chat_id=chat_id,
        sender_id=str(current_user.id),
        receiver_id=receiver_id,
        content=content,
        listing_id=listing_id,
    )

    await manager.send_personal_message(message, receiver_id)
    return message


async def get_chat_list(current_user: User) -> list:
    return await Message().get_chat_list(str(current_user.id))


async def get_listing_unread_count(
    db: Session,
    listing_id: UUID,
    current_user: User,
) -> dict:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    is_seller = listing.seller_id == current_user.id
    svc = Message()

    if is_seller:
        count = await svc.count_unread_for_seller(str(listing_id), str(current_user.id))
    else:
        count = await svc.count_unread_for_buyer(
            str(listing_id), str(listing.seller_id), str(current_user.id)
        )

    return {"count": count}


async def get_listing_conversations(
    db: Session,
    listing_id: UUID,
    current_user: User,
) -> list:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can view all conversations",
        )

    buyers_data = await Message().get_conversation_buyers(str(listing_id), str(current_user.id))

    conversations = []
    for item in buyers_data:
        buyer_id = item["buyer_id"]
        try:
            buyer = db.query(User).filter(User.id == UUID(buyer_id)).first()
            if buyer:
                conversations.append({
                    "buyer_id": str(buyer.id),
                    "buyer_name": buyer.name,
                    "buyer_phone": buyer.phone,
                    "unread_count": item["unread_count"],
                })
        except Exception:
            pass

    return conversations


async def get_listing_messages(
    db: Session,
    listing_id: UUID,
    current_user: User,
    buyer_id: str | None,
) -> list:
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    is_seller = listing.seller_id == current_user.id

    if is_seller:
        if not buyer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="buyer_id required for seller",
            )
        other_id = buyer_id
    else:
        other_id = str(listing.seller_id)

    chat_id = generate_chat_id(str(listing_id), str(current_user.id), other_id)
    svc = Message()
    messages = await svc.get_messages(chat_id)
    await svc.mark_as_read(chat_id, other_id)
    return messages


async def get_chat_by_id(chat_id: str, limit: int = 50) -> list:
    return await Message().get_messages(chat_id, limit)
