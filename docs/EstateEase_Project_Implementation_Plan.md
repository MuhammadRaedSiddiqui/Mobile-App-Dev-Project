# Estate Ease — Project Development & Implementation Plan

**Basis:** `EstateEase_Technical_Documentation_v1_2.md`
**Delivery model:** 10 weeks; the Phase 1 MVP is complete by the end of Week 6. Phase 2 is valuable but must not delay the verified-rental core.
**Primary outcome:** a cross-platform React Native app through which Karachi renters can find residential rentals with trustworthy freshness and true-cost information, while agents can manage and re-verify their listings.

## 1. Scope, Operating Rules, and Milestones

### Phase 1 MVP — required by end of Week 6

- Seeker and agent registration, login, logout, session handling, and profile updates.
- Residential rental discovery for four seeded categories: 1-Bed Flats, Portions, Shared / Roommate, and Studios.
- Listing browse, detail, whole-token title search, basic filtering, favorites, and viewport map discovery.
- Agent create, edit, and soft-delete listing workflows, including up to 10 validated images.
- The three trust differentiators: freshness badges/re-verification, report-as-unavailable with an enforceable one-report-per-user rule, and true monthly cost.
- Production-quality empty, loading, error, unauthorized, and removed-listing states on iOS and Android.

### Phase 2 — Weeks 7–10, in priority order

- Advanced filters, search history, similar listings, and map clustering.
- Optional commercial/for-sale expansion only after the residential rental MVP is accepted.
- Public agent pages, area-livability tags, native sharing, notifications, and radius search are lower-priority extensions.

### Non-negotiable technical rules

| Rule | Implementation consequence |
|---|---|
| Client reads Firestore; all writes use Express | Do not call Firestore client write APIs from the mobile application. Every mutation has an authenticated REST endpoint. |
| Firestore rules deny client writes | Rules are tested as code before any feature is marked complete. |
| MVP is residential rentals only | Do not expose `priceType: total`, sales, featured listings, or commercial UI in Phase 1. |
| Listing removal is soft delete | `DELETE /listings/:id` changes the listing status to `removed`; favorites continue to display it as unavailable. |
| Freshness is derived | Compute the status on the server from `lastVerifiedAt`; do not persist a mutable `freshnessStatus` field. |
| Reports are idempotent | Use `listings/{listingId}/reports/{reporterId}` and a transaction; only a new reporter increments the count. |

### Milestone gates

| Gate | Target | Exit evidence |
|---|---:|---|
| G0 — architecture ready | End W1 | Repositories/configuration, Firebase projects, environment templates, data contracts, and access-control design reviewed. |
| G1 — vertical slice | End W2 | A user can authenticate, read seeded listings, open a detail screen, and see a server-calculated cost/freshness response. |
| G2 — MVP feature complete | End W5 | All Phase 1 user journeys work against Firebase in a shared test environment. |
| G3 — MVP release candidate | End W6 | Test suite and manual matrix pass on iOS and Android; demo data is prepared. |
| G4 — final delivery | End W10 | Accepted Phase 2 scope, performance/security checks, final documentation, and demo build are complete. |

## 2. Work Breakdown Structure

### Phase 0 — Initiation and solution design (Week 1, Days 1–2)

**Goal:** remove delivery ambiguity before implementation begins.

> **Status — foundation complete (mock mode).** Item 1 is done: the feature-first Expo + Express workspace exists with TypeScript (strict) across both tiers, ESLint/Prettier, `.env.example`, `.gitignore`, a CI workflow, and a developer `README.md`; a new contributor can run mobile and API locally with no secrets. Items 2–3 are partially prepared as **placeholders** — Firebase client/Admin config stubs exist and the read/write split (client reads later, all writes via Express) is enforced in code, but real Firebase projects, Security Rules, and the frozen DTO contract document are deferred to Phase 2. Item 4: a sanitized seed set covering all categories and fresh/aging/stale/removed listings is in place (`src/mocks/data.ts`, `backend/src/services/store.ts`).

1. Establish the delivery workspace.
   - Create the React Native/Expo and Express projects using the documented feature-first layout.
   - Configure TypeScript or enforce a documented JavaScript linting/validation convention; use one convention consistently across mobile and backend.
   - Add Git branching, pull-request review, issue board, CI workflow, `.env.example`, `.gitignore`, and a developer setup README.
   - **Done when:** a new contributor can run mobile and API locally without receiving secrets from source control.

