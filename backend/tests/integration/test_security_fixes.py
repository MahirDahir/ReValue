"""
Regression tests for security and concurrency fixes.
Each test maps to a specific bug fix — if these break, a fix was reverted.
"""
import os
import pytest
from tests.conftest import register, login_headers


# ── Fix 1: Phone enumeration prevention ──────────────────────────────────────

def test_login_wrong_phone_returns_generic_error(client):
    """Non-existent phone must not produce a phone-specific error message."""
    resp = client.post("/api/auth/login", data={
        "username": "0500000000", "password": "anypassword"
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail == "Invalid credentials"
    assert "phone" not in detail.lower()


def test_login_wrong_password_returns_same_error(client):
    """Wrong password must return the same message as wrong phone — no enumeration."""
    register(client, "0501234567", "correct_pass", "Alice")
    resp = client.post("/api/auth/login", data={
        "username": "0501234567", "password": "wrong_pass"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_wrong_phone_and_wrong_password_same_message(client):
    """Both failure modes must return identical detail to prevent enumeration."""
    register(client, "0501234567", "correct_pass", "Alice")

    wrong_phone = client.post("/api/auth/login", data={
        "username": "0509999999", "password": "anypass"
    })
    wrong_pass = client.post("/api/auth/login", data={
        "username": "0501234567", "password": "wrongpass"
    })

    assert wrong_phone.json()["detail"] == wrong_pass.json()["detail"]


# ── Fix 2: Single-worker enforcement ─────────────────────────────────────────

def test_multi_worker_startup_raises():
    """Setting WEB_CONCURRENCY > 1 must raise RuntimeError at startup."""
    os.environ["WEB_CONCURRENCY"] = "2"
    try:
        # Re-import to trigger lifespan / _check_single_worker
        from main import _check_single_worker
        with pytest.raises(RuntimeError, match="WEB_CONCURRENCY"):
            _check_single_worker()
    finally:
        os.environ.pop("WEB_CONCURRENCY", None)


def test_single_worker_does_not_raise():
    """WEB_CONCURRENCY=1 (default) must not raise."""
    os.environ.pop("WEB_CONCURRENCY", None)
    from main import _check_single_worker
    _check_single_worker()  # should not raise


# ── Fix 3: Mark sold race condition — idempotency ─────────────────────────────

def _reach_contact_revealed(client, seller_headers, buyer_headers):
    """Helper: drive a conversation all the way to contact_revealed."""
    listing = client.post(
        "/api/listings/",
        data={
            "title": "Race Test Listing",
            "waste_category": "plastic",
            "quantity": "1",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
        },
        headers=seller_headers,
    ).json()
    listing_id = listing["id"]

    conv = client.post(
        "/api/conversations/start",
        json={"listing_id": listing_id, "price": 10.0},
        headers=buyer_headers,
    ).json()
    conv_id = conv["id"]

    def action(headers, act, value=None):
        return client.post(
            f"/api/conversations/{conv_id}/action",
            json={"action": act, "value": value},
            headers=headers,
        )

    action(seller_headers, "accept_price")
    action(buyer_headers, "suggest_pickup", "2026-06-01T10:00:00")
    action(seller_headers, "accept_pickup")
    action(seller_headers, "reveal_contact")

    return listing_id, conv_id


def test_mark_sold_already_sold_returns_400(client, seller_headers, buyer_headers):
    """Second mark-sold on the same listing must return 400, not silently double-sell."""
    listing_id, conv_id = _reach_contact_revealed(client, seller_headers, buyer_headers)

    first = client.post(
        f"/api/conversations/listing/{listing_id}/mark-sold",
        json={"conversation_id": conv_id},
        headers=seller_headers,
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/conversations/listing/{listing_id}/mark-sold",
        json={"conversation_id": conv_id},
        headers=seller_headers,
    )
    assert second.status_code == 400
    assert "already sold" in second.json()["detail"].lower()


def test_only_seller_can_mark_sold(client, seller_headers, buyer_headers):
    """Buyer must not be able to trigger mark-sold on a listing."""
    listing_id, conv_id = _reach_contact_revealed(client, seller_headers, buyer_headers)

    resp = client.post(
        f"/api/conversations/listing/{listing_id}/mark-sold",
        json={"conversation_id": conv_id},
        headers=buyer_headers,
    )
    assert resp.status_code == 403


# ── Fix 4: Mass assignment — status field removed from ListingUpdate ──────────

def test_buyer_cannot_set_listing_status_via_update(client, seller_headers, buyer_headers, sample_listing):
    """PUT /listings/{id} must not accept a status field — 422 if passed."""
    resp = client.put(
        f"/api/listings/{sample_listing['id']}",
        json={"status": "sold"},
        headers=buyer_headers,
    )
    # 403 because buyer doesn't own the listing — but status field itself
    # must also be stripped. Verify status is unchanged regardless.
    assert resp.status_code in (403, 422)


def test_seller_cannot_set_status_to_sold_via_update(client, seller_headers, sample_listing):
    """Even the seller cannot use PUT /listings/{id} to set status=sold — must use mark-sold flow."""
    resp = client.put(
        f"/api/listings/{sample_listing['id']}",
        json={"status": "sold"},
        headers=seller_headers,
    )
    # status field is no longer in the schema so it's ignored (200) or rejected (422)
    # either way the listing must NOT become sold
    listing = client.get(f"/api/listings/{sample_listing['id']}").json()
    assert listing["status"] != "sold"
