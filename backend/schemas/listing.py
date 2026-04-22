from pydantic import BaseModel, Field
from typing import Optional, List


class ListingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    waste_category: str
    quantity: int = Field(1, ge=1, le=1_000_000)
    unit: str = "pieces"
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    estimated_price: Optional[float] = Field(None, ge=0, le=1_000_000)
    pickup_slots: Optional[List[dict]] = []


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    waste_category: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=1, le=1_000_000)
    unit: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    estimated_price: Optional[float] = Field(None, ge=0, le=1_000_000)
    status: Optional[str] = None
    pickup_slots: Optional[List[dict]] = None


class ListingResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: Optional[str]
    waste_category: str
    quantity: int
    unit: str
    status: str
    latitude: float
    longitude: float
    address: Optional[str]
    images: list
    estimated_price: Optional[float]
    seller_rating: float
    pickup_slots: Optional[list] = []

    class Config:
        from_attributes = True
