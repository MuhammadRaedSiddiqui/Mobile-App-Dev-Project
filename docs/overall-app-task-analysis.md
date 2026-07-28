# Overall App Task Analysis — Estate Ease Verification

This document is the overall app verification plan for Estate Ease. It covers end-to-end behavior across the whole mobile app and backend delivery, including Phase 1 MVP scope, Phase 8 feature extensions, and Phase 9 final hardening.

## Purpose

- Provide a single reference for overall product validation.
- Confirm all key app areas work in mock mode locally.
- Capture regression, performance, accessibility, and documentation checks.
- Support handoff by listing the full app scope and acceptance criteria.

## Setup

1. Start the backend API:
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. Start the Expo app:
   - `cd ..`
   - `npm install`
   - `npm start`
3. Confirm local environment:
   - `app.json` / `expo.extra.useMockData` is `true`
   - `backend/.env.example` or `.env` includes `MOCK_MODE=true`
4. Reset demo state before the walkthrough:
   - `POST http://localhost:4000/v1/demo/reset`

## Demo accounts

- Seeker: `ayesha@example.com` / `password123`
- Agent: `danish@example.com` / `password123`

## Overall app scope

The overall app includes:
- Seeker experience: browse, search, map discovery, favorites, listing detail, offline resilience
- Agent experience: listing creation/editing, verification queue, soft-delete, public agent profiles
- Notifications: saved-search alerts, permission consent, preferences
- Deep links: listing, agent, tabs, and NotFound fallback
- Backend APIs: listings, search filters, radius search, notifications, reports, demo reset, rate limiting
- Phase 9 handoff: regression, performance, accessibility, documentation, QA evidence

## Verification categories

1. Auth and onboarding
2. Seeker browsing and search
3. Listing detail and cost calculations
4. Map exploration and radius search
5. Favorites, reports, and soft deletes
6. Agent listings and trust workflows
7. Shared and public agent experiences
8. Notifications and saved search
9. Offline resilience and error handling
10. Deep links and navigation
11. Non-functional requirements
12. Backend/API and operational readiness
13. Documentation and handoff completeness

## 1. Auth and onboarding

### A1. Cold launch
- Launch the app from a cleared state.
- Verify splash → login/registration appears cleanly.
- Confirm no stale role shell is shown.

### A2. Login and role routing
- Log in as seeker.
- Log in as agent.
- Verify correct tab sets and role-specific home screens.

### A3. Registration
- Create a new seeker account.
- Create a new agent account.
- Confirm role selection is enforced and cannot be changed later.

### A4. Authentication errors
- Attempt login with invalid credentials.
- Confirm user-friendly error messages.
- Confirm no raw Firebase or internal error text leaks.

### A5. Logout and session clearing
- Log out from seeker and agent flows.
- Restart the app.
- Confirm session is cleared and login appears.

### A6. Profile management
- Update display name, phone, avatar.
- Save and restart.
- Confirm changes persist.

## 2. Seeker browsing and search

### B1. Home browsing
- Open the seeker home screen.
- Verify listings appear with freshness badges and category action pills.
- Confirm initial page load is responsive.

### B2. Search filtering
- Enter search text and apply filters by bedrooms, area, tags, and budget.
- Verify the filter panel works and preserves state across navigation.
- Confirm clear-all resets filters.

### B3. Recent searches
- Use recent search history.
- Delete recent searches.
- Confirm per-user persistence.

### B4. Related content
- Open listing detail.
- Confirm the similar listings rail displays relevant alternatives.
- Confirm the current listing is not repeated.

### B5. Listing list actions
- Save/unsave favorites from cards.
- Confirm UI feedback and optimistic updates.

## 3. Listing detail and cost calculations

### C1. Detail content
- Open a listing detail.
- Confirm gallery images load.
- Confirm amenities, area, bedroom, and price data are accurate.

### C2. Cost breakdown
- Verify monthly cost and deposit amortization are shown.
- Confirm the cost panel language is clear and consistent.

### C3. View tracking
- Navigate to detail.
- Confirm the backend view counter updates via API.

### C4. Reporting unavailable
- Report a listing as unavailable.
- Confirm report feedback and duplicate report protection.

## 4. Map exploration and radius search

### D1. Map display
- Open the Map tab.
- Confirm Karachi listings pins appear.
- Verify map loads without runtime errors.

### D2. Viewport queries
- Pan and zoom the map.
- Confirm listings refresh after debounce.

### D3. Clusters and callouts
- Tap a cluster or pin.
- Confirm cluster expansion and detail navigation.

