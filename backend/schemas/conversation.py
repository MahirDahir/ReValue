from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class ConversationStart(BaseModel):
    listing_id: UUID


class ConversationStartWithPrice(BaseModel):
    listing_id: UUID
    price: float = Field(..., gt=0, le=1_000_000)


class ConversationAction(BaseModel):
    action: str
    value: Optional[str] = None


class MarkSoldRequest(BaseModel):
    conversation_id: UUID


class ConversationResponse(BaseModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID
    seller_id: UUID
    status: str
    suggested_price: Optional[float] = None
    agreed_price: Optional[float] = None
    suggested_pickup: Optional[str] = None
    agreed_pickup: Optional[str] = None
    pickup_suggested_by: Optional[UUID] = None
    price_suggested_by: Optional[UUID] = None
    listing_title: Optional[str] = None
    listing_has_price: bool = False
    listing_pickup_slots: Optional[list] = []
    buyer_name: Optional[str] = None

    class Config:
        from_attributes = True
