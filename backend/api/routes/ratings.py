from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel

from db.postgres_conn import get_db
from models.postgres.user import User
from models.postgres.transaction import Transaction
from models.postgres.rating import Rating, RatingType
from api.middleware.auth import get_current_user

router = APIRouter(prefix="/ratings", tags=["Ratings"])


class RatingCreate(BaseModel):
    transaction_id: str
    rated_id: str
    rating_type: str  # "buyer" or "seller"
    score: float
    comment: str | None = None


class RatingResponse(BaseModel):
    id: UUID
    transaction_id: UUID
    rater_id: UUID
    rated_id: UUID
    rating_type: str
    score: float
    comment: str | None

    class Config:
        from_attributes = True


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(
    rating_data: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a rating for a user after a transaction"""
    # Verify transaction exists
    transaction = db.query(Transaction).filter(
        Transaction.id == UUID(rating_data.transaction_id)
    ).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # Verify rater is part of the transaction
    if str(current_user.id) != str(transaction.buyer_id) and str(current_user.id) != str(transaction.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only rate users from your own transactions",
        )

    # Validate rating type
    if rating_data.rating_type not in ["buyer", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating type must be 'buyer' or 'seller'",
        )

    # Validate score
    if not (1 <= rating_data.score <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score must be between 1 and 5",
        )

    # Check if rating already exists
    existing_rating = db.query(Rating).filter(
        Rating.transaction_id == UUID(rating_data.transaction_id),
        Rating.rater_id == current_user.id,
    ).first()
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this transaction",
        )

    # Create rating
    new_rating = Rating(
        transaction_id=UUID(rating_data.transaction_id),
        rater_id=current_user.id,
        rated_id=UUID(rating_data.rated_id),
        rating_type=rating_data.rating_type,
        score=rating_data.score,
        comment=rating_data.comment,
    )

    db.add(new_rating)

    # Update user's rating
    rated_user = db.query(User).filter(User.id == UUID(rating_data.rated_id)).first()
    if rated_user:
        if rating_data.rating_type == "buyer":
            rated_user.update_buyer_rating(rating_data.score)
        else:
            rated_user.update_seller_rating(rating_data.score)

    db.commit()
    db.refresh(new_rating)

    return new_rating


@router.get("/user/{user_id}")
def get_user_ratings(user_id: UUID, db: Session = Depends(get_db)):
    """Get all ratings for a user"""
    ratings = db.query(Rating).filter(Rating.rated_id == user_id).all()
    return ratings