### D4. Radius search
- Activate radius search mode.
- Adjust radius values.
- Confirm search results match the area and radius state UI updates.

### D5. Error handling
- Simulate a map fetch problem if possible.
- Confirm retry controls appear and recover gracefully.

## 5. Favorites, reports, and soft deletes

### E1. Favorites persistence
- Save favorites.
- Restart the app.
- Confirm favorites persist.

### E2. Removed listing handling
- Soft-delete a listing as an agent.
- Verify favorites and related screens display the removed state instead of dropping silently.

### E3. Report flow
- Report a listing as unavailable.
- Confirm one report per user and agent report restrictions.

## 6. Agent listings and trust workflows

### F1. Listing creation
- Create a listing with photos and required details.
- Confirm the multi-step form is navigable.
- Confirm uploaded photos display correctly.

### F2. Listing edit
- Edit an existing listing.
- Confirm details update and persist.

### F3. Soft-delete
- Soft-delete a listing.
- Confirm the listing is flagged removed and agent dashboards reflect the state.

### F4. Verification queue
- Use the verify action on the agent dashboard.
- Confirm `lastVerifiedAt` updates and listing freshness resets.

### F5. Guarded actions
- Confirm seeker routes do not allow agent-only listing form access.
- Verify proper fallback or NotFound behavior.

## 7. Shared and public agent experiences

### G1. Share listing
- Use the native sharing action from listing detail.
- Confirm the share sheet includes a deep link.

### G2. Public agent profile
- Open an agent profile page.
- Confirm public profile data loads and shows only active listings.

## 8. Notifications and saved search

### H1. Notification permission
- Grant or deny push permission.
- Confirm the app handles both cases cleanly.

### H2. Saved searches
- Save a search.
- View saved searches.
- Delete a saved search.
- Confirm changes persist and UI updates.

### H3. Notification preferences
- Update notification preferences.
- Confirm preference values are saved.

## 9. Offline resilience and error handling

### I1. Offline startup
- Launch with network disabled.
- Confirm the app shows an offline banner and does not crash.

### I2. Cached content
- Navigate while offline and use cached listing/favorite data.
- Confirm cached state is labeled.

### I3. Retry handling
- Lose network mid-session.
- Confirm retry or error states are presented gracefully.

## 10. Deep links and navigation

### J1. Listing deep links
- Open `estateease://listing/lst-001` while authenticated.
- Confirm the listing detail screen opens.

### J2. Agent deep links
- Open `estateease://agent/:agentId`.
- Confirm the public agent screen opens.

### J3. Unknown routes
- Open an invalid deep link.
- Confirm the NotFound screen appears.

## 11. Non-functional requirements

### K1. Performance
- Validate first load of 10 listings within target time.
- Validate full-text search under 1.5 seconds for 100-character queries.
- Validate acceptable map performance with clustering.

### K2. Accessibility
- Confirm screen-reader labels on primary actions.
- Confirm touch target sizes and contrast.
- Confirm layouts do not break under large font settings.

### K3. Stability
- Confirm no crashes during core journeys.
- Confirm all primary screens recover from errors.

## 12. Backend/API and operational readiness

### L1. Demo reset
- Confirm `POST /v1/demo/reset` works in mock mode.

### L2. Tests and typecheck
- Backend: `npm test`, `npm run typecheck`, `npm run lint`
- Frontend: `npm run typecheck`, `npm run lint`

### L3. Expo and API health
- Confirm the Expo Metro manifest is reachable.
- Confirm `GET /listings` and key route responses are valid.

### L4. Known limitations
- Confirm `docs/known-limitations.md` reflects remaining gaps.
- Confirm deferred items are documented and justified.

## 13. Documentation and handoff completeness

### M1. README coverage
- Confirm `README.md` includes setup, mock mode, demo accounts, and Phase 8/9 status.

### M2. Release notes
- Confirm `docs/RELEASE_NOTES.md` accurately lists completed scope and pending limitations.

### M3. QA evidence
- Confirm `docs/qa-manual-matrix.md` is updated with device, OS, build, and pass/fail notes.

### M4. Handoff notes
- Confirm `docs/phase-9-final-handover.md` is current.
- Confirm operational notes cover demo reset, version strategy, mock-mode config, and run instructions.

## Acceptance criteria

- A developer can run the app and backend locally using only the docs.
- Core seeker and agent journeys are validated end-to-end in mock mode.
- Phase 8 feature delivery is confirmed and any remaining limitations are documented.
- Performance, accessibility, and stability spot checks are completed.
- Handoff documentation is complete and consistent with the current code state.
