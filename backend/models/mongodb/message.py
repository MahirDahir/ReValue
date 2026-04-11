from datetime import datetime
from typing import Optional
from db.mongo_conn import get_mongo_db


class Message:
    """MongoDB message model for chat functionality"""

    def __init__(self):
        self.db = get_mongo_db()
        self.collection = self.db.messages

    async def create_message(
        self,
        chat_id: str,
        sender_id: str,
        content: str,
        receiver_id: Optional[str] = None,
        listing_id: Optional[str] = None,
    ) -> dict:
        """Create a new message"""
        message = {
            "chat_id": chat_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "content": content,
            "listing_id": listing_id,
            "timestamp": datetime.utcnow(),
            "read": False,
        }
        result = await self.collection.insert_one(message)
        message["_id"] = str(result.inserted_id)
        return message

    async def get_messages(self, chat_id: str, limit: int = 50) -> list:
        """Get messages for a chat, ordered by timestamp"""
        cursor = self.collection.find({"chat_id": chat_id}).sort("timestamp", 1).limit(limit)
        messages = []
        async for msg in cursor:
            msg["_id"] = str(msg["_id"])
            msg["timestamp"] = msg["timestamp"].isoformat()
            messages.append(msg)
        return messages

    async def get_conversation_buyers(self, listing_id: str, seller_id: str) -> list:
        """Return unique buyer IDs who have sent messages about a listing to the seller"""
        listing_id_clean = listing_id.replace("-", "")
        cursor = self.collection.find(
            {"listing_id": {"$in": [listing_id, listing_id_clean]}, "receiver_id": seller_id},
            {"sender_id": 1}
        )
        buyer_ids = set()
        async for msg in cursor:
            buyer_ids.add(msg["sender_id"])
        return list(buyer_ids)

    async def mark_as_read(self, chat_id: str, sender_id: str) -> int:
        """Mark all messages from a chat as read for the other participant"""
        result = await self.collection.update_many(
            {"chat_id": chat_id, "sender_id": sender_id, "read": False},
            {"$set": {"read": True}},
        )
        return result.modified_count

    async def get_chat_list(self, user_id: str) -> list:
        """Get list of chats for a user with last message preview"""
        pipeline = [
            {"$match": {"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]}},
            {
                "$group": {
                    "_id": "$chat_id",
                    "last_message": {"$first": "$$ROOT"},
                    "unread_count": {
                        "$sum": {"$cond": [{"$and": [{"$eq": ["$read", False]}, {"$eq": ["$sender_id", user_id]}]}, 0, 1]}
                    },
                }
            },
            {"$sort": {"last_message.timestamp": -1}},
        ]
        # Simplified query - in production would need more sophisticated aggregation
        cursor = self.collection.aggregate(pipeline)
        chats = []
        async for chat in cursor:
            chats.append(chat)
        return chats
