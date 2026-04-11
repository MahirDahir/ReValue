from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.MONGODB_DB]


def get_mongo_db():
    """Dependency for getting MongoDB database in FastAPI routes"""
    return db


async def get_messages_collection():
    """Get messages collection"""
    return db.messages


async def init_mongo_indexes():
    """Initialize MongoDB indexes"""
    messages = db.messages
    await messages.create_index([("chat_id", 1), ("timestamp", 1)])
    await messages.create_index([("sender_id", 1)])
