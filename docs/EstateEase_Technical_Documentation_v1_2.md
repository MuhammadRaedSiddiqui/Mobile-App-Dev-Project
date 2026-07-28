ESTATE EASE

**Verified Rental Discovery for Karachi's Young Professionals**

*Cross-Platform Mobile Application — Technical Project Documentation*

**Version 1.2 · July 2026**

**Document History**

| **Version** | **Date**   | **Changes**                                                                                                                                                                                                                                                                                                                                                                                                                          |
|-------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.0         | April 2026 | Initial architecture, schema, API, screens, backlog, timeline, NFRs, codebase structure, risk register.                                                                                                                                                                                                                                                                                                                              |
| 1.1         | July 2026  | Repositioned around verified rental discovery; added problem statement, competitive analysis, personas, and the trust-module (freshness verification, cost transparency).                                                                                                                                                                                                                                                            |
| 1.2         | July 2026  | Closed the data-access ambiguity (2.2); resolved the rental-vs-commercial scope conflict (3.4); made report-abuse prevention enforceable via a reports subcollection (3.3.1); changed listing delete to a soft delete (4.3); documented Firestore's search/geo limits and workarounds (3.3, 8.6); added a Testing Strategy (11); replaced placeholder survey figures with an explicit, unfilled research template pending real data. |

1\. Introduction

1.1 Problem Statement

Karachi's rental market moves fast and runs on a trust deficit. A young professional or student searching for a one-bedroom flat or portion in Gulshan, Johar Town, or PECHS typically spends several weeks calling agents and visiting properties — most frustratingly, discovering that a promising listing was rented out days or weeks before they called.

The dominant platforms (Zameen.com, OLX Pakistan) are built around property sales and agent listing volume, not the end-renter experience. Their listings carry no freshness signal: there is no way to know whether a property is still available, whether the advertised rent is the price a renter will actually pay once deposit, maintenance, and utilities are added, or whether the poster is accountable. As a result, seekers fall back on fragmented Facebook groups, WhatsApp broadcasts, and word-of-mouth — channels that are unstructured, unverified, and impossible to search.

The problem is not a lack of listings. It is a lack of freshness, transparency, and trust in the listings that exist. This document intentionally does not cite survey statistics — the previous draft did, and the figures were placeholders, not real findings. They have been removed rather than replaced with different invented numbers.

1.2 Solution Overview

Estate Ease is a cross-platform React Native application that reorients real estate discovery around the renter. Rather than competing with Zameen.com on listing volume, it competes on listing reliability through three mechanisms:

1\. Freshness verification — every listing carries a lastVerifiedAt timestamp; agents re-confirm availability with one tap, and stale listings are flagged and deprioritized.

2\. True-cost transparency — every detail screen shows the real monthly cost (rent + amortized deposit + maintenance + utilities), not just the headline rent.

3\. Renter-first taxonomy — categories match how young Karachiites actually search (1-bed flats, portions, shared/roommate, studios), not how agents file paperwork.

The application serves two user roles — Property Seekers and Property Agents — across 15 screens and 7 core modules, targeting iOS and Android.

| **15 Screens** | **2 User Roles** | **7 Core Modules** | **iOS & Android** |
|----------------|------------------|--------------------|-------------------|

1.3 Competitive Analysis

| **Capability**              | **Zameen.com** | **OLX Pakistan** | **Facebook Groups** | **Estate Ease**                   |
|-----------------------------|----------------|------------------|---------------------|-----------------------------------|
| Listing freshness signal    | ✗              | ✗                | ✗                   | ✓ verified timestamp + stale flag |
| Report-unavailable flow     | ✗              | ✗                | ✗                   | ✓ one-tap                         |
| True monthly cost breakdown | ✗ rent only    | ✗ rent only      | ✗                   | ✓                                 |
| Renter-first categories     | partial        | ✗                | ✗                   | ✓                                 |
| Map-based discovery         | weak           | ✗                | ✗                   | ✓ viewport map                    |
| Mobile-first native UX      | web port       | web port         | general app         | ✓                                 |

Estate Ease does not need to win on volume. It wins on the things volume platforms are structurally unable to offer: freshness, transparency, and renter focus.

1.4 Target Users & Personas

**Persona 1 — Ayesha Khan, 24, Software Engineer (Seeker)**

Just joined a software house on Shahrah-e-Faisal. Needs a 1-bed flat or portion in Gulshan/PECHS within her monthly budget, within 30 minutes of work.

- Frustration: called six agents last week; four listings were already rented. Advertised price never matched the final ask.

- Goal: filter by budget and area, see only fresh listings, understand total monthly cost before calling.

