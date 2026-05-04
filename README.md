# ReValue

A marketplace for turning waste into money — sellers post waste material (plastic, glass, metal, electronics, and more); buyers collect and pay. Structured negotiation flow, no free-text chat.

## Features

- **Phone-based Auth** — register and login with phone number + password; inline error on failure
- **Buyer / Seller Toggle** — switch modes with one click; green theme for buyers, blue for sellers
- **Listings** — create with photo upload (JPG/PNG/WEBP, max 5 MB), Leaflet map picker, waste category, quantity, optional price, pickup availability slots
- **Location** — reverse-geocoded address display + OpenStreetMap embed on each card (no API key needed)
- **Structured Negotiation** — price offer → pickup time → contact reveal (no free-text chat)
- **Full Event Timeline** — every negotiation step logged with actor name and timestamp; full history visible in the conversation view
- **Live Notification Badges** — header "🤝 Negotiations" button shows pending-action count; per-listing badges on the grid; badges clear when you open the conversation
- **History View** — three tabs: Active / Done / Cancelled; each row re-opens the conversation
- **Mark Sold with Buyer Selector** — seller picks the actual buyer from a list of buyers who received contact details; others are auto-notified and cancelled
- **Waste Categories** — Plastic, Glass, Metal, Electronics, Other
- **Docker Compose** — one command to run everything locally
- **Render-ready** — `render.yaml` for one-click free cloud deployment
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

Every transition is logged in the conversation timeline. Seller can cancel (block) at any non-terminal state.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (SQLAlchemy ORM + Alembic migrations)
- **Auth**: JWT (HS256, 7-day tokens) + bcrypt
- **Images**: Cloudinary CDN (prod) / local disk (dev)
- **Payments**: Stripe *(stubbed)*

### Web Frontend
- **Framework**: React 18 + Vite (no routing library — view state drives rendering)
- **Maps**: react-leaflet v4 (listing form), OpenStreetMap iframe embed (listing cards)
- **Geocoding**: Nominatim / OpenStreetMap (no API key)
- **HTTP Client**: Axios with JWT interceptor
- **Testing**: Vitest 2 + React Testing Library + MSW

### Infrastructure
- Docker Compose (local)
- Render (free cloud) — see `render.yaml`

## Project Structure

```
ReValue/
├── backend/
│   ├── api/routes/           # auth, users, listings, conversations, ratings, payments
│   ├── alembic/versions/     # 0001 → 0002 → 0003 → 0004
│   ├── db/                   # PostgreSQL connection + Base
│   ├── models/postgres/      # User, Listing, Conversation, ConversationEvent
│   ├── schemas/              # Pydantic v2 schemas
│   ├── services/             # Business logic (conversation state machine, image upload)
│   ├── tests/integration/    # pytest integration tests
│   ├── entrypoint.sh         # DB create + alembic upgrade head + uvicorn
│   └── Dockerfile
└── web/
    ├── src/
    │   ├── api/              # conversations.js, listings.js, auth.js, users.js
    │   ├── components/       # Header, ListingCard, ListingForm, ConversationView,
    │   │                     # NegotiationsListView, HistoryView, MapPicker, ...
    │   ├── constants/        # WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS
    │   ├── hooks/            # useAuth, useListings, useConversation, useGeocoding
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
# Backend integration tests
cd backend
source venv/Scripts/activate   # Windows
pytest -v

# Frontend unit/component tests
cd web
npm test
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ phone, password, name }` |
| POST | `/api/auth/login` | form: `username` (phone) + `password` |
| GET  | `/api/auth/me` | Current user (Bearer token) |

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

**Actions**: `suggest_price`, `accept_price`, `decline_price`, `suggest_pickup`, `accept_pickup`, `reveal_contact`, `cancel`

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
| pickup_slots | JSON: `[{"day": "monday", "start": "09:00", "end": "17:00"}]` |
| actual_buyer_id | Set when seller confirms buyer via mark-sold flow |

## Database Migrations
| ID | Description |
|---|---|
| 0001 | users, listings, transactions, ratings |
| 0002 | conversations table |
| 0003 | price_suggested_by on conversations, pickup_slots on listings |
| 0004 | conversation_events, seen_by_buyer/seller, actual_buyer_id |

Migrations run automatically on container start via `entrypoint.sh` → `alembic upgrade head`.

## Deployment

See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md) for Render cloud deployment instructions.

Required env vars for production: `SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_URL`

## License

MIT
