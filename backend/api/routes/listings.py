from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import json

from db.postgres_conn import get_db
from models.postgres.user import User
from api.middleware.auth import get_current_user
from schemas.listing import ListingUpdate, ListingResponse
from services.listing_service import VALID_WASTE_CATEGORIES, VALID_STATUSES
import services.listing_service as listing_service

router = APIRouter(prefix="/listings", tags=["Listings"])


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    waste_category: str = Form(...),
    quantity: int = Form(1),
    unit: str = Form("pieces"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    estimated_price: Optional[float] = Form(None),
    pickup_slots: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="latitude must be between -90 and 90")
    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="longitude must be between -180 and 180")
    try:
        slots = json.loads(pickup_slots) if pickup_slots else []
    except (json.JSONDecodeError, TypeError):
        slots = []
    return listing_service.create_listing(
        db, current_user, title, description, waste_category,
        quantity, unit, latitude, longitude, address, estimated_price, images, slots,
    )


@router.get("/", response_model=List[ListingResponse])
def get_listings(
    status_filter: Optional[str] = None,
    seller_id: Optional[str] = None,
    waste_category: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    db: Session = Depends(get_db),
):
    if waste_category and waste_category.lower() not in VALID_WASTE_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid waste_category. Must be one of: {VALID_WASTE_CATEGORIES}")
    if latitude is not None and not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="latitude must be between -90 and 90")
    if longitude is not None and not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="longitude must be between -180 and 180")
    if max_distance_km is not None and not (0 < max_distance_km <= 5000):
        raise HTTPException(status_code=400, detail="max_distance_km must be between 0 and 5000")
    return listing_service.get_listings(
        db, status_filter, seller_id, waste_category, latitude, longitude, max_distance_km,
    )


@router.get("/mine", response_model=List[ListingResponse])
def get_my_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return listing_service.get_my_listings(db, current_user)


@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing(listing_id: UUID, db: Session = Depends(get_db)):
    return listing_service.get_listing(db, listing_id)


@router.put("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: UUID,
    listing_data: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return listing_service.update_listing(db, listing_id, listing_data, current_user)


@router.put("/{listing_id}/status")
def update_listing_status(
    listing_id: UUID,
    new_status: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return listing_service.update_listing_status(db, listing_id, new_status, current_user)


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return listing_service.delete_listing(db, listing_id, current_user)
