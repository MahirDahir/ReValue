from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from db.postgres_conn import get_db
from models.postgres.user import User
from api.middleware.auth import get_current_user
from schemas.payment import PaymentIntentCreate, PaymentIntentResponse
import services.payment_service as payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-intent", response_model=PaymentIntentResponse)
def create_payment_intent(
    payment_data: PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return payment_service.create_payment_intent(db, current_user, payment_data)


@router.post("/confirm/{transaction_id}")
def confirm_payment(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return payment_service.confirm_payment(db, current_user, transaction_id)


@router.post("/webhook")
async def stripe_webhook(request: dict):
    # In production: verify webhook signature and handle events
    return {"status": "ok"}
