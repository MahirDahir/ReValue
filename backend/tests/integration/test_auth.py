"""
Tests for /api/auth/* endpoints.
Covers registration, login, token validation, and protected route access.
"""


def test_register_success(client):
    resp = client.post("/api/auth/register", json={
        "phone": "0501234567", "password": "secure123", "name": "Alice"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["phone"] == "0501234567"
    assert data["user"]["name"] == "Alice"
    assert "access_token" in data
    assert "password" not in str(data)
    assert "password_hash" not in str(data)


def test_register_duplicate_phone(client):
    payload = {"phone": "0501234567", "password": "secure123", "name": "Alice"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400
    assert "already" in resp.json()["detail"].lower()


def test_register_missing_required_fields(client):
    # Missing password
    resp = client.post("/api/auth/register", json={"phone": "0501234567", "name": "Alice"})
    assert resp.status_code == 422


def test_login_success(client):
    client.post("/api/auth/register", json={
        "phone": "0501234567", "password": "secure123", "name": "Alice"
    })
    resp = client.post("/api/auth/login", data={
        "username": "0501234567", "password": "secure123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "phone": "0501234567", "password": "secure123", "name": "Alice"
    })
    resp = client.post("/api/auth/login", data={
        "username": "0501234567", "password": "wrongpassword"
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/api/auth/login", data={
        "username": "0509999999", "password": "anypassword"
    })
    assert resp.status_code == 401


def test_get_me_authenticated(client, seller_headers):
    resp = client.get("/api/auth/me", headers=seller_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["phone"] == "0501111111"
    assert data["name"] == "Test Seller"


def test_get_me_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403  # FastAPI OAuth2 returns 403 when token is absent


def test_get_me_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer fake.token.here"})
    assert resp.status_code == 401