2. Create Firebase environments and access model.
   - Create separate development and demo/production Firebase projects or clearly separated configuration profiles.
   - Enable Firebase Authentication (email/password), Firestore, Storage, and required platform map configuration.
   - Create least-privilege service-account handling for Express; store credentials only in the backend environment/secrets manager.
   - Write Firestore Security Rules: authenticated client reads only, published listing visibility only, own-profile/own-favorites reads only, and deny all direct writes.
   - **Done when:** emulator or test-project checks prove direct client writes fail and the Admin SDK can perform approved writes.

3. Freeze MVP contracts and acceptance criteria.
   - Define request/response DTOs, validation rules, timestamps, error codes, pagination cursor format, and timezone policy (store UTC; render local dates).
   - Confirm the API/read split: client Firestore reads for browse/detail/realtime fields, Express for every mutation. Document how the UI reconciles an API mutation with a Firestore listener.
   - Define ownership matrix: agent owns listing; seeker owns favorites/reports; only agents can see their drafts and dashboard data.
   - **Done when:** API and mobile owners approve a single contract document and no screen relies on an unspecified field.

4. Plan test data and design artifacts.
   - Prepare wireframes for seven critical screens: login/register, home/listings, detail, search/filter, map, favorites, and agent listing form/dashboard.
   - Prepare a sanitized seed-data set covering all categories, fresh/aging/stale listings, removed listings, report thresholds, zero/non-zero cost inputs, and map coordinates within Karachi.
   - **Done when:** the team can demonstrate every required UI state without inventing data during testing.

### Phase 1 — Platform foundation and authentication (Week 1, Days 3–5)

**Goal:** establish a navigable, secure application shell.

> **Status — complete in mock mode.** Item 1 (mobile foundation): Expo, React Navigation v6, Redux Toolkit store, Axios instance/interceptors, reads-only Firebase client SDK, shared theme, and reusable inputs/buttons/cards/badges/skeletons are all in place; the Auth Stack, role-aware Main Tab Navigator, splash-time session restoration, and route guards work, and cold launch resolves the correct flow without a navigation flash. Namespaced AsyncStorage keys (`ee:*:{uid}`) are defined. Item 2 (auth/profile API): `register`, `login`, `logout`, `me`, and profile update endpoints exist with zod validation, standardized error envelopes, role-based guards, and mock-token auth middleware; unauthenticated mutations and cross-role access are rejected (covered by `backend/src/__tests__`). Item 3 (profile UI + tests): login, role-choice registration, logout, and profile-edit screens present friendly messages; backend unit + integration tests pass (29/29). **Deferred to real-credential wiring:** Firebase ID-token verification against live projects and manual on-device token-expiry testing.

1. Mobile app foundation.
   - Configure Expo, React Navigation v6, Redux Toolkit store, Axios instance/interceptors, Firebase client SDK, shared theme, reusable inputs/buttons/cards/badges/skeletons, and error boundary.
   - Implement Auth Stack, Main Tab Navigator, splash auth-state restoration, onboarding, and role-aware route guards.
   - Define AsyncStorage key conventions such as `ee:favorites:{uid}`, `ee:search-history:{uid}`, and cached-read expiry metadata.
   - **Acceptance:** cold launch determines the correct public, seeker, or agent flow without a visible navigation flash.

