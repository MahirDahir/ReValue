# ReValue — Claude Code Context

## What this project is
A production-targeted marketplace for turning waste into money. Sellers post waste material (plastic, glass, metal, electronics, etc.); buyers collect and pay. Targets iOS App Store + Google Play Store via React Native (future). Currently a React web frontend.

## Tech stack
| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11), uvicorn |
| Database | PostgreSQL via SQLAlchemy (sync) — MongoDB removed |
| Auth | JWT (HS256, 7-day tokens), bcrypt |
| Frontend | React 18 + Vite, component-based, no router |
| Frontend tests | Vitest 2 + React Testing Library + MSW |
| Maps (form) | react-leaflet **v4** — must stay v4, v5 requires React 19 |
| Maps (cards) | OpenStreetMap iframe embed (no API key) |
| Geocoding | Nominatim reverse geocoding (no API key) |
| Images | Cloudinary CDN (prod) / local disk (dev fallback) |
| HTTP client | axios with JWT interceptor (baseURL = /api) |

## Key file locations
```
backend/
  main.py                              # FastAPI app, all routers registered
  entrypoint.sh                        # DB create → alembic upgrade head → uvicorn
  config.py                            # Settings (pydantic-settings)
  api/routes/
    auth.py                            # POST /auth/register, /login, GET /me
    listings.py                        # Listings CRUD + status
    conversations.py                   # Full negotiation state machine + events
    users.py / ratings.py / payments.py
  api/middleware/auth.py               # JWT get_current_user dependency
  models/postgres/
    user.py / listing.py               # Core models
    conversation.py                    # Conversation + ConversationStatus constants
    conversation_event.py              # Event log (actor, event_type, value, timestamp)
  db/postgres_conn.py                  # SQLAlchemy session / get_db / Base
  schemas/
    auth.py / listing.py / conversation.py   # Pydantic v2
  services/
    conversation_service.py            # State machine + event logging + mark-sold
    listing_service.py / user_service.py / rating_service.py / payment_service.py
    image_service.py                   # Cloudinary upload or local disk
  alembic/versions/
    0001_initial_schema.py             # users, listings, transactions, ratings
    0002_conversations.py              # conversations table
    0003_add_price_suggested_by_and_pickup_slots.py
    0004_conversation_events_and_sold_buyer.py  # events, seen_by_*, actual_buyer_id
  uploads/                             # Local image storage (dev only)
  tests/
    conftest.py
    integration/                       # pytest integration tests

web/src/
  App.jsx                              # Slim orchestrator, all view routing via state
  AppContext.jsx                       # token, user, mode, view, error, success
  api/
    client.js                          # axios instance + JWT interceptor
    auth.js / listings.js / conversations.js / users.js
  components/
    Header.jsx                         # Browse + 🤝 Negotiations (badge) + History
    LoginPage.jsx                      # Local error state (not global context)
    RegisterPage.jsx
    ListingsPage.jsx                   # Grid + category/status filters
    ListingCard.jsx                    # Card + Mark Sold buyer picker
    ListingForm.jsx                    # Create + Edit (Leaflet map, pickup slots)
    ConversationView.jsx               # Full timeline + all negotiation actions
    NegotiationsListView.jsx           # Seller: per-listing buyer list
    HistoryView.jsx                    # 3 tabs: Active / Done / Cancelled
    MapPicker.jsx                      # LocationPicker + MapRecenter
  constants/categories.js             # WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS
  hooks/
    useAuth.js                         # login throws (caller handles error display)
    useListings.js                     # listings + pending counts
    useConversation.js                 # conversation state + markSeen + contactsRevealed
    useGeocoding.js                    # Nominatim reverse geocoding cache
  index.css                            # All CSS
```

## Running the project
Everything runs in Docker. Never start services as local processes.

```bash
docker-compose up --build -d          # Build + start (runs migrations automatically)
docker-compose down                   # Stop
docker-compose down -v                # Stop + wipe all data
docker-compose logs -f backend        # Follow backend logs
docker-compose logs -f web
```

Tests still run locally:
```bash
cd backend && source venv/Scripts/activate && pytest -v
cd web && npm test
```

## Architecture decisions & gotchas

### State machine — Conversation
```
price_pending → price_suggested → price_agreed
    → pickup_suggested → pickup_agreed → contact_revealed
    → cancelled (either party, any non-terminal state)
```
- Every transition calls `_log()` → writes a `ConversationEvent` row
- `seen_by_buyer` / `seen_by_seller` booleans on Conversation — flip to False when the other party acts, True when the party opens the conversation (`/seen` endpoint) or fetches contact
- Pending count queries filter `not conv.seen_by_X` — this is what drives the header badge
- `start_with_price` is idempotent: if conversation exists in `price_pending` OR buyer has own `price_suggested`, it re-suggests; otherwise creates new
- **Re-suggest**: both buyer and seller can update their own pending suggestion (price or pickup) at any time without waiting for the other party to respond
- **Cancel**: both buyer and seller can cancel at any non-terminal state (not after `contact_revealed`)

