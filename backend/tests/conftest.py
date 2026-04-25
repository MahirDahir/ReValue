import os
# Must be set before limiter.py / main.py are imported so slowapi skips rate checks in tests
os.environ["RATELIMIT_ENABLED"] = "False"
# Use 4 bcrypt rounds in tests instead of 12 — valid hash, ~60x faster per operation
os.environ["BCRYPT_ROUNDS"] = "4"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")

TEST_PG_URL = f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/revalue_test"


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

test_engine = create_engine(TEST_PG_URL)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Register all models with Base.metadata so create_all works
import models.postgres.user               # noqa
import models.postgres.listing            # noqa
import models.postgres.transaction        # noqa
import models.postgres.rating             # noqa
import models.postgres.conversation       # noqa
import models.postgres.conversation_event # noqa

from db.session import Base, get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def clean_database():
    with test_engine.connect() as conn:
        conn.execute(text(
            "TRUNCATE TABLE conversation_events, conversations, ratings, transactions, listings, users RESTART IDENTITY CASCADE"
        ))
        conn.commit()
    yield


@pytest.fixture(scope="session")
def client():
    from main import app

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


def register(client, phone, password, name):
    return client.post("/api/auth/register", json={
        "phone": phone, "password": password, "name": name
    })


def login_headers(client, phone, password):
    resp = client.post("/api/auth/login", data={
        "username": phone, "password": password
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def seller_headers(client):
    register(client, "0501111111", "password123", "Test Seller")
    return login_headers(client, "0501111111", "password123")


@pytest.fixture
def buyer_headers(client):
    register(client, "0502222222", "password123", "Test Buyer")
    return login_headers(client, "0502222222", "password123")


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
