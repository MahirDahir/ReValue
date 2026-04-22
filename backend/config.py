from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import sys


_INSECURE_DEFAULTS = {"your-secret-key-change-in-production", "replace-with-a-strong-secret-key-at-least-32-chars"}


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ReValue"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # PostgreSQL — individual vars (local/Docker Compose)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "revalue"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # PostgreSQL — single URL (Railway/PaaS overrides individual vars above)
    DATABASE_URL: Optional[str] = None

    # File Upload
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "webp"}
    UPLOAD_DIR: str = "uploads"

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Cloudinary (image storage — set in production, leave empty for local disk)
    CLOUDINARY_URL: str = ""

    # Sentry (error tracking — set in production, leave empty to disable)
    SENTRY_DSN: str = ""

    # Maps
    MAPS_API_KEY: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    if not s.DEBUG and s.SECRET_KEY in _INSECURE_DEFAULTS:
        print("FATAL: SECRET_KEY is not set. Set a strong SECRET_KEY before running in production.", file=sys.stderr)
        sys.exit(1)
    return s
