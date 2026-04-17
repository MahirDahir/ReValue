"""
Business logic for payments (Stripe-stubbed).
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from models.postgres.user import User
from models.postgres.listing import Listing, ListingStatus
from models.postgres.transaction import Transaction, TransactionStatus
from schemas.payment import PaymentIntentCreate, PaymentIntentResponse


def create_payment_intent(
    db: Session,
    current_user: User,
    payment_data: PaymentIntentCreate,
) -> PaymentIntentResponse:
    listing = db.query(Listing).filter(Listing.id == UUID(payment_data.listing_id)).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is no longer available",
        )

    transaction = Transaction(
        listing_id=listing.id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        agreed_price=payment_data.amount / 100,
        payment_status=TransactionStatus.PENDING,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # In production: create Stripe Payment Intent here
    client_secret = f"pi_mock_{transaction.id}"

    listing.status = ListingStatus.PENDING
    db.commit()

    return PaymentIntentResponse(
        client_secret=client_secret,
        transaction_id=str(transaction.id),
    )


def confirm_payment(db: Session, current_user: User, transaction_id: UUID) -> dict:
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if transaction.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    transaction.payment_status = TransactionStatus.COMPLETED
    transaction.status = TransactionStatus.COMPLETED

    listing = db.query(Listing).filter(Listing.id == transaction.listing_id).first()
    if listing:
        listing.status = ListingStatus.SOLD

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
