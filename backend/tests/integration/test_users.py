def _get_my_id(client, headers):
    return client.get("/api/auth/me", headers=headers).json()["id"]


def test_get_user_profile(client, seller_headers):
    user_id = _get_my_id(client, seller_headers)
    resp = client.get(f"/api/users/{user_id}", headers=seller_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Seller"
    assert "password_hash" not in data


def test_get_user_stats(client, seller_headers):
    user_id = _get_my_id(client, seller_headers)
    resp = client.get(f"/api/users/{user_id}/stats", headers=seller_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "buyer_rating" in data
    assert "seller_rating" in data
    assert "total_transactions" in data


def test_get_nonexistent_user(client, seller_headers):
    resp = client.get("/api/users/00000000-0000-0000-0000-000000000000", headers=seller_headers)
    assert resp.status_code == 404
