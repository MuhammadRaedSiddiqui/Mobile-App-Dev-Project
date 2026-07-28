# Estate Ease

A cross-platform React Native (Expo) app for finding trustworthy residential rentals in Karachi, backed by an Express + Firebase Admin API. The three trust differentiators are **listing freshness**, **report-as-unavailable**, and **true monthly cost**.

This repository currently contains a **mock-mode MVP release candidate (Phases 0–6)**: scaffolding, auth, seeker discovery/search/favorites/map/trust, agent listing CRUD + media + verification, profile edit, deep links, rate limits, demo reset, and docs under `docs/`. It runs end to end **without any real Firebase credentials**.

## Architecture at a glance

- **Mobile** (`/src`) — Expo SDK 57 (React Native 0.86, React 19, New Architecture), TypeScript (strict), React Navigation v6, Redux Toolkit, Axios.
- **Backend** (`/backend`) — Express, Firebase Admin SDK, zod validation, Jest + supertest.
- **Read/write split (do not violate):** React Native may read Firestore directly later, but **all writes must go through Express**. There are no direct client Firestore writes anywhere in the codebase, and the client Firebase module is reads-only by construction.
- **Feature-first layout:** `src/features/{auth,listings,favorites,search,agent,map,trust}`, with shared `components/`, `theme/`, `services/`, `store/`, and `navigation/`.

## Mock-data mode

Both tiers boot in mock mode so a new contributor can run everything without secrets:

- Mobile: `useMockData` (from `app.json` → `extra`) defaults to `true` — services resolve against `src/mocks/data.ts`.
- Backend: `MOCK_MODE=true` — the API serves an in-memory store and accepts `mock-token-<uid>` bearer tokens; Firebase Admin init is skipped.

### Demo credentials (mock mode)

| Role   | Email                | Password    |
| ------ | -------------------- | ----------- |
| Seeker | ayesha@example.com   | password123 |
| Agent  | danish@example.com   | password123 |

## Prerequisites

- Node.js 20+ and npm (required by Expo SDK 57)
- Expo Go on a physical device, or an iOS Simulator / Android Emulator

## Running the mobile app

```bash
npm install
cp .env.example .env      # optional — defaults work in mock mode
npm start                 # Expo dev server; press i / a, or scan the QR in Expo Go
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run format
```

## Running the backend API

```bash
cd backend
npm install
cp .env.example .env      # MOCK_MODE=true by default
npm run dev               # ts-node-dev, http://localhost:4000
```

Verify it:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/v1/listings
```

Checks and tests:

```bash
npm test                  # Jest + supertest (freshness, cost, tokenize, visibility, validation, pagination, view dedup, API integration)
npm run typecheck
npm run lint
npm run build             # tsc + tsc-alias → dist/
```

### Seeding a real Firestore project

The demo data lives in the in-memory store for mock mode. To populate a real
project, disable mock mode, provide Admin credentials, and run the repeatable
(idempotent) seed script:

```bash
cd backend
MOCK_MODE=false npm run seed   # refuses to run in mock mode or without credentials
```

It seeds the four categories and demo listings via the Admin SDK — the same
write path Express uses. Deploy the accompanying Firestore config with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Environment configuration

Nothing secret is committed. `.env` and `backend/serviceAccountKey.json` are gitignored.

**Mobile (`app.json` → `expo.extra`, overridable via `EXPO_PUBLIC_*`):**

- `apiBaseUrl` — Express base URL (default `http://localhost:4000/v1`)
- `useMockData` — `true` until real credentials are wired
- `firebase*` — client SDK placeholders (reads only)

**Backend (`backend/.env`):**

- `MOCK_MODE` — `true` to use the in-memory store
- `FIREBASE_SERVICE_ACCOUNT_JSON` / `GOOGLE_APPLICATION_CREDENTIALS` — Admin SDK credentials (leave empty in mock mode)
- `FRESH_THRESHOLD_DAYS=7`, `AGING_THRESHOLD_DAYS=14`, `DEPOSIT_AMORTIZATION_MONTHS=12` — trust-model tuning

## Trust model (server-computed)

- **Freshness** — `fresh` ≤ 7 days, `aging` ≤ 14 days, `stale` > 14 days since last verification. Stale listings are hidden from default discovery (surfaced only with an explicit `includeStale` browse).
- **Report-as-unavailable** — once a listing reaches the report threshold (default 3 distinct reporters), it is suppressed from browse pending agent re-verification.
- **True monthly cost** — the security deposit is amortized over 12 months and shown as context; the headline monthly figure never silently folds the deposit in.
- **View counting** — a unique view is recorded per viewer per 24h window; the count is a write and therefore flows through Express (`POST /listings/:id/view`), never a direct client write.

Freshness, cost, and visibility are computed by the backend (`backend/src/services/{freshness,cost,visibility}.ts`) so the client never derives trust signals locally.

## Discovery & pagination

Browse uses opaque **cursor pagination** (10 items/page, max 50). The mobile Home
screen appends pages via infinite scroll (`onEndReached` → `loadMore`), with a
footer spinner and pull-to-refresh. The client cursor scheme mirrors the backend's
`o:<offset>` base64url token so the mock and live contracts stay identical; in live
Firestore this maps to `startAfter(lastDoc)`, backed by the composite indexes in
`firestore.indexes.json`.

## Firestore artifacts

- `firestore.rules` — signed-in reads, `status == 'active'` public visibility, own-profile/own-favorites reads; **every client write is denied** (writes go through Express + Admin SDK).
- `firestore.indexes.json` — composite indexes backing each accepted browse/search/dashboard query.
- `backend/src/scripts/seed.ts` — repeatable seed/import (see above).

## Project status

Phases 0–8 are implemented as a **mock-mode** product slice: seeker discovery/map clustering/advanced filters/similar listings/trust, agent CRUD/media/verify, profile edit, deep links, rate limits, demo reset, public agent profiles, saved-search notifications, and radius search. Live Firebase wiring, EAS installables, FCM delivery, and production credentials are not implemented yet.

Phase 9 is final hardening, documentation, and handover: regression polish, QA evidence, accessibility checks, and operational documentation.

### Docs

- [Manual QA matrix](docs/qa-manual-matrix.md)
- [API reference](docs/api.md)
- [Release notes](docs/RELEASE_NOTES.md)
- [Known limitations](docs/known-limitations.md)

### Demo reset

With the API running (`MOCK_MODE=true`):

```bash
curl -X POST http://localhost:4000/v1/demo/reset
```
