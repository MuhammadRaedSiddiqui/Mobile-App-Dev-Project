# Manual QA matrix — Phase 1 MVP (Estate Ease)

Use this checklist on **iOS** and **Android** (Expo Go or a development build). Record device, OS, build, and pass/fail for each row.

**Demo accounts (mock mode)**

| Role   | Email              | Password    |
|--------|--------------------|-------------|
| Seeker | ayesha@example.com | password123 |
| Seeker | raed@example.com   | password123 |
| Agent  | danish@example.com | password123 |

**Before a demo walkthrough:** `POST http://localhost:4000/v1/demo/reset` (API must be running with `MOCK_MODE=true`).

## Auth

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| A1 | Cold launch → splash → login | | | No flash of wrong role shell |
| A2 | Seeker login → Seeker tabs | | | |
| A3 | Agent login → Agent tabs | | | |
| A4 | Bad password → friendly error | | | No raw Firebase codes |
| A5 | Register seeker + agent | | | Role immutable after create |
| A6 | Logout clears session + user caches | | | |
| A7 | Edit profile (name, agent phone, avatar) | | | Persists after restart |

## Browse / search / detail / cost

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| B1 | Home loads ≤10 listings, freshness badges | | | Target ≤2s on 4G |
| B2 | Category pills filter | | | |
| B3 | Infinite scroll + pull-to-refresh | | | |
| B4 | Search debounce + filters + clear-all | | | Bedrooms, area, tags, budget presets, preserved filters |
| B5 | Recent search remove + clear | | | Per-user AsyncStorage |
| B6 | Similar listings on detail | | | Excludes self; empty state OK |
| B7 | Detail gallery, cost panel, views | | | Deposit amortization copy clear |
| B8 | Favorite from card + detail | | | Optimistic + rollback |

## Map

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| M1 | Map tab shows Karachi pins | | | Expo Go provider differences OK |
| M2 | Pan re-queries viewport | | | Debounced |
| M3 | Cluster expand + pin callout → detail | | | Clustering enabled |
| M4 | Map load error → retry | | | |

## Favorites / removed

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| F1 | Saved list persists across sessions | | | |
| F2 | Soft-deleted favorite shows unavailable | | | Not dropped |

## Agent CRUD / trust

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| G1 | Create listing multi-step + photos | | | |
| G2 | Edit + soft-delete with confirm | | | |
| G3 | Dashboard verify queue one-tap | | | Freshness resets; browse refreshes |
| G4 | Seeker report with confirm; already-reported disabled | | | Agents cannot report |
| G5 | Seeker cannot open ListingForm deep link as agent | | | Lands NotFound |

## Offline

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| O1 | Airplane mode → offline banner | | | |
| O2 | Cached browse / favorites labeled | | | Freshness >1h flagged |
| O3 | Offline open does not crash | | | |

## Deep links

| # | Scenario | iOS | Android | Notes |
|---|----------|-----|---------|-------|
| D1 | `estateease://listing/lst-001` opens detail | | | While logged in |
| D2 | Unknown path → NotFound | | | |

## NFR spot-checks (record evidence)

| Metric | Target | Measured | Device / build |
|--------|--------|----------|----------------|
| First 10 listings | ≤2s on 4G | | |
| Search ≤100 chars | ≤1.5s | | |
| Compressed image | ≤200 KB where feasible | | |
| Map 200 pins | ≥30 FPS | | |

**Deferred:** EAS production installables, live Firebase rules emulator suite, physical map provider parity matrix.
