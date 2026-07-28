# Phase 2 commercial / for-sale scope decision

**Date:** 2026-07-27  
**Decision:** **Defer / reject for current delivery.** Commercial and for-sale listings are **not** justified to start before Phase 9 quality gates.

## Inputs reviewed

| Signal | Observation (mock / MVP RC) |
|--------|-----------------------------|
| Freshness distribution | Seed set covers fresh / aging / stale; seeker default browse still hides stale |
| Reports per listing | Idempotent seeker report + agent re-verify path works; volume is demo-scale only |
| Verification completion | Agent re-verify clears reports; no production completion metrics yet |
| Cost-panel interaction | True monthly cost ships; no separate analytics funnel |
| Browse latency | Mock + Express pagination acceptable; live Firestore cost unknown |
| Map errors | Viewport query + clustering in place; provider/EAS still a known limitation |

## Why commercial stays cuttable

1. **MVP contract is residential rentals only** — `priceType: total`, sales inventory, and commercial categories would change schema, filters, cost semantics, and agent UX.
2. **No approved migration** — introducing `priceType: 'total'` / commercial categories without a written schema + regression plan violates Phase 7 acceptance.
3. **Quality risk** — Phase 8–9 capacity is better spent on live Firebase wiring, EAS builds, and NFR evidence than a second inventory model.

## Conditions to reopen

Commercial/for-sale may be designed **only after**:

1. Explicit product approval (written), and  
2. A migration doc covering: schema fields, indexes, filter/UI updates, pricing semantics (`monthly` vs `total`), Security Rules, and a regression plan, and  
3. Confirmation that Phase 1 trust rules (freshness, report, cost) remain unchanged for residential rentals.

Until then, do **not** expose commercial UI, sale pricing, or `priceType: total` in the client.
