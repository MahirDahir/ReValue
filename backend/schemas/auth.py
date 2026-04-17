from pydantic import BaseModel
from uuid import UUID


class UserRegister(BaseModel):
    phone: str
    password: str
    name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: UUID
    phone: str
    name: str
    avatar_url: str | None = None
    buyer_rating: float
    seller_rating: float
    total_transactions: int

    class Config:
        from_attributes = True
