/**
 * Listings read service.
 *
 * READS: in production these come directly from Firestore via the client SDK,
 * gated by Security Rules (active listings only). While `config.useMockData` is
 * true they resolve from MOCK_LISTINGS. Either way, callers get the same typed
 * shapes and the same opaque cursor-pagination contract as the Express API.
 *
 * WRITES: there is exactly one here — recordView — and it goes through Express
 * (POST /listings/:id/view), never Firestore. No create/update/delete of listing
 * content lives in the client; that path is Express-only (Phase 4). Do not add a
 * direct client Firestore write here.
 */
import { config } from '@/config/env';
import { PAGE_SIZE } from '@/utils/constants';
import { Category, CategoryId, Listing, ListingDetail, Paginated } from '@/utils/types';
import { MOCK_AGENTS, MOCK_CATEGORIES, MOCK_LISTINGS } from '@/mocks/data';
import { isWithinRadiusKm } from '@/utils/geo';
import { api } from './api';

export interface ListingQuery {
  category?: CategoryId;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  /** Match listings carrying ANY of these location tags. */
  tags?: string[];
  /** Freshness statuses to include; default browse hides 'stale'. */
  fresh?: Array<Listing['freshness']['status']>;
  /** Exact bedroom count. Prefer `minBedrooms` for “N+” chips. */
  bedrooms?: number;
  /** Inclusive lower bound on bedrooms (e.g. 3 → 3+). */
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  /** Viewport bounds for map discovery. */
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  /** Radius search from a centre point (km). Replaces viewport bounds when set. */
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  cursor?: string;
  limit?: number;
  /** Exclude a listing id (similar-listings rail). */
  excludeId?: string;
}

const MAX_LIMIT = 200;

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Opaque offset cursor, mirroring the backend's `o:<offset>` base64url scheme so
 * the two implementations stay contract-compatible. Callers must treat it as a
 * black box. In live Firestore this maps to startAfter(lastDoc).
 */
