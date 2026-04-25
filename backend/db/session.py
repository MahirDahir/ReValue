from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

# Railway (and most PaaS) inject DATABASE_URL; fall back to individual vars
_url = settings.DATABASE_URL or (
    f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)
# SQLAlchemy requires postgresql:// not postgres:// (common Railway quirk)
DATABASE_URL = _url.replace("postgres://", "postgresql://", 1) if _url.startswith("postgres://") else _url

engine = create_engine(
    DATABASE_URL,
    pool_size=5,           # persistent connections per worker process
    max_overflow=10,       # burst connections above pool_size
    pool_pre_ping=True,    # test connection liveness before use (handles cloud PG idle timeouts)
    pool_recycle=1800,     # recycle connections every 30 min
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session in FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database connection - schema is managed by Alembic migrations"""
    pass
