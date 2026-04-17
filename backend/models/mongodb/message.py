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
        """Return buyers with unread message counts for a listing"""
        listing_id_clean = listing_id.replace("-", "")
        pipeline = [
            {
                "$match": {
                    "listing_id": {"$in": [listing_id, listing_id_clean]},
                    "receiver_id": seller_id,
                }
            },
            {
                "$group": {
                    "_id": "$sender_id",
                    "unread_count": {
                        "$sum": {"$cond": [{"$eq": ["$read", False]}, 1, 0]}
                    },
                }
            },
        ]
        cursor = self.collection.aggregate(pipeline)
        result = []
        async for doc in cursor:
            result.append({"buyer_id": doc["_id"], "unread_count": doc["unread_count"]})
        return result

    async def mark_as_read(self, chat_id: str, sender_id: str) -> int:
        """Mark all unread messages from a sender in a chat as read"""
        result = await self.collection.update_many(
            {"chat_id": chat_id, "sender_id": sender_id, "read": False},
            {"$set": {"read": True}},
        )
        return result.modified_count

    async def count_unread_for_seller(self, listing_id: str, seller_id: str) -> int:
        """Count total unread messages sent by any buyer to this seller about a listing"""
        listing_id_clean = listing_id.replace("-", "")
        count = await self.collection.count_documents({
            "listing_id": {"$in": [listing_id, listing_id_clean]},
            "receiver_id": seller_id,
            "read": False,
        })
        return count

    async def count_unread_for_buyer(self, listing_id: str, seller_id: str, buyer_id: str) -> int:
        """Count unread messages from seller to a specific buyer about a listing"""
        listing_id_clean = listing_id.replace("-", "")
        count = await self.collection.count_documents({
            "listing_id": {"$in": [listing_id, listing_id_clean]},
            "sender_id": seller_id,
            "receiver_id": buyer_id,
            "read": False,
        })
        return count

    async def get_chat_list(self, user_id: str) -> list:
        """Get list of chats for a user with last message preview and correct unread counts"""
        pipeline = [
            {"$match": {"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]}},
            {
                "$group": {
                    "_id": "$chat_id",
                    "listing_id": {"$first": "$listing_id"},
                    "last_message": {"$last": "$$ROOT"},
                    "unread_count": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$read", False]},
                                        {"$ne": ["$sender_id", user_id]},
                                    ]
                                },
                                1,
                                0,
                            ]
                        }
                    },
                }
            },
            {"$sort": {"last_message.timestamp": -1}},
        ]
        cursor = self.collection.aggregate(pipeline)
        chats = []
        async for chat in cursor:
            chat["last_message"]["_id"] = str(chat["last_message"]["_id"])
            chat["last_message"]["timestamp"] = chat["last_message"]["timestamp"].isoformat()
            chats.append(chat)
        return chats
