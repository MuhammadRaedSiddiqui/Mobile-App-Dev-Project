# Estate Ease — Full App Test & Task Analysis

End-to-end manual test plan covering every phase (0–9), all features, and both user
journeys. Runs entirely in **mock mode** (no Firebase credentials required). Use it to
walk the whole product, confirm each phase's behaviour, and record evidence.

- **Mode:** mock (`MOCK_MODE=true` backend, `useMockData=true` client) — the default.
- **Write invariant:** all writes go through Express. The client never writes Firestore directly.
- **Legend:** ✅ works · ⚠️ works with a known caveat · ❌ blocker · — not tested.

---

## 0. Environment setup

| # | Step | Command | Expect |
|---|------|---------|--------|
| E1 | Install backend deps | `cd backend && npm install` | Completes |
| E2 | Install client deps | `npm install` (repo root) | Completes |
| E3 | Start API (mock) | `cd backend && npm run dev` | Log: `listening on http://localhost:4000 (mockMode=true)` |
| E4 | Start app | `npm start` (root) → press `a` / `i` / `w` | Metro bundles; app opens |
| E5 | Reset demo data before a run | `POST http://localhost:4000/v1/demo/reset` **or** `cd backend && npm run reset` | `{ success: true }`; listings/reports back to seed |

**Demo accounts (mock)**

| Role   | Email                | Password      | uid            |
|--------|----------------------|---------------|----------------|
| Seeker | ayesha@example.com   | password123   | seeker-ayesha  |
| Agent  | danish@example.com   | password123   | agent-danish   |

**Pre-flight (developer sanity — should already pass):**

| # | Check | Command | Expect |
|---|-------|---------|--------|
| E6 | Backend tests | `cd backend && npm test` | 109/109 pass, 9 suites |
| E7 | Backend typecheck | `cd backend && npm run typecheck` | No output (clean) |
| E8 | Client typecheck | `npm run typecheck` | No output (clean) |

---

## Phase 0–1 — Foundation & Authentication

Platform bootstrap, role-based navigation shells, and the full auth surface.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| A1 | Cold launch | Kill & reopen app | Splash → login; no flash of the wrong role shell | |
| A2 | Seeker login | Log in as ayesha | Lands on **Seeker tabs** (Home, Search, Map, Favorites, Profile) | |
| A3 | Agent login | Log in as danish | Lands on **Agent tabs** (Dashboard, Listings, Profile) | |
| A4 | Bad password | Wrong password | Friendly inline error; no raw Firebase/error codes | |
| A5 | Register seeker | Create a new seeker account | Succeeds; role selector honoured; role immutable after create | |
| A6 | Register agent | Create a new agent account | Succeeds; agent phone captured | |
| A7 | Validation | Submit empty / bad email | Inline field errors, submit blocked | |
| A8 | Logout | Profile → Logout | Returns to login; user-scoped caches cleared (see O-series) | |

---

## Phase 2 — Discovery vertical slice (browse / categories / detail)

Read-only browse, category filtering, listing detail, and the true-cost panel foundation.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| B1 | Home loads | Open Home as seeker | ≤10 listings, freshness badges (Fresh/Aging/Stale). Target ≤2s on 4G | |
| B2 | Category pills | Tap each category | List filters to that category; "all" resets | |
| B3 | Infinite scroll | Scroll to bottom | Next page appends; no duplicates | |
| B4 | Pull-to-refresh | Pull down | Refetches; spinner then fresh list | |
| B5 | Open detail | Tap a card | Detail screen: gallery, title, price, specs | |
| B6 | View count | Open a listing | View count reflects; increments server-side | |

---

## Phase 3 — Seeker discovery & saved inventory (search + favorites)

Debounced search, advanced filters (Phase 7 filters listed here too), and favorites.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| S1 | Search debounce | Type in the search bar letter-by-letter | **No refetch per keystroke** — query commits after debounce (~400ms) | |
| S2 | Filter debounce | Change min/max price rapidly | No refetch per digit; commits after debounce | |
| S3 | Clear-all | Set filters, tap Clear all | Both raw + committed filters reset; full list returns | |
| S4 | Zero results | Impossible filter combo | Graceful empty state, not a spinner or crash | |
| F1 | Favorite from card | Tap heart on a card | Optimistic fill; persists | |
| F2 | Favorite from detail | Toggle on detail | State matches card everywhere | |
| F3 | Favorites tab | Open Favorites | Saved listings appear (refetch on tab focus) | |
| F4 | Persist | Save, kill app, reopen, open Favorites | Saved items still present | |
| F5 | Removed favorite | Favorite a listing, have agent soft-delete it | Shows as **unavailable**, not silently dropped | |
| F6 | Cross-user isolation | Log out ayesha, log in danish | Ayesha's favorites never visible to danish | |

