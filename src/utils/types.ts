/**
 * Shared domain types for the Estate Ease client.
 *
 * These mirror the API contract in EstateEase_Technical_Documentation_v1_2.md
 * (sections 3 & 4). Server-derived fields (freshness, costBreakdown) are the
 * shape the Express API returns — the client never computes authoritative values.
 */

export type UserRole = 'seeker' | 'agent';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export type PriceType = 'monthly' | 'yearly'; // Phase 1 rental-only; 'total' is Phase 2.

export type ListingStatus = 'active' | 'rented' | 'draft' | 'removed';

export type CategoryId = 'one-bed' | 'portion' | 'shared' | 'studio';

export interface Category {
  categoryId: CategoryId;
  name: string;
  slug: string;
  iconName: string;
  sortOrder: number;
}

export interface ListingLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  area: string;
}

/** Freshness is computed server-side from lastVerifiedAt and returned in responses. */
export type FreshnessStatus = 'fresh' | 'aging' | 'stale';

export interface Freshness {
  status: FreshnessStatus;
  lastVerifiedAt: string; // ISO 8601, UTC
  daysSince: number;
}

/**
 * Why a seeker reported a listing. Recorded alongside the report, but note that
 * every reason counts the same toward UNAVAILABLE_REPORT_THRESHOLD — nothing
 * routes 'scam' or 'offensive' anywhere separately yet.
 */
export type ReportReason = 'inaccurate' | 'unavailable' | 'scam' | 'offensive' | 'other';

/** True-cost breakdown, computed server-side. estimatedMonthlyTotal is authoritative. */
export interface CostBreakdown {
  rent: number;
  depositMonths: number;
  monthlyMaintenance: number;
  estimatedUtilities: number;
  estimatedMonthlyTotal: number;
}

export interface Listing {
  listingId: string;
  agentId: string;
  categoryId: CategoryId;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  location: ListingLocation;
  locationTags?: string[];
  /** Geohash for geospatial index backfill (Phase 8 radius search). */
  geohash?: string;
  status: ListingStatus;
  viewCount: number;
  freshness: Freshness;
  costBreakdown: CostBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface ListingAgent {
  uid: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
}

/** GET /listings/:id shape. */
export interface ListingDetail {
  listing: Listing;
  agent: ListingAgent;
}

/** Standard paginated list response. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
  /** Opaque forward cursor for the next page; undefined when hasMore is false. */
  nextCursor?: string;
}

/** Standardized API error envelope from the Express layer. */
export interface ApiError {
  code: string;
  message: string;
}
