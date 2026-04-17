from pydantic import BaseModel


class PaymentIntentCreate(BaseModel):
    listing_id: str
    amount: float  # In cents


class PaymentIntentResponse(BaseModel):
    client_secret: str
    transaction_id: str
