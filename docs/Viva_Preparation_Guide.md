# Viva / Defense Preparation Guide

**Project:** Estate Ease — Verified Rental Discovery App  
**Purpose:** Prepare each team member to confidently answer instructor questions about their role

---

## Role 1: Muhammad Raed Siddiquie — Full-Stack Developer

### Your Responsibilities
- Overall project architecture and design decisions
- State management (Redux Toolkit store, slices, async thunks)
- Navigation structure (React Navigation, role-based routing, deep linking)
- CI/CD pipeline (GitHub Actions)
- Integration between frontend and backend
- Project planning and documentation

---

### Potential Questions & Answers

**Q1: Why did you choose React Native + Expo instead of native Android/iOS?**

We chose React Native with Expo because:
- Cross-platform — single codebase for both Android and iOS
- Expo SDK 57 gives managed workflow with pre-built native modules (camera, maps, image picker)
- Faster development cycle with hot-reload
- TypeScript support out of the box for type safety
- Large ecosystem of libraries (React Navigation, Redux Toolkit, etc.)

---

**Q2: Why use Redux Toolkit instead of Context API or other state management?**

Redux Toolkit was chosen because:
- We have multiple slices of global state that many screens need (auth, favorites, meta)
- `createAsyncThunk` handles async operations (login, register, API calls) with built-in pending/fulfilled/rejected states
- The auth token needs to be accessible globally (for Axios interceptors) — Redux makes this easy via `wireAuthToken()`
- Optimistic UI updates with rollback (favorites toggle) are cleaner with Redux's predictable state flow
- Context API would cause unnecessary re-renders in deeply nested component trees

---

**Q3: Explain the navigation architecture. Why separate navigators for each role?**

The navigation is structured as:
```
RootNavigator → AuthNavigator (if logged out) OR MainNavigator (if logged in)
MainNavigator → SeekerTabs (if role=seeker) OR AgentTabs (if role=agent)
```

Why separate:
- Seekers need 6 tabs (Home, Search, Map, Favorites, Messages, Profile)
- Agents need 4 different tabs (Dashboard, Listings, Inbox, Profile)
- Role separation means a seeker can NEVER accidentally access agent screens (like listing creation) and vice versa
- The `RootNavigator` acts as a session guard — it shows a splash screen while restoring the session from AsyncStorage, then decides which tree to render. This means there's no "flash" of the wrong screen on app launch.

---

**Q4: What is the `restoreSession` logic and why is it needed?**

When the app cold-launches, we don't know if the user was previously logged in. `restoreSession`:
1. Reads the saved token + user profile from AsyncStorage
2. If found → sets state to `authenticated` → shows MainNavigator
3. If not found → sets state to `unauthenticated` → shows AuthNavigator

Without this, users would need to log in every time they open the app. The `status: 'restoring'` initial state keeps the splash screen visible until this check completes.

---

**Q5: How does the auth token get attached to every API request?**

We use a pattern called `wireAuthToken`:
1. After the Redux store is created, we call `wireAuthToken(() => store.getState().auth.token)`
2. This registers a token-provider function with the Axios HTTP client
3. An Axios interceptor reads this function before every request and sets the `Authorization: Bearer <token>` header
4. This way, every API call automatically carries the current session token without each screen/service needing to know about auth

---

**Q6: What does the CI/CD pipeline do?**

Our GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR to main:
- **Mobile job:** Runs ESLint (catches code style issues) + TypeScript type-checking (catches type errors)
- **Backend job:** Runs ESLint + TypeScript type-checking + Jest test suite (9 test files)

This ensures no broken code gets merged to the main branch.

---

**Q7: What is the `metaSlice` and why does it exist?**

The `metaSlice` holds a `browseGeneration` counter. When an agent creates, edits, or verifies a listing, this counter increments. The home screen watches this counter — when it changes, it refetches listings. This solves the stale-data problem: after an agent verifies a listing, seekers immediately see updated freshness without needing to manually refresh.

---

**Q8: How does deep linking work in your app?**

We configured the `estateease://` URL scheme in `app.json`. React Navigation's `linking` config maps URLs to screens:
- `estateease://listing/lst-001` → opens ListingDetail for that listing
- `estateease://home` → opens the Home tab
- `estateease://search` → opens Search

