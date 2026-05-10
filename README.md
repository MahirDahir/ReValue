# ReValue

A marketplace for turning waste into money — sellers post waste material (plastic, glass, metal, electronics, and more); buyers collect and pay. Structured negotiation flow, no free-text chat.

## Features

- **Phone-based Auth** — register and login with phone number + password; inline error on failure
- **Buyer / Seller Toggle** — switch modes with one click; green theme for buyers, blue for sellers
- **Listings** — create with photo upload (JPG/PNG/WEBP, max 5 MB), Leaflet map picker, waste category, quantity, optional flat price or weight-based pricing (₪/kg), pickup availability slots
- **Weight-based Pricing** — listings can specify `quantity_kg` (total weight) and `price_per_kg` (₪/kg) in addition to or instead of a flat price; ListingForm shows a live total estimate; ListingCard shows a ₪X/kg badge
- **Location** — reverse-geocoded address display + OpenStreetMap embed on each card (no API key needed)
- **Structured Negotiation** — price offer → pickup time → contact reveal (no free-text chat)
- **Re-suggest** — both buyer and seller can update their own pending price or pickup suggestion at any time without waiting for the other party to respond first
- **Full Event Timeline** — every negotiation step logged with actor name and timestamp; full history visible in the conversation view
- **Real-time Updates** — all polling replaced by Server-Sent Events; seller/buyer counts and open conversation views update instantly
- **Live Notification Badges** — header "🤝 Negotiations" button shows pending-action count; per-listing badges on the grid; badges clear when you open the conversation
- **History View** — six tabs: All / Your turn / Waiting / Negotiated / Sold / Cancelled; filtered by buying/selling mode; each row re-opens the conversation
- **Mark Sold with Buyer Selector** — seller picks the actual buyer from buyers who received contact details; others are auto-notified and cancelled
- **Business Profiles** — sellers can set a public `business_name` and `business_type` (contractor/dealer/factory/other); business name appears on listing cards instead of personal name; `is_verified` flag on user
- **Seller Negotiations List** — per-listing buyer list with action-needed badge
- **Hebrew + English i18n** — full multilingual support via react-i18next; language toggle (globe icon) in the Header; RTL layout for Hebrew; language persisted in localStorage
- **Rate Limiting** — slowapi: `/auth/register` 10/min, `/auth/login` 20/min, `/listings/` 60/min, `/listings/{id}` 120/min, `/conversations/contact` 20/min
- **Structured Logging** — structlog JSON logs per request (method, path, status, duration_ms, ip)
- **Sentry** — opt-in error tracking via `SENTRY_DSN` env var
- **Waste Categories** — Plastic, Glass, Metal, Electronics, Other
- **Docker Compose** — one command to run everything locally
- **Railway deployment** — see `DEPLOY_RAILWAY.md`
- **Cloudinary images** — uploads stored on Cloudinary CDN in production, local disk in dev

## Negotiation Flow

```
Buyer opens negotiation → enters price offer
    ↓
[price_pending] ←─────────────────────────────────┐
    ↓ buyer or seller suggests price               │
[price_suggested]                                  │
    ↓ other party accepts / declines ──────────────┘
[price_agreed]
    ↓ either party suggests pickup time
[pickup_suggested] ←──────────────────────────────┐
    ↓ other party accepts / counter-suggests ──────┘
[pickup_agreed]
    ↓ seller shares phone
[contact_revealed]  →  buyer views seller's phone
```

Every transition is logged in the conversation timeline. Either party can cancel at any non-terminal state. Both parties can re-suggest their own pending price or pickup without the other party acting first.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (SQLAlchemy ORM + Alembic migrations)
- **Auth**: JWT (HS256, 7-day tokens) + bcrypt
- **Images**: Cloudinary CDN (prod) / local disk (dev)
- **Real-time**: Server-Sent Events via asyncio in-memory pub/sub (`sse_bus.py`) — requires single uvicorn worker
- **Rate limiting**: slowapi
- **Logging**: structlog (JSON, per-request)
- **Error tracking**: Sentry (opt-in via `SENTRY_DSN`)
- **Payments**: Stripe *(stubbed)*

