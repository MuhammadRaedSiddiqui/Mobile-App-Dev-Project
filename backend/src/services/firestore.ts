/**
 * Firestore data layer - implements the same interface as the mock store but
 * operates against live Firestore. Used when MOCK_MODE=false.
 *
 * Uses Firebase Admin SDK which has different API than client SDK.
 */

import { getDb } from '@/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole, ListingStatus, PriceType } from '@/utils/types';

interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  verificationStatus: 'unverified' | 'verified';
  verifiedAt?: string;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp | Date;
  updatedAt: FirebaseFirestore.Timestamp | Date;
}

interface FirestoreListing {
  listingId: string;
  agentId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    area: string;
  };
  locationTags: string[];
  geohash: string;
  status: ListingStatus;
  viewCount: number;
  lastVerifiedAt: FirebaseFirestore.Timestamp | Date;
  cost: {
    rent: number;
    depositMonths: number;
    monthlyMaintenance: number;
    estimatedUtilities: number;
  };
  createdAt: FirebaseFirestore.Timestamp | Date;
  updatedAt: FirebaseFirestore.Timestamp | Date;
}

// Collection names
const USERS_COLLECTION = 'users';
const LISTINGS_COLLECTION = 'listings';
const CATEGORIES_COLLECTION = 'categories';
const FAVORITES_COLLECTION = 'favorites';

/**
 * Get a user by UID
 */
export async function getUser(uid: string): Promise<FirestoreUser | null> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();
  if (!userDoc.exists) return null;

  return userDoc.data() as FirestoreUser;
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<FirestoreUser | null> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection(USERS_COLLECTION)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as FirestoreUser;
}

/**
 * Create a new user
 */
export async function createUser(
  uid: string,
  data: Omit<FirestoreUser, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<FirestoreUser> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const userData: FirestoreUser = {
    ...data,
    uid,
    email: data.email.toLowerCase(),
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  await db.collection(USERS_COLLECTION).doc(uid).set(userData);
  return userData;
}

/**
 * Update a user's profile
 */
export async function updateUser(
  uid: string,
  updates: Partial<Pick<FirestoreUser, 'displayName' | 'phone' | 'avatarUrl' | 'verificationStatus' | 'verifiedAt'>>
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(USERS_COLLECTION).doc(uid).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get a listing by ID
 */
export async function getListing(listingId: string): Promise<FirestoreListing | null> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const listingDoc = await db.collection(LISTINGS_COLLECTION).doc(listingId).get();
  if (!listingDoc.exists) return null;

  return listingDoc.data() as FirestoreListing;
}

/**
 * Create a new listing
 */
export async function createListing(
  data: Omit<FirestoreListing, 'createdAt' | 'updatedAt'>
): Promise<FirestoreListing> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const listingData: FirestoreListing = {
    ...data,
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  };

  await db.collection(LISTINGS_COLLECTION).doc(data.listingId).set(listingData);
  return listingData;
}

/**
 * Update a listing
 */
export async function updateListing(
  listingId: string,
  updates: Partial<Omit<FirestoreListing, 'listingId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(LISTINGS_COLLECTION).doc(listingId).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete (mark as removed) a listing
 */
export async function deleteListing(listingId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(LISTINGS_COLLECTION).doc(listingId).update({
    status: 'removed' as ListingStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Query listings with filters
 */
export async function queryListings(filters: {
  categoryId?: string;
  city?: string;
  status?: ListingStatus;
  agentId?: string;
  limit?: number;
  startAfterDoc?: FirebaseFirestore.QueryDocumentSnapshot;
}): Promise<{ listings: FirestoreListing[]; lastDoc?: FirebaseFirestore.QueryDocumentSnapshot }> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  let query: FirebaseFirestore.Query = db.collection(LISTINGS_COLLECTION);

  // Apply filters
  if (filters.categoryId) {
    query = query.where('categoryId', '==', filters.categoryId);
  }
  if (filters.city) {
    query = query.where('location.city', '==', filters.city);
  }
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters.agentId) {
    query = query.where('agentId', '==', filters.agentId);
  }

  // Order and paginate
  query = query.orderBy('lastVerifiedAt', 'desc');
  if (filters.startAfterDoc) {
    query = query.startAfter(filters.startAfterDoc);
  }
  query = query.limit(filters.limit || 10);

  const snapshot = await query.get();
  const listings = snapshot.docs.map(doc => doc.data() as FirestoreListing);
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];

  return { listings, lastDoc };
}

/**
 * Get all categories
 */
export async function getCategories() {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection(CATEGORIES_COLLECTION)
    .orderBy('sortOrder', 'asc')
    .get();

  return snapshot.docs.map(doc => doc.data());
}

/**
 * Add a listing to favorites
 */
export async function addFavorite(uid: string, listingId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(FAVORITES_COLLECTION).doc(`${uid}_${listingId}`).set({
    uid,
    listingId,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Remove a listing from favorites
 */
export async function removeFavorite(uid: string, listingId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(FAVORITES_COLLECTION).doc(`${uid}_${listingId}`).delete();
}

/**
 * Get all favorites for a user
 */
export async function getFavorites(uid: string): Promise<string[]> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection(FAVORITES_COLLECTION)
    .where('uid', '==', uid)
    .get();

  return snapshot.docs.map(doc => doc.data().listingId);
}

/**
 * Check if a listing is favorited
 */
export async function isFavorite(uid: string, listingId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const favDoc = await db.collection(FAVORITES_COLLECTION).doc(`${uid}_${listingId}`).get();
  return favDoc.exists;
}

/**
 * Increment view count for a listing
 */
export async function incrementViewCount(listingId: string): Promise<number> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  const listingRef = db.collection(LISTINGS_COLLECTION).doc(listingId);
  const listingDoc = await listingRef.get();

  if (!listingDoc.exists) {
    throw new Error('Listing not found');
  }

  const currentCount = (listingDoc.data() as FirestoreListing).viewCount || 0;
  const newCount = currentCount + 1;

  await listingRef.update({
    viewCount: newCount,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return newCount;
}

/**
 * Update listing verification timestamp
 */
export async function verifyListing(listingId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error('Firestore not initialized');

  await db.collection(LISTINGS_COLLECTION).doc(listingId).update({
    lastVerifiedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
