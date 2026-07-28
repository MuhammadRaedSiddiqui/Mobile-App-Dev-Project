/**
 * Firebase client SDK init — READS ONLY.
 *
 * Per the data-access boundary (Technical Docs §2.2): the client reads Firestore
 * directly (browse/detail/live freshness), but NEVER writes. All writes go through
 * the Express API using the Admin SDK. Do not import Firestore write functions
 * (addDoc/setDoc/updateDoc/deleteDoc) anywhere in this app.
 *
 * Initialization is lazy and guarded: while running on mock data (Phase 0/1) or
 * without real Web credentials, this stays uninitialized and callers fall back to
 * the mock layer, so the app boots cleanly with an empty .env.
 */
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { config, isFirebaseConfigured } from '@/config/env';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config.firebase);
  }
  return app;
}

/** Returns a Firestore instance for client READS, or null when not configured. */
export function getDb(): Firestore | null {
  if (firestore) return firestore;
  const initialized = getFirebaseApp();
  if (!initialized) return null;
  firestore = getFirestore(initialized);
  return firestore;
}

export { isFirebaseConfigured };
