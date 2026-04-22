from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models.postgres.user import User
from models.postgres.transaction import Transaction
from models.postgres.rating import Rating
from schemas.rating import RatingCreate


def create_rating(db: Session, current_user: User, rating_data: RatingCreate) -> Rating:
    transaction = db.query(Transaction).filter(
        Transaction.id == UUID(rating_data.transaction_id)
    ).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if current_user.id not in (transaction.buyer_id, transaction.seller_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only rate users from your own transactions",
        )

    if rating_data.rating_type not in ["buyer", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating type must be 'buyer' or 'seller'",
        )

    if not (1 <= rating_data.score <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score must be between 1 and 5",
        )

    existing = db.query(Rating).filter(
        Rating.transaction_id == UUID(rating_data.transaction_id),
        Rating.rater_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this transaction",
        )

    new_rating = Rating(
        transaction_id=UUID(rating_data.transaction_id),
        rater_id=current_user.id,
        rated_id=UUID(rating_data.rated_id),
        rating_type=rating_data.rating_type,
        score=rating_data.score,
        comment=rating_data.comment,
    )

    db.add(new_rating)

    rated_user = db.query(User).filter(User.id == UUID(rating_data.rated_id)).first()
    if rated_user:
        if rating_data.rating_type == "buyer":
            rated_user.update_buyer_rating(rating_data.score)
        else:
            rated_user.update_seller_rating(rating_data.score)

    db.commit()
    db.refresh(new_rating)
    return new_rating


def get_user_ratings(db: Session, user_id: UUID) -> list:
    return db.query(Rating).filter(Rating.rated_id == user_id).all()
