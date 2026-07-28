# Filter & index strategy (Phase 7)

Estate Ease browse filters are designed so every common combination is either **index-backed** or **bounded client-side refinement** after an indexed query.

## Server query params (`GET /v1/listings`)

| Param | Behavior |
|-------|----------|
| `category`, `q`, `city`, `tags` | Equality / array-contains / whole-token title |
| `minPrice` / `maxPrice` | Inclusive range on `price` |
| `bedrooms` | Exact match |
| `minBedrooms` | Inclusive lower bound (UI “3+”) |
| `minArea` / `maxArea` | Inclusive range on `area` |
| `fresh` / `includeStale` | Freshness inclusion set |
| `minLat`/`maxLat`/`minLng`/`maxLng` | Viewport band (map) |
| `cursor` / `limit` | Opaque pagination, max 200 |

## Firestore composites (`firestore.indexes.json`)

Deployed (or planned) composites cover:

- status + lastVerifiedAt  
- status + categoryId + lastVerifiedAt / price / area  
- status + titleKeywords (array-contains)  
- status + bedrooms + lastVerifiedAt  
- status + locationTags (array-contains)  
- status + categoryId + location.city + lastVerifiedAt (similar)  
- agentId + status + createdAt  

## Unsupported multi-range note

Firestore allows at most one inequality field per query. Combinations such as **price range + area range + lat band** cannot all be server-ranged. Strategy:

1. Choose the most selective **indexed** equality/array filter (category, city, tag, bedrooms).  
2. Apply **one** range on the server (prefer price or area).  
3. Refine remaining ranges and longitude **in Express/mock (and later client)** on a **bounded** page (≤200).  

Mock mode and the current Express in-memory store apply all filters server-side for contract parity; live Firestore wiring must follow this document when swapping the store implementation.
