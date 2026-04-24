# ReValue — Manual Testing Checklist

Run this after every deploy or significant change.

---

## Auth
- [ ] Register with valid details → redirects to listings
- [ ] Register with password < 6 chars → shows inline error
- [ ] Register with duplicate phone → shows inline error
- [ ] Login with correct credentials → enters app
- [ ] Login with wrong password → shows inline error (not global)
- [ ] Logout → returns to login screen, clears all state

---

## Listings (Buyer mode)
- [ ] Listings load instantly from cache on page open (no empty flash)
- [ ] New listings appear within 30 seconds (poll)
- [ ] Category filter works (Plastic / Glass / Metal / Electronics / Other)
- [ ] Seller's own listings are not shown to themselves in buyer mode
- [ ] Sold listings are greyed out / not negotiable
- [ ] Seller name shown on each card
- [ ] Map/location shown on card
- [ ] Click listing image → fullscreen overlay opens, click background closes it
- [ ] Fullscreen image does not flicker on desktop (no card hover interference)

---

## Listings (Seller mode)
- [ ] My listings load instantly from cache
- [ ] All / Available / Sold / 🤝 Negotiating filters work
- [ ] 🤝 Negotiating only shows listings with active (non-cancelled) negotiations
- [ ] + Add Listing opens create form
- [ ] Edit listing → changes saved, returns to listings
- [ ] Delete listing with no negotiations → deleted immediately
- [ ] Delete listing with active negotiations → shows warning with count
- [ ] "Cancel all & delete" → cancels negotiations, deletes listing, buyers notified via SSE
- [ ] "Keep listing" → warning dismissed, listing stays
- [ ] Mark Sold → buyer picker appears (only buyers who reached contact-revealed)
- [ ] Mark Sold with no eligible buyers → "Mark Sold anyway" option
- [ ] Reactivate sold listing → status returns to available

---

## Negotiation flow (full happy path)
Open two browser tabs: Tab A = Seller, Tab B = Buyer

- [ ] Buyer clicks Negotiate → enters price → conversation starts
- [ ] Seller sees badge on listing card (SSE, no refresh needed)
- [ ] Seller opens negotiations → sees buyer's offer
- [ ] Seller accepts price → both sides update via SSE
- [ ] Buyer suggests pickup time
- [ ] Seller accepts pickup → both sides update
- [ ] Seller reveals contact → buyer sees phone number
- [ ] Seller marks sold to this buyer → listing goes sold, other negotiations cancelled

---

## Negotiation — edge cases
- [ ] Both buyer and seller can re-suggest price while waiting
- [ ] Both buyer and seller can re-suggest pickup while waiting
- [ ] Buyer can cancel at any non-terminal state
- [ ] Seller can cancel at any non-terminal state
- [ ] Cannot cancel after contact_revealed
- [ ] Cancelled conversation shows ❌ in history with correct actor name
- [ ] Seller: cancelled negotiation does NOT show "Your turn" badge
- [ ] Seller: cancelled negotiation clears from Negotiating filter after viewing

---

## Notifications & badges (SSE)
- [ ] Seller header badge increments when buyer acts (no refresh)
- [ ] Seller badge clears after opening conversation
- [ ] Buyer header badge increments when seller acts (no refresh)
- [ ] Buyer badge clears after opening conversation
- [ ] Listing deleted mid-negotiation → buyer gets green notification
- [ ] Deleted listing disappears from buyer listings instantly
- [ ] Deleted listing appears in buyer History → Removed tab

---

## History view
- [ ] All / Your turn / Waiting / Negotiated / Sold / Cancelled tabs work
- [ ] "Sold" tab label changes to "Purchased" in buyer mode
- [ ] Removed tab only appears when there are removed listings
- [ ] Rows sorted newest first
- [ ] Opening a conversation from history shows correct data (no stale flash)
- [ ] Back from conversation returns to history (not listings)

---

## Seller negotiations list (per listing)
- [ ] All / Active / Deal done / Cancelled tabs, default is All
- [ ] Rows sorted newest first
- [ ] "Your turn" badge shown correctly
- [ ] Opening a conversation shows correct buyer (no stale flash from previous)
- [ ] Back returns to negotiations list (not listings)

---

## Navigation / state
- [ ] Mode toggle (Buyer ↔ Seller) clears filters and reloads listings
- [ ] Mode persists after page refresh (localStorage)
- [ ] Switching mode clears all badges and resets view

---

## Mobile / responsive
- [ ] Listings grid readable on mobile
- [ ] Negotiation actions usable on mobile
- [ ] Image lightbox works on mobile (tap to open, tap to close)
- [ ] History tabs wrap correctly on small screen

---

## After deploy checklist
- [ ] Backend health check passes (`/health` returns 200)
- [ ] Registration and login work
- [ ] Image upload works (Cloudinary)
- [ ] SSE connects (no errors in browser console Network tab → EventSource)
- [ ] `ALLOWED_ORIGINS` matches frontend URL (no CORS errors)
