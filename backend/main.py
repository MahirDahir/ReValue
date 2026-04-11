from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from config import get_settings
from db import init_db, init_mongo_indexes
from api.routes.auth import router as auth_router
from api.routes.users import router as users_router
from api.routes.listings import router as listings_router
from api.routes.messages import router as messages_router
from api.routes.ratings import router as ratings_router
from api.routes.payments import router as payments_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Marketplace for recycling bottles - connecting sellers and buyers",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize databases on startup"""
    init_db()
    await init_mongo_indexes()
    print(f"[OK] {settings.APP_NAME} started successfully!")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "message": "Welcome to RecycleBottles API",
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Include routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(listings_router, prefix=settings.API_PREFIX)
app.include_router(messages_router, prefix=settings.API_PREFIX)
app.include_router(ratings_router, prefix=settings.API_PREFIX)
app.include_router(payments_router, prefix=settings.API_PREFIX)

# Mount static files for image uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