### Web Frontend
- **Framework**: React 18 + Vite (no routing library — view state drives rendering)
- **i18n**: react-i18next + i18next-browser-languagedetector (English + Hebrew, RTL support)
- **Maps**: react-leaflet v4 (listing form), OpenStreetMap iframe embed (listing cards)
- **Geocoding**: Nominatim / OpenStreetMap (no API key)
- **HTTP Client**: Axios with JWT interceptor
- **Testing**: Vitest 2 + React Testing Library + MSW

### Infrastructure
- Docker Compose (local)
- Railway (cloud) — see `DEPLOY_RAILWAY.md`

## Project Structure

```
ReValue/
├── backend/
│   ├── api/routes/           # auth, users, listings, conversations, ratings, payments, events
│   ├── alembic/versions/     # 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008
│   ├── db/                   # PostgreSQL connection + Base
│   ├── models/postgres/      # User, Listing, Conversation, ConversationEvent
│   ├── schemas/              # Pydantic v2 schemas
│   ├── services/             # Business logic (conversation state machine, image upload, SSE bus)
│   ├── limiter.py            # Standalone slowapi rate limiter module
│   ├── tests/integration/    # pytest integration tests
│   ├── entrypoint.sh         # DB create + alembic upgrade head + uvicorn
│   └── Dockerfile
└── web/
    ├── src/
    │   ├── api/              # conversations.js, listings.js, auth.js, users.js
    │   ├── components/       # Header, ListingCard, ListingForm, ConversationView,
    │   │                     # NegotiationsListView, HistoryView, MapPicker, ...
    │   ├── constants/        # WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS
    │   ├── hooks/            # useAuth, useListings, useConversation, useGeocoding, useSSE
    │   ├── i18n/             # index.js (i18next setup), locales/en.json, locales/he.json
    │   ├── App.jsx           # Slim orchestrator
    │   └── AppContext.jsx    # Global state
    ├── nginx.conf
    └── Dockerfile
```

## Running Locally

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# Set SECRET_KEY and POSTGRES_PASSWORD at minimum

# 2. Start everything (runs DB migrations automatically)
docker-compose up --build -d

# 3. Open the app
#    Web:  http://localhost:3000
#    API:  http://localhost:8000/docs  (only in DEBUG=true mode)
```

To stop: `docker-compose down`  
To wipe all data: `docker-compose down -v`

## Running Tests

```bash
# Backend — run inside Docker (requires live PostgreSQL + Redis)
docker exec revalue-backend-1 sh -c "cd /app && python -m pytest tests/ -v"

# Frontend — run locally
cd web && npm test
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ phone, password, name }` |
| POST | `/api/auth/login` | form: `username` (phone) + `password` |
| GET  | `/api/auth/me` | Current user (Bearer token) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/users/{id}` | Public user profile |
| GET  | `/api/users/{id}/stats` | User stats |
| PUT  | `/api/users/me` | Update own profile |
| POST | `/api/users/me/change-password` | Change password |
| PUT  | `/api/users/me/business-profile` | Set `business_name`, `business_type` |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/listings/` | Browse available + sold listings |
| GET    | `/api/listings/mine` | Seller's own listings |
| POST   | `/api/listings/` | Create (multipart form) |
| PUT    | `/api/listings/{id}` | Update |
| PUT    | `/api/listings/{id}/status` | Change status |
| DELETE | `/api/listings/{id}` | Delete |

### Conversations (Negotiations)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/conversations/start` | Start or resume negotiation with a price offer |
| POST | `/api/conversations/{id}/action` | Drive state machine: `{ action, value }` |
| GET  | `/api/conversations/{id}` | Get conversation state + full event timeline |
| POST | `/api/conversations/{id}/seen` | Mark conversation as seen (clears badge) |
| GET  | `/api/conversations/mine` | All my conversations (buyer + seller) |
| GET  | `/api/conversations/my-for-listing/{id}` | Buyer's own conversation for a listing |
| GET  | `/api/conversations/listing/{id}` | Seller: all buyer negotiations for a listing |
| GET  | `/api/conversations/contacts-revealed/{id}` | Seller: buyers who reached contact_revealed |
| GET  | `/api/conversations/pending-counts` | Seller: action-needed counts per listing |
| GET  | `/api/conversations/buyer-pending-counts` | Buyer: pending-action counts |
| GET  | `/api/conversations/{id}/contact` | Buyer: view seller contact (after reveal) |
| POST | `/api/conversations/listing/{id}/mark-sold` | Seller: confirm actual buyer, cancel others |

