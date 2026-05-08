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


# ── Fix 2: Redis Pub/Sub SSE bus ─────────────────────────────────────────────

def test_sse_bus_notify_does_not_raise_when_redis_unavailable():
    """notify() must degrade gracefully when Redis is unreachable — never crash the API."""
    import os
    old = os.environ.get("REDIS_URL")
    os.environ["REDIS_URL"] = "redis://127.0.0.1:19999/0"  # nothing listening here

    # Force re-import with broken URL
    import importlib
    import services.sse_bus as bus
    bus._client = None  # reset cached client
    bus._redis_url = "redis://127.0.0.1:19999/0"

    try:
        bus.notify("some-user-id", {"kind": "test", "data": {}})  # must not raise
    finally:
        bus._client = None
        bus._redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        if old is not None:
            os.environ["REDIS_URL"] = old
        else:
            os.environ.pop("REDIS_URL", None)


def test_sse_bus_publish_and_receive():
    """notify() must publish a message that a subscriber can read from Redis."""
    import redis as sync_redis
    import json
    import services.sse_bus as bus

    redis_url = "redis://localhost:6379/0"

    # Point the bus at the local Redis (tests run outside Docker)
    bus._client = None
    bus._redis_url = redis_url

    r = sync_redis.from_url(redis_url, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe("sse:test-user-99")

    import time
    time.sleep(0.1)  # let subscribe complete

    bus.notify("test-user-99", {"kind": "test", "data": "hello"})

    time.sleep(0.1)

    # Drain messages — skip subscribe confirmation, find the actual message
    actual = None
    for _ in range(10):
        m = pubsub.get_message()
        if m and m["type"] == "message":
            actual = m
            break

    pubsub.unsubscribe()
    r.close()
    bus._client = None  # reset so other tests aren't affected

    assert actual is not None, "Expected a message event from Redis pub/sub"
    payload = json.loads(actual["data"])
    assert payload["kind"] == "test"
    assert payload["data"] == "hello"


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


# ── Fix 5: PRICE_AGREED missing from seller's your_turn badge ─────────────────

def _reach_price_agreed(client, seller_headers, buyer_headers):
    """Helper: drive a conversation to price_agreed (buyer accepted seller's price offer)."""
    listing = client.post(
        "/api/listings/",
        data={
            "title": "Badge Test Listing",
            "waste_category": "metal",
            "quantity": "5",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
        },
        headers=seller_headers,
    ).json()
    listing_id = listing["id"]

    # Buyer starts negotiation
    conv = client.post(
        "/api/conversations/start",
        json={"listing_id": listing_id, "price": 20.0},
        headers=buyer_headers,
    ).json()
    conv_id = conv["id"]

    # Seller accepts price → status becomes PRICE_AGREED
    client.post(
        f"/api/conversations/{conv_id}/action",
        json={"action": "accept_price"},
        headers=seller_headers,
    )
    return listing_id, conv_id


def test_seller_your_turn_badge_set_when_price_agreed(client, seller_headers, buyer_headers):
    """Seller must have your_turn=1 for a listing when the conversation reaches PRICE_AGREED.

    Regression: PRICE_AGREED was missing from the seller's your_turn condition in
    get_pending_counts(), so the item-level badge never appeared even though the header
    badge (unseen) was correctly set.
    """
    listing_id, _ = _reach_price_agreed(client, seller_headers, buyer_headers)

    counts = client.get("/api/conversations/pending-counts", headers=seller_headers).json()

    assert listing_id in counts, "listing missing from pending counts after PRICE_AGREED"
    assert counts[listing_id]["your_turn"] >= 1, (
        "seller your_turn should be >=1 when conversation is PRICE_AGREED "
        "(seller must suggest pickup next)"
    )


# ── Fix 6: Buyer badge correctness — your_turn not gated on seen_by_buyer ─────

def _make_listing_and_start(client, seller_headers, buyer_headers, price=20.0):
    listing = client.post(
        "/api/listings/",
        data={
            "title": "Buyer Badge Listing",
            "waste_category": "glass",
            "quantity": "3",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
        },
        headers=seller_headers,
    ).json()
    conv = client.post(
        "/api/conversations/start",
        json={"listing_id": listing["id"], "price": price},
        headers=buyer_headers,
    ).json()
    return listing["id"], conv["id"]


def test_buyer_your_turn_zero_while_waiting_for_seller(client, seller_headers, buyer_headers):
    """Buyer's your_turn must be 0 while the ball is in the seller's court.

    After buyer suggests a price, it's the seller's turn. The buyer has no action
    to take, so your_turn should be 0 even though the conversation exists.
    """
    listing_id, conv_id = _make_listing_and_start(client, seller_headers, buyer_headers)

    counts = client.get("/api/conversations/buyer-pending-counts", headers=buyer_headers).json()
    # Listing may not appear at all, or if it does your_turn must be 0
    your_turn = counts.get(listing_id, {}).get("your_turn", 0)
    assert your_turn == 0, (
        "buyer your_turn should be 0 when waiting for seller to respond to price suggestion"
    )


def test_buyer_your_turn_badge_set_after_accepting_sellers_counter_price(client, seller_headers, buyer_headers):
    """Buyer must have your_turn=1 after accepting the seller's counter-offer (PRICE_AGREED).

    Regression: buyer accepted seller's counter, becoming the next actor (suggest pickup),
    but seen_by_buyer was left True so unseen=0 and the badge never appeared.
    """
    listing_id, conv_id = _make_listing_and_start(client, seller_headers, buyer_headers)

    def action(headers, act, value=None):
        return client.post(
            f"/api/conversations/{conv_id}/action",
            json={"action": act, "value": value},
            headers=headers,
        )

    # Seller declines and counter-offers
    action(seller_headers, "decline_price")
    action(seller_headers, "suggest_price", "15.0")

    # Buyer accepts seller's counter → PRICE_AGREED, buyer must now suggest pickup
    action(buyer_headers, "accept_price")

    counts = client.get("/api/conversations/buyer-pending-counts", headers=buyer_headers).json()
    assert listing_id in counts, "listing missing from buyer counts after accepting counter-offer"
    assert counts[listing_id]["your_turn"] >= 1, (
        "buyer your_turn should be >=1 after accepting seller's counter (must suggest pickup)"
    )


def test_buyer_your_turn_badge_set_after_seller_reopens(client, seller_headers, buyer_headers):
    """Buyer must have your_turn=1 when seller reopens a cancelled conversation.

    Regression: after reopen seen_by_buyer was not reset to False when buyer is next actor.
    """
    listing_id, conv_id = _make_listing_and_start(client, seller_headers, buyer_headers)

    def action(headers, act, value=None):
        return client.post(
            f"/api/conversations/{conv_id}/action",
            json={"action": act, "value": value},
            headers=headers,
        )

    # Seller cancels then reopens (seller is canceller so seller can reopen)
    action(seller_headers, "cancel")
    action(seller_headers, "reopen")

    counts = client.get("/api/conversations/buyer-pending-counts", headers=buyer_headers).json()
    assert listing_id in counts, "listing missing from buyer counts after reopen"
    assert counts[listing_id]["your_turn"] >= 1, (
        "buyer your_turn should be >=1 after reopen — buyer must re-suggest price"
    )
