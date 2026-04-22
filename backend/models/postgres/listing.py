from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.session import Base


class ListingStatus:
    AVAILABLE = "available"
    PENDING = "pending"
    SOLD = "sold"
    CANCELLED = "cancelled"


class WasteCategory:
    PLASTIC = "plastic"
    GLASS = "glass"
    METAL = "metal"
    ELECTRONICS = "electronics"
    OTHER = "other"


class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Listing details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    waste_category = Column(String(50), nullable=False)  # plastic, glass, metal, electronics, other
    quantity = Column(Integer, nullable=False, default=1)
    unit = Column(String(20), nullable=False, default="pieces")  # kg, pieces
    status = Column(String(20), default=ListingStatus.AVAILABLE, index=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)

    # Images - stored as JSON array of URLs
    images = Column(JSON, default=list)

    # Pricing (negotiated via chat, but can have initial estimate)
    estimated_price = Column(Float, nullable=True)

    # Seller's available pickup slots: [{"day": "monday", "start": "09:00", "end": "17:00"}, ...]
    pickup_slots = Column(JSON, default=list, nullable=True)

    # Set when seller confirms the actual buyer via "Mark Sold" flow
    actual_buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seller = relationship("User", foreign_keys=[seller_id], backref="listings")
