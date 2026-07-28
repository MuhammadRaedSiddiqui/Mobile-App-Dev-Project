# Release notes — Phase 8 optional extensions (mock mode)

**Version:** 0.1.0-rc  
**Date:** 2026-07-28  
**Mode:** Mock data by default (`useMockData` / `MOCK_MODE=true`)

## What’s in this build

- Seeker: browse, **advanced search** (beds, area, tags, budget presets, preserved filters), detail (true cost + freshness + **similar listings**), **clustered** map, **radius search**, favorites, report-unavailable, offline cache/banner
- Agent: dashboard verification queue, multi-step create/edit, soft-delete, image upload pipeline
- Profile edit (display name, agent phone, avatar)
- Notifications: saved-search alerts with push consent, notification preferences, saved-search management
- Public agent profile pages and native listing sharing with `estateease://listing/:id`
- Profile edit (display name, agent phone, avatar)
- Deep links: `estateease://listing/:id`, `estateease://agent/:agentId`, tabs, NotFound fallback
- API: `GET /listings/:id/similar`; bedrooms/area filters; radius search; notification routes; rate limits; demo reset
- Scope: commercial/for-sale **deferred** — `docs/phase-2-commercial-scope-decision.md`

## Phase 9 — final hardening & handover

Phase 9 focuses on regression, performance, accessibility, and delivery documentation:

- Complete the full regression suite and capture device evidence
- Validate critical NFRs for listing load, search, images, and map performance
- Confirm accessibility labels, touch targets, and keyboard/navigation behavior
- Finalize setup, reset, release, and incident documentation
- Ensure another developer can run, seed, test, and demo the system from docs alone

## How to run a demo

1. `cd backend && npm install && npm run dev`
2. `POST http://localhost:4000/v1/demo/reset`
3. Root: `npm install && npm start` → Expo Go
4. Seeker: ayesha@example.com / password123  
   Agent: danish@example.com / password123
5. Walkthroughs: seeker browse→filter→detail→cost→favorite→report; agent create→verify→clear reports

See `docs/qa-manual-matrix.md` for the full checklist.

## Known limitations

See `docs/known-limitations.md`.