- Maps to: freshness badge, true-cost calculator, budget filter, map view.

**Persona 2 — Danish Ahmed, 31, Real Estate Agent (Agent)**

Manages 40+ rental listings across Gulshan and Johar; posts on Zameen, OLX, and three WhatsApp groups.

- Frustration: gets calls about properties he rented out weeks ago (wasted time); his genuinely available listings drown in a sea of stale competition.

- Goal: a way to signal "this is still available, verified today" and stand out; fewer dead calls.

- Maps to: one-tap re-verification, freshness badge as a competitive advantage, agent dashboard verification queue.

2\. System Architecture

2.1 High-Level Architecture

Estate Ease follows a client-server architecture with a React Native frontend, a Node.js/Express REST API, and Firebase Firestore for persistence. AsyncStorage provides local caching and limited offline support.

| **Layer**        | **Technology**       | **Responsibility**                          |
|------------------|----------------------|---------------------------------------------|
| Presentation     | React Native + Expo  | UI rendering, navigation, state display     |
| State Management | Redux Toolkit        | Global app state, auth session, filters     |
| Networking       | Axios                | HTTP requests, interceptors, error handling |
| Backend API      | Node.js + Express.js | REST endpoints, business logic, validation  |
| Authentication   | Firebase Auth        | JWT-based auth, role management, sessions   |
| Primary Database | Firebase Firestore   | Listings, users, favorites, reports         |
| Local Cache      | AsyncStorage         | Offline data, recent searches, user prefs   |
| Media Storage    | Firebase Storage     | Property images, user avatars               |
| Maps             | React Native Maps    | Property pin display, location picker       |

2.2 Data Access Boundary

The previous version left it unstated whether the mobile client talks to Firestore directly or only through Express. That ambiguity is closed here with one explicit rule, split by operation type:

