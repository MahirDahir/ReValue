from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from db.session import get_db
from models.postgres.user import User
from services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from api.deps import get_current_user
from config import get_settings
from schemas.auth import UserRegister, TokenResponse, UserResponse
from limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def _token_response(user: User) -> TokenResponse:
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "phone": user.phone,
            "name": user.name,
            "buyer_rating": user.buyer_rating,
            "seller_rating": user.seller_rating,
            "total_transactions": user.total_transactions,
        },
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone == user_data.phone).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

    new_user = User(
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return _token_response(new_user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_response(user)


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
