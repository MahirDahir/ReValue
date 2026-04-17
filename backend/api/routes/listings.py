from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.postgres_conn import get_db
from models.postgres.user import User
from api.middleware.auth import get_current_user
from schemas.listing import ListingUpdate, ListingResponse
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
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return listing_service.create_listing(
        db, current_user, title, description, waste_category,
        quantity, unit, latitude, longitude, address, estimated_price, images,
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
