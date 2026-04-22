from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models.postgres.user import User
from schemas.user import UserUpdate


def get_user_profile(db: Session, user_id: UUID) -> dict:
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


def get_user_stats(db: Session, user_id: UUID) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def update_current_user(db: Session, current_user: User, user_data: UserUpdate) -> dict:
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
