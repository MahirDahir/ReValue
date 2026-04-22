from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.session import Base


class TransactionStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id       = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=False, index=True)
    buyer_id         = Column(UUID(as_uuid=True), ForeignKey("users.id"),    nullable=False, index=True)
    seller_id        = Column(UUID(as_uuid=True), ForeignKey("users.id"),    nullable=False, index=True)
    agreed_price     = Column(Float, nullable=False)
    payment_status   = Column(String(20), default=TransactionStatus.PENDING)
    payment_intent_id = Column(String(255), nullable=True)
    status           = Column(String(20), default=TransactionStatus.PENDING, index=True)
    status_changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at     = Column(DateTime(timezone=True), nullable=True)
    completed_at     = Column(DateTime(timezone=True), nullable=True)
    cancelled_at     = Column(DateTime(timezone=True), nullable=True)
