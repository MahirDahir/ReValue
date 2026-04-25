import time
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
import os

from config import get_settings
from logging_config import configure_logging
from db import init_db
from api.routes.auth import router as auth_router
from api.routes.users import router as users_router
from api.routes.listings import router as listings_router
from api.routes.ratings import router as ratings_router
from api.routes.payments import router as payments_router
from api.routes.conversations import router as conversations_router
from api.routes.events import router as events_router

settings = get_settings()

configure_logging(settings.DEBUG)
log = structlog.get_logger()

# Sentry — only initialised when SENTRY_DSN is set
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.1,
        environment="development" if settings.DEBUG else "production",
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("startup", app=settings.APP_NAME)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Marketplace for recycling waste — connecting sellers and buyers",
    version="1.0.0",
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.middleware("http")
async def request_logging(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    log.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
        ip=request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown"),
    )
    return response



@app.get("/")
def root():
    return {"name": settings.APP_NAME, "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


app.include_router(auth_router,          prefix=settings.API_PREFIX)
app.include_router(users_router,         prefix=settings.API_PREFIX)
app.include_router(listings_router,      prefix=settings.API_PREFIX)
app.include_router(ratings_router,       prefix=settings.API_PREFIX)
app.include_router(payments_router,      prefix=settings.API_PREFIX)
app.include_router(conversations_router, prefix=settings.API_PREFIX)
app.include_router(events_router,        prefix=settings.API_PREFIX)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
