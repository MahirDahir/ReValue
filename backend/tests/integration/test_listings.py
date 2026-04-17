"""
Tests for /api/listings/* endpoints.
Covers CRUD operations, permission enforcement, and status transitions.
"""


LISTING_PAYLOAD = {
    "title": "50 kg of Scrap Metal",
    "description": "Clean, sorted steel and aluminium",
    "waste_category": "metal",
    "quantity": "50",
    "unit": "kg",
    "latitude": "32.0853",
    "longitude": "34.7818",
    "address": "Tel Aviv",
    "estimated_price": "25.0",
}


# ── Create ────────────────────────────────────────────────────────────────────

def test_create_listing_success(client, seller_headers):
    resp = client.post("/api/listings/", data=LISTING_PAYLOAD, headers=seller_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "50 kg of Scrap Metal"
    assert data["waste_category"] == "metal"
    assert data["unit"] == "kg"
    assert data["status"] == "available"
    assert data["quantity"] == 50


def test_create_listing_unauthenticated(client):
    resp = client.post("/api/listings/", data=LISTING_PAYLOAD)
    assert resp.status_code == 403  # FastAPI OAuth2 returns 403 when token is absent


def test_create_listing_missing_required_field(client, seller_headers):
    payload = {k: v for k, v in LISTING_PAYLOAD.items() if k != "waste_category"}
    resp = client.post("/api/listings/", data=payload, headers=seller_headers)
    assert resp.status_code == 422


def test_create_listing_invalid_category(client, seller_headers):
    payload = {**LISTING_PAYLOAD, "waste_category": "bottles"}
    resp = client.post("/api/listings/", data=payload, headers=seller_headers)
    assert resp.status_code == 400


# ── Read ──────────────────────────────────────────────────────────────────────

def test_get_all_listings_empty(client):
    resp = client.get("/api/listings/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_all_listings_returns_created(client, sample_listing):
    resp = client.get("/api/listings/")
    assert resp.status_code == 200
    listings = resp.json()
    assert len(listings) == 1
    assert listings[0]["id"] == sample_listing["id"]


def test_get_listing_by_id(client, sample_listing):
    resp = client.get(f"/api/listings/{sample_listing['id']}")
    assert resp.status_code == 200
    assert resp.json()["title"] == sample_listing["title"]


def test_get_listing_by_nonexistent_id(client):
    resp = client.get("/api/listings/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_get_my_listings(client, seller_headers, sample_listing):
    resp = client.get("/api/listings/mine", headers=seller_headers)
    assert resp.status_code == 200
    listings = resp.json()
    assert len(listings) == 1
    assert listings[0]["id"] == sample_listing["id"]


def test_get_my_listings_unauthenticated(client):
    resp = client.get("/api/listings/mine")
    assert resp.status_code == 403  # FastAPI OAuth2 returns 403 when token is absent


# ── Update ────────────────────────────────────────────────────────────────────

def test_update_own_listing(client, seller_headers, sample_listing):
    resp = client.put(
        f"/api/listings/{sample_listing['id']}",
        json={"title": "Updated Title", "quantity": 75},
        headers=seller_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["quantity"] == 75


def test_update_other_sellers_listing(client, buyer_headers, sample_listing):
    resp = client.put(
        f"/api/listings/{sample_listing['id']}",
        json={"title": "Hijacked"},
        headers=buyer_headers,
    )
    assert resp.status_code == 403


# ── Delete ────────────────────────────────────────────────────────────────────

def test_delete_own_listing(client, seller_headers, sample_listing):
    resp = client.delete(
        f"/api/listings/{sample_listing['id']}", headers=seller_headers
    )
    assert resp.status_code == 200
    # Confirm it's gone
    assert client.get(f"/api/listings/{sample_listing['id']}").status_code == 404


def test_delete_other_sellers_listing(client, buyer_headers, sample_listing):
    resp = client.delete(
        f"/api/listings/{sample_listing['id']}", headers=buyer_headers
    )
    assert resp.status_code == 403


# ── Status transitions ────────────────────────────────────────────────────────

def test_mark_listing_sold(client, seller_headers, sample_listing):
    resp = client.put(
        f"/api/listings/{sample_listing['id']}/status",
        data={"new_status": "sold"},
        headers=seller_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "sold"


def test_mark_listing_sold_by_non_owner(client, buyer_headers, sample_listing):
    resp = client.put(
        f"/api/listings/{sample_listing['id']}/status",
        data={"new_status": "sold"},
        headers=buyer_headers,
    )
    assert resp.status_code == 403


def test_sold_listing_still_visible_to_buyers(client, seller_headers, buyer_headers, sample_listing):
    client.put(
        f"/api/listings/{sample_listing['id']}/status",
        data={"new_status": "sold"},
        headers=seller_headers,
    )
    resp = client.get("/api/listings/")
    ids = [l["id"] for l in resp.json()]
    assert sample_listing["id"] in ids
