# RecycleBottles — Bug Fixes & Requirements Plan

## Bugs to Fix

### BUG-01 — Filter by type twice clears all listings
**Description:** Clicking the bottle type filter dropdown twice (or selecting the same type twice) causes all listings to disappear from the UI.  
**Root cause:** The current filter logic mutates the listings state in-place instead of filtering from the original list. A second filter has no items left to filter against.  
**Fix:** Keep a separate `allListings` reference and always filter from that, never from the already-filtered state.

---

### BUG-02 — Phone field incorrectly marked as optional
**Description:** The phone field on the Create Account form shows as "Phone (optional)" but phone is the primary login key and must be mandatory.  
**Expected:** Phone is required, unique per user, and used to log in instead of email.  
**Fix:** Add `required` to the phone input, remove the "(optional)" label, enforce unique constraint on the phone column in the DB, and update login to query by phone instead of email.

---

### BUG-03 — Chat messages not showing in chat box
**Description:** Sending a message returns HTTP 201 and fetching messages returns HTTP 200, but the chat box remains empty.  
**Root cause (suspected):** The `chat_id` generation logic may differ between the send and the fetch calls, so messages are stored under one ID but fetched under a different one. Also the message list endpoint may be returning data in an unexpected shape.  
**Fix:** Audit `generate_chat_id()` in `messages.py` to ensure it produces the same deterministic ID for both send and fetch. Verify the response shape matches what the frontend expects.

---

## New Requirements

### REQ-01 — Default role is Buyer, no selection needed at registration
**Description:** Remove the buyer/seller role selector from the Create Account form. All new users start as Buyers by default.  
**Details:**
- Registration form only collects: Name, Phone, Password.
- Login is by phone number (see REQ-04).
- Role can be toggled any time after login (see REQ-02).

---

### REQ-02 — Buyer/Seller toggle button (changes layout theme)
**Description:** A single toggle button in the header lets the user switch between Buyer mode and Seller mode at any time.  
**Details:**
- **Buyer mode** → green theme, sees all available listings from all sellers.
- **Seller mode** → blue theme, sees only their own listings + Add Listing button.
- The toggle persists in `localStorage` so it survives page refresh.
- Default is Buyer mode.

---

### REQ-03 — Seller view shows own listings + Add button; Buyer view shows all listings
**Description:** The listings page content changes based on the active mode.  
**Seller mode:**
- Shows only listings created by the logged-in user.
- Displays an "Add Listing" button prominently.
- Shows listing status (available, pending, sold).

**Buyer mode:**
- Shows all available listings from all sellers.
- No "Add Listing" button.

---

### REQ-04 — Login by phone number (phone replaces email as unique key)
**Description:** Phone number is the primary identifier. Email is removed entirely.  
**Details:**
- Registration: collects Name, Phone (mandatory, unique), Password.
- Login page: Phone Number + Password fields only.
- Backend: remove email field from User model, add unique + not-null constraint on phone, query user by phone on login.
- JWT token `sub` remains the user UUID (no change).
- The login page is the default landing page for unauthenticated users.

---

### REQ-05 — Login page is the default page with a Register button
**Description:** When a user opens the app and is not logged in, they land on the Login page (not the listings page).  
**Details:**
- Login form is shown by default.
- Login page has a "Don't have an account? Register" button.
- After login, user is taken to listings (Buyer mode) or their listings (Seller mode).

---

### REQ-06 — Location by Google Maps link or interactive map, not coordinates
**Description:** Replace the latitude/longitude coordinate input fields with a Google Maps link field or an embedded map picker.  
**Details:**
- Option A: User pastes a Google Maps URL — the app parses it to extract lat/lng automatically.
- Option B: Embed a map (Google Maps or Leaflet.js — no API key needed) where the user drops a pin.
- Leaflet.js is recommended for the POC (free, no API key required).
- Display listing location as a clickable map pin on the listing card, not raw coordinates.

---

### REQ-07 — Each bottle type has its own icon
**Description:** Replace the generic box icon with a distinct icon per bottle type everywhere bottles are displayed (listing cards, filters, forms).  
**Type → Icon mapping:**
| Type | Icon |
|---|---|
| Plastic | 🧴 |
| Glass | 🍾 |
| Aluminum | 🥫 |
| Mixed | ♻️ |

---

## Implementation Order (Suggested)

| Priority | Item | Effort |
|---|---|---|
| 1 | BUG-01 Filter clears listings | Small |
| 2 | BUG-02 + REQ-04 Phone as mandatory unique login key (replaces email) | Medium |
| 4 | REQ-05 Login as default page | Small |
| 5 | REQ-01 Remove role from registration | Small |
| 6 | REQ-02 Buyer/Seller toggle + theme | Medium |
| 7 | REQ-03 Seller/Buyer listing views | Small |
| 8 | REQ-07 Bottle type icons | Small |
| 9 | REQ-06 Location via map | Large |
| 10 | BUG-03 Chat not showing | Medium |
