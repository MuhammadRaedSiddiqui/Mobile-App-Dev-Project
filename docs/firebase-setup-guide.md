# Firebase Setup Guide — Estate Ease

How to take Estate Ease from **mock mode** (no credentials, in-memory data) to a
**live Firebase** project (Auth + Firestore + Storage). Follow this only when you're
ready to leave Phase 0/1 mock mode — the app runs fully without it until then.

## Architecture recap (read first)

The data-access boundary is **non-negotiable**:

- **All writes go through the Express API** using the Firebase **Admin SDK** (a secret service account). The mobile client never writes Firestore directly.
- The mobile client may **read** Firestore directly using the **public Web config**, and calls Express for every mutation.
- Two separate credential sets:
  - **Backend** → service account JSON (secret, never committed).
  - **Client** → Web config (public, safe to ship).

```
Mobile app ──reads──▶ Firestore
    │
    └──writes──▶ Express API ──Admin SDK──▶ Firestore / Storage
```

---

## 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `estate-ease`), accept defaults, create.
3. In **Build → Firestore Database** → **Create database** → start in **production mode** → pick a region close to Karachi (e.g. `asia-south1`). We deploy explicit rules later.
4. In **Build → Storage** → **Get started** → production mode, same region.
5. In **Build → Authentication** → **Get started** → enable the **Email/Password** provider (matches the app's login/register).

---

## 2. Backend credentials (Admin SDK — SECRET)

1. Console → **Project settings** (gear) → **Service accounts** tab.
2. Click **Generate new private key** → downloads a JSON file. **This grants full backend access — treat it like a password.**
3. Save it as `backend/serviceAccountKey.json` (already gitignored) **or** keep the JSON to paste inline.
4. Create `backend/.env` from the template:

   ```bash
   cd backend
   cp .env.example .env
   ```

5. Edit `backend/.env`:

   ```env
   MOCK_MODE=false
   FIREBASE_PROJECT_ID=your-project-id

   # Option A — path to the key file (recommended):
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

   # Option B — inline JSON on a single line (instead of the path above):
   # FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
   ```

   The loader in [backend/src/config/firebase.ts](backend/src/config/firebase.ts) prefers `FIREBASE_SERVICE_ACCOUNT_JSON`, then falls back to `GOOGLE_APPLICATION_CREDENTIALS`. Set **one**.

> **Never commit** `serviceAccountKey.json` or a filled `.env`. Both are gitignored — keep it that way. Setting `MOCK_MODE=false` **without** valid credentials makes the server refuse to start rather than run half-configured.

---

## 3. Client credentials (Web config — PUBLIC)

1. Console → **Project settings** → **General** tab → **Your apps** → add a **Web app** (`</>`), register it.
2. Copy the `firebaseConfig` values shown.
3. Create the client `.env` from the template:

   ```bash
   cp .env.example .env      # repo root
   ```

4. Edit `.env`:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/v1
   EXPO_PUBLIC_USE_MOCK=false
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcd...
   ```

   These are read in [src/config/env.ts](src/config/env.ts); [src/firebase.ts](src/firebase.ts) stays uninitialized (mock fallback) until `apiKey` **and** `projectId` are both present.

> For a physical device, replace `localhost` in `EXPO_PUBLIC_API_BASE_URL` with your machine's LAN IP (e.g. `http://192.168.1.20:4000/v1`) and add that origin to `CORS_ORIGINS` in `backend/.env`.

---

## 4. Install & authenticate the Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

Create a `firebase.json` at the repo root (it isn't committed yet) so the CLI knows where the rules/indexes live:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Associate the project:

```bash
firebase use --add        # pick your project, alias it "default"
```

---

## 5. Deploy security rules & indexes

The rules artifacts already exist in the repo:

- [firestore.rules](firestore.rules) — client reads allowed on active listings/categories; **all client writes denied** (writes go through Express/Admin, which bypasses rules).
- [storage.rules](storage.rules) — client writes denied; uploads go through the API.
- [firestore.indexes.json](firestore.indexes.json) — the composite indexes for browse, category, price, title search, agent dashboard, and the Phase 7 filters (bedrooms, area, tags, similar).

Deploy them:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

> Composite indexes take a few minutes to build. Until they finish, queries needing them return a `FAILED_PRECONDITION` error with a console link — that's expected during propagation.

---

## 6. Seed live data

With `backend/.env` set to `MOCK_MODE=false` and valid credentials:

```bash
cd backend
npm run seed
```

This writes the four categories and the demo listings (now including livability tags) through the Admin SDK. It **refuses to run** in mock mode or without credentials, so it can't target the wrong environment. It's idempotent — re-running overwrites by fixed IDs rather than duplicating.

Create the demo auth users in **Authentication → Users → Add user** (Email/Password) to match the seed agents/seekers, e.g. `danish@example.com` / `ayesha@example.com`. The seed writes listing documents keyed to `agent-danish` / `agent-sara`; align UIDs or update the seed's `agentId` values to the UIDs Firebase assigns.

---

## 7. Run against live Firebase

```bash
# Terminal 1 — API
cd backend && npm run dev
# Expect: "listening on http://localhost:4000 (mockMode=false)"

# Terminal 2 — app
npm start
```

The startup log should say `mockMode=false`. If it still says `true`, `MOCK_MODE` wasn't picked up (check `backend/.env` and restart).

---

## 8. Verify the live wiring

| # | Check | How | Expect |
|---|-------|-----|--------|
| V1 | API in live mode | Read the API startup log | `mockMode=false` |
| V2 | Auth | Register/login a new user in the app | User appears in Firebase Auth → Users |
| V3 | Read path | Browse Home | Listings load from Firestore (seeded data) |
| V4 | Write path | Agent creates a listing | New doc appears in Firestore `listings` |
| V5 | Rules enforced | Attempt a direct client write (dev console) | **Denied** by `firestore.rules` |
| V6 | Indexes | Run a filtered/sorted search | No `FAILED_PRECONDITION`; results ordered correctly |
| V7 | Storage | Upload an avatar/listing image | Object appears in the Storage bucket |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Server refuses to start with `MOCK_MODE=false` | Missing/invalid credentials | Set `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` correctly |
| App still shows mock data | `EXPO_PUBLIC_USE_MOCK` still `true`, or Web config blank | Set `=false`, fill all `EXPO_PUBLIC_FIREBASE_*`, restart Metro with cache clear (`expo start -c`) |
| `FAILED_PRECONDITION: index` | Composite index not built yet | Wait for build, or click the console link to create it; ensure `firestore:indexes` was deployed |
| `PERMISSION_DENIED` on read | Rules deployed but doc not `active`, or not deployed | Re-check `firestore.rules`; confirm the query targets readable docs |
| Physical device can't reach API | `localhost` in client URL | Use LAN IP in `EXPO_PUBLIC_API_BASE_URL` + add to `CORS_ORIGINS` |
| CORS error in web build | Origin not allow-listed | Add the origin to `CORS_ORIGINS` in `backend/.env` |

---

## Security checklist (before sharing anything)

- [ ] `backend/serviceAccountKey.json` and both `.env` files are **untracked** (`git status` shows them ignored).
- [ ] No service account JSON pasted into client code or committed config.
- [ ] `firestore.rules` / `storage.rules` deployed and deny direct client writes.
- [ ] Auth restricted to Email/Password (no unintended providers enabled).
- [ ] The Web `apiKey` is understood to be **public** (it's an identifier, not a secret) — security comes from rules, not from hiding it.

---

## Reverting to mock mode

Set `MOCK_MODE=true` in `backend/.env` and `EXPO_PUBLIC_USE_MOCK=true` in `.env`, restart both. No credentials are read; the app runs on in-memory fixtures again — useful for offline demos.
