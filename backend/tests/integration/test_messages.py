"""
Tests for /api/messages/* endpoints.
Covers sending messages, reading chat history, and unread counts.
"""


def _send_message(client, listing_id, receiver_id, content, headers):
    return client.post("/api/messages/", json={
        "listing_id": listing_id,
        "receiver_id": receiver_id,
        "content": content,
    }, headers=headers)


def _get_seller_id(client, seller_headers):
    return client.get("/api/auth/me", headers=seller_headers).json()["id"]


def _get_buyer_id(client, buyer_headers):
    return client.get("/api/auth/me", headers=buyer_headers).json()["id"]


# ── Send message ──────────────────────────────────────────────────────────────

def test_send_message_success(client, seller_headers, buyer_headers, sample_listing):
    seller_id = _get_seller_id(client, seller_headers)
    resp = _send_message(
        client, sample_listing["id"], seller_id,
        "Hi, is this still available?", buyer_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["content"] == "Hi, is this still available?"
    assert data["listing_id"] == sample_listing["id"]


def test_send_message_unauthenticated(client, seller_headers, sample_listing):
    seller_id = _get_seller_id(client, seller_headers)
    resp = _send_message(
        client, sample_listing["id"], seller_id,
        "Hi!", headers={}
    )
    assert resp.status_code == 403  # FastAPI OAuth2 returns 403 when token is absent


def test_send_message_to_nonexistent_listing(client, seller_headers, buyer_headers):
    seller_id = _get_seller_id(client, seller_headers)
    resp = _send_message(
        client, "00000000-0000-0000-0000-000000000000", seller_id,
        "Hello?", buyer_headers
    )
    assert resp.status_code == 404


# ── Read messages ─────────────────────────────────────────────────────────────

def test_get_chat_messages(client, seller_headers, buyer_headers, sample_listing):
    seller_id = _get_seller_id(client, seller_headers)
    _send_message(client, sample_listing["id"], seller_id, "Message 1", buyer_headers)
    _send_message(client, sample_listing["id"], seller_id, "Message 2", buyer_headers)

    resp = client.get(
        f"/api/messages/listing/{sample_listing['id']}",
        headers=buyer_headers,
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 2
    assert messages[0]["content"] == "Message 1"
    assert messages[1]["content"] == "Message 2"


# ── Unread count ──────────────────────────────────────────────────────────────

def test_unread_count_increases_after_message(client, seller_headers, buyer_headers, sample_listing):
    seller_id = _get_seller_id(client, seller_headers)

    # Before any messages — unread count for seller should be 0
    resp = client.get(
        f"/api/messages/listing/{sample_listing['id']}/unread-count",
        headers=seller_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["count"] == 0

    # Buyer sends a message to seller
    _send_message(client, sample_listing["id"], seller_id, "Are you there?", buyer_headers)

    # Seller's unread count should now be 1
    resp = client.get(
        f"/api/messages/listing/{sample_listing['id']}/unread-count",
        headers=seller_headers,
    )
    assert resp.json()["count"] == 1