This allows sharing listing URLs that open directly in the app, and supports push notification navigation.

---

**Q9: Why TypeScript and not plain JavaScript?**

TypeScript catches bugs at compile time. For example:
- If someone passes a `string` where a `number` is expected, TypeScript catches it before the app runs
- Our types (`Listing`, `UserProfile`, `CostBreakdown`) act as documentation — you can see exactly what shape data has
- With 12,600+ lines of code across 116 files, TypeScript prevents many runtime crashes that would be hard to debug in plain JS

---

**Q10: How do you handle the offline scenario?**

Multiple layers:
- `@react-native-community/netinfo` detects network status
- `OfflineBanner` component shows a visible indicator when offline
- Browse data is cached with a 1-hour TTL in AsyncStorage
- Favorites fall back to cached data if the API fails
- The app remains usable (read-only) even without connectivity

---

---

## Role 2: Hashir Badar — Frontend Developer / UI-UX Designer

### Your Responsibilities
- All 19 screen components (UI implementation)
- Design system (colors, typography, spacing)
- Screen prototypes (HTML/PNG mockups)
- Map integration with clustering
- Search and filter UI
- Responsive layouts and UX patterns

---

### Potential Questions & Answers

**Q1: What design system did you follow?**

We created a custom design system inspired by Airbnb's visual language:
- **Colors:** Primary coral (`#FF5A5F`), dark text, light canvas background
- **Typography:** System fonts with defined sizes (heading, body, caption)
- **Spacing:** Consistent 4px/8px/16px/24px scale
- All defined in `src/theme/` so every screen uses the same visual language — no hardcoded colors anywhere in components

---

**Q2: How does the search and filter system work from a UI perspective?**

The search screen has:
- A text input for full-text search (searches title, description, area name)
- Filter options: budget range (preset brackets like 20k-30k), bedrooms, area (sqft), freshness status, livability tags
- Recent searches stored per-user in AsyncStorage
- Saved searches that can trigger notification alerts when new matching listings appear

Filters are stored in Redux-compatible state and sent as query parameters to the API.

---

**Q3: How does the map screen work?**

The map screen uses `react-native-maps` with `react-native-map-clustering`:
- Shows Karachi with pin markers for each listing
- Pins cluster when zoomed out (e.g., "5 listings" cluster dot) and expand when zoomed in
- Two search modes:
  - **Viewport search:** Loads listings visible in the current map bounds (minLat/maxLat/minLng/maxLng)
  - **Radius search:** User taps a point, selects radius (1/2/5 km), sees listings within that circle
- Tapping a pin shows a listing preview card; tapping the card navigates to ListingDetail

---

**Q4: Explain the listing detail screen. What information does it show?**

The listing detail screen shows:
- **Image gallery** — Horizontally scrollable full-width images
- **Freshness badge** — Color-coded: green (fresh, ≤7 days), yellow (aging, ≤14 days), red (stale, >14 days)
- **True cost breakdown** — Rent + amortized deposit + maintenance + utilities = total monthly cost
- **Property details** — Bedrooms, bathrooms, area in sqft, address
- **Agent card** — Agent name, phone, "message" button
- **Actions** — Favorite (heart icon), Share, Report as unavailable
- **Similar listings** — Carousel of related listings (same category/area)

---

**Q5: What is "optimistic UI" in the favorites feature?**

When a user taps the heart icon:
1. The UI instantly toggles the heart (filled/unfilled) — no loading spinner
2. In the background, the API call fires
3. If the API succeeds → state is confirmed
4. If the API fails → the heart automatically reverts back

This makes the app feel fast and responsive. The user never waits for a network round-trip just to save a favorite.

---

**Q6: How did you make the app look consistent across all screens?**

- Centralized theme file (`src/theme/`) with colors, typography, and spacing constants
- Shared components in `src/components/common/` (buttons, cards, banners, splash)
- Listing-specific shared components in `src/components/listing/` (ListingCard, FreshnessBadge, CostBadge)
- Never using inline hardcoded values — always `colors.primary`, `spacing.md`, etc.

---

**Q7: How does the listing creation wizard work for agents?**