**Actions**: `suggest_price`, `accept_price`, `decline_price`, `suggest_pickup`, `accept_pickup`, `reveal_contact`, `cancel`, `reopen`

### Real-time Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events/stream` | SSE stream — query param `token=<jwt>`; emits `seller_counts`, `buyer_counts`, `conversation` events |

### Ratings
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ratings/` | Create rating |
| GET  | `/api/ratings/user/{id}` | Get user ratings |

### Payments *(stubbed)*
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-intent` | Create Stripe payment intent |
| POST | `/api/payments/confirm/{id}` | Confirm payment |

## Data Models

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| phone / name | VARCHAR | Credentials + display name |
| business_name | VARCHAR 255 | Optional; publicly visible on listing cards |
| business_type | VARCHAR 50 | contractor / dealer / factory / other |
| is_verified | BOOLEAN | Default false; verified badge |

### Conversation
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| listing_id / buyer_id / seller_id | UUID | Foreign keys |
| status | VARCHAR | State machine status (see flow above) |
| suggested_price / agreed_price | FLOAT | Negotiated price |
| price_suggested_by | UUID | Blocks Accept on the suggester |
| suggested_pickup / agreed_pickup | VARCHAR | ISO datetime string |
| pickup_suggested_by | UUID | Whose turn to respond |
| seen_by_buyer / seen_by_seller | BOOLEAN | False = unread update |

### ConversationEvent
| Field | Type | Notes |
|---|---|---|
| conversation_id | UUID | FK → conversations (CASCADE) |
| actor_name | VARCHAR | Denormalised — no join needed for display |
| event_type | VARCHAR | negotiation_started, price_suggested, price_accepted, price_declined, pickup_suggested, pickup_accepted, contact_revealed, cancelled |
| value | VARCHAR | Price amount, ISO datetime, or cancel reason |
| created_at | TIMESTAMPTZ | Timeline ordering |

### Listing
| Field | Notes |
|---|---|
| waste_category | plastic, glass, metal, electronics, other |
| unit | kg, pieces |
| estimated_price | FLOAT — flat price in ₪ (optional) |
| quantity_kg | FLOAT — total weight in kg (optional, weight-based pricing) |
| price_per_kg | FLOAT — price per kg in ₪ (optional, weight-based pricing) |
| pickup_slots | JSON: `[{"day": "monday", "start": "09:00", "end": "17:00"}]` |
| actual_buyer_id | Set when seller confirms buyer via mark-sold flow |

## Database Migrations
| ID | Description |
|---|---|
| 0001 | users, listings, transactions, ratings |
| 0002 | conversations table |
| 0003 | price_suggested_by on conversations, pickup_slots on listings |
| 0004 | conversation_events, seen_by_buyer/seller, actual_buyer_id |
| 0005 | Add cancelled_by to conversations |
| 0006 | listing_removed flag + listing_title_snapshot |
| 0007 | conversations seller_id index |
| 0008 | Weight pricing on listings + business profile on users |

Migrations run automatically on container start via `entrypoint.sh` → `alembic upgrade head`.

## Deployment

See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md) for Railway cloud deployment instructions.

Required env vars for production: `SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_URL`  
Optional: `SENTRY_DSN` (error tracking), `REDIS_URL` (set manually in Railway dashboard)

**Note**: The SSE endpoint requires a single uvicorn worker (in-memory queue). Multi-worker deployments will break real-time delivery. `REDIS_URL` and service links must be configured manually in the Railway dashboard.

## License

MIT
