"""
Shared fixtures for all tests.

Uses a separate PostgreSQL database (revalue_test) and a separate
MongoDB database (revalue_test) so tests never touch production data.

The TestClient is session-scoped (one event loop for all tests) to avoid
Motor AsyncIOMotorClient clashing with a new event loop on each test.

Each test still gets a clean slate — all tables are truncated before every test.
"""

import os
import pytest
import pymongo
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ── Connection settings ───────────────────────────────────────────────────────
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

TEST_PG_URL = f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/revalue_test"
TEST_MONGO_DB_NAME = "revalue_test"


# ── Create test PostgreSQL database if it doesn't exist ──────────────────────
def _ensure_test_db_exists():
    master_url = f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/postgres"
    master_engine = create_engine(master_url, isolation_level="AUTOCOMMIT")
    with master_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'revalue_test'")
        ).fetchone()
        if not exists:
            conn.execute(text("CREATE DATABASE revalue_test"))
    master_engine.dispose()


_ensure_test_db_exists()

# ── SQLAlchemy test engine ────────────────────────────────────────────────────
test_engine = create_engine(TEST_PG_URL)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# pymongo sync client — used only for MongoDB cleanup between tests
_sync_mongo = pymongo.MongoClient(MONGO_URI)
_sync_test_db = _sync_mongo[TEST_MONGO_DB_NAME]

# ── Register all models with Base.metadata ────────────────────────────────────
import models.postgres.user        # noqa
import models.postgres.listing     # noqa
import models.postgres.transaction # noqa
import models.postgres.rating      # noqa

from db.postgres_conn import Base, get_db
from db.mongo_conn import get_mongo_db


# ── Create all tables once per session, drop at the end ──────────────────────
@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=test_engine)   # always start from clean schema
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


# ── Wipe all rows + MongoDB messages before every test ───────────────────────
@pytest.fixture(autouse=True)
def clean_database():
    with test_engine.connect() as conn:
        conn.execute(text(
            "TRUNCATE TABLE ratings, transactions, listings, users RESTART IDENTITY CASCADE"
        ))
        conn.commit()
    _sync_test_db.messages.drop()
    yield


# ── Single TestClient for the whole session ───────────────────────────────────
# Session scope avoids the "Event loop is closed" error that happens when
# Motor's async client is torn down and recreated on every test.
@pytest.fixture(scope="session")
def client():
    from motor.motor_asyncio import AsyncIOMotorClient
    from main import app

    # Create Motor test client here (inside the session, bound to its event loop)
    _test_motor_client = AsyncIOMotorClient(MONGO_URI)
    _test_mongo_db = _test_motor_client[TEST_MONGO_DB_NAME]

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    def override_get_mongo_db():
        return _test_mongo_db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_mongo_db] = override_get_mongo_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    _test_motor_client.close()
    app.dependency_overrides.clear()


# ── Auth helpers ──────────────────────────────────────────────────────────────
def register(client, phone, password, name):
    return client.post("/api/auth/register", json={
        "phone": phone, "password": password, "name": name
    })


def login_headers(client, phone, password):
    resp = client.post("/api/auth/login", data={
        "username": phone, "password": password
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Reusable user fixtures ────────────────────────────────────────────────────
@pytest.fixture
def seller_headers(client):
    register(client, "0501111111", "password123", "Test Seller")
    return login_headers(client, "0501111111", "password123")


@pytest.fixture
def buyer_headers(client):
    register(client, "0502222222", "password123", "Test Buyer")
    return login_headers(client, "0502222222", "password123")


# ── Reusable listing fixture ──────────────────────────────────────────────────
@pytest.fixture
def sample_listing(client, seller_headers):
    resp = client.post(
        "/api/listings/",
        data={
            "title": "50 kg of Plastic Waste",
            "description": "Clean, sorted plastic",
            "waste_category": "plastic",
            "quantity": "50",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
            "address": "Tel Aviv",
            "estimated_price": "10.0",
        },
        headers=seller_headers,
    )
    assert resp.status_code == 201, f"Listing creation failed: {resp.text}"
    return resp.json()