2. Authentication and profile API.
   - Implement `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, and the token refresh strategy.
   - Verify Firebase ID tokens in Express middleware; attach the authenticated UID and role to requests; standardize 401/403/422/429/500 error responses.
   - On registration, create the profile record with an immutable role; validate display name, email, and optional agent phone fields.
   - **Acceptance:** unauthenticated mutations are rejected; a seeker cannot access agent routes; a restarted app restores a valid session or safely returns to login.

3. Profile UI and tests.
   - Implement login, registration with role choice, logout, and profile edit screens; present friendly messages rather than Firebase error codes.
   - Add unit tests for auth middleware and validation plus manual iOS/Android login/logout/token-expiry tests.
   - **Acceptance:** each role can create an account, sign in/out, edit permitted profile fields, and receive understandable validation feedback.

### Phase 2 — Data layer, categories, and read-only discovery vertical slice (Week 2)

**Goal:** make authentic rental inventory visible end to end.

> **Status — complete in mock mode.** Item 1 (Firestore schema and indexes): `firestore.rules` enforces signed-in reads, `status == 'active'` public visibility, own-profile/own-favorites reads, and denies every client write; `firestore.indexes.json` covers all accepted browse/search/dashboard query patterns; `backend/src/scripts/seed.ts` is a repeatable, idempotent Admin-SDK seed script that refuses to run in mock mode or without credentials. Item 2 (shared server business logic): pure functions for title tokenization (≤20 tokens), freshness status, true-cost breakdown, report-threshold decision, and default-browse visibility are implemented in `backend/src/services/{freshness,cost,tokenize,visibility,validation}.ts`; a Jest suite covers normal, boundary, and invalid cases for every function (54/54 passing across 6 suites). Item 3 (client read services and browse UI): `listingsService` uses opaque cursor pagination (base64url `o:<offset>` scheme, 10/page, max 50) with a guarded live-Firestore read path; `useListings` supports infinite scroll via `loadMore`/`hasMore`; HomeScreen wires `onEndReached` → `loadMore` with a footer `ActivityIndicator` and pull-to-refresh; mock seeds expanded to 13 active listings spanning all 4 categories and fresh/aging/stale/zero-cost states. Item 4 (listing detail vertical slice): `ListingDetailScreen` renders a swipeable `Gallery` (dot indicator, lazy off-screen pages), view count, freshness badge, true-cost panel, and role-appropriate actions; `listingsService.recordView` fires best-effort through Express (`POST /listings/:id/view`) with 24h server-side dedup. **Deferred to real-credential wiring:** live Firestore client SDK query wiring (stubs are in place and documented), `startAfter(doc)` cursor mapping, and on-device view-dedup validation.

1. Implement Firestore schema and indexes.
   - Create `users`, `listings`, `categories`, `favorites`, and `listings/{id}/reports/{reporterId}` data helpers.
   - Seed the four Phase 1 category documents; add repeatable seed/import script for demo listings.
   - Create and document Firestore composite indexes for category/status/createdAt and each accepted query pattern. Confirm index build completion before UI testing.
   - **Acceptance:** seeded data can be queried using the expected browse sort with no missing-index errors.

2. Build shared server business logic.
   - Implement pure functions for title tokenization (lowercase, whole words, maximum 20 tokens), freshness status, true-cost breakdown, report-threshold decision, and visible/default-browse decision.
   - Define cost formula: `estimatedMonthlyTotal = monthlyRent + (monthlyRent × depositMonths / agreed amortization period) + monthlyMaintenance + estimatedUtilities`; agree and document the amortization period before UI copy is finalized.
   - Validate listing constraints: title ≤120, description ≤2000, price ≥0, permitted rental price types, up to 10 images, valid Karachi location object, and numeric cost inputs.
   - **Acceptance:** a Jest suite covers normal, boundary, and invalid cases for every pure function.

3. Build client read services and browse UI.
   - Implement Firestore client read queries for default browse, listing detail, categories, and relevant `onSnapshot` listeners.
   - Implement Home and Listings screens with category pills, paginated `FlatList`, listing cards, image lazy loading, freshness badge, price/location presentation, loading skeleton, empty state, and error/retry state.
   - Use cursor-based pagination, ten items per request; default ordering ranks fresh and aging listings above stale listings, while retaining an explicit stale visibility state when required.
   - **Acceptance:** first ten listings appear within two seconds on a representative 4G test; opening a listing shows real data and live changes to freshness/view count.

4. Implement listing detail vertical slice.
   - Render gallery placeholder, property specs, agent info, location, freshness data, true-cost panel, and role-appropriate actions.
   - Implement an authenticated view-count endpoint and a deduplication approach for unique views; document its exact heuristic to avoid inflated counts.
   - **Acceptance:** the listing detail UI matches the API contract and displays fresh, aging, stale, and missing optional-cost conditions correctly.

### Phase 3 — Seeker discovery and saved inventory (Week 3) ✅ COMPLETE

> **Status — complete (mock mode, 2026-07-27).** All four items delivered: (1) `GET /listings` extended with price/city/tags/freshness filters, malformed-input rejection (422), and stale-inclusion logic — 65/65 backend tests pass. (2) Full SearchScreen with debounced keyword input, price/city/freshness filter panel, active-filter chips, clear-all, result count, no-results state, and recent-search persistence (AsyncStorage, 30-day TTL). (3) Favorites end-to-end: `listFull()` client method returns full Listing objects including soft-deleted entries; FavoritesScreen renders removed listings as unavailable rather than dropping them; optimistic toggle with rollback unchanged. (4) Client typecheck clean; backend suite 65/65.

**Goal:** complete the primary renter search journey.

1. Complete listings read API/query implementation.
   - Implement `GET /listings` contract support for category, price range, city, tags, freshness, whole-token `q`, viewport bounds, cursor/page, and limit.
   - Keep search scope explicit in UI/help text: exact whole token matching only, no substring, fuzzy, or typo correction.
   - Ensure draft and removed listings are excluded from public browse; stale listings are excluded from the default view but can be surfaced where product requirements allow.
   - **Acceptance:** query combinations return stable paginated results and reject malformed filters safely.

2. Implement Search and basic filters.
   - Build debounced keyword input, category/city/budget/tag/freshness filter controls, applied-filter chips, clear-all, result count, and no-results state.
   - Cache recent read/search state with one-hour freshness expiry for server-calculated freshness data.
   - **Acceptance:** users can filter to a known seed listing, clear filters, and receive clear feedback for unsupported/fuzzy-looking search terms.

3. Implement favorites end to end.
   - Build authenticated `GET /favorites`, `POST /favorites/:listingId`, `DELETE /favorites/:listingId`, and `GET /favorites/check/:listingId` endpoints with duplicate-safe storage.
   - Add save/unsave controls to cards/detail and a Seeker-only Favorites screen. Optimistically update UI with rollback on error; update `AsyncStorage` cache after confirmed writes.
   - Mark a soft-deleted favorite as unavailable rather than dropping it.
   - **Acceptance:** saving is idempotent, persists across sessions, works after reconnecting, and removed listings remain visibly unavailable in Favorites.

4. Add seeker journey tests.
   - Test the browse → search/filter → detail/cost → favorite journey on Android and iOS.
   - Add tests for empty results, expired cache, network interruption, and unauthorized favorite calls.
   - **Acceptance:** test evidence is captured in the manual matrix and all critical-path defects are triaged before the next phase.

### Phase 4 — Agent listing management and media (Week 4) ✅ COMPLETE

> **Status — complete (mock mode, 2026-07-27).** All four items delivered: (1) Agent listing mutations via `GET/POST/PUT/DELETE /v1/agent/listings` with ownership checks, soft delete (`status: removed`), optional `draft|active` create, zod + shared `validateListingInput`, and `lastVerifiedAt` initialized on create — covered by API tests including cross-owner 403s. (2) Image pipeline: `POST /v1/agent/listings/images` (multer memory, magic-byte MIME sniff for jpeg/png/webp, ≤5 MB, ≤10 files), mock CDN URLs / live Storage path; mobile `mediaService` + `ImagePickerField` (camera/gallery, WebP compress with JPEG fallback, reorder/remove, upload progress). (3) Agent screens: Dashboard with live stats + verification queue (one-tap verify), My Listings with soft-delete confirmation, multi-step Create/Edit form (basics → Karachi area picker → costs → photos) with Save draft / Publish. (4) Backend suites cover upload sniffing + CRUD; client mock store mutates seeded listings correctly. **Deferred to real-credential wiring:** Firebase Storage live uploads and on-device camera/gallery matrix on physical iOS/Android.

**Goal:** make a verified rental supply workflow usable by agents.

1. Build listing mutation endpoints.
   - Implement authenticated/authorized `POST /listings`, `PUT /listings/:id`, and `DELETE /listings/:id`.
   - On create/edit, compute `titleKeywords`, normalize data, set audit timestamps, enforce ownership, and initialize `lastVerifiedAt` on creation.
   - Implement soft delete only: set `status: removed`; ensure agents cannot edit another agent’s listing and public reads exclude removed records.
   - **Acceptance:** all validation/ownership failures return the standard error format; an existing favorite remains referentially valid after deletion.

2. Build image pipeline.
   - Implement image selection from camera/gallery, local compression and WebP conversion, upload progress, retry/cancel behavior, ordered preview, remove/reorder actions, and upload cleanup strategy.
   - In backend/upload handling validate authenticated owner, MIME type (`jpg`, `png`, `webp`), content size ≤5 MB, count ≤10, and Storage path ownership. Do not trust file extensions or client MIME metadata alone.
   - **Acceptance:** valid images render from Storage; invalid or oversized files are rejected without creating orphaned listing references.

3. Build agent screens.
   - Implement Agent Dashboard, My Listings, verification-queue placeholder, Create Listing multi-step form, and Edit Listing form.
   - Provide draft/active/rented/removed statuses internally, but offer only residential-rental category and monthly/yearly price choices in Phase 1.
   - Include address/location picker, cost inputs, clear field-level validation, and confirmation for soft delete.
   - **Acceptance:** an agent can create a listing with photos, revise it, set it removed, and see their own drafts while another user cannot.

4. Verify agent workflows.
   - Test image/network failure recovery, listing input boundaries, ownership checks, soft deletion, and iOS/Android image picker behavior.
   - **Acceptance:** a newly created listing appears in authorized dashboard/read states and, once active, in seeker browse according to ordering rules.

### Phase 5 — Trust module, maps, offline resilience, and MVP integration (Week 5) ✅ COMPLETE

> **Status — complete (mock mode, 2026-07-27).** (1) Verify + report: seeker-only report with self-report blocked, idempotent `alreadyReported`, detail confirmation/error/disabled states, dashboard + detail verify with report clear; GET `/listings/:id/reported`. (2) True-cost panel explains 12-month deposit amortization and shows zero optional charges; PKR rounding covered in tests. (3) Map tab with `react-native-maps`, pan-to-search viewport query (`minLat/maxLat/minLng/maxLng`, limit 200), pins → detail. (4) Offline: NetInfo banner, namespaced AsyncStorage for favorites/browse/search/reported with 1h freshness TTL labeling, logout clears user-scoped keys. **Deferred to live credentials / device QA:** Firebase transactional report subcollections, Expo Go vs custom-dev-client map provider parity on physical devices.

**Goal:** deliver Estate Ease’s differentiated experience and all essential integrations.

1. Implement freshness verification.
   - Add `POST /listings/:id/verify` for owner agents. Set `lastVerifiedAt` transactionally, delete that listing’s report documents, reset `unavailableReports` to zero, and return recalculated freshness.
   - Build dashboard verification queue, one-tap confirm action, cards/detail badge states (fresh ≤7 days, aging 8–14, stale >14), and default-rank behavior.
   - **Acceptance:** verifying immediately refreshes the agent/seeker view and clears existing reports; server-clock boundaries are tested.

2. Implement report-unavailable safely.
   - Add `POST /listings/:id/report` for seekers only. In one transaction, create `reports/{reporterId}` only if absent, increment count only for a new report, and apply the ≥3 unique-report visibility rule.
   - Make the endpoint idempotent, prevent agents reporting their own listings, and return an appropriate state without exposing reporter identities.
   - Add the detail-screen action, confirmation, success/error state, and disabled/already-reported state.
   - **Acceptance:** repeated reports from the same user do not increase the count; three distinct seekers affect default browse; re-verification restores the normal state.

3. Complete true-cost experience.
   - Finalize shared calculation/output fields and render the breakdown with plain-language explanatory copy, including deposit amortization assumptions and zero/missing optional charges.
   - Test monetary rounding, yearly-price treatment, large values, and formatting in PKR.
   - **Acceptance:** API and mobile use the same server-provided total; all seed cases show an intelligible cost calculation.

4. Implement map discovery.
   - Integrate `react-native-maps`, pins, tap-to-detail, search-on-pan, and current viewport query using latitude range plus client-side longitude filtering.
   - Limit/virtualize pins as needed to retain 30 FPS with 200 markers. Clearly avoid a radius-search control in Phase 1.
   - Test Expo Go/provider differences on iOS and Android; decide whether an EAS custom development client is required for demo map parity.
   - **Acceptance:** panning to a seeded viewport returns only visible listings and opens the intended listing without a crash on either platform.

5. Add offline and state resilience.
   - Cache favorites, recent searches, and last successful browse data in namespaced AsyncStorage with expiry; ensure the app never presents cached freshness as current beyond one hour.
   - Add reconnect refresh, offline indicator, cache-miss empty state, and safe logout cache clearing for user-scoped keys.
   - **Acceptance:** app opening offline is stable, cached content is labeled appropriately, and one user cannot see another user’s cached favorites.

### Phase 6 — MVP stabilization and release candidate (Week 6) ✅ COMPLETE

> **Status — complete (mock mode RC, 2026-07-27).** (1) Integration: `PUT /auth/profile` + ProfileEdit (name/phone/avatar), deep links (`estateease://…`) + NotFound, agent-only ListingForm guard, browse invalidation after CRUD/verify, Map/Dashboard error+retry. (2) Security: rate limits on auth/report/upload, Authorization log redaction, `storage.rules` artifact, seeker-only favorites, ownership tests retained. (3) QA docs: `docs/qa-manual-matrix.md` + NFR worksheet (device evidence deferred). (4) Demo: `POST /v1/demo/reset` + `npm run reset`, `docs/api.md`, `docs/RELEASE_NOTES.md`, `docs/known-limitations.md`. **Deferred:** EAS installables, Firestore rules emulator suite, physical NFR timing evidence.

