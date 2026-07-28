/**
 * Saved-search matching and mock push delivery (Phase 8).
 * Failed notification attempts must never block listing creation.
 */
import type { SerializedListing } from './store';

export interface SavedSearchQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  tags?: string[];
  fresh?: string[];
  bedrooms?: number;
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  category?: string;
}

export interface SavedSearchRecord {
  id: string;
  uid: string;
  label: string;
  query: SavedSearchQuery;
  notifyOnNewListings: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  savedSearchAlerts: boolean;
}

/** Returns true when a newly active listing satisfies a saved search query. */
export function listingMatchesSavedSearch(
  listing: SerializedListing,
  query: SavedSearchQuery,
): boolean {
  if (listing.status !== 'active') return false;
  if (query.category && listing.categoryId !== query.category) return false;
  if (query.minPrice != null && listing.price < query.minPrice) return false;
  if (query.maxPrice != null && listing.price > query.maxPrice) return false;
  if (query.city && listing.location.city.toLowerCase() !== query.city.trim().toLowerCase()) {
    return false;
  }
  if (query.bedrooms != null && (listing.bedrooms ?? 0) !== query.bedrooms) return false;
  if (query.minBedrooms != null && (listing.bedrooms ?? 0) < query.minBedrooms) return false;
  if (query.minArea != null && listing.area < query.minArea) return false;
  if (query.maxArea != null && listing.area > query.maxArea) return false;
  if (query.tags?.length) {
    const wanted = query.tags.map((t) => t.toLowerCase());
    const have = listing.locationTags.map((t) => t.toLowerCase());
    if (!wanted.some((t) => have.includes(t))) return false;
  }
  if (query.fresh?.length && !query.fresh.includes(listing.freshness.status)) return false;
  if (query.q?.trim()) {
    const tokens = query.q.toLowerCase().split(/\s+/).filter(Boolean);
    const titleTokens = listing.title.toLowerCase().split(/\s+/);
    if (!tokens.some((t) => titleTokens.includes(t))) return false;
  }
  return true;
}

export interface PushDeliveryResult {
  uid: string;
  searchId: string;
  listingId: string;
  delivered: boolean;
  reason?: 'no_consent' | 'no_token' | 'alerts_disabled' | 'search_disabled';
}

/**
 * Mock push dispatch — logs intent only. Real FCM wiring is deferred to live credentials.
 * Never throws; callers treat this as fire-and-forget.
 */
export function dispatchSavedSearchAlert(input: {
  uid: string;
  token?: string;
  prefs: NotificationPreferences;
  search: SavedSearchRecord;
  listing: SerializedListing;
}): PushDeliveryResult {
  const base = {
    uid: input.uid,
    searchId: input.search.id,
    listingId: input.listing.listingId,
  };
  if (!input.prefs.pushEnabled) return { ...base, delivered: false, reason: 'no_consent' };
  if (!input.prefs.savedSearchAlerts) {
    return { ...base, delivered: false, reason: 'alerts_disabled' };
  }
  if (!input.search.notifyOnNewListings) {
    return { ...base, delivered: false, reason: 'search_disabled' };
  }
  if (!input.token) return { ...base, delivered: false, reason: 'no_token' };
  // Mock mode: structured log stands in for FCM.
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.info('[notifications] saved-search alert', {
      uid: input.uid,
      searchId: input.search.id,
      listingId: input.listing.listingId,
      title: input.listing.title,
    });
  }
  return { ...base, delivered: true };
}
