from pydantic import BaseModel
from uuid import UUID


class RatingCreate(BaseModel):
    transaction_id: str
    rated_id: str
    rating_type: str  # "buyer" or "seller"
    score: float
    comment: str | None = None


class RatingResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    rater_id: UUID
    rated_id: UUID
    rating_type: str
    score: float
    comment: str | None

    class Config:
        from_attributes = True