---

## Phase 4 — Agent listing management & media

Agent-only CRUD through Express, dashboard stats, media placeholder.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| G1 | Empty state | New agent with no listings → Listings tab | "No listings yet — Tap + New…" | |
| G2 | Create — validation | + New → Publish immediately | Inline errors on Title, Price, Address, Area | |
| G3 | Create — success | Fill valid fields → Publish | Returns to list; new row with **Fresh** badge | |
| G4 | Karachi bounds | (API) create with lat 10.0 | Rejected 422 (out of Karachi) | |
| G5 | Edit | Edit a row, change price → Save | Updated price shows on list | |
| G6 | Soft-delete | Remove a row | Row dimmed + **Removed** badge; Edit/Remove hidden | |
| G7 | Dashboard stats | Open Dashboard | Active / Needs-verifying / Total-views reflect reality; update on focus | |
| G8 | Media placeholder | Create without an image | Falls back to placeholder image (⚠️ no native picker yet) | |
| G9 | Ownership | (API) danish edits sara's listing | 403 forbidden | |

---

## Phase 5 — Trust, maps, offline

Freshness verify, report-unavailable, true-cost, map discovery, offline resilience.

**Freshness & verification**

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| T1 | Freshness bands | Inspect seeded listings | ≤7d Fresh, 8–14d Aging, >14d Stale | |
| T2 | Verify queue | Agent Dashboard | Stale/aging listings appear in verification queue | |
| T3 | One-tap verify | Tap Verify | Freshness resets to Fresh; existing reports cleared; browse refreshes | |
| T4 | Verify auth | (API) seeker calls `POST /listings/:id/verify` | 403 | |

**Report unavailable**

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| R1 | Report | Seeker → detail → Report unavailable → confirm | Success state; button becomes "Already reported" (disabled) | |
| R2 | Idempotent | Same seeker reports again | Count does **not** increase | |
| R3 | Own listing | Agent tries to report own listing | Blocked | |
| R4 | Threshold | 3 distinct seekers report one listing | Hidden from default browse; re-verify restores it | |
| R5 | Reported state | (API) `GET /listings/:id/reported` | Reflects whether current user reported | |

**True-cost panel**

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| C1 | Breakdown | Open any detail | Rent + amortized deposit (12-mo) + maintenance + utilities, PKR-formatted | |
| C2 | Copy | Read the panel | Plain-language deposit-amortization explanation | |
| C3 | Zero charges | Listing with no maintenance/utilities | Shows 0 gracefully | |
| C4 | Server-authoritative | Compare API total vs UI | Identical (UI only explains, never recomputes) | |

**Map**

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| M1 | Pins | Map tab | Karachi pins render (Expo Go provider differences acceptable) | |
| M2 | Pan-to-search | Pan the map | Viewport re-queries (debounced); only visible listings, ≤200 | |
| M3 | Pin → detail | Tap a pin callout | Opens the correct listing detail | |
| M4 | Error/retry | Force a fetch error | Error state with Retry | |

**Offline**

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| O1 | Banner | Airplane mode | Offline banner appears above all screens | |
| O2 | Cached data | Open app offline after a prior online session | Cached browse/favorites shown, labeled | |
| O3 | Freshness TTL | Cached >1h | Not presented as current (1h freshness TTL) | |
| O4 | No crash | Cold-open offline | Stable; cache-miss empty states, no crash | |
| O5 | Reconnect refresh | Go offline then back online | Browse auto-refetches on reconnect (no stale cache) | |
| O6 | Logout clears cache | Logout | User-scoped keys (favorites, history, filters, prefs, browse, reported) removed | |

---

## Phase 6 — Stabilization / release candidate

Integration glue, security, deep links, demo tooling.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| I1 | Profile edit | Profile → Edit (name, agent phone, avatar) | Saves via `PUT /auth/profile`; persists after restart | |
| I2 | Deep link — detail | Open `estateease://listing/lst-001` while logged in | Opens that detail | |
| I3 | Deep link — unknown | Open `estateease://nonsense/path` | NotFound screen | |
| I4 | Role guard | Seeker deep-links into ListingForm | Redirected to NotFound (agent-only) | |
| I5 | Cache reconcile | Create/verify then return to browse | No duplicate cards, no stale badges | |
| SEC1 | Rate limit | Hammer auth/report/upload endpoints | Throttled (429) after limit | |
| SEC2 | Log redaction | Inspect API logs | `Authorization: Bearer [REDACTED]` | |
| SEC3 | Favorites role | (API) agent hits favorites endpoints | 403 (seeker-only) | |
| SEC4 | No secrets shipped | Inspect client bundle/config | No service account / server secret present | |

