from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
import os
import uuid as _uuid

from db.postgres_conn import get_db
from models.postgres.user import User
from models.postgres.listing import Listing, ListingStatus, BottleType
from api.middleware.auth import get_current_user
from services.image_service import save_upload_file, get_image_url

router = APIRouter(prefix="/listings", tags=["Listings"])


# Schemas
class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    bottle_type: str
    quantity: int = 1
    latitude: float
    longitude: float
    address: Optional[str] = None
    estimated_price: Optional[float] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    bottle_type: Optional[str] = None
    quantity: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    estimated_price: Optional[float] = None
    status: Optional[str] = None


class ListingResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: Optional[str]
    bottle_type: str
    quantity: int
    status: str
    latitude: float
    longitude: float
    address: Optional[str]
    images: list
    estimated_price: Optional[float]
    seller_rating: float

    class Config:
        from_attributes = True


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    bottle_type: str = Form(...),
    quantity: int = Form(1),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    estimated_price: Optional[float] = Form(None),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new bottle listing (seller)"""
    # Validate bottle type
    valid_types = ["plastic", "glass", "aluminum", "mixed"]
    if bottle_type.lower() not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid bottle type. Must be one of: {valid_types}",
        )

    # Save images
    image_urls = []
    for img in images:
        if img.filename:
            filepath = save_upload_file(img)
            image_urls.append(get_image_url(filepath))

    # Create listing
    new_listing = Listing(
        seller_id=current_user.id,
        title=title,
        description=description,
        bottle_type=bottle_type.lower(),
        quantity=quantity,
        latitude=latitude,
        longitude=longitude,
        address=address,
        estimated_price=estimated_price,
        images=image_urls,
    )

    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)

    return {
        "id": str(new_listing.id),
        "seller_id": str(new_listing.seller_id),
        "seller_name": current_user.name,
        "title": new_listing.title,
        "description": new_listing.description,
        "bottle_type": new_listing.bottle_type,
        "quantity": new_listing.quantity,
        "status": new_listing.status,
        "latitude": new_listing.latitude,
        "longitude": new_listing.longitude,
        "address": new_listing.address,
        "images": new_listing.images,
        "estimated_price": new_listing.estimated_price,
        "seller_rating": current_user.seller_rating,
    }


@router.get("/", response_model=List[ListingResponse])
def get_listings(
    status_filter: Optional[str] = None,
    seller_id: Optional[str] = None,
    bottle_type: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Get all listings with optional filters"""
    query = db.query(Listing).join(User, Listing.seller_id == User.id)

    # Apply filters
    if seller_id:
        try:
            query = query.filter(Listing.seller_id == _uuid.UUID(seller_id))
        except ValueError:
            return []  # invalid UUID format — return empty rather than crashing
    if status_filter:
        query = query.filter(Listing.status == status_filter)
    if bottle_type:
        query = query.filter(Listing.bottle_type == bottle_type.lower())

    # Only show available listings by default — skip when fetching a specific seller's own listings
    if not status_filter and not seller_id:
        query = query.filter(Listing.status == ListingStatus.AVAILABLE)

    listings = query.all()

    # Simple distance filter (Haversine formula could be added for accuracy)
    if latitude and longitude and max_distance_km:
        filtered = []
        for listing in listings:
            # Simple Euclidean distance (good enough for POC)
            dist = ((listing.latitude - latitude) ** 2 + (listing.longitude - longitude) ** 2) ** 0.5
            # Rough conversion: 1 degree ≈ 111 km
            if dist * 111 <= max_distance_km:
                filtered.append(listing)
        listings = filtered

    return [
        {
            "id": str(l.id),
            "seller_id": str(l.seller_id),
            "seller_name": l.seller.name,
            "title": l.title,
            "description": l.description,
            "bottle_type": l.bottle_type,
            "quantity": l.quantity,
            "status": l.status,
            "latitude": l.latitude,
            "longitude": l.longitude,
            "address": l.address,
            "images": l.images,
            "estimated_price": l.estimated_price,
            "seller_rating": l.seller.seller_rating,
        }
        for l in listings
    ]


@router.get("/mine", response_model=List[ListingResponse])
def get_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all listings for the currently authenticated seller (all statuses)"""
    listings = (
        db.query(Listing)
        .join(User, Listing.seller_id == User.id)
        .filter(Listing.seller_id == current_user.id)
        .all()
    )
    return [
        {
            "id": str(l.id),
            "seller_id": str(l.seller_id),
            "seller_name": current_user.name,
            "title": l.title,
            "description": l.description,
            "bottle_type": l.bottle_type,
            "quantity": l.quantity,
            "status": l.status,
            "latitude": l.latitude,
            "longitude": l.longitude,
            "address": l.address,
            "images": l.images,
            "estimated_price": l.estimated_price,
            "seller_rating": current_user.seller_rating,
        }
        for l in listings
    ]


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(listing_id: UUID, db: Session = Depends(get_db)):
    """Get a specific listing by ID"""
    listing = (
        db.query(Listing).join(User, Listing.seller_id == User.id).filter(Listing.id == listing_id).first()
    )
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return {
        "id": str(listing.id),
        "seller_id": str(listing.seller_id),
        "seller_name": listing.seller.name,
        "title": listing.title,
        "description": listing.description,
        "bottle_type": listing.bottle_type,
        "quantity": listing.quantity,
        "status": listing.status,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "address": listing.address,
        "images": listing.images,
        "estimated_price": listing.estimated_price,
        "seller_rating": listing.seller.seller_rating,
    }


@router.put("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: UUID,
    listing_data: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a listing (seller only)"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Only seller can update
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can update this listing")

    # Update fields
    for field, value in listing_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(listing, field, value)

    db.commit()
    db.refresh(listing)

    return {
        "id": str(listing.id),
        "seller_id": str(listing.seller_id),
        "seller_name": current_user.name,
        "title": listing.title,
        "description": listing.description,
        "bottle_type": listing.bottle_type,
        "quantity": listing.quantity,
        "status": listing.status,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "address": listing.address,
        "images": listing.images,
        "estimated_price": listing.estimated_price,
        "seller_rating": current_user.seller_rating,
    }


@router.put("/{listing_id}/status")
def update_listing_status(
    listing_id: UUID,
    status: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update listing status (buyer can mark as sold after purchase)"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Validate status
    valid_statuses = [ListingStatus.AVAILABLE, ListingStatus.PENDING, ListingStatus.SOLD, ListingStatus.CANCELLED]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    # Seller or buyer can update status
    # In a real app, you'd check if current user is involved in a transaction
    listing.status = status
    db.commit()
    db.refresh(listing)

    return {"message": f"Listing status updated to {status}", "status": status}


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a listing (seller only)"""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Only seller can delete
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the seller can delete this listing")

    # Delete images
    for img_url in listing.images:
        filepath = img_url.replace("/uploads/", "uploads/")
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(listing)
    db.commit()

    return {"message": "Listing deleted successfully"}
