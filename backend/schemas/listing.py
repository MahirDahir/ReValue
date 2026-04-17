from pydantic import BaseModel
from typing import Optional


class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    waste_category: str
    quantity: int = 1
    unit: str = "pieces"
    latitude: float
    longitude: float
    address: Optional[str] = None
    estimated_price: Optional[float] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    waste_category: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
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

    class Config:
        from_attributes = True
