# Phase 9 Task Analysis — Final Validation and Handoff

This document is a Phase 9-specific verification plan for the current Estate Ease MVP build. It focuses on final regression, performance, accessibility, and documentation checks for the features already implemented in mock mode.

## Overview

Phase 9 is not about adding new feature scope. It is about validating the existing Phase 8 implementation, confirming the build is stable and deliverable, and capturing evidence for handoff.

## Phase 9 objectives

- Confirm Phase 8 features work end-to-end in mock mode.
- Verify regression coverage for auth, browse, map, listing detail, favorites, agent workflows, and deep links.
- Validate non-functional criteria: performance, offline resilience, accessibility, and documentation completeness.
- Capture evidence and operational notes necessary for handoff.

## Setup

1. Start the backend API:
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. Start the Expo app:
   - `cd ..`
   - `npm install`
   - `npm start`
3. Confirm the Expo Metro server is running and reachable on a local port.
4. Confirm mock mode is active:
   - `app.json` / `expo.extra.useMockData` should be `true`
   - `backend/.env.example` or `.env` should have `MOCK_MODE=true`
5. Reset demo state before a full walkthrough:
   - `POST http://localhost:4000/v1/demo/reset`

## Demo accounts

- Seeker: `ayesha@example.com` / `password123`
- Agent: `danish@example.com` / `password123`

## Phase 8 implemented scope

This checklist is built on the current Phase 8 delivery in mock mode. Verify the following Phase 8 features as part of Phase 9 final QA:
- Seeker browse/search/detail with true cost, freshness, similar listings, and favorites
- Clustered map discovery and radius-based viewport queries
- Agent create/edit/soft-delete listings and verification queue
- Saved-search notifications, native share links, public agent profiles, and deep-link routing
- Offline error handling, cached content labels, and demo reset support

## Verification categories

1. Auth and session handling
2. Browse, search, and listing detail
3. Map discovery and radius search
4. Favorites and removed listings
5. Agent listing management and trust
6. Phase 8 feature verification
7. Offline and resilience
8. Deep links
9. Non-functional requirements
10. Backend/API and operational checks

## 1. Auth and session handling

### A1. Cold launch path
- Steps:
  1. Launch the app from a fresh start.
  2. Observe splash, then login screen.
- Expected:
  - No flash of a wrong role shell.
  - App lands on login/registration without delay.
- Evidence:
  - Screenshot or video of startup flow.

### A2. Seeker login and navigation
- Steps:
  1. Log in as seeker.
  2. Confirm the Seeker tab bar is shown.
- Expected:
  - Access to Home, Search, Map, Favorites, Profile.

### A3. Agent login and navigation
- Steps:
  1. Log in as agent.
  2. Confirm the Agent tab bar is shown.
- Expected:
  - Access to Dashboard, My Listings, Profile.

### A4. Failed login handling
- Steps:
  1. Attempt login with a wrong password.
- Expected:
  - Friendly error displayed.
  - No raw Firebase error codes shown.

### A5. Registration flow
- Steps:
  1. Create a new seeker or agent account.
- Expected:
  - Account is created.
  - Role is immutable after creation.

### A6. Logout behavior
- Steps:
  1. Logout from seeker or agent.
  2. Restart the app.
- Expected:
  - Session is cleared.
  - User caches are cleared.

### A7. Profile edit
- Steps:
  1. Edit display name / phone / avatar.
  2. Save and restart.
- Expected:
  - Profile changes persist.

## 2. Browse, search, and listing detail

### B1. Home listing load
- Steps:
  1. Open Home as seeker.
- Expected:
  - First page loads ≤10 listings.
  - Freshness badges appear correctly.
  - Target: ≤2 seconds on a representative network.

### B2. Category filtering
- Steps:
  1. Tap category pills in Home.
- Expected:
  - Listings filter to the selected category.

### B3. Pagination and refresh
- Steps:
  1. Scroll to the bottom of Home.
  2. Trigger pull-to-refresh.
- Expected:
  - More listings load.
  - Refresh reloads content.

### B4. Search and filter panel
- Steps:
  1. Open Search.
  2. Enter text, set bedroom/area/tag/budget filters.
  3. Clear all filters.
- Expected:
  - Debounced search behavior.
  - Filters apply correctly.
  - Filters are preserved across navigation.

### B5. Recent search management
- Steps:
  1. Save or run searches.
  2. Remove recent searches.
- Expected:
  - Recent searches are stored per user.
  - Removal works correctly.

### B6. Similar listings rail
- Steps:
  1. Open a listing detail.
  2. View the similar listings section.
- Expected:
  - Similar listings do not include the current listing.
  - Empty state displays gracefully.

### B7. Listing detail and cost
- Steps:
  1. Open a listing.
- Expected:
  - Gallery loads images.
  - Cost breakdown shows true monthly cost and deposit amortization.
  - View count updates via `POST /listings/:id/view`.

### B8. Favorites toggling
- Steps:
  1. Save/unsave listings from cards and detail.
- Expected:
  - UI updates optimistically.
  - Rollback occurs on error.

## 3. Map discovery and radius search

### M1. Map view baseline
- Steps:
  1. Open the Map tab.
- Expected:
  - Karachi pins appear.
  - Map renders without immediate errors.