---

## Phase 7 — Enhanced discovery

Advanced filters, search history, similar listings, map clustering.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| E7a | Bedrooms filter | Search → bedroom chips (any/1/2/3+) | List filters accordingly | |
| E7b | Area range | Set min/max area | Filters by area | |
| E7c | Tag multi-select | Pick multiple location/livability tags | Any-match filtering | |
| E7d | Budget presets | Tap a budget preset | Min/max price applied | |
| E7e | Preserved filters | Set filters, leave Search, return | Filters restored (per-user AsyncStorage) | |
| E7f | Recent searches | Run searches | Appear in recent list | |
| E7g | Remove/clear history | ✕ one item; Clear all | Item removed / list cleared | |
| E7h | Similar listings | Open a detail | "Similar" row: same category+city, excludes self/removed/draft; empty state OK | |
| E7i | Clustering | Zoom out on map with dense pins | Clusters form; tap expands; tap pin → detail | |

---

## Phase 8 — Optional extensions

Share, public agent profile, livability tags, saved-search notifications, radius search.

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| X1 | Share | Detail → Share | Native share sheet with `estateease://listing/:id` link | |
| X2 | Shared link opens | Open the shared link | Lands on that listing detail | |
| X3 | Agent profile | Detail → tap agent | AgentProfileScreen; active listings only, no PII | |
| X4 | Livability tags | Open a listing with livability tags | "Area livability" section (Water/Load-shedding/Internet) | |
| X5 | Push consent | Notification settings | Opt-in/out switches; alerts gated on consent | |
| X6 | Saved search CRUD | Create/list/delete a saved search | Persists; delete removes | |
| X7 | New-listing alert | Agent creates a listing matching a saved search | Mock FCM dispatch logged (console); creation never blocked on delivery | |
| X8 | Radius search | Map → radius mode → 1/2/5 km | Only listings within radius shown | |

> Note: push is a console-log mock (no `expo-notifications`); sharing uses RN's built-in `Share`. Commercial/for-sale is **deferred** by design.

---

## Phase 9 — Hardening / docs / accessibility (partial)

| # | Scenario | Steps | Expect | Result |
|---|----------|-------|--------|--------|
| H1 | Touch targets | Inspect primary buttons/inputs | ≥48px min height | |
| H2 | Screen-reader labels | Enable VoiceOver/TalkBack; tab core actions | Buttons/cards/detail actions announced | |
| H3 | Docs present | Browse `docs/` + README | api.md, filter-strategy, known-limitations, release notes, this file | |
| H4 | Known limitations | Read `docs/known-limitations.md` | Deferrals accurately listed | |

> **Phase 9 is intentionally incomplete:** architecture diagram, filled QA/NFR evidence, backup/quota/incident ops docs, and some accessibility labels/hints are outstanding. Treat H-series as spot-checks, not a completion gate.

---

## End-to-end journeys (demo rehearsal)

**Seeker journey**
1. Login (ayesha) → Home loads listings.
2. Search + apply filters (bedrooms, budget preset) → results narrow.
3. Open a detail → review gallery + true-cost panel.
4. Favorite it → confirm in Favorites tab.
5. Map tab → pan → tap a pin → detail.
6. Report an unavailable listing → confirm disabled state.
7. Airplane mode → offline banner + cached data → reconnect → refresh.

**Agent journey**
1. Login (danish) → Dashboard stats.
2. Listings → + New → create a listing → appears Fresh.
3. Edit price → save. Soft-delete another → Removed badge.
4. Let a listing go stale (or use seeded stale one) → Dashboard verify queue → one-tap Verify → resets Fresh, clears reports.
5. Confirm a seeker's report cleared after re-verify.
6. Public agent profile reachable from a seeker's detail view.

---

## NFR spot-checks (record evidence)

| Metric | Target | Measured | Device / build |
|--------|--------|----------|----------------|
| First 10 listings | ≤2s on 4G | | |
| Search (≤100 chars) | ≤1.5s | | |
| Compressed image | ≤200 KB where feasible | | |
| Map with 200 pins | ≥30 FPS | | |

---

## Known caveats (expected, not defects)

- **Mock mode throughout** — live Firestore/Storage/FCM wiring is credential-gated and deferred.
- **No native image picker** (Phase 4.2) — listing form uses image URLs + a placeholder fallback.
- **Push notifications are a console-log mock** — no real device delivery.
- **Phase 9 handover docs partial** — see the H-series note above.
- **Backend `npm run reset`** resets an in-process store; for a running server use the HTTP `POST /v1/demo/reset` endpoint.