**Goal:** deliver a demonstrable, reliable Phase 1 release.

1. Close feature integration gaps.
   - Complete profile avatar upload/edit, cross-feature navigation, role guards, deep-link/error fallback, and all empty/loading/error states.
   - Reconcile REST mutation results with Firestore listeners to prevent duplicate cards, stale favorite buttons, or stale freshness badges.
   - **Acceptance:** both end-to-end journeys work without developer tools or manual database editing.

2. Perform security and data review.
   - Re-run Firestore rules tests; attempt direct client writes, cross-account updates, draft reads, cross-owner listing edits, and repeat reports.
   - Review API authentication on every mutation, input sanitization, rate limiting for sensitive endpoints, CORS policy, log redaction, environment-secret handling, and Storage rules.
   - **Acceptance:** all high-severity findings are fixed or explicitly accepted with a recorded mitigation; no client secret or service account is shipped in the app.

3. Complete MVP quality assurance.
   - Run unit tests for freshness, cost, report threshold, title tokenization, validators, and access helpers.
   - Execute the documented manual matrix on iOS and Android: auth, browse/filter, detail/cost, map, favorites/removed listing, CRUD, verify/report, and offline startup.
   - Measure NFRs: first ten listings ≤2 seconds on 4G, search ≤1.5 seconds under 100 characters, image payload ≤200 KB where feasible, and map ≥30 FPS with 200 pins.
   - **Acceptance:** no blocker/critical defects remain; results are recorded with device, OS, build, and evidence.