### M2. Viewport query
- Steps:
  1. Pan/zoom the map.
- Expected:
  - Listings refresh after debounce.

### M3. Clustering and pin detail
- Steps:
  1. Tap clusters / pins.
- Expected:
  - Clusters expand.
  - Pin callout navigation opens detail.

### M4. Radius search mode
- Steps:
  1. Switch to radius mode.
  2. Change radius value.
- Expected:
  - Listings update based on radius.
  - UI shows radius state text.

### M5. Map retry on failure
- Steps:
  1. Simulate a map data error (if possible).
- Expected:
  - Retry option appears.

## 4. Favorites and removed listings

### F1. Favorites persistence
- Steps:
  1. Save favorites.
  2. Restart and reload.
- Expected:
  - Favorite list persists.

### F2. Soft-deleted favorite handling
- Steps:
  1. Remove a favorite listing.
  2. View the Favorites screen.
- Expected:
  - Soft-deleted listing remains visible as unavailable.

## 5. Agent listing management and trust

### G1. Create listing
- Steps:
  1. Agent creates a listing with photos.
  2. Complete the multi-step form.
- Expected:
  - Listing is created.
  - Photos upload and render.

### G2. Edit and soft-delete
- Steps:
  1. Edit an existing listing.
  2. Soft-delete it.
- Expected:
  - Edits persist.
  - Soft-delete shows confirmation.
  - Listing status changes to removed.

### G3. Verify queue behavior
- Steps:
  1. Use the dashboard verify action.
- Expected:
  - `lastVerifiedAt` updates.
  - Freshness resets.
  - Browse reflects the verified state.

### G4. Report unavailable
- Steps:
  1. Seeker reports a listing.
  2. Attempt duplicate reports.
- Expected:
  - Report is recorded once per user.
  - After 3 distinct reports, listing is suppressed.
  - Agent-owned reports are blocked.

### G5. Guarded route access
- Steps:
  1. As seeker, open a ListingForm deep link.
- Expected:
  - User is routed to NotFound.

## 6. Phase 8 optional extensions

### P8.1 Share listing
- Steps:
  1. Tap the share icon on detail.
- Expected:
  - Native share sheet opens with a deep link.
  - Shared URL is `estateease://listing/:id`.

### P8.2 Public agent profile
- Steps:
  1. Open an agent profile.
- Expected:
  - Public profile loads.
  - Active listings only.

### P8.3 Notifications settings
- Steps:
  1. Enable push notifications.
  2. Toggle saved-search alerts.
- Expected:
  - Preferences save correctly.
  - Push token registration is invoked in mock mode.

### P8.4 Saved-search management
- Steps:
  1. Save a search from Search.
  2. List and delete saved searches.
- Expected:
  - Saved searches appear.
  - Delete removes them.

### P8.5 Radius search API
- Steps:
  1. Query listing API with `centerLat`, `centerLng`, `radiusKm`.
- Expected:
  - Results are limited by distance.
  - `lst-001` is included when appropriate and distant listings excluded.

## 7. Offline and resilience

### O1. Offline startup
- Steps:
  1. Launch with no network.
- Expected:
  - Offline banner appears.
  - App does not crash.

### O2. Cached content labeling
- Steps:
  1. Use cached browse/favorites data.
- Expected:
  - Cached state is labeled.
  - Freshness >1h is flagged.

### O3. Offline error handling
- Steps:
  1. Turn network off mid-session.
- Expected:
  - Retry / error messages appear gracefully.

## 8. Deep links

### D1. Listing deep link
- Steps:
  1. Open `estateease://listing/lst-001` while authenticated.
- Expected:
  - Listing detail screen opens.

### D2. Unknown deep link
- Steps:
  1. Open an invalid path.
- Expected:
  - NotFound screen appears.

## 9. Non-functional requirements

### NFR1. Load performance
- Verify first 10 listings load under 2s on a representative connection.

### NFR2. Search performance
- Verify 100-character search completes under 1.5s.

### NFR3. Image payloads
- Verify listing image uploads are compressed and reasonably sized.

### NFR4. Map performance
- Verify map remains usable with 200 pins and clustering enabled.

### NFR5. Accessibility
- Verify touch targets, contrast, font scaling, and screen-reader labels.

## 10. Backend/API and operational checks

### B1. Demo reset
- Confirm `POST /v1/demo/reset` returns success in mock mode.

### B2. Typecheck and lint
- Root frontend: `npm run typecheck`, `npm run lint`
- Backend: `npm run typecheck`, `npm run lint`

### B3. Backend tests
- Confirm `npm test` in `backend` passes all suites.

### B4. Expo server health
- Confirm local Expo server responds on `http://127.0.0.1:8082`.
- Confirm `index.exp?platform=android` returns a valid manifest.

### B5. Known limitations review
- Confirm any remaining limitations are documented in `docs/known-limitations.md`.

## Evidence and reporting

For each verified task, capture:
- Device / OS / build details
- Pass/fail result
- Notes on any deviations or issues
- Screenshots or terminal output when relevant

## Suggested follow-up

- Add results to `docs/qa-manual-matrix.md`.
- Update `docs/phase-9-final-handover.md` with completed evidence.
- Log any defects in issue tracking with reproduction steps and severity.
