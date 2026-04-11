from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel

from db.postgres_conn import get_db
from models.postgres.user import User
from api.middleware.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


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


@router.get("/{user_id}", response_model=dict)
def get_user_profile(user_id: UUID, db: Session = Depends(get_db)):
    """Get user profile by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": str(user.id),
        "phone": user.phone,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "buyer_rating": user.buyer_rating,
        "seller_rating": user.seller_rating,
        "total_transactions": user.total_transactions,
    }


@router.get("/{user_id}/stats", response_model=UserStats)
def get_user_stats(user_id: UUID, db: Session = Depends(get_db)):
    """Get user statistics"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


@router.put("/me", response_model=dict)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile"""
    if user_data.name is not None:
        current_user.name = user_data.name
    if user_data.phone is not None:
        current_user.phone = user_data.phone
    if user_data.avatar_url is not None:
        current_user.avatar_url = user_data.avatar_url

    db.commit()
    db.refresh(current_user)

    return {
        "id": str(current_user.id),
        "phone": current_user.phone,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
    }