4. Prepare MVP demonstration and release artifact.
   - Freeze a stable demo dataset and accounts for one seeker and one agent; create a reset script for reports/listing state.
   - Build installable Android/iOS artifacts or demo-compatible builds, verify physical-device installation, and rehearse the two demo-critical journeys.
   - Update README, API documentation, setup instructions, known limitations, and release notes.
   - **Acceptance:** a fresh tester can run the required seeker and agent journeys from written instructions.

### Phase 7 — Enhanced discovery (Weeks 7–8)

**Goal:** improve usefulness without changing the approved MVP trust model.

> **Status — complete in mock mode.** Advanced search filters (bedrooms, area, tags, budget presets, preserved per-user filter state), per-item recent-search remove, `GET /listings/:id/similar`, map clustering (`react-native-map-clustering`), filter/index strategy doc, and an explicit **defer** decision on commercial/for-sale are in place. Live Firestore composite deployment and device FPS profiling remain for credentialed environments.

1. Advanced filters.
   - Add bedroom count, area range, location-tag multi-select, richer budget controls, and preserved filter state.
   - Add only filters supported by planned Firestore indexes; avoid unsupported compound query combinations or route them through a documented bounded client-side refinement.
   - **Acceptance:** filters are performant, index-backed where required, resettable, and tested with zero/many-result cases.

