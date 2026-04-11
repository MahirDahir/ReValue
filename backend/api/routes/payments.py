from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
import os

from db.postgres_conn import get_db
from models.postgres.user import User
from models.postgres.listing import Listing
from models.postgres.transaction import Transaction, TransactionStatus
from api.middleware.auth import get_current_user
from config import get_settings

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()


class PaymentIntentCreate(BaseModel):
    listing_id: str
    amount: float  # In cents


class PaymentIntentResponse(BaseModel):
    client_secret: str
    transaction_id: str


@router.post("/create-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payment_data: PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe payment intent"""
    # Verify listing exists
    listing = db.query(Listing).filter(Listing.id == UUID(payment_data.listing_id)).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Verify listing is available
    if listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Listing is no longer available")

    # Create transaction
    transaction = Transaction(
        listing_id=listing.id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        agreed_price=payment_data.amount / 100,  # Convert from cents
        payment_status=TransactionStatus.PENDING,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # In production, create Stripe Payment Intent here
    # For POC, return a mock client_secret
    client_secret = f"pi_mock_{transaction.id}"

    # Update listing status to pending
    listing.status = ListingStatus.PENDING
    db.commit()

    return PaymentIntentResponse(
        client_secret=client_secret,
        transaction_id=str(transaction.id),
    )


@router.post("/confirm/{transaction_id}")
def confirm_payment(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm payment and complete transaction"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # Verify current user is the buyer
    if transaction.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Update transaction status
    transaction.payment_status = TransactionStatus.COMPLETED
    transaction.status = TransactionStatus.COMPLETED

    # Update listing status to sold
    listing = db.query(Listing).filter(Listing.id == transaction.listing_id).first()
    if listing:
        listing.status = ListingStatus.SOLD

    # Update user stats
    buyer = db.query(User).filter(User.id == transaction.buyer_id).first()
    seller = db.query(User).filter(User.id == transaction.seller_id).first()

    if buyer:
        buyer.total_transactions += 1
        buyer.total_spent += transaction.agreed_price
    if seller:
        seller.total_transactions += 1
        seller.total_earned += transaction.agreed_price

    db.commit()

    return {"message": "Payment confirmed successfully", "transaction_id": str(transaction.id)}


@router.post("/webhook")
async def stripe_webhook(request: dict):
    """Handle Stripe webhooks (production)"""
    # In production, verify webhook signature and handle events
    # For POC, just return success
    return {"status": "ok"}
