/**
 * App-wide constants. AsyncStorage keys follow the namespaced `ee:*:{uid}`
 * convention from the technical documentation (NFR 8.3.3) to prevent collisions
 * and cross-user leakage.
 */

export const STORAGE_KEYS = {
  authSession: 'ee:auth:session',
  favorites: (uid: string) => `ee:favorites:${uid}`,
  searchHistory: (uid: string) => `ee:search-history:${uid}`,
  searchFilters: (uid: string) => `ee:search-filters:${uid}`,
  notificationPrefs: (uid: string) => `ee:notification-prefs:${uid}`,
  lastBrowse: (uid: string) => `ee:last-browse:${uid}`,
  reported: (uid: string) => `ee:reported:${uid}`,
} as const;

/** Server-calculated freshness data must not be presented as current beyond 1 hour. */
export const CACHE_TTL_MS = 60 * 60 * 1000;

/** Cursor pagination page size (NFR 8.3.2). */
export const PAGE_SIZE = 10;

/**
 * Unavailability reports needed before a listing drops out of default browse.
 * Mirrors the server's UNAVAILABLE_REPORT_THRESHOLD (backend/src/config/env.ts);
 * the client keeps its own copy so mock mode and the detail screen can apply the
 * same rule without a round trip.
 */
export const UNAVAILABLE_REPORT_THRESHOLD = 3;

export const CATEGORIES_ORDER = ['one-bed', 'portion', 'shared', 'studio'] as const;
