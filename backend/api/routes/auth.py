from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import timedelta
from uuid import UUID

from db.postgres_conn import get_db
from models.postgres.user import User
from services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from api.middleware.auth import get_current_user
from config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == user_data.phone).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        phone=user_data.phone,
        password_hash=hashed_password,
        name=user_data.name,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(new_user.id),
            "phone": new_user.phone,
            "name": new_user.name,
            "buyer_rating": new_user.buyer_rating,
            "seller_rating": new_user.seller_rating,
            "total_transactions": new_user.total_transactions,
        },
    )


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "phone": user.phone,
            "name": user.name,
            "buyer_rating": user.buyer_rating,
            "seller_rating": user.seller_rating,
            "total_transactions": user.total_transactions,
        },
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
