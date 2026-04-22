from pydantic import BaseModel, field_validator
from uuid import UUID


class UserRegister(BaseModel):
    phone: str
    password: str
    name: str

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @field_validator('phone')
    @classmethod
    def phone_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Phone cannot be empty')
        return v.strip()


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