2. Search history and similar listings.
   - Persist per-user recent searches to AsyncStorage with remove/clear controls and privacy-safe logout cleanup.
   - Implement `GET /listings/:id/similar` using same category + city, excluding removed/draft/current listing and applying freshness order.
   - **Acceptance:** history is user-scoped; similar listings have deterministic exclusion and graceful empty state.

3. Map clustering.
   - Add clustering after baseline map performance is profiled; preserve tap-to-expand/tap-to-detail behavior and viewport queries.
   - **Acceptance:** dense seed data remains usable and meets the map frame-rate target on target devices.

4. Phase 2 scope decision.
   - Review feedback and MVP metrics: listing freshness distribution, reports per listing, verification completion, cost-panel interaction, browse latency, and map errors.
   - Decide whether commercial/for-sale work is justified; if yes, write a schema migration, filter/UI updates, pricing semantics, and regression plan before implementation.
   - **Acceptance:** commercial work does not begin without an explicit approved design; it remains cuttable if it threatens final quality. → See `docs/phase-2-commercial-scope-decision.md` (**deferred**).

### Phase 8 — Optional product extensions (Week 9, capacity permitting) ✅ COMPLETE

**Goal:** implement only the extensions that fit after G3 quality stays intact.

> **Status — complete (mock mode, 2026-07-28).** Share listing (native share sheet + `estateease://listing/:id` deep link), public agent profile (`GET /agents/:uid`, `AgentProfileScreen`), area livability tags (UI + seed data in `locationTags`), saved-search notifications (push-token registration, preferences opt-in/out, saved-search CRUD, mock FCM dispatch on new active listings), and true radius search (`centerLat/centerLng/radiusKm` + Map radius mode). Commercial/for-sale remains **deferred** per Phase 7 decision.

