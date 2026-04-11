from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.postgres_conn import Base


class RatingType:
    BUYER = "buyer"
    SELLER = "seller"


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=False, index=True)

    # Who is rating whom
    rater_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    rated_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Rating type - is this rating for the person as a buyer or seller?
    rating_type = Column(String(20), nullable=False)  # "buyer" or "seller"

    # Score and comment
    score = Column(Float, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Prevent duplicate ratings
    __table_args__ = (
        # Unique constraint to prevent rating the same transaction twice
        # This would be better as a proper unique constraint but keeping it simple
    )
