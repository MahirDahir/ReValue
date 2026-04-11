from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.postgres_conn import Base


class ListingStatus:
    AVAILABLE = "available"
    PENDING = "pending"
    SOLD = "sold"
    CANCELLED = "cancelled"


class BottleType:
    PLASTIC = "plastic"
    GLASS = "glass"
    ALUMINUM = "aluminum"
    MIXED = "mixed"


class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Listing details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    bottle_type = Column(String(50), nullable=False)  # plastic, glass, aluminum, mixed
    quantity = Column(Integer, nullable=False, default=1)
    status = Column(String(20), default=ListingStatus.AVAILABLE, index=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)

    # Images - stored as JSON array of URLs
    images = Column(JSON, default=list)

    # Pricing (negotiated via chat, but can have initial estimate)
    estimated_price = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seller = relationship("User", backref="listings")