- Reads — browsing listings, listing detail, and live freshness/view-count updates — go directly from the React Native client to Firestore using the Firebase client SDK, with onSnapshot listeners where real-time updates matter. Firestore Security Rules gate these reads (e.g. seekers cannot read another agent's draft listings).

- Writes — creating, editing, or removing a listing; verify; report; favoriting; profile edits — go exclusively through the Express REST API. Express uses the Firebase Admin SDK server-side, which bypasses Security Rules, so validation and business logic (freshness computation, report-threshold logic, cost calculation) live in exactly one place instead of being duplicated between client code and declarative rules.

- The React Native client never calls a Firestore write method directly. Security Rules deny all client writes by default; only the Admin SDK, used from Express, can write.

> *This is the concrete implementation of NFR 8.2.2 — see section 8.2.*

2.3 Module Breakdown

The application is decomposed into seven core modules that map directly to the feature set:

| **Module**           | **Responsibility**                                                                                                                                           |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| auth-module          | Registration, login, token refresh, role assignment (Seeker / Agent), and profile management.                                                                |
| listings-module      | CRUD operations for property listings, image upload pipeline, category tagging, and status management.                                                       |
| discovery-module     | Keyword search over indexed title tokens, category browsing, budget range filtering, and location tag matching — see 3.3 and 8.6 for the exact search model. |
| favorites-module     | Save/unsave listings, persistent favorites list synced to Firestore, local offline cache via AsyncStorage.                                                   |
| maps-module          | Interactive map rendering using React Native Maps, coordinate storage per listing, viewport-bounded queries, cluster view for multiple pins.                 |
| trust-module         | Listing freshness verification, seeker "report as unavailable" flow, true-cost breakdown computation, and freshness badge logic.                             |
| notifications-module | Push notification hooks for new listings matching saved searches (stretch goal, Phase 2).                                                                    |

3\. Database Schema & Data Models

3.1 Entity Relationship Overview

Users own many Listings (one-to-many). Users save many Listings via Favorites (many-to-many junction). Listings belong to one Category (many-to-one). Listings hold many LocationTags (many-to-many). Each Listing has one Location coordinate object and many Reports (one-to-many, keyed by reporting user — see 3.3.1).

3.2 Collection: users

> *Authentication credentials are managed entirely by Firebase Auth. This collection stores profile data only — no password material is ever persisted in Firestore.*

| **Field**   | **Type**  | **Constraint**   | **Description**                                 |
|-------------|-----------|------------------|-------------------------------------------------|
| uid         | string    | PK, unique       | Firebase Auth UID — primary identifier          |
| email       | string    | required, unique | User email address for login                    |
| displayName | string    | required         | Full name displayed across the app              |
| role        | enum      | required         | 'seeker' \| 'agent' — controls access levels    |
| phone       | string    | optional         | Contact number visible on listings (agent only) |
| avatarUrl   | string    | optional         | Firebase Storage URL for profile photo          |
| createdAt   | timestamp | auto             | Account creation timestamp                      |
| updatedAt   | timestamp | auto             | Last profile update timestamp                   |
| isActive    | boolean   | default: true    | Soft delete / account deactivation flag         |

3.3 Collection: listings

| **Field**          | **Type**    | **Constraint**    | **Description**                                                                                                               |
|--------------------|-------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------|
| listingId          | string      | PK, auto-gen      | Auto-generated Firestore document ID                                                                                          |
| agentId            | string (FK) | required          | References users.uid — listing owner                                                                                          |
| categoryId         | string (FK) | required          | References categories.categoryId                                                                                              |
| title              | string      | max 120           | Short descriptive title for the property                                                                                      |
| titleKeywords      | array       | auto, max 20      | Array of lowercased word tokens from the title, maintained on write. Powers keyword search — see 8.6.                         |
| description        | string      | max 2000          | Full markdown-supported property description                                                                                  |
| price              | number      | min 0             | Listing price in PKR                                                                                                          |
| priceType          | enum        | required          | 'monthly' \| 'yearly' — Phase 1 is rental-only. 'total' (for sale) is reserved for the Phase 2 commercial extension, see 3.4. |
| area               | number      | required          | Property area in square feet                                                                                                  |
| bedrooms           | number      | optional          | Bedroom count (not applicable to studios)                                                                                     |
| bathrooms          | number      | optional          | Bathroom count                                                                                                                |
| imageUrls          | array       | max 10            | Firebase Storage URLs for property images                                                                                     |
| location           | object      | required          | Nested: { lat, lng, address, city, area }                                                                                     |
| locationTags       | array       | optional          | Array of tag IDs (e.g. \['near-metro', 'gated'\])                                                                             |
| status             | enum        | default: 'active' | 'active' \| 'sold' \| 'rented' \| 'draft' \| 'removed'                                                                        |
| isFeatured         | boolean     | default: false    | Reserved for Phase 2 (agent-paid promotion). Not implemented or surfaced in the Phase 1 MVP — do not build UI for it yet.     |
| viewCount          | number      | default: 0        | Incremented on each unique view                                                                                               |
| lastVerifiedAt     | timestamp   | auto on create    | Last time the agent confirmed availability. Drives the freshness badge.                                                       |
| unavailableReports | number      | default: 0        | Maintained count of documents in the reports subcollection — see 3.3.1. Not a freely-incrementable counter.                   |
| depositMonths      | number      | default 0         | Security deposit expressed in months of rent.                                                                                 |
| monthlyMaintenance | number      | default 0         | Monthly maintenance / society charges (PKR).                                                                                  |
| estimatedUtilities | number      | optional          | Estimated monthly utilities (PKR). Agent-provided or area default.                                                            |
| createdAt          | timestamp   | auto              | Listing creation timestamp                                                                                                    |
| updatedAt          | timestamp   | auto              | Last edit timestamp                                                                                                           |

> *freshnessStatus ('fresh' ≤7d · 'aging' 8–14d · 'stale' \>14d) is computed server-side from lastVerifiedAt and returned in API responses — it is not stored, so it can never go stale itself.*
>
> *Search and geo scope, stated honestly: keyword search (the q param, 4.3) matches whole lowercase tokens in titleKeywords via an array-contains query — this is Firestore's practical substitute for full-text search, and it does not do fuzzy or substring matching. Map queries (4.3) are bounded to the current viewport — a range query on location.lat combined with a client-side filter on location.lng — which supports "listings visible on this map view," not true radius search. Real radius search would need geohashing (e.g. a library such as geofirestore) and is scoped to Phase 2. See 8.6.*

3.3.1 Subcollection: listings/{listingId}/reports/{reporterId}

Introduced to make the report-abuse rule in the Risk Register (10) and NFR 8.5.3 actually enforceable, rather than just stated.

| **Field**  | **Type**  | **Constraint**     | **Description**                                                                                                                                                                      |
|------------|-----------|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| reporterId | string    | doc ID = users.uid | Using the reporting user's UID as the document ID guarantees at most one report per user per listing — a second report overwrites the same document instead of creating a duplicate. |
| reportedAt | timestamp | auto               | When the report was filed                                                                                                                                                            |

> *listings.unavailableReports is a count of documents in this subcollection, incremented transactionally by the Express /report handler only when the reporter's document does not already exist. When an agent successfully calls /listings/:id/verify, the entire reports subcollection for that listing is cleared and unavailableReports resets to 0 — re-verification doubles as the dispute mechanism, reusing an action agents already take instead of adding a new endpoint.*

3.4 Collection: categories

A seeded, mostly static collection. Managed by admin; not user-editable in Phase 1. Categories reflect how young Karachi renters actually search — by dwelling type, not transaction type.

| **Field**  | **Type** | **Constraint**   | **Description**                                              |
|------------|----------|------------------|--------------------------------------------------------------|
| categoryId | string   | PK               | e.g. 'one-bed', 'portion', 'shared'                          |
| name       | string   | required, unique | Display name: '1-Bed Flats', 'Portions', 'Shared / Roommate' |
| slug       | string   | required, unique | URL-safe identifier used in queries                          |
| iconName   | string   | required         | Icon key referencing the icon library                        |
| sortOrder  | number   | required         | Display ordering on the browse screen                        |

**Seeded categories (Phase 1) — residential rental only, matching the renter-first positioning in 1.2–1.3:**

| **categoryId** | **name**          | **sortOrder** |
|----------------|-------------------|---------------|
| one-bed        | 1-Bed Flats       | 1             |
| portion        | Portions          | 2             |
| shared         | Shared / Roommate | 3             |
| studio         | Studios           | 4             |

> *Commercial listings and for-sale listings are deliberately out of Phase 1. A Phase 2 commercial category (supporting both priceType: 'monthly' and a reintroduced priceType: 'total') can be added once the Phase 1 renter-first experience is validated — see 6.2. Shipping a commercial/for-sale category in Phase 1 alongside four purely-residential-rental categories would undercut the renter-first argument made in 1.2–1.3, which is why it is deferred rather than included "just in case."*

3.5 Collection: favorites

Implements the many-to-many relationship between users and listings. A composite key prevents duplicate saves.

| **Field**  | **Type**    | **Constraint** | **Description**                  |
|------------|-------------|----------------|----------------------------------|
| favoriteId | string      | PK, auto-gen   | Firestore document ID            |
| userId     | string (FK) | required       | References users.uid             |
| listingId  | string (FK) | required       | References listings.listingId    |
| savedAt    | timestamp   | auto           | When the user saved this listing |

4\. API Specification

4.1 Base URL & Conventions

All API endpoints follow RESTful conventions. Requests and responses use JSON. Authentication is handled via Bearer tokens issued by Firebase Auth.

| **Item**     | **Value**                                                                                    |
|--------------|----------------------------------------------------------------------------------------------|
| Base URL     | https://api.estateease.app/v1                                                                |
| Auth Header  | Authorization: Bearer \<firebase_id_token\>                                                  |
| Content-Type | application/json                                                                             |
| Error Format | { "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } } |

4.2 Authentication Endpoints

| **Method** | **Endpoint**   | **Body / Params**                      | **Response**                    |
|------------|----------------|----------------------------------------|---------------------------------|
| POST       | /auth/register | { email, password, displayName, role } | 201: { uid, token, user }       |
| POST       | /auth/login    | { email, password }                    | 200: { token, user, expiresIn } |
| POST       | /auth/logout   | Bearer token (header)                  | 200: { success: true }          |
| GET        | /auth/me       | Bearer token (header)                  | 200: { user object }            |
| PUT        | /auth/profile  | { displayName?, phone?, avatarUrl? }   | 200: { updated user }           |
| POST       | /auth/refresh  | { refreshToken }                       | 200: { newToken, expiresIn }    |

4.3 Listings Endpoints

| **Method** | **Endpoint**          | **Query / Body**                                                                 | **Response**                                                              |
|------------|-----------------------|----------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| GET        | /listings             | ?category&minPrice&maxPrice&city&tags&q&fresh&swLat&swLng&neLat&neLng&page&limit | 200: { listings\[\], total, page }                                        |
| GET        | /listings/:id         | —                                                                                | 200: { listing, agent }                                                   |
| POST       | /listings             | { title, description, price, categoryId, location, costInputs, ... }             | 201: { listingId, listing }                                               |
| PUT        | /listings/:id         | Partial listing body (agent only)                                                | 200: { updated listing }                                                  |
| DELETE     | /listings/:id         | Bearer token (agent/owner)                                                       | 200: { status: 'removed' } — soft delete, see note below                  |
| GET        | /listings/:id/similar | —                                                                                | 200: { listings\[\] } same category+city                                  |
| POST       | /listings/:id/view    | —                                                                                | 200: { viewCount }                                                        |
| POST       | /listings/:id/verify  | Bearer (agent owner)                                                             | 200: { lastVerifiedAt, freshnessStatus } — also clears reports, see 3.3.1 |
| POST       | /listings/:id/report  | Bearer (seeker)                                                                  | 200: { unavailableReports } — idempotent per reporter, see 3.3.1          |

> *DELETE no longer performs a physical delete. It sets status: 'removed', consistent with the soft-delete pattern already used on users.isActive. A hard delete would orphan any favorites document still pointing at that listing, since Firestore does not cascade; a removed listing instead simply displays as unavailable wherever it is referenced.*
>
> *The fresh param accepts a comma-separated list of freshness statuses (e.g. ?fresh=fresh,aging) to exclude stale listings from default browse. q matches whole lowercase tokens against titleKeywords (3.3) — not a fuzzy or substring search. swLat/swLng/neLat/neLng define the current map viewport for bounded location queries (3.3) — there is no radius parameter in Phase 1.*

4.4 Favorites Endpoints

| **Method** | **Endpoint**                | **Auth**                    | **Response**                       |
|------------|-----------------------------|-----------------------------|------------------------------------|
| GET        | /favorites                  | Bearer token (seeker)       | 200: { listings\[\] with savedAt } |
| POST       | /favorites/:listingId       | Bearer token (seeker)       | 201: { favoriteId, savedAt }       |
| DELETE     | /favorites/:listingId       | Bearer token (seeker/owner) | 204: No content                    |
| GET        | /favorites/check/:listingId | Bearer token                | 200: { isSaved: boolean }          |

> *If a favorited listing's status is 'removed', it still appears in the Favorites list but is visually marked unavailable rather than silently disappearing — favorites are a record of user intent, not a live availability feed.*

4.5 Example Response

GET /v1/listings/:id → 200

{

"listing": {

"listingId": "Lx9f2...",

"title": "1-Bed Flat, Block 13, Gulshan-e-Iqbal",

"price": 38000,

"priceType": "monthly",

"freshness": { "status": "fresh", "lastVerifiedAt": "2026-07-24T09:12:00Z", "daysSince": 2 },

"costBreakdown": {

"rent": 38000,

"depositMonths": 2,

"monthlyMaintenance": 2500,

"estimatedUtilities": 6500,

"estimatedMonthlyTotal": 47000

},

"location": { "lat": 24.9213, "lng": 67.0871, "area": "Gulshan-e-Iqbal", "city": "Karachi" }

},

"agent": { "uid": "...", "displayName": "Danish Ahmed", "phone": "0300-..." }

}

5\. Screen Inventory & Navigation

5.1 Navigation Structure

The app uses React Navigation v6 with a stack + tab hybrid pattern. Unauthenticated users see the Auth Stack. Authenticated users enter the Main Tab Navigator.

> *This table specifies structure and content, not visual design. Low-fidelity wireframes (even quick Figma or paper sketches) for the seven screens marked Agent/Seeker-critical below are a recommended companion deliverable for a mobile-development course grade, and are not a substitute for anything in this document.*

5.2 Screen Definitions

| **Screen Name**     | **Route**       | **Access**            | **Key Components**                                                                                                         |
|---------------------|-----------------|-----------------------|----------------------------------------------------------------------------------------------------------------------------|
| SplashScreen        | /splash         | Public                | Logo animation, auth state check                                                                                           |
| OnboardingScreen    | /onboard        | Public (first launch) | Carousel, role selection CTA                                                                                               |
| LoginScreen         | /auth/login     | Public                | Email/password form, Firebase auth                                                                                         |
| RegisterScreen      | /auth/register  | Public                | Form with role toggle (Seeker/Agent)                                                                                       |
| HomeScreen          | /home           | Authenticated         | Renter-first category pills (1-Bed, Portions, Roommate, Studios), featured carousel, search bar                            |
| SearchScreen        | /search         | Authenticated         | Keyword search input, recent queries, results list                                                                         |
| FilterSheet         | /filter (modal) | Authenticated         | Budget range slider, category, city, tag multi-select, freshness toggle                                                    |
| ListingsScreen      | /listings       | Authenticated         | Paginated FlatList, card grid with freshness badge, sort toggle                                                            |
| ListingDetailScreen | /listings/:id   | Authenticated         | Image gallery, info rows, freshness badge, true-cost breakdown panel, "Report as Unavailable" action, map pin, contact CTA |
| MapScreen           | /map            | Authenticated         | React Native Maps, viewport-bounded query, cluster markers, search-on-pan                                                  |
| FavoritesScreen     | /favorites      | Seeker only           | Saved listings FlatList, unavailable-state marker, empty state                                                             |
| AgentDashboard      | /agent          | Agent only            | My Listings, verification queue ("Confirm still available"), add listing FAB, stats                                        |
| CreateListingScreen | /agent/create   | Agent only            | Multi-step form, image picker, cost inputs (deposit, maintenance, utilities)                                               |
| EditListingScreen   | /agent/edit/:id | Agent only (owner)    | Pre-filled form, cost inputs, one-tap re-verify                                                                            |
| ProfileScreen       | /profile        | Authenticated         | Avatar, display name, edit, logout                                                                                         |

6\. Feature Backlog

6.1 Phase 1 — Core MVP (Weeks 1–6)

| **Feature**             | **Description**                                                                                     | **Priority** | **Status** |
|-------------------------|-----------------------------------------------------------------------------------------------------|--------------|------------|
| User Auth               | Registration, login, logout with Firebase Auth and role assignment                                  | High         | To Do      |
| Renter-First Categories | Dwelling-type category structure (1-bed, portion, roommate, studio) + seed data                     | High         | To Do      |
| Listing Browse          | Paginated listings screen with cards showing image, price, title, location                          | High         | To Do      |
| Listing Detail          | Full property page with image gallery, specs, agent info                                            | High         | To Do      |
| Keyword Search          | Whole-word search over indexed title tokens (array-contains); not fuzzy — see 8.6                   | High         | To Do      |
| Save to Favorites       | Save/unsave listings; view full favorites list                                                      | High         | To Do      |
| Map View                | Viewport-bounded property pins on interactive map with tap-to-detail                                | High         | To Do      |
| Agent Listings          | Agents can create, edit, soft-delete their own listings                                             | High         | To Do      |
| Freshness Verification  | Agent one-tap re-confirm; lastVerifiedAt tracked; freshness badge on cards                          | High         | To Do      |
| Report Unavailable      | Seeker flags stale listing via reports subcollection; ≥3 unique reporters hides from default browse | High         | To Do      |
| True Cost Calculator    | Cost breakdown panel on detail screen (rent + deposit + maintenance + utilities)                    | High         | To Do      |
| Image Upload            | Multi-image upload to Firebase Storage from camera/gallery                                          | Medium       | To Do      |
| Profile Management      | Edit display name, phone, avatar                                                                    | Medium       | To Do      |

6.2 Phase 2 — Enhanced Features (Weeks 7–10)

| **Feature**                    | **Description**                                                                                      | **Priority** | **Status** |
|--------------------------------|------------------------------------------------------------------------------------------------------|--------------|------------|
| Advanced Filters               | Budget slider, bedroom count, area range, location tags multi-select                                 | Medium       | Planned    |
| Similar Listings               | Auto-suggest related properties on the detail screen                                                 | Medium       | Planned    |
| Search History                 | Persist recent searches locally in AsyncStorage                                                      | Medium       | Planned    |
| Map Clustering                 | Group nearby pins into clusters on the map view                                                      | Medium       | Planned    |
| Commercial & For-Sale Category | Reintroduce a commercial category and priceType: 'total', deferred from Phase 1 (3.4)                | Low          | Planned    |
| Area Livability Tags           | Extend locationTags with practical info (water availability, load-shedding zone, internet providers) | Low          | Planned    |
| Agent Profile                  | Public-facing agent page with all their active listings                                              | Low          | Planned    |
| Share Listing                  | Share listing URL via native share sheet                                                             | Low          | Planned    |

7\. Development Timeline

7.1 Sprint Plan

| **Sprint** | **Duration** | **Deliverables**                                                                                                             | **Owner(s)**   |
|------------|--------------|------------------------------------------------------------------------------------------------------------------------------|----------------|
| S1         | Week 1–2     | Project setup, Expo config, Firebase init, navigation scaffold, Auth screens (Login, Register)                               | All members    |
| S2         | Week 2–3     | Home screen with renter-first category pills, Listings screen with mock data, Listing Detail screen (cost panel placeholder) | Uzair + Hashir |
| S3         | Week 3–4     | Firestore integration, real listings data, Search + Filter, seeded renter-first categories                                   | Raed + Hashir  |
| S4         | Week 4–5     | Agent Dashboard with verification queue, Create/Edit Listing forms with cost inputs, Firebase Storage image upload           | Uzair + Raed   |
| S5         | Week 5–6     | Favorites module, Map screen with pins, report-unavailable flow, freshness badge logic, AsyncStorage caching                 | All members    |
| S6         | Week 6–7     | Profile screen, bug fixes, UI polish, role-based access enforcement — minimum demonstrable slice complete                    | All members    |
| S7         | Week 7–8     | Advanced filters, similar listings, search history, map clustering                                                           | Raed + Hashir  |
| S8         | Week 9–10    | Testing (section 11), performance optimization, final demo prep, documentation                                               | All members    |

> *Buffer note: S6 marks the minimum demonstrable slice (auth + browse + freshness + cost + agent CRUD). If any earlier sprint slips, Phase 2 items in S7 are the first to be cut — the core differentiators are protected in S1–S6.*

8\. Non-Functional Requirements

8.1 Performance

1\. Listings screen must load and display the first 10 results within 2 seconds on a 4G connection.

2\. Images must be lazy-loaded and compressed to WebP format (max 200KB per image).

3\. Search results must return within 1.5 seconds for queries under 100 characters.

4\. Map must render up to 200 pins without frame rate drops below 30 FPS.

8.2 Security

1\. All API endpoints must validate Firebase ID tokens — no unauthenticated access to write operations.

2\. Firestore Security Rules deny all direct client writes by default; only the Express API, using the Firebase Admin SDK, may write to Firestore. Direct client reads are limited to non-draft listings and the reading user's own profile/favorites — see 2.2.

3\. User passwords are never stored by the application — credential management is delegated entirely to Firebase Auth.

4\. Image uploads must validate MIME type server-side (jpg/png/webp only, max 5MB).

8.3 Scalability

1\. Firestore collections must use composite indexes for common query patterns (category + status + createdAt).

2\. Listings queries must be paginated with cursor-based pagination (limit 10 per page, Firestore startAfter).

3\. AsyncStorage keys must be namespaced (e.g. ee:favorites:userId) to prevent collision.

8.4 Usability

1\. All screens must support both iOS and Android with no platform-specific layout bugs.

2\. Empty states must be implemented for all list screens (Favorites, Search, Agent Listings).

3\. Loading skeletons must replace spinners for list screens to improve perceived performance.

4\. Error messages must be user-friendly — no raw Firebase error codes exposed to the UI.

8.5 Data Freshness

1\. Listings unverified for more than 14 days must be visually flagged stale and excluded from default browse ordering.

2\. freshnessStatus must be computed server-side and cached client-side for no longer than 1 hour.

3\. A seeker may report a given listing at most once; this is enforced by the reporterId-keyed subcollection in 3.3.1, not by client-side convention — a second report from the same authenticated user simply overwrites their own report document rather than incrementing the count.

8.6 Search & Discovery Scope

Stated explicitly so the limitation is a documented design decision rather than something discovered mid-sprint:

1\. Keyword search matches whole lowercase tokens against titleKeywords (3.3). It does not do fuzzy matching, typo tolerance, or substring search. A hosted search service (e.g. Algolia or Typesense, both with usable free tiers) is the recommended Phase 2 upgrade if this becomes a priority.

2\. Map queries are bounded to the current viewport (a range query on latitude combined with a client-side longitude filter). This is 'listings visible on this map view,' not radius search. True radius search ("within 2km of me") requires geohashing (e.g. a library such as geofirestore) and is scoped to Phase 2.

9\. Codebase Structure

9.1 Recommended Folder Layout

The project follows a feature-first folder structure to co-locate related components, hooks, and services.

estate-ease/

├── src/

│ ├── assets/ \# Fonts, images, icon SVGs

│ ├── components/ \# Shared/reusable UI components

│ │ ├── common/ \# Button, Input, Card, Badge, Skeleton

│ │ ├── listing/ \# ListingCard, ImageGallery, FreshnessBadge, CostBreakdown

│ │ └── map/ \# MapView, PropertyPin, ClusterPin

│ ├── features/ \# Feature modules

│ │ ├── auth/ \# Screens, hooks, services for auth

│ │ ├── listings/ \# Screens, hooks, services for listings

│ │ ├── favorites/ \# Screens, hooks, services for favorites

│ │ ├── search/ \# Search screen, filter sheet, history

│ │ ├── map/ \# Map screen and related hooks

│ │ ├── trust/ \# Freshness verification, report-unavailable, cost calculator

│ │ └── agent/ \# Agent dashboard, create/edit screens

│ ├── navigation/ \# Stack, tab navigator definitions

│ ├── services/ \# API layer (axios instance, endpoints)

│ │ ├── api.js \# Axios base config + interceptors

│ │ ├── listings.js \# Listings API calls

│ │ ├── auth.js \# Auth API calls

│ │ ├── favorites.js \# Favorites API calls

│ │ └── trust.js \# Verify + report API calls

│ ├── store/ \# Redux Toolkit slices + store config

│ ├── hooks/ \# Global custom hooks (useDebounce, etc.)

│ ├── utils/ \# Formatters, validators, constants

│ ├── theme/ \# Colors, typography, spacing constants

│ └── firebase.js \# Firebase SDK init and exports

├── backend/ \# Node.js Express API

│ ├── routes/ \# Express routers per resource

│ ├── controllers/ \# Business logic handlers

│ ├── middleware/ \# Auth verify, error handler, rate limiter

│ ├── models/ \# Firestore query helpers

│ └── server.js \# App entry point

├── app.json \# Expo config

├── .env \# Firebase keys (gitignored)

└── README.md \# Developer setup guide

10\. Risk Register

| **Risk**                                      | **Impact**                                                                | **Likelihood** | **Mitigation**                                                                                                                                                                                                                                                                                                                                                                              |
|-----------------------------------------------|---------------------------------------------------------------------------|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Firebase free tier limits exceeded            | API calls blocked; app unusable                                           | Medium         | Implement pagination + caching; monitor Firestore read counts weekly                                                                                                                                                                                                                                                                                                                        |
| React Native version incompatibility          | Build failures on iOS or Android                                          | Low            | Pin all dependencies; test on both platforms after each sprint                                                                                                                                                                                                                                                                                                                              |
| Team member unavailability                    | Sprint goals missed                                                       | Medium         | Cross-train on all modules; maintain up-to-date README                                                                                                                                                                                                                                                                                                                                      |
| Map API quota exceeded                        | Map screen broken in production                                           | Low            | Use Google Maps only for production; use OSM in development                                                                                                                                                                                                                                                                                                                                 |
| Image upload size abuse                       | Firebase Storage costs spike                                              | Low            | Enforce 5MB limit and MIME validation in backend middleware                                                                                                                                                                                                                                                                                                                                 |
| Agents don't re-verify listings               | Freshness signal degrades; core differentiator weakens                    | Medium         | One-tap verify via dashboard prompt; rank fresh/aging listings above stale ones in default sort so verification is a competitive advantage                                                                                                                                                                                                                                                  |
| Report abuse (flagging competitors' listings) | Legitimate listings hidden unfairly                                       | Low            | Enforced via the reporterId-keyed subcollection (3.3.1) — one document per reporter, not a bare counter, so a single user cannot exceed one report. An agent's re-verify clears all reports (4.3), which is the dispute path.                                                                                                                                                               |
| Map provider inconsistency in Expo Go         | iOS and Android examiners may see different map providers during the demo | Medium         | react-native-maps works in Expo Go with no extra setup, but Expo Go defaults to Apple Maps on iOS and Google Maps on Android. Test on both platforms before the demo; budget time for an EAS custom dev client with a Google Maps API key if platform parity matters for grading. Pin react-native-maps to the 1.20.x stable line — 1.21.x's New Architecture support is still stabilizing. |

11\. Testing Strategy

Scoped for a three-person team on a one-semester timeline — this is deliberately not an enterprise test plan.

11.1 Unit Testing

Jest covers the pure business-logic functions — code with no I/O, so it is the cheapest, highest-value testing to write:

- Freshness-status computation (fresh / aging / stale from lastVerifiedAt)

- True-cost calculation (rent + deposit amortization + maintenance + utilities)

- Report-threshold logic (≥3 unique reporters hides a listing)

- Title tokenization for titleKeywords

11.2 Manual Test Matrix

Run at the end of each sprint against both platforms. Statuses below are intentionally left as Pending — this document specifies what will be tested, not results that don't exist yet.

| **Test Case**                              | **iOS** | **Android** | **Notes**                               |
|--------------------------------------------|---------|-------------|-----------------------------------------|
| Register / login / logout                  | Pending | Pending     | Include token refresh                   |
| Browse + filter listings                   | Pending | Pending     | Include empty-result state              |
| Listing detail + cost breakdown            | Pending | Pending     |                                         |
| Map view (viewport query + pins)           | Pending | Pending     | See map-provider risk, section 10       |
| Save / unsave favorite                     | Pending | Pending     | Include a removed-listing favorite      |
| Agent: create / edit / soft-delete listing | Pending | Pending     |                                         |
| Agent: one-tap verify                      | Pending | Pending     | Confirm reports subcollection clears    |
| Seeker: report as unavailable              | Pending | Pending     | Confirm one-report-per-user idempotency |
| Offline app open (AsyncStorage cache)      | Pending | Pending     | No crash with no network                |

11.3 Demo-Critical Smoke Test

Immediately before the final demo, walk both core journeys end to end on a physical or simulated device for each platform:

- Seeker journey: browse → filter → listing detail → save to favorites.

- Agent journey: create listing → one-tap verify → confirm a seeker report is visible on the dashboard and clears on re-verify.

*CS-575: Mobile Application Development · University of Karachi (UBIT) · Version 1.2 · July 2026*
