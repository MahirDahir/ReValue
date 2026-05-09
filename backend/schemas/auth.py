from pydantic import BaseModel, Field, field_validator
from uuid import UUID


class UserRegister(BaseModel):
    phone: str
    password: str
    name: str

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
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
    business_name: str | None = None
    business_type: str | None = None
    is_verified: bool = False

    class Config:
        from_attributes = True


VALID_BUSINESS_TYPES = ["contractor", "dealer", "factory", "other"]


class BusinessProfileUpdate(BaseModel):
    business_name: str | None = Field(None, max_length=255)
    business_type: str | None = None

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, v):
        if v is not None and v not in VALID_BUSINESS_TYPES:
            raise ValueError(f"business_type must be one of: {VALID_BUSINESS_TYPES}")
        return v