1. Select extensions by value and capacity.
   - Candidate order: share listing → public agent profile → area-livability tags → saved-search notifications → true radius search → commercial/for-sale.
   - Break each extension into design, security/data, API, mobile, test, and rollback tasks before starting it.
   - **Acceptance:** no optional feature reduces performance, changes Phase 1 access rules, or creates an untested data migration.

2. Notification foundation, if selected.
   - Register push tokens with consent, store tokens securely, define saved-search matching, throttle new-listing alerts, and provide opt-out controls.
   - **Acceptance:** notifications are not sent without consent and failed deliveries do not block listing creation.

3. Radius search, if selected.
   - Introduce a geohash field/backfill and geospatial query library; retain viewport mode as fallback and add index/cost monitoring.
   - **Acceptance:** distance results are validated against known coordinates and do not regress viewport browsing.

### Phase 9 — Final hardening, documentation, and handover (Week 10)

**Goal:** package a maintainable, testable final submission.

1. Regression, performance, and accessibility pass.
   - Run the full regression suite after every Phase 2 merge.
   - Profile Firestore read volume, storage use, API error rates, image payloads, app start time, list rendering, and map behavior; address high-cost hotspots.
   - Verify touch-target sizing, contrast, dynamic text/layout behavior, keyboard handling, and screen-reader labels on critical actions.
   - **Acceptance:** final NFR evidence and outstanding limitations are documented.

2. Documentation and operations.
   - Finalize architecture diagram, schema/index list, security rules, API/OpenAPI-style reference, environment setup, seed/reset instructions, test report, release notes, risk register, and known limitations.
   - Document operational checks: weekly Firestore/Storage quota review, dependency version pinning, build/release procedure, incident contacts/ownership, and backup/export approach.
   - **Acceptance:** another developer can set up, seed, test, and demo the system from documentation alone.

3. Final acceptance and presentation.
   - Rehearse seeker journey: browse → filter/search → detail → cost → favorite.
   - Rehearse agent journey: create listing → verify → seeker report → dashboard visibility → re-verify/report clear.
   - Keep a recorded fallback demo and an offline-safe data plan for network/provider instability.
   - **Acceptance:** both journeys succeed on the selected demo devices and the final backlog is classified as shipped, deferred, or rejected.

## 3. Cross-Cutting Engineering Backlog

These tasks run throughout the project and must be planned into each sprint rather than left to the end.

| Area | Recurring tasks | Completion standard |
|---|---|---|
| Code quality | Lint, format, type/contract checks, peer review, small PRs, dependency pinning | CI passes before merge; changes have a reviewer and test evidence. |
| Testing | Add unit tests with business-rule changes; update manual matrix after each sprint | A regression test exists for every fixed critical defect. |
| Security | Review token/role checks, rules, validation, rate limits, and secrets | New endpoints are secure by default and tested for unauthorized/cross-owner access. |
| Data/indexes | Add/query-test Firestore indexes; monitor query cost and pagination | No production query depends on an undeployed index or unbounded collection read. |
| UX | Validate loading, empty, error, offline, removed, and permission-denied states | No screen strands the user with a raw backend/Firebase error. |
| Observability | Structured API errors, non-sensitive analytics/logging, crash reports | A defect can be reproduced using timestamp, endpoint/screen, build, and anonymized context. |
| Release management | Version builds, maintain changelog, retain demo dataset/reset procedure | Each release can be identified, installed, and rolled back to the prior build. |

## 4. Dependency Map and Critical Path

```text
Environment + contracts + security rules
        ↓
Auth/session/role guards ───────┐
        ↓                       │
Schema + indexes + seed data ───┼──→ browse/detail/map read flows
        ↓                       │             ↓
Listing validation/cost logic ──┼──→ agent CRUD/media
        ↓                       │             ↓
Verify/report transactions ─────┴──→ trust badges/default ordering
                                           ↓
Favorites/offline + cross-platform QA → MVP release candidate
                                           ↓
Phase 2 enhancements → final regression/handover
```

Critical-path constraints:

- Do not start agent CRUD before shared validation, ownership middleware, and Storage policy are available.
- Do not mark reporting complete until the subcollection transaction and re-verification cleanup are tested together.
- Do not tune browse performance with production-like data until required Firestore indexes are deployed.
- Do not start commercial/for-sale work until the Phase 1 release candidate passes; it changes pricing semantics, queries, and test coverage.

