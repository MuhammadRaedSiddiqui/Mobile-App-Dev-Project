# Phase 9 — Final hardening, documentation, and handover

This document captures the Phase 9 handoff and final delivery checklist for Estate Ease.

## Status

Phase 8 feature extension work is implemented in mock mode:
- share listing deep links
- public agent profiles
- radius search
- saved-search notifications
- area livability tags

Phase 9 focuses on final validation, documentation, and operational readiness.

## Phase 9 goals

1. Regression, performance, and accessibility pass.
2. Documentation and operations are complete.
3. Final acceptance and presentation are rehearsed.

## Tasks

### Regression and QA

- Run the full backend Jest suite and confirm all tests pass.
- Run Expo typecheck and lint on the mobile app.
- Execute the manual QA matrix in `docs/qa-manual-matrix.md` on at least one iOS and one Android device.
- Capture evidence for each NFR spot-check:
  - first 10 listings load ≤2s on a representative mobile network
  - search response ≤1.5s for 100-character queries
  - image compression remains acceptable for listing uploads
  - map with a dense dataset retains usable performance
- Update the manual matrix with device, OS, and build details.

### Performance and stability

- Profile map performance and verify clustering works on target devices.
- Confirm no regressions in list rendering, scrolling, or infinite loading flows.
- Validate network error handling and retry states across browse, map, detail, and agent flows.
- Verify offline startup does not crash and cached content is labeled correctly.

### Accessibility

- Confirm touch targets and spacing for primary controls.
- Validate text contrast, font scaling, and layout behavior on large text settings.
- Ensure screen-reader labels are present for all critical actions, including share, save, report, verify, and form submission.
- Check keyboard behavior and focus order on forms and modal dialogs.

### Documentation and handover

- Update `README.md` with Phase 8 and Phase 9 status, demo instructions, and setup notes.
- Ensure `docs/RELEASE_NOTES.md` reflects the current build scope and known limitations.
- Confirm `docs/qa-manual-matrix.md` is current and includes the Phase 9 checklist.
- Review `docs/known-limitations.md` and include any remaining known gaps.
- Add or update operational notes for:
  - demo reset procedure
  - dependency pinning and version strategy
  - environment setup and mock-mode configuration
  - handover contact points and rollover plan

### Acceptance criteria

- A new developer can run the app and backend locally using only the README and docs.
- All critical Phase 1/8 user journeys are confirmed on the selected demo devices.
- Remaining deferred items are documented as either "deferred" or "rejected" with rationale.
- The final release notes and QA evidence are complete.

## Next steps

- Schedule a final review of the Phase 9 checklist with the team.
- Collect and attach measured performance data to `docs/qa-manual-matrix.md`.
- Identify any immediate issues and resolve them before final handoff.
