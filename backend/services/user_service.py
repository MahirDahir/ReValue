from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import bcrypt

from models.postgres.user import User
from schemas.user import UserUpdate, ChangePassword


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


def change_password(db: Session, current_user: User, data: ChangePassword) -> dict:
    if not bcrypt.checkpw(data.old_password.encode(), current_user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.password_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Password changed successfully"}
