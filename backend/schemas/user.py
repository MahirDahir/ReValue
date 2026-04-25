from pydantic import BaseModel
from uuid import UUID


class UserStats(BaseModel):
    id: UUID
    phone: str
    name: str
    buyer_rating: float
    seller_rating: float
    buyer_rating_count: int
    seller_rating_count: int
    total_transactions: int
    total_earned: float
    total_spent: float

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class ChangePassword(BaseModel):
    old_password: str
    new_password: str
