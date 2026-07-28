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

export const CATEGORIES_ORDER = ['one-bed', 'portion', 'shared', 'studio'] as const;