### Mark Sold flow
1. Seller clicks "Mark Sold" → frontend calls `GET /conversations/contacts-revealed/{listing_id}` → returns buyers who reached `contact_revealed`
2. Seller selects the actual buyer → `POST /conversations/listing/{listing_id}/mark-sold` with `conversation_id`
3. Backend: marks listing sold + sets `actual_buyer_id`, cancels all other active conversations with event "Item sold to another buyer"
4. If no buyers reached contact yet, frontend offers "Mark Sold anyway" (plain status change)

### Frontend routing
- No routing library — `view` state in AppContext drives rendering
- Views: `login`, `register`, `listings`, `create`, `edit`, `conversation`, `negotiations`, `history`
- `openConversationFromHistory` reconstructs a minimal listing proxy `{id, title}` so ConversationView has context when opened from History

### Auth error handling
- `useAuth.login` throws — it does NOT catch. Each form (LoginPage) owns its local error state.
- Global `setError` is only for non-auth, non-form errors (listings, actions, etc.)

### Polling
- Seller: `loadSellerUnreadCounts` every 4s when on listings view
- Buyer: `loadListings` every 5s + `loadBuyerPendingCounts` every 4s
- Open conversation: `loadConversation` every 4s (in `useConversation`)
- All interval callbacks use refs for stale-closure safety

### Backend route ordering
- In `conversations.py`: `/pending-counts`, `/buyer-pending-counts`, `/mine`, `/my-for-listing/{id}`, `/listing/{id}`, `/contacts-revealed/{id}` must all be declared **before** `/{conv_id}` to prevent FastAPI swallowing them as UUID params.

### Default map location
Tel Aviv, Israel: `latitude: 32.0853, longitude: 34.7818`

### Images
- `image_service.py` checks `CLOUDINARY_URL` env var — uses Cloudinary if set, local `/uploads/` otherwise
- `docker-compose.yml` does not pass `CLOUDINARY_URL` → dev always uses local disk (intentional)

## Data models

### Conversation
| Field | Notes |
|---|---|
| status | price_pending → price_suggested → price_agreed → pickup_suggested → pickup_agreed → contact_revealed / cancelled |
| price_suggested_by | UUID — who made the last price offer (blocks Accept on the suggester) |
| pickup_suggested_by | UUID — who made the last pickup suggestion |
| seen_by_buyer / seen_by_seller | Boolean — False = unread update waiting |

### ConversationEvent
| Field | Notes |
|---|---|
| event_type | negotiation_started, price_suggested, price_accepted, price_declined, pickup_suggested, pickup_accepted, contact_revealed, cancelled |
| actor_name | Denormalised name for display (no join needed) |
| value | Price amount, ISO datetime, or cancel reason |

### Listing
| Field | Notes |
|---|---|
| waste_category | plastic, glass, metal, electronics, other |
| unit | kg, pieces |
| pickup_slots | JSON array: `[{"day": "monday", "start": "09:00", "end": "17:00"}]` |
| actual_buyer_id | Set when seller confirms who bought via mark-sold flow |

## Non-functional features
- Rate limiting: `/auth/register` 10/min, `/auth/login` 20/min, all routes 200/min (slowapi)
- Structured JSON logging (structlog) — request method, path, status, duration_ms, ip per request
- Sentry error tracking (opt-in via SENTRY_DSN env var)
- DB connection pool: pool_size=5, max_overflow=10, pool_pre_ping, pool_recycle=1800
- 4 uvicorn workers, `restart: always` in Docker Compose
- Upload atomicity: if DB commit fails after image upload, local files are cleaned up
- Load tests: `backend/tests/load/locustfile.py` (locust)

## Rate limiter module
`backend/limiter.py` is a standalone module that exports `limiter`. Import from there — NOT from `main.py` — to avoid circular imports. `main.py` and `auth.py` both import from `limiter.py`.

## Current feature set
- Auth: register / login (phone + password), inline error on login failure
- Mode toggle: Buyer ↔ Seller (persisted in localStorage)
- Listings: create (Leaflet map + image upload + pickup slots), edit, delete, reactivate
- Negotiation: full state machine with event timeline, price + pickup back-and-forth, contact reveal
- Re-suggest: both parties can update their own pending price/pickup suggestion while waiting
- Withdraw: both buyer and seller can cancel at any non-terminal state
- Notifications: per-listing and header badge counts, clear on view
- Mark Sold: buyer selector (only buyers who got contact), auto-cancels others
- History: 3 tabs (Active / Done / Cancelled), filtered by current mode (buying vs selling), rows re-open conversation
- Seller: per-listing negotiations list with "Action needed" badge
- Buyer: negotiate button with pending count badge per listing
