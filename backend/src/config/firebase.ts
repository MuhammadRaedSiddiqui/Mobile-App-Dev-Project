/**
 * Firebase Admin SDK bootstrap — the ONLY component in the system that writes to
 * Firestore. Initialization is guarded: while `config.mockMode` is true (Phase
 * 0/1) this is skipped entirely and the API serves in-memory fixtures, so the
 * server boots with no credentials.
 *
 * To go live (Phase 2): set MOCK_MODE=false and supply a service account via
 * FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS. The real key
 * must NEVER be committed (see .gitignore).
 */
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import { config } from './env';

let db: Firestore | null = null;

export function initFirebase(): void {
  if (config.mockMode) {
    // eslint-disable-next-line no-console
    console.log('[firebase] MOCK_MODE=true — Admin SDK not initialized; using in-memory fixtures.');
    return;
  }

  // Lazy require so the dependency isn't pulled in during mock-mode boot/tests.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin');

  let app: App;
  if (admin.apps.length) {
    app = admin.app();
  } else if (config.firebase.serviceAccountJson) {
    const credential = admin.credential.cert(JSON.parse(config.firebase.serviceAccountJson));
    app = admin.initializeApp({ credential, projectId: config.firebase.projectId || undefined });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS on the environment.
    app = admin.initializeApp({ projectId: config.firebase.projectId || undefined });
  }

  db = admin.firestore(app);
}

/** Firestore handle for write operations. Null in mock mode. */
export function getDb(): Firestore | null {
  return db;
}

/** Verify a Firebase ID token. Returns the decoded token, or throws. */
export async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  if (config.mockMode) {
    throw new Error('verifyIdToken called in mock mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin');
  const decoded = await admin.auth().verifyIdToken(idToken);
  return { uid: decoded.uid, email: decoded.email };
}
