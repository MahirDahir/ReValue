from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.session import get_db
from models.postgres.user import User
from api.deps import get_current_user
from schemas.rating import RatingCreate, RatingResponse
import services.rating_service as rating_service

router = APIRouter(prefix="/ratings", tags=["Ratings"])


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(
    rating_data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return rating_service.create_rating(db, current_user, rating_data)


@router.get("/user/{user_id}")
def get_user_ratings(user_id: UUID, db: Session = Depends(get_db)):
    return rating_service.get_user_ratings(db, user_id)