It's a 4-step form (`ListingFormScreen`):
1. **Basics** — Title, description, category, bedrooms, bathrooms, area
2. **Location** — Area name (dropdown of Karachi areas), full address, map pin for coordinates
3. **Pricing** — Monthly rent, deposit (in months), maintenance, estimated utilities
4. **Photos** — Pick from gallery or take with camera (using `expo-image-picker`), reorder, delete

Each step validates before allowing "Next." The form supports both creating new listings and editing existing ones.

---

**Q8: Why did you create screen prototypes before building the actual screens?**

Screen prototypes (HTML/PNG mockups) serve as a blueprint:
- We could align on the design before writing any React Native code
- Faster iteration — changing HTML is quicker than rebuilding native components
- Acts as documentation for what the final screen should look like
- Helps divide work — one person designs, others implement, and both match

---

**Q9: How do you handle different screen sizes?**

- React Native's `flex` layout adapts to screen dimensions
- `react-native-safe-area-context` handles notches and status bars
- No hardcoded pixel widths — use percentages and flex ratios
- ScrollView wraps content that may overflow on smaller screens
- Bottom tabs use standard sizing that works on all devices

---

**Q10: What is the onboarding carousel and why include it?**

The onboarding carousel is shown only to first-time users. It has 3-4 slides explaining:
- What Estate Ease does (find verified rentals)
- The freshness/trust feature
- How seekers and agents use the app differently

Purpose: reduces confusion for new users and sets expectations. After viewing it once, users go directly to Login on next launch.

---

---

## Role 3: Uzair Ali — Backend Developer / QA Engineer

### Your Responsibilities
- Express API server (all route handlers, middleware)
- Firebase configuration (Firestore rules, storage rules, indexes)
- Security implementation (auth middleware, rate limiting, validation)
- Business logic services (freshness, cost, visibility, notifications)
- Testing (9 Jest test suites)
- Data modeling and seed scripts

---

### Potential Questions & Answers

**Q1: Why separate the backend from the mobile app? Why not just use Firebase directly?**

The architecture enforces that **all writes go through Express**:
- **Validation:** We validate every input with Zod schemas before writing. A client can't bypass validation.
- **Business logic:** Freshness computation, cost calculation, report threshold — these must be computed server-side so a malicious client can't fake them.
- **Security:** Firebase security rules deny ALL client writes. Even if someone reverse-engineers the app, they can't directly modify Firestore.
- **Atomicity:** Operations like "verify listing + clear all reports" must happen together. The server does both in one operation.

The client CAN read Firestore directly (for speed), but can never write.

---

**Q2: What is the "verify listing" feature and why does it exist?**

In Karachi's rental market, listings go stale quickly — a property may be rented out within days but remain listed for months. "Verify" solves this:

- An agent can re-verify their listing, which resets `lastVerifiedAt` to NOW
- This resets the freshness badge to "fresh" (green)
- It also clears any "unavailable" reports from seekers
- Seekers can trust that a "fresh" listing was confirmed available within the last 7 days

Without this, old/rented listings pollute search results and waste seekers' time.

---

**Q3: Explain the report-as-unavailable system.**

