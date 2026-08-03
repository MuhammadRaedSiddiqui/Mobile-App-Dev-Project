# Firebase Integration Guide

## Setup Instructions

### 1. Create Firebase Projects

You need **three separate Firebase projects** for isolation:

1. **Development**: `estate-ease-dev`
2. **Staging**: `estate-ease-staging`  
3. **Production**: `estate-ease-prod`

**Steps for each project:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name
4. Disable Google Analytics (optional for dev/staging)
5. Click "Create project"

### 2. Enable Firebase Services

For **each project**, enable these services:

#### Authentication
1. Go to Authentication → Sign-in method
2. Enable "Email/Password"
3. Save

#### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in **test mode** (we'll deploy rules later)
4. Choose a location (e.g., `us-central1`)
5. Click "Enable"

#### Cloud Storage
1. Go to Storage
2. Click "Get started"
3. Start in **test mode**
4. Use same location as Firestore
5. Click "Done"

### 3. Generate Service Account Keys

For **each project**:

1. Go to Project Settings (gear icon) → Service accounts
2. Click "Generate new private key"
3. Confirm and download the JSON file
4. Rename the file:
   - `serviceAccountKey-dev.json` (for development)
   - `serviceAccountKey-staging.json` (for staging)
   - `serviceAccountKey-prod.json` (for production)
5. Move to `backend/` directory
6. **NEVER commit these files** (they're gitignored)

### 4. Configure Backend Environment

#### Development (.env)
```bash
NODE_ENV=development
MOCK_MODE=false
PORT=4000
FIREBASE_PROJECT_ID=estate-ease-dev
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey-dev.json
```

#### Staging (.env.staging)
```bash
NODE_ENV=staging
MOCK_MODE=false
PORT=4000
FIREBASE_PROJECT_ID=estate-ease-staging
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey-staging.json
```

#### Production (.env.production)
```bash
NODE_ENV=production
MOCK_MODE=false
PORT=8080
FIREBASE_PROJECT_ID=estate-ease-prod
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey-prod.json
```

### 5. Deploy Firestore Configuration

Install Firebase CLI:
```bash
npm install -g firebase-tools
```

Login to Firebase:
```bash
firebase login
```

Initialize Firebase in project root:
```bash
firebase init
```
- Select "Firestore" and "Storage"
- Choose existing project (estate-ease-dev for now)
- Accept default filenames

Deploy rules and indexes:
```bash
# Development
firebase use estate-ease-dev
firebase deploy --only firestore:rules,firestore:indexes,storage

# Staging  
firebase use estate-ease-staging
firebase deploy --only firestore:rules,firestore:indexes,storage

# Production
firebase use estate-ease-prod
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 6. Seed Firestore with Demo Data

```bash
cd backend
MOCK_MODE=false npm run seed:firestore
```

This creates:
- 4 categories
- 4 demo users
- 2 demo listings

### 7. Configure Frontend

Update `EXPO_PUBLIC_*` variables in `.env`:

**Development:**
```bash
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/v1

# Get these from Firebase Console → Project Settings → General → Your apps
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=estate-ease-dev.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=estate-ease-dev
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=estate-ease-dev.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

To get Firebase Web config:
1. Go to Project Settings
2. Scroll to "Your apps"
3. Click "Web" icon (</>) to add web app
4. Copy the config values

### 8. Test the Integration

#### Backend Test
```bash
cd backend
npm run dev
```

Look for:
- ✓ Environment validation passed
- ✓ Connected to Firestore (if not mock mode)
- 🚀 Estate Ease API ready
- Mode: LIVE FIREBASE

Test endpoints:
```bash
# Health check
curl http://localhost:4000/health

# Get categories
curl http://localhost:4000/v1/listings/categories

# Get listings
curl http://localhost:4000/v1/listings
```

#### Frontend Test
```bash
npm start
```

- App should start without validation errors
- Check console for Firebase initialization messages
- Try logging in with demo credentials
- Verify data loads from Firestore

### 9. Verify Security Rules

Try these commands to verify security:

```bash
# Should succeed (backend uses Admin SDK)
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ayesha@example.com","password":"password123"}'

# Direct Firestore write from client should fail (security rules deny)
# Test this in your app's browser console:
# firebase.firestore().collection('users').add({test: true})
# Should get: "Missing or insufficient permissions"
```

## Troubleshooting

### "Firebase credentials not configured"
- Verify `FIREBASE_PROJECT_ID` is set
- Check service account file exists and path is correct
- Ensure file is valid JSON

### "Permission denied" errors
- Deploy security rules: `firebase deploy --only firestore:rules,storage`
- Verify service account has "Firebase Admin" role
- Check Firebase Console → IAM for service account permissions

### "Collection not found" errors  
- Run seed script: `npm run seed:firestore`
- Verify seed completed successfully
- Check Firestore console to see if data exists

### Backend won't start
- Run `npm run typecheck` to check for errors
- Verify all env vars are set
- Check service account JSON is valid

### Frontend can't connect
- Verify `EXPO_PUBLIC_API_BASE_URL` points to running backend
- Check Firebase Web config values are correct
- On physical device, use your computer's IP instead of localhost

## Next Steps

Once Firebase is working:

1. ✅ Backend connects to Firestore
2. ✅ Frontend connects to Firebase Auth
3. ⬜ Implement actual registration flow with Firestore profile creation
4. ⬜ Test authentication end-to-end
5. ⬜ Implement listing CRUD through Firestore
6. ⬜ Test all API endpoints with live data
7. ⬜ Update frontend services to use live Firebase when not in mock mode

## Security Checklist

- [ ] Service account keys are NOT committed to git
- [ ] Different Firebase projects for dev/staging/prod
- [ ] Security rules deployed and tested
- [ ] All client writes are denied by Firestore rules
- [ ] Backend validates all mutations before writing
- [ ] Environment variables are properly secured

## Cost Monitoring

Firebase free tier includes:
- 50K document reads/day
- 20K document writes/day  
- 20K document deletes/day
- 1GB storage

Monitor usage:
1. Go to Firebase Console
2. Select project
3. Click "Usage and billing"
4. Set up budget alerts

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
