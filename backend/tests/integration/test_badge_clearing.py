"""
Regression tests for badge clearing behaviour.

Each test verifies that after a party opens and reads a conversation
(mark_seen), their item-level unseen count drops to 0. This is the layer
that directly drives the card badge on the listings page.

These tests complement the your_turn tests in test_security_fixes.py —
they test the *other* field (unseen) that the card badge now uses.
"""
import pytest
from tests.conftest import register, login_headers


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_listing(client, seller_headers, title="Badge Listing"):
    return client.post(
        "/api/listings/",
        data={
            "title": title,
            "waste_category": "plastic",
            "quantity": "1",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
        },
        headers=seller_headers,
    ).json()


def start_conv(client, buyer_headers, listing_id, price=10.0):
    return client.post(
        "/api/conversations/start",
        json={"listing_id": listing_id, "price": price},
        headers=buyer_headers,
    ).json()


def action(client, headers, conv_id, act, value=None):
    return client.post(
        f"/api/conversations/{conv_id}/action",
        json={"action": act, "value": value},
        headers=headers,
    )


def buyer_unseen(client, buyer_headers, listing_id):
    counts = client.get("/api/conversations/buyer-pending-counts", headers=buyer_headers).json()
    return counts.get(listing_id, {}).get("unseen", 0)


def seller_unseen(client, seller_headers, listing_id):
    counts = client.get("/api/conversations/pending-counts", headers=seller_headers).json()
    return counts.get(listing_id, {}).get("unseen", 0)


def mark_seen(client, headers, conv_id):
    return client.post(f"/api/conversations/{conv_id}/seen", headers=headers)


# ── Buyer badge: clears after mark_seen ──────────────────────────────────────

def test_buyer_unseen_clears_after_seller_declines(client, seller_headers, buyer_headers):
    """Buyer opens conversation after seller declines price — unseen must drop to 0."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "decline_price")

    assert buyer_unseen(client, buyer_headers, listing["id"]) >= 1, \
        "buyer unseen should be >=1 after seller declines"

    mark_seen(client, buyer_headers, conv["id"])

    assert buyer_unseen(client, buyer_headers, listing["id"]) == 0, \
        "buyer unseen must be 0 after opening the conversation"


def test_buyer_unseen_clears_after_seller_counter_offer(client, seller_headers, buyer_headers):
    """Buyer badge clears after opening a conversation where seller sent a counter-offer."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "decline_price")
    action(client, seller_headers, conv["id"], "suggest_price", "8.0")

    assert buyer_unseen(client, buyer_headers, listing["id"]) >= 1

    mark_seen(client, buyer_headers, conv["id"])

    assert buyer_unseen(client, buyer_headers, listing["id"]) == 0


def test_buyer_unseen_clears_after_seller_reveals_contact(client, seller_headers, buyer_headers):
    """Buyer badge clears after opening a conversation where seller shared contact details."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "accept_price")
    action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-08-01T10:00:00")
    action(client, seller_headers, conv["id"], "accept_pickup")
    action(client, seller_headers, conv["id"], "reveal_contact")

    assert buyer_unseen(client, buyer_headers, listing["id"]) >= 1, \
        "buyer unseen should be >=1 after seller reveals contact"

    mark_seen(client, buyer_headers, conv["id"])

    assert buyer_unseen(client, buyer_headers, listing["id"]) == 0, \
        "buyer unseen must be 0 after opening the conversation"


def test_buyer_unseen_clears_after_seller_cancels(client, seller_headers, buyer_headers):
    """Buyer badge clears after opening a conversation the seller cancelled."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "cancel")

    assert buyer_unseen(client, buyer_headers, listing["id"]) >= 1

    mark_seen(client, buyer_headers, conv["id"])

    assert buyer_unseen(client, buyer_headers, listing["id"]) == 0


# ── Seller badge: clears after mark_seen ─────────────────────────────────────

def test_seller_unseen_clears_after_buyer_starts_negotiation(client, seller_headers, buyer_headers):
    """Seller badge clears after opening a conversation where buyer made a price offer."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])

    assert seller_unseen(client, seller_headers, listing["id"]) >= 1, \
        "seller unseen should be >=1 after buyer starts negotiation"

    mark_seen(client, seller_headers, conv["id"])

    assert seller_unseen(client, seller_headers, listing["id"]) == 0, \
        "seller unseen must be 0 after opening the conversation"


def test_seller_unseen_clears_after_buyer_accepts_price(client, seller_headers, buyer_headers):
    """Seller badge clears after buyer accepts seller's counter-offer (PRICE_AGREED)."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "decline_price")
    action(client, seller_headers, conv["id"], "suggest_price", "8.0")
    action(client, buyer_headers, conv["id"], "accept_price")

    assert seller_unseen(client, seller_headers, listing["id"]) >= 1

    mark_seen(client, seller_headers, conv["id"])

    assert seller_unseen(client, seller_headers, listing["id"]) == 0


def test_seller_unseen_clears_after_buyer_suggests_pickup(client, seller_headers, buyer_headers):
    """Seller badge clears after buyer proposes a pickup time."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, seller_headers, conv["id"], "accept_price")
    action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-08-01T10:00:00")

    assert seller_unseen(client, seller_headers, listing["id"]) >= 1

    mark_seen(client, seller_headers, conv["id"])

    assert seller_unseen(client, seller_headers, listing["id"]) == 0


def test_seller_unseen_clears_after_buyer_cancels(client, seller_headers, buyer_headers):
    """Seller badge clears after opening a conversation the buyer cancelled."""
    listing = make_listing(client, seller_headers)
    conv = start_conv(client, buyer_headers, listing["id"])
    action(client, buyer_headers, conv["id"], "cancel")

    assert seller_unseen(client, seller_headers, listing["id"]) >= 1

    mark_seen(client, seller_headers, conv["id"])

    assert seller_unseen(client, seller_headers, listing["id"]) == 0