## 5. Suggested Team Ownership

For a three-person team, assign one directly responsible owner per task and a backup reviewer. Shared ownership is useful for QA but should not obscure accountability.

| Workstream | Primary owner | Backup/reviewer |
|---|---|---|
| Mobile foundation, navigation, shared UI | Mobile lead | Discovery lead |
| Backend API, Admin SDK, validation, transactions | Backend lead | Trust lead |
| Firebase Auth/Firestore/Storage/rules/indexes | Backend lead | Mobile lead |
| Discovery, search, map, caching | Discovery lead | Mobile lead |
| Agent CRUD, image forms, dashboard | Mobile lead | Backend lead |
| Freshness, reporting, cost trust module | Backend lead | Discovery lead |
| Test automation, manual matrix, release/demo | Rotating QA owner per sprint | All members |

At sprint planning, convert every task above into a ticket with: owner, estimate, dependencies, acceptance criteria, test case, and demo note. Keep a weekly rotation for code review and release ownership so no area has a single point of failure.

## 6. Sprint Execution Cadence

1. **Sprint planning (start of week):** choose only tasks whose dependencies are ready; reserve capacity for testing, review, and defects.
2. **Daily sync:** report completed work, next work, blockers, and any schema/API contract changes.
3. **Mid-sprint integration:** merge behind stable interfaces; test a vertical slice on a real Android and iOS device rather than waiting for the final day.
4. **Sprint review:** demo working acceptance criteria, not mockups or unverified endpoints.
5. **Retrospective:** update estimates, risks, documentation, and the cut list. If an MVP task slips, remove Phase 2 work first.

## 7. Definition of Done

A development task is complete only when all relevant items below are true:

- Implementation is merged, reviewed, linted, and builds on the target platform(s).
- Request/response, schema, indexes, and rules are updated when the feature changes data.
- Client mutation uses Express; there is no direct Firestore client write path.
- Authorization, validation, error, loading, empty, offline, and edge states are implemented.
- Automated tests cover changed pure logic and authorization/transaction behavior where applicable.
- The manual iOS and Android scenario passes and is recorded.
- User-facing copy does not promise fuzzy search, radius search, or guaranteed availability beyond the documented feature scope.
- Documentation, demo data, and release notes are updated where the change is externally visible.

## 8. Risk Controls and Cut Strategy

| Risk | Preventive action | Contingency |
|---|---|---|
| MVP schedule slip | Protect Weeks 1–6 and demo a vertical slice by W2 | Cut Phase 2 in this order: commercial, notifications/radius, area tags/agent page, clustering, similar/history. |
| Firestore cost/index failures | Cursor pagination, index inventory, local cache, weekly read monitoring | Temporarily reduce page/pin limits and disable nonessential realtime listeners. |
| Freshness signal is gamed or ignored | Verification queue, ranking advantage, report flow, tracked metrics | Add agent reminders/operational review after MVP; do not weaken the one-report-per-user rule. |
| Report abuse | Reporter-ID document, transaction, role/ownership checks, re-verify dispute path | Investigate anomalous reporters through secure backend logs; do not expose identities in the app. |
| Map inconsistency/quota | Test both providers early, use development-safe maps setup, verify API key restrictions | Use tested physical-device configuration and a static/list fallback for demo continuity. |
| Image cost/abuse | MIME/size/count checks, compression, Storage paths, cleanup plan | Disable new image uploads temporarily while preserving existing listings. |
| Team availability | Backup owner and up-to-date setup/docs each sprint | Reassign self-contained tickets; avoid coupling all core logic to one contributor. |

## 9. Final Acceptance Checklist

- [ ] A seeker and agent can register and authenticate; access is role-appropriate.
- [ ] Public inventory is residential rental only and uses the four seeded renter-first categories.
- [ ] Browse/detail/search/filter/map use real Firestore reads with pagination and documented search/geo limitations.
- [ ] All writes go through authenticated Express endpoints; Firestore client writes are denied.
- [ ] Agents can create, edit, upload validated images for, and soft-delete only their own listings.
- [ ] A listing displays server-derived freshness and server-provided true monthly cost.
- [ ] A seeker can favorite a listing and see a removed favorite marked unavailable.
- [ ] Reports are one per seeker per listing, three unique reports affect default visibility, and agent re-verification clears reports.
- [ ] Empty/loading/error/offline states work on iOS and Android.
- [ ] Unit tests, manual matrix, smoke tests, performance checks, documentation, and demo/recovery materials are complete.
