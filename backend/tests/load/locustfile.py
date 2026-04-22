"""
Load tests for ReValue API.

Usage:
  cd backend
  locust -f tests/load/locustfile.py --host http://localhost:8000

Open http://localhost:8089 to configure users / spawn rate.
"""

import random
import string
from locust import HttpUser, task, between


def _rand_phone():
    return "07" + "".join(random.choices(string.digits, k=9))


class BuyerUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        phone = _rand_phone()
        r = self.client.post("/api/auth/register", json={"phone": phone, "password": "Test1234!", "name": "Load Buyer"})
        if r.status_code in (200, 201):
            self.token = r.json().get("access_token")

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(5)
    def browse_listings(self):
        self.client.get("/api/listings/", headers=self._headers())

    @task(2)
    def browse_with_filter(self):
        cat = random.choice(["plastic", "glass", "metal", "electronics", "other"])
        self.client.get(f"/api/listings/?waste_category={cat}", headers=self._headers())

    @task(1)
    def view_profile(self):
        self.client.get("/api/auth/me", headers=self._headers())

    @task(1)
    def buyer_pending_counts(self):
        self.client.get("/api/conversations/buyer-pending-counts", headers=self._headers())


class SellerUser(HttpUser):
    wait_time = between(2, 5)
    token = None
    listing_id = None

    def on_start(self):
        phone = _rand_phone()
        r = self.client.post("/api/auth/register", json={"phone": phone, "password": "Test1234!", "name": "Load Seller"})
        if r.status_code in (200, 201):
            self.token = r.json().get("access_token")
            self._create_listing()

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _create_listing(self):
        r = self.client.post(
            "/api/listings/",
            data={
                "title": "Load Test Plastic",
                "waste_category": "plastic",
                "quantity": "10",
                "unit": "kg",
                "latitude": "32.0853",
                "longitude": "34.7818",
            },
            headers=self._headers(),
        )
        if r.status_code in (200, 201):
            self.listing_id = r.json().get("id")

    @task(3)
    def view_my_listings(self):
        self.client.get("/api/listings/?seller_mode=true", headers=self._headers())

    @task(2)
    def pending_counts(self):
        self.client.get("/api/conversations/pending-counts", headers=self._headers())

    @task(1)
    def health(self):
        self.client.get("/health")