If a seeker visits a property and finds it already rented:
1. They tap "Report as unavailable" on the listing detail screen
2. The API records one report (idempotent — same user can't report twice)
3. Once 3 distinct seekers report the same listing, it's **suppressed from browse results**
4. The listing still exists — the agent can re-verify it to clear reports and restore visibility
5. Agents cannot report listings (only seekers can)
6. An agent cannot report their own listing

This is crowdsourced trust — the community flags stale listings without needing admin intervention.

---

**Q4: How does authentication work in the backend?**

The `authenticate` middleware:
1. Extracts the `Bearer <token>` from the Authorization header
2. In **mock mode:** Tokens look like `mock-token-<uid>` — it extracts the uid directly
3. In **live mode:** Calls Firebase Admin SDK's `verifyIdToken()` to validate the token and get the uid
4. Looks up the user by uid in the database to get their role
5. Attaches `req.user = { uid, email, role, displayName }` to the request

The `requireRole('agent')` middleware then gates certain routes (like listing creation) to only agents.

---

**Q5: Why role-based authentication? Why not let any user create listings?**

Estate Ease has two distinct user types with different permissions:
- **Seekers:** Can browse, search, favorite, report, message agents
- **Agents:** Can create/edit/verify listings, upload photos, manage their portfolio

If any user could create listings:
- No accountability — fake listings from anonymous users
- No verification — only the listing owner should be able to re-verify
- No trust — the freshness model requires a responsible agent per listing

The role is assigned at registration and enforced at the API level with `requireRole()`.

---

**Q6: How does the freshness computation work?**

Pure function in `backend/src/services/freshness.ts`:
```
daysSince = floor((now - lastVerifiedAt) / 86400000)

if daysSince <= 7  → 'fresh'  (green badge)
if daysSince <= 14 → 'aging'  (yellow badge)
if daysSince > 14  → 'stale'  (red badge, hidden from default browse)
```

Key design decisions:
- Computed server-side only — clients cannot manipulate freshness
- Pure function with injectable `now` parameter — makes unit testing deterministic
- Stale listings are hidden from browse by default (can be shown with `includeStale=true`)
- Thresholds are configurable via environment variables

---

**Q7: What is the true cost breakdown and why not just show rent?**

In Pakistan's rental market, the actual monthly expense is much higher than advertised rent:
```
estimatedMonthlyTotal = rent + (rent × depositMonths / 12) + maintenance + utilities
```

For example, a listing advertising "PKR 25,000/month" with 2-month deposit, 3k maintenance, 5k utilities actually costs:
```
25000 + (25000 × 2 / 12) + 3000 + 5000 = PKR 37,167/month
```

The deposit is amortized over 12 months because it's an upfront cost the tenant must budget for. This prevents listings from hiding true costs behind a low headline rent.

---

**Q8: Explain the Firestore security rules.**

Our rules follow one principle: **clients can READ, never WRITE**.

```
listings/{id}: allow read if signed-in AND status == 'active'
users/{uid}: allow read if you ARE that uid
favorites/{uid}: allow read if you ARE that uid
categories: allow read if signed-in
ALL writes: denied (allow write: if false)
```

Why:
- All writes go through Express (which uses the Admin SDK and bypasses rules)
- A client can't read draft/removed listings (only `active`)
- A user can't read another user's profile or favorites
- Even if someone decompiles the APK and gets Firebase credentials, they can't modify data

---

**Q9: What testing did you implement and why those specific tests?**

9 test suites covering the most critical parts:

| Test | Why |
|------|-----|
| `api.test.ts` | Integration tests — verifies full request→response cycle for auth, listings, favorites, trust |
| `cost.test.ts` | Cost breakdown math must be correct — wrong numbers destroy user trust |
| `freshness.test.ts` | Freshness thresholds are the core feature — edge cases around day boundaries |
| `visibility.test.ts` | Determines what users see — bugs here show wrong listings or hide valid ones |
| `geo.test.ts` | Distance calculations for radius search — math errors give wrong map results |
| `validation.test.ts` | Zod schemas — ensures bad input is rejected before reaching business logic |
| `tokenize.test.ts` | Search tokenization — ensures search queries match expected listings |
| `upload.test.ts` | Image upload — verifies file type/size restrictions work |
| `notifications.test.ts` | Notification services — ensures alerts fire for correct events |

We used `supertest` for API integration tests (simulates HTTP requests without starting a real server) and plain Jest for unit tests on pure functions.

---

**Q10: What is rate limiting and why did you add it?**

`express-rate-limit` restricts how many requests a client can make in a time window:
- Prevents abuse (e.g., someone spamming the report endpoint to suppress a listing)
- The report endpoint has its own stricter limiter (`reportLimiter`)
- Protects against brute-force login attempts
- Reduces server load from misbehaving clients

Without rate limiting, a single malicious user could: spam reports to hide all listings, attempt thousands of login combinations, or overload the server with requests.

---

**Q11: Explain the data model. What collections exist in Firestore?**

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| `users` | User profiles | uid, email, role, displayName, phone, avatarUrl |
| `listings` | Rental properties | title, price, category, location (lat/lng), photos, agentId, status, lastVerifiedAt, unavailableReports |
| `categories` | Property types | name, slug, iconName, sortOrder |
| `favorites/{uid}/items` | Per-user saved listings | listingId references |
| `listings/{id}/reports/{uid}` | Unavailability reports | reporterId, createdAt |

The `listings` collection has composite indexes for efficient querying (by category + price, by freshness + area, by geo-bounds, etc.).

---

**Q12: What is Zod and why use it instead of manual validation?**

Zod is a TypeScript-first schema validation library. For every API endpoint, we define what the input should look like:

```typescript
const schema = z.object({
  title: z.string().min(5).max(200),
  price: z.number().positive(),
  bedrooms: z.number().int().min(0).max(20),
});
```

Why Zod over manual `if` checks:
- Automatically returns clear error messages ("Expected number, received string")
- TypeScript infers the validated type — no need for separate type definitions
- Composable — reuse schemas across endpoints
- Less code, fewer bugs — one schema replaces 10+ manual checks

---

**Q13: What is the mock mode and why build it?**

Mock mode (`MOCK_MODE=true`) lets the entire app run without Firebase credentials:
- Backend uses an in-memory JavaScript object instead of Firestore
- Authentication accepts `mock-token-<uid>` tokens without calling Firebase Auth
- 14 sample Karachi listings with realistic data are preloaded

Why:
- Team members can develop without Firebase access
- CI tests run without cloud dependencies
- Demo/presentation works offline
- Frontend development isn't blocked by backend not being connected to Firebase yet

---

**Q14: How does the view-count system prevent inflation?**

The `recordView` function tracks unique views:
- Records which user viewed which listing and when
- The same user viewing the same listing within 24 hours counts as ONE view
- This prevents: refreshing the page to inflate views, bots spamming views, agents inflating their own listings

---

**Q15: What security measures does the backend implement?**

| Layer | Tool | Purpose |
|-------|------|---------|
| HTTP Headers | Helmet | Prevents XSS, clickjacking, MIME sniffing |
| CORS | cors middleware | Only allows requests from our app's origin |
| Rate Limiting | express-rate-limit | Prevents brute-force and spam |
| Input Validation | Zod | Rejects malformed requests |
| Authentication | Firebase Admin SDK | Verifies tokens cryptographically |
| Authorization | requireRole() | Enforces role-based access |
| Write Protection | Firestore rules | Denies all client-side writes |

---

---

## Common Questions (All Members Should Know)

**Q: What problem does Estate Ease solve?**

Karachi's rental market lacks transparency. Listings stay online after being rented, advertised prices hide true costs (deposits, maintenance), and there's no way to verify if a listing is still available. Estate Ease solves this with freshness tracking, report-as-unavailable, and true cost breakdown.

---

**Q: Why Karachi specifically?**

The app is scoped to Karachi because:
- Localized area names (DHA, Gulshan, PECHS, Clifton, etc.) are built into the filter system
- Map defaults center on Karachi coordinates
- Mock data uses real Karachi neighborhoods and realistic local pricing (PKR 20k-80k range)
- Solving one city well is better than solving many cities poorly

---

**Q: How many lines of code does the project have?**

- Frontend (React Native): ~8,800 lines across 76 files
- Backend (Express): ~3,800 lines across 40 files
- Total: ~12,600 lines of TypeScript

---

**Q: What would you add if you had more time?**

- Connect to live Firebase (credentials ready, architecture supports it)
- Push notifications via Firebase Cloud Messaging
- Image compression and CDN delivery
- In-app chat with real-time listeners
- Payment integration for premium agent listings
- Admin panel for content moderation

---

**Q: Why not use a single REST endpoint for everything?**

We have modular routes (`/auth`, `/listings`, `/favorites`, `/agent`, `/messages`, etc.) because:
- Separation of concerns — each route file handles one domain
- Independent rate limiting per module
- Easier testing — test one module without importing the entire app
- Clearer API documentation

---

**Q: How does the app handle errors?**

- Backend: Centralized `errorHandler` middleware catches all thrown errors, formats them consistently as `{ success: false, error: { code, message } }`
- Frontend: Redux thunks have `rejected` cases that populate `state.error`, which screens display as user-friendly messages
- Network failures: Caught by Axios interceptors, fall back to cached data where available

---

**Q: What is cursor-based pagination and why use it?**

Traditional pagination (page 1, page 2) breaks when new listings are added between requests — you either miss items or see duplicates. Cursor-based pagination uses the last item's ID as a bookmark:
- "Give me 20 listings after listing ID X"
- Even if new listings are added, the next page starts exactly where the previous one ended
- This is critical for infinite-scroll feeds where content updates frequently

---

*Study this document thoroughly. Understand the WHY behind every decision, not just the WHAT.*
