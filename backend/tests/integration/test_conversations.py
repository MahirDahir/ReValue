"""
Integration tests for the negotiation state machine.
"""
import pytest
from tests.conftest import register, login_headers


# ── helpers ──────────────────────────────────────────────────────────────────

def _listing_no_price(client, headers):
    resp = client.post(
        "/api/listings/",
        data={
            "title": "No-price Plastic",
            "waste_category": "plastic",
            "quantity": "10",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _listing_with_price(client, headers, price="20.0"):
    resp = client.post(
        "/api/listings/",
        data={
            "title": "Fixed-price Plastic",
            "waste_category": "plastic",
            "quantity": "5",
            "unit": "kg",
            "latitude": "32.0853",
            "longitude": "34.7818",
            "estimated_price": price,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _start(client, buyer_headers, listing_id, price=15.0):
    resp = client.post("/api/conversations/start", json={"listing_id": listing_id, "price": price})
    # must use buyer token
    resp = client.post(
        "/api/conversations/start",
        json={"listing_id": listing_id, "price": price},
        headers=buyer_headers,
    )
    assert resp.status_code in (200, 201)
    return resp.json()


def _action(client, headers, conv_id, action, value=None):
    resp = client.post(
        f"/api/conversations/{conv_id}/action",
        json={"action": action, "value": value},
        headers=headers,
    )
    return resp


# ── tests ────────────────────────────────────────────────────────────────────

class TestNegotiationFullFlow:
    def test_buyer_suggest_seller_accept_price(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 15.0)
        assert conv["status"] == "price_suggested"
        assert conv["suggested_price"] == 15.0

        r = _action(client, seller_headers, conv["id"], "accept_price")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "price_agreed"
        assert data["agreed_price"] == 15.0

    def test_fixed_price_listing_skips_price_negotiation(self, client, seller_headers, buyer_headers):
        listing = _listing_with_price(client, seller_headers, "20.0")
        conv = _start(client, buyer_headers, listing["id"], 20.0)
        assert conv["status"] == "price_agreed"
        assert conv["agreed_price"] == 20.0

    def test_seller_declines_and_counter(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 5.0)

        r = _action(client, seller_headers, conv["id"], "decline_price")
        assert r.status_code == 200
        assert r.json()["status"] == "price_pending"

        r = _action(client, seller_headers, conv["id"], "suggest_price", "12.0")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "price_suggested"
        assert data["suggested_price"] == 12.0

        r = _action(client, buyer_headers, conv["id"], "accept_price")
        assert r.status_code == 200
        assert r.json()["agreed_price"] == 12.0

    def test_buyer_updates_own_pending_offer(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        assert conv["status"] == "price_suggested"

        # Buyer re-suggests while waiting
        r = _action(client, buyer_headers, conv["id"], "suggest_price", "12.0")
        assert r.status_code == 200
        data = r.json()
        assert data["suggested_price"] == 12.0
        assert data["status"] == "price_suggested"

    def test_cannot_accept_own_offer(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)

        r = _action(client, buyer_headers, conv["id"], "accept_price")
        assert r.status_code == 403

    def test_pickup_negotiation(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")

        r = _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        assert r.status_code == 200
        assert r.json()["status"] == "pickup_suggested"

        r = _action(client, seller_headers, conv["id"], "accept_pickup")
        assert r.status_code == 200
        assert r.json()["status"] == "pickup_agreed"

    def test_pickup_counter(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")

        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        r = _action(client, seller_headers, conv["id"], "suggest_pickup", "2026-06-02T14:00:00")
        assert r.status_code == 200
        data = r.json()
        assert data["suggested_pickup"] == "2026-06-02T14:00:00"

    def test_buyer_update_own_pickup(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")

        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        r = _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-03T09:00:00")
        assert r.status_code == 200
        assert r.json()["suggested_pickup"] == "2026-06-03T09:00:00"

    def test_contact_reveal_completes_deal(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")
        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        _action(client, seller_headers, conv["id"], "accept_pickup")
        r = _action(client, seller_headers, conv["id"], "reveal_contact")
        assert r.status_code == 200
        assert r.json()["status"] == "contact_revealed"

    def test_only_seller_can_reveal_contact(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")
        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        _action(client, seller_headers, conv["id"], "accept_pickup")
        r = _action(client, buyer_headers, conv["id"], "reveal_contact")
        assert r.status_code == 403


class TestCancellation:
    def test_seller_can_cancel(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        r = _action(client, seller_headers, conv["id"], "cancel")
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_buyer_can_cancel(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        r = _action(client, buyer_headers, conv["id"], "cancel")
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_seller_gets_unread_notification_on_buyer_cancel(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, buyer_headers, conv["id"], "cancel")
        r = client.get(f"/api/conversations/{conv['id']}", headers=seller_headers)
        assert r.json()["seen_by_seller"] is False

    def test_cannot_act_after_cancel(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, buyer_headers, conv["id"], "cancel")
        r = _action(client, seller_headers, conv["id"], "accept_price")
        assert r.status_code == 400

    def test_cannot_cancel_after_contact_revealed(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")
        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        _action(client, seller_headers, conv["id"], "accept_pickup")
        _action(client, seller_headers, conv["id"], "reveal_contact")
        r = _action(client, seller_headers, conv["id"], "cancel")
        assert r.status_code == 400

    def test_canceller_can_reopen(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, buyer_headers, conv["id"], "cancel")
        # buyer cancelled — buyer can reopen
        r = _action(client, buyer_headers, conv["id"], "reopen")
        assert r.status_code == 200
        assert r.json()["status"] == "price_pending"

    def test_non_canceller_cannot_reopen(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, buyer_headers, conv["id"], "cancel")
        # buyer cancelled — seller cannot reopen
        r = _action(client, seller_headers, conv["id"], "reopen")
        assert r.status_code == 403

    def test_cannot_reopen_non_cancelled(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        r = _action(client, seller_headers, conv["id"], "reopen")
        assert r.status_code == 400


class TestMarkSold:
    def test_mark_sold_to_buyer(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")
        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        _action(client, seller_headers, conv["id"], "accept_pickup")
        _action(client, seller_headers, conv["id"], "reveal_contact")

        r = client.post(
            f"/api/conversations/listing/{listing['id']}/mark-sold",
            json={"conversation_id": conv["id"]},
            headers=seller_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert "actual_buyer_id" in data

    def test_only_seller_can_mark_sold(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")
        _action(client, buyer_headers, conv["id"], "suggest_pickup", "2026-06-01T10:00:00")
        _action(client, seller_headers, conv["id"], "accept_pickup")
        _action(client, seller_headers, conv["id"], "reveal_contact")

        r = client.post(
            f"/api/conversations/listing/{listing['id']}/mark-sold",
            json={"conversation_id": conv["id"]},
            headers=buyer_headers,
        )
        assert r.status_code == 403


class TestEventTimeline:
    def test_events_recorded(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)
        _action(client, seller_headers, conv["id"], "accept_price")

        r = client.get(f"/api/conversations/{conv['id']}", headers=buyer_headers)
        assert r.status_code == 200
        events = r.json()["events"]
        event_types = [e["event_type"] for e in events]
        assert "negotiation_started" in event_types
        assert "price_suggested" in event_types
        assert "price_accepted" in event_types


class TestSeenNotifications:
    def test_mark_seen_clears_flag(self, client, seller_headers, buyer_headers):
        listing = _listing_no_price(client, seller_headers)
        conv = _start(client, buyer_headers, listing["id"], 10.0)

        # Conv should have seen_by_seller=False (buyer just suggested price)
        r = client.get(f"/api/conversations/{conv['id']}", headers=seller_headers)
        assert r.json()["seen_by_seller"] is False

        # Seller marks seen
        r = client.post(f"/api/conversations/{conv['id']}/seen", headers=seller_headers)
        assert r.status_code == 200
        assert r.json()["seen_by_seller"] is True
