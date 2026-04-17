# ReValue

A cross-platform marketplace for turning waste into money — sellers post any waste material (plastic, glass, metal, electronics, and more); buyers collect and pay.

## Features

- 🔐 **Phone-based Auth** — register and login with phone number (unique key, no email)
- 🛒 **Buyer / Seller Toggle** — switch modes with one click; green theme for buyers, blue for sellers
- 📋 **Buyer View** — browse all available listings from all sellers
- 🏪 **Seller View** — see all own listings (including sold), filter by status (All / Available / Sold / Pending), mark as sold, reactivate sold items
- 💬 **In-App Chat** — buyers chat with sellers per listing; sellers see all buyer threads and can reply
- 📸 **Image Upload** — list bottles with photos
- ⭐ **Rating System** — rate buyers and sellers after transactions
- 📍 **Location** — address + coordinates per listing *(map picker planned — see Roadmap)*
- 🧴🍾⚙️📱📦 **Waste Categories** — Plastic, Glass, Metal, Electronics, Other

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Databases**:
  - PostgreSQL — users, listings, transactions, ratings
  - MongoDB — chat messages
- **Auth**: JWT (python-jose) + bcrypt password hashing
- **Payments**: Stripe *(stubbed for POC)*

### Web Frontend
- **Framework**: React 18 + Vite
- **HTTP Client**: Axios
- **Testing**: Vitest 2 + React Testing Library + MSW

### Infrastructure
- PostgreSQL and MongoDB run as Docker containers

## Project Structure

```
RecycleBottles/
├── backend/
│   ├── api/
│   │   ├── routes/        # auth, users, listings, messages, payments, ratings
│   │   └── middleware/    # JWT auth middleware
│   ├── db/                # PostgreSQL + MongoDB connections
│   ├── models/
│   │   ├── postgres/      # SQLAlchemy ORM models
│   │   └── mongodb/       # MongoDB message model
│   ├── schemas/           # Pydantic v2 request/response schemas
│   ├── services/          # Business logic (listing, message, user, rating, payment)
│   ├── tests/
│   │   └── integration/   # pytest integration tests (33 tests)
│   ├── config.py
│   ├── main.py
│   └── requirements.txt
└── web/
    ├── src/
    │   ├── api/            # Axios client layer (auth, listings, messages, users)
    │   ├── components/     # Header, ListingCard, LoginPage, ChatView, etc.
    │   ├── constants/      # BOTTLE_ICONS
    │   ├── hooks/          # useAuth, useListings, useMessages, useGeocoding
    │   ├── test/           # MSW server, handlers, renderWithContext helper
    │   ├── App.jsx         # Slim orchestrator (~200 lines)
    │   ├── AppContext.jsx  # Global state (token, user, mode, view, error)
    │   └── index.css       # Theming + layout
    └── package.json
```

## Running Tests

### Backend (integration tests)

With the databases running (via Docker Compose or the bat file):

```cmd
cd backend
venv\Scripts\activate
pytest -v
```

Tests run against a separate `recycle_bottles_test` database — production data is never touched.
Each test starts with a clean slate (all tables truncated before every test).

**33 tests** cover: auth, listings CRUD, permission enforcement, messaging, and user profiles.

### Frontend (unit/component tests)

No database or server needed — MSW intercepts all HTTP at the module level.

```cmd
cd web
npm test
```

**14 tests** cover: axios auth interceptor, useAuth hook (login/logout/register), LoginPage form behaviour, and ListingCard rendering.

---

## Getting Started

### Quick Start — Docker Compose

```bash
# 1. Copy and fill in secrets
cp .env.example .env

# 2. Start everything (databases, backend, frontend)
docker-compose up --build -d

# 3. Open the app
#    Web:      http://localhost:3000
#    API docs: http://localhost:8000/docs
```

On first run the backend entrypoint automatically creates the `revalue` database and applies all Alembic migrations — no manual steps needed.

To stop: `docker-compose down`  
To wipe all data too: `docker-compose down -v`

On Windows: double-click **`start-poc.bat`** / **`stop-poc.bat`**

---

### Manual Start (development only)

#### 1. Start Databases (Docker)

```bash
docker-compose up -d postgres mongo
```

#### 2. Start Backend

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

#### 3. Start Frontend

```bash
cd web
npm run dev
```

