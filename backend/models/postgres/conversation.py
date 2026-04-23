from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from db.session import Base


class ConversationStatus:
    PRICE_PENDING    = "price_pending"     # buyer just opened, no price suggested yet
    PRICE_SUGGESTED  = "price_suggested"   # buyer suggested a price, awaiting seller
    PRICE_AGREED     = "price_agreed"      # seller accepted price
    PICKUP_SUGGESTED = "pickup_suggested"  # buyer (or seller counter) suggested a time
    PICKUP_AGREED    = "pickup_agreed"     # seller accepted pickup time
    CONTACT_REVEALED = "contact_revealed"  # seller chose to share phone
    CANCELLED        = "cancelled"


class Conversation(Base):
    __tablename__ = "conversations"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id    = Column(UUID(as_uuid=True), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True, index=True)
    buyer_id      = Column(UUID(as_uuid=True), ForeignKey("users.id"),   nullable=False, index=True)
    seller_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"),   nullable=False)

    status        = Column(String(30), nullable=False, default=ConversationStatus.PRICE_PENDING, index=True)

    suggested_price  = Column(Float, nullable=True)   # buyer's latest price offer
    agreed_price     = Column(Float, nullable=True)

    # ISO datetime string for simplicity (stored as varchar, displayed as-is)
    suggested_pickup = Column(String(50), nullable=True)  # latest proposed pickup datetime
    agreed_pickup    = Column(String(50), nullable=True)

    # who made the last pickup suggestion (so UI knows whose turn it is)
    pickup_suggested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # who made the last price suggestion (so UI hides Accept/Decline from the suggester)
    price_suggested_by  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # who cancelled (so only they can reopen)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # notification-seen flags: False means the party has an unread update
    seen_by_buyer  = Column(Boolean, nullable=False, default=True)
    seen_by_seller = Column(Boolean, nullable=False, default=True)

    # set True when seller force-deletes the listing mid-negotiation
    listing_removed       = Column(Boolean, nullable=False, default=False)
    listing_title_snapshot = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
