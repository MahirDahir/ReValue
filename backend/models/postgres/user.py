from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.postgres_conn import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)

    # Ratings
    buyer_rating = Column(Float, default=0.0)
    seller_rating = Column(Float, default=0.0)
    buyer_rating_count = Column(Integer, default=0)
    seller_rating_count = Column(Integer, default=0)

    # Stats
    total_transactions = Column(Integer, default=0)
    total_earned = Column(Float, default=0.0)
    total_spent = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    def update_buyer_rating(self, new_rating: float):
        total = self.buyer_rating * self.buyer_rating_count + new_rating
        self.buyer_rating_count += 1
        self.buyer_rating = total / self.buyer_rating_count

    def update_seller_rating(self, new_rating: float):
        total = self.seller_rating * self.seller_rating_count + new_rating
        self.seller_rating_count += 1
        self.seller_rating = total / self.seller_rating_count