Web app at: **http://localhost:3000**

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register — body: `{ phone, password, name }` |
| POST | `/api/auth/login` | Login — form: `username` (phone) + `password` |
| GET | `/api/auth/me` | Get current user (Bearer token) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/{id}` | Get user profile |
| GET | `/api/users/{id}/stats` | Get user statistics |
| PUT | `/api/users/me` | Update current user |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings/` | Browse all available listings; optional `?waste_category=` filter |
| GET | `/api/listings/mine` | Get all own listings regardless of status (seller, requires Bearer token) |
| POST | `/api/listings/` | Create listing (multipart form) |
| GET | `/api/listings/{id}` | Get listing details |
| PUT | `/api/listings/{id}` | Update listing |
| PUT | `/api/listings/{id}/status` | Update status (available / pending / sold / cancelled) |
| DELETE | `/api/listings/{id}` | Delete listing |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/messages/` | Send message — body: `{ listing_id, receiver_id, content }` |
| GET | `/api/messages/listing/{id}` | Buyer: get own chat with seller. Seller: requires `?buyer_id=` to view a buyer's thread |
| GET | `/api/messages/listing/{id}/conversations` | Seller only — list all buyers who messaged about a listing |
| GET | `/api/messages/{chat_id}` | Get messages by chat ID |
| WS | `/api/messages/ws/{user_id}` | WebSocket for real-time chat |

### Ratings
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ratings/` | Create rating after transaction |
| GET | `/api/ratings/user/{id}` | Get ratings for a user |

### Payments *(stubbed)*
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-intent` | Create Stripe payment intent |
| POST | `/api/payments/confirm/{id}` | Confirm payment |

## Data Models

### User (PostgreSQL)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| phone | VARCHAR(20) | **Unique, NOT NULL** — used as login key |
| password_hash | VARCHAR | bcrypt |
| name | VARCHAR | |
| buyer_rating / seller_rating | FLOAT | Averaged automatically |
| total_transactions | INT | |

### Listing (PostgreSQL)
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| seller_id | UUID | FK → users |
| title, description | TEXT | |
| waste_category | VARCHAR | plastic / glass / metal / electronics / other |
| quantity | INT | |
| unit | VARCHAR | kg / pieces |
| status | VARCHAR | available / pending / sold / cancelled |
| latitude, longitude | FLOAT | |
| images | JSON | Array of URL paths |
| estimated_price | FLOAT | Optional starting price |

### Message (MongoDB)
| Field | Type | Notes |
|---|---|---|
| chat_id | String | `{listing_id}_{sorted_user_ids}` — normalized, no dashes |
| sender_id / receiver_id | String | User UUIDs |
| content | String | |
| timestamp | DateTime | |
| read | Boolean | |

## Known Bugs Fixed

| ID | Bug | Fix Applied |
|---|---|---|
| BUG-01 | Filtering by type twice cleared all listings | Keep `allListings` as source of truth; always filter from original list |
| BUG-02 | Phone shown as optional in registration | Phone is now mandatory and unique — it is the login key |
| BUG-03 | Chat messages not showing despite 201/200 | `chat_id` was inconsistent (dashes vs no-dashes in UUIDs); normalized all IDs before generating chat_id |
| BUG-04 | Seller could not see chats from buyers | Added `/listing/{id}/conversations` endpoint to list buyers; seller can open any buyer thread via `?buyer_id=`; "View Chats" button added to seller listing cards |
| BUG-05 | Buyer still saw listing as "available" after seller marked it sold | Added 30-second auto-refresh of listings in buyer mode so status changes are reflected without manual reload |
| BUG-06 | Sold listings disappeared from seller's view after marking sold | `GET /listings/` now accepts `seller_id` param which bypasses the default available-only filter; seller fetches their own listings at all statuses |
| BUG-07 | New seller listing not visible in buyer browser; sold status not reflected in buyer browser | Buyer auto-refresh reduced to 5 s; stale closure in interval fixed via `loadListingsRef`; `handleCreateListing` now fetches with `seller_id` so seller view stays consistent after create |
| BUG-08 | All listings disappeared for seller after marking as sold / filtering by Sold | Added `GET /listings/mine` endpoint (JWT-identified, no UUID string comparison). Status changes now use an optimistic local state update — `allListings` is mapped in-place immediately after PUT succeeds, no re-fetch race condition possible |
| BUG-09 | Sent chat messages not shown immediately | `sendMessage` now appends the POST response body directly to `messages` state instead of doing a second GET. Added 3 s polling while chat is open so incoming messages from the other party appear automatically |
| BUG-10 | Backend crashed on login with "database recycle_bottles does not exist" | `.env` was not updated when DB was renamed to `revalue` (only `.env.example` was). Fixed `.env`; added `entrypoint.sh` that auto-creates the DB and runs `alembic upgrade head` on every container start — no manual steps required |

## Roadmap

| ID | Feature | Status |
|---|---|---|
| REQ-01 | No role selection at registration — default Buyer | ✅ Done |
| REQ-02 | Buyer/Seller toggle button + color theme | ✅ Done |
| REQ-03 | Seller sees own listings; Buyer sees all | ✅ Done |
| REQ-04 | Login by phone number (replaces email) | ✅ Done |
| REQ-05 | Login page as default landing page | ✅ Done |
| REQ-07 | Bottle type icons (🧴🍾🥫♻️) | ✅ Done |
| REQ-06 | Location via Google Maps link or Leaflet map | 🔲 Pending |

## License

MIT