function encodeCursor(offset: number): string {
  // btoa is available in the RN/Hermes runtime; base64 keeps it opaque.
  return btoa(`o:${offset}`).replace(/=+$/, '');
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = atob(cursor);
    const match = /^o:(\d+)$/.exec(decoded);
    const offset = match ? Number(match[1]) : 0;
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

/** Default browse ordering: fresh/aging above stale, then most-recently verified. */
function defaultSort(a: Listing, b: Listing): number {
  const rank = { fresh: 0, aging: 1, stale: 2 } as const;
  if (rank[a.freshness.status] !== rank[b.freshness.status]) {
    return rank[a.freshness.status] - rank[b.freshness.status];
  }
  return a.freshness.daysSince - b.freshness.daysSince;
}

function applyMockQuery(query: ListingQuery): Paginated<Listing> {
  const limit = Math.min(query.limit ?? PAGE_SIZE, MAX_LIMIT);
  const offset = decodeCursor(query.cursor);
  const fresh = query.fresh ?? ['fresh', 'aging']; // default browse excludes stale

  let items = MOCK_LISTINGS.filter((l) => l.status === 'active');

  if (query.category) items = items.filter((l) => l.categoryId === query.category);
  if (query.minPrice != null) items = items.filter((l) => l.price >= query.minPrice!);
  if (query.maxPrice != null) items = items.filter((l) => l.price <= query.maxPrice!);
  if (query.city) {
    const city = query.city.trim().toLowerCase();
    items = items.filter((l) => l.location.city.toLowerCase() === city);
  }
  if (query.tags && query.tags.length) {
    const wanted = query.tags.map((t) => t.toLowerCase());
    items = items.filter((l) =>
      (l.locationTags ?? []).some((t) => wanted.includes(t.toLowerCase())),
    );
  }
  if (query.bedrooms != null) {
    items = items.filter((l) => (l.bedrooms ?? 0) === query.bedrooms);
  }
  if (query.minBedrooms != null) {
    items = items.filter((l) => (l.bedrooms ?? 0) >= query.minBedrooms!);
  }
  if (query.minArea != null) items = items.filter((l) => l.area >= query.minArea!);
  if (query.maxArea != null) items = items.filter((l) => l.area <= query.maxArea!);
  if (query.excludeId) items = items.filter((l) => l.listingId !== query.excludeId);
  items = items.filter((l) => fresh.includes(l.freshness.status));

  if (query.q && query.q.trim()) {
    // Whole-lowercase-token match, mirroring the titleKeywords array-contains model.
    const tokens = query.q.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter((l) => {
      const titleTokens = l.title.toLowerCase().split(/\s+/);
      return tokens.some((t) => titleTokens.includes(t));
    });
  }

  // Latitude band or radius search.
  const radiusActive =
    query.centerLat != null &&
    query.centerLng != null &&
    query.radiusKm != null &&
    query.radiusKm > 0;

  if (radiusActive) {
    items = items.filter((l) =>
      isWithinRadiusKm(
        query.centerLat!,
        query.centerLng!,
        l.location.lat,
        l.location.lng,
        query.radiusKm!,
      ),
    );
  } else {
    if (query.minLat != null) items = items.filter((l) => l.location.lat >= query.minLat!);
    if (query.maxLat != null) items = items.filter((l) => l.location.lat <= query.maxLat!);
    if (query.minLng != null) items = items.filter((l) => l.location.lng >= query.minLng!);
    if (query.maxLng != null) items = items.filter((l) => l.location.lng <= query.maxLng!);
  }

  items = [...items].sort(defaultSort);

  const total = items.length;
  const paged = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const hasMore = nextOffset < total;
  return {
    items: paged,
    total,
    // `page` retained for callers that still think in pages; derived from offset.
    page: Math.floor(offset / limit) + 1,
    hasMore,
    nextCursor: hasMore ? encodeCursor(nextOffset) : undefined,
  };
}

export const listingsService = {
  async getCategories(): Promise<Category[]> {
    if (config.useMockData) return delay(MOCK_CATEGORIES);
    // Live: read the seeded `categories` collection via the client SDK (read-only,
    // Security-Rules gated). Web-SDK wiring lands with real credentials; until then
    // we serve the same reference data so the contract is stable.
    return MOCK_CATEGORIES;
  },

  async getListings(query: ListingQuery = {}): Promise<Paginated<Listing>> {
    if (config.useMockData) return delay(applyMockQuery(query));
    // Live: client SDK query — where('status','==','active'), orderBy(lastVerifiedAt
    // desc), startAfter(cursorDoc), limit(n). READS ONLY. Backed by the composite
    // indexes in firestore.indexes.json. Falls back to the mock shape until wired.
    return applyMockQuery(query);
  },

  async getListingById(listingId: string): Promise<ListingDetail> {
    if (config.useMockData) {
      const listing = MOCK_LISTINGS.find((l) => l.listingId === listingId);
      if (!listing) throw new Error('This listing could not be found.');
      const agent = MOCK_AGENTS[listing.agentId] ?? {
        uid: listing.agentId,
        displayName: 'Estate Ease Agent',
      };
      return delay({ listing, agent });
    }
    const listing = MOCK_LISTINGS.find((l) => l.listingId === listingId)!;
    return { listing, agent: MOCK_AGENTS[listing.agentId] };
  },

  /**
   * Record a unique view. This is a WRITE, so it goes through Express (which
   * de-dupes per viewer per 24h and updates Firestore via the Admin SDK). Best-
   * effort: a failure here never blocks the detail screen.
   */
  async recordView(listingId: string): Promise<{ viewCount: number; counted: boolean } | null> {
    if (config.useMockData) {
      const listing = MOCK_LISTINGS.find((l) => l.listingId === listingId);
      return delay({ viewCount: (listing?.viewCount ?? 0) + 1, counted: true }, 150);
    }
    try {
      const { data } = await api.post(`/listings/${listingId}/view`);
      return { viewCount: data.viewCount, counted: data.counted };
    } catch {
      return null;
    }
  },

  /**
   * Similar listings: same category + city, exclude self/removed/draft, freshness order.
   */
  async getSimilar(listingId: string, limit = 6): Promise<Listing[]> {
    if (config.useMockData) {
      const source = MOCK_LISTINGS.find((l) => l.listingId === listingId);
      if (!source || source.status === 'removed' || source.status === 'draft') {
        throw new Error('This listing could not be found.');
      }
      const page = applyMockQuery({
        category: source.categoryId,
        city: source.location.city,
        excludeId: listingId,
        fresh: ['fresh', 'aging', 'stale'],
        limit,
      });
      return delay(page.items);
    }
    try {
      const { data } = await api.get(`/listings/${listingId}/similar`, { params: { limit } });
      return data.items as Listing[];
    } catch {
      return [];
    }
  },
};
