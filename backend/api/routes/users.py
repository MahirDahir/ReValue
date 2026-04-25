from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from db.session import get_db
from models.postgres.user import User
from api.deps import get_current_user
from schemas.user import UserStats, UserUpdate, ChangePassword
import services.user_service as user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}", response_model=dict)
def get_user_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.get_user_profile(db, user_id)


@router.get("/{user_id}/stats", response_model=UserStats)
def get_user_stats(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.get_user_stats(db, user_id)


@router.put("/me", response_model=dict)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.update_current_user(db, current_user, user_data)


@router.post("/me/change-password", response_model=dict)
def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user_service.change_password(db, current_user, data)
