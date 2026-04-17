from pydantic import BaseModel


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
