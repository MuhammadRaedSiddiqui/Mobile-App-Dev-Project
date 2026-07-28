# Known limitations — Estate Ease MVP RC

## Deferred / not in this build

- **Live Firebase** — Auth ID-token verification, Firestore client reads, Admin Storage uploads, and emulator rules tests are not wired. Mock mode is the supported local path.
- **EAS / store installables** — No `eas.json` or checked-in native projects; demo via Expo Go / local API. Custom-dev-client may be required for full map provider parity on some devices.
- **Firestore listeners** — Browse refresh after agent mutations uses a generation counter + refetch, not realtime `onSnapshot`.
- **Contact agent** — Detail CTA is a placeholder (no dialer/WhatsApp deep link yet).
- **Commercial listings** — Deferred per `docs/phase-2-commercial-scope-decision.md`.
- **Client unit test suite** — Backend Jest covers trust/CRUD/upload/filters/similar; mobile has typecheck + lint in CI only.
- **Image ≤200 KB** — Best-effort WebP compress loop; not asserted with byte measurement in CI.
- **Map FPS on device** — Clustering is enabled; formal frame-rate profiling on target devices is still pending for Phase 9.

## Accepted mitigations

| Finding | Mitigation |
|---------|------------|
| Rate limits in-memory only | Sufficient for single-node mock/demo; replace with Redis-backed limiter before multi-instance production |
| Demo reset unauthenticated | Bound to `MOCK_MODE=true`; disabled in live |
| Storage rules undeployed | Artifact committed (`storage.rules`); deploy with Firebase project when credentials exist |
| Deep links while logged out | Linking enabled only when authenticated; cold-link after login is a follow-up |

## Security posture (RC)

- Client Firestore writes denied by rules; no service account in the app
- Mutations authenticated; agent ownership enforced; seeker-only favorites/report
- Upload MIME sniffed from magic bytes (jpeg/png/webp), ≤5 MB, ≤10 files
- Morgan logs redact `Authorization`
