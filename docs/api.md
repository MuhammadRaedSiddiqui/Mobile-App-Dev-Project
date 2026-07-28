# Estate Ease — API reference (MVP)

Base URL: `http://localhost:4000/v1` (override via `EXPO_PUBLIC_API_BASE_URL` / `apiBaseUrl`).

All successful responses are JSON. Errors use:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `RATE_LIMITED` (429), `CONFLICT` (409).

Auth header: `Authorization: Bearer <token>` (`mock-token-<uid>` in mock mode).

## Health

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` (unversioned) | No | `{ status, mockMode }` |

## Auth

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | No | Mock only; rate-limited |
| POST | `/auth/login` | No | Mock only; rate-limited |
| GET | `/auth/me` | Yes | |
| PUT | `/auth/profile` | Yes | `displayName`, `phone`, `avatarUrl` |
| POST | `/auth/logout` | Yes | Client discards token |

## Listings (read + view)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/listings` | No* | Query: category, q, min/maxPrice, city, tags, fresh, includeStale, bedrooms, minBedrooms, min/maxArea, min/maxLat/Lng, cursor, limit≤200 |
| GET | `/listings/categories` | No | |
| GET | `/listings/:id/similar` | No | Same category + city; excludes self/removed/draft; freshness order; `limit`≤20 (default 6) |
| GET | `/listings/:id` | No | |
| POST | `/listings/:id/view` | Yes | Unique view / 24h |

\*Public browse still expects signed-in clients in live Firestore rules.

## Trust

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/listings/:id/verify` | Agent owner | Clears reports |
| POST | `/listings/:id/report` | Seeker | Idempotent; rate-limited |
| GET | `/listings/:id/reported` | Yes | Soft check for current seeker |

## Favorites

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/favorites` | Seeker | |
| GET | `/favorites/check/:id` | Seeker | |
| POST | `/favorites/:id` | Seeker | |
| DELETE | `/favorites/:id` | Seeker | |

## Agent

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/agent/listings` | Agent | All statuses |
| POST | `/agent/listings` | Agent | Create (draft\|active) |
| PUT | `/agent/listings/:id` | Agent owner | |
| DELETE | `/agent/listings/:id` | Agent owner | Soft delete |
| POST | `/agent/listings/images` | Agent | Multipart `images`; rate-limited |

## Demo

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/demo/reset` | No | Mock mode only — restore seed listings/reports/favorites |

## Agents (Phase 8)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/agents/:uid` | No | Public agent profile + active listings |

## Notifications (Phase 8, seeker-only)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/notifications/push-token` | Seeker | Register device token (consent flow on client) |
| DELETE | `/notifications/push-token` | Seeker | Unregister |
| GET | `/notifications/preferences` | Seeker | `{ pushEnabled, savedSearchAlerts }` |
| PUT | `/notifications/preferences` | Seeker | Opt in/out |
| GET | `/notifications/saved-searches` | Seeker | |
| POST | `/notifications/saved-searches` | Seeker | `{ label, query, notifyOnNewListings? }` |
| DELETE | `/notifications/saved-searches/:id` | Seeker | |

### Listings radius query (Phase 8)

Add to `GET /listings`: `centerLat`, `centerLng`, `radiusKm` (≤50). When set, viewport bounds are ignored and results are filtered by haversine distance from the centre.
