/**
 * Agent listing-management service. Every method is a WRITE (or an owner-scoped
 * read) → Express only. Mock mode uses a mutable in-memory copy of seeded
 * listings so create / edit / soft-delete work for both new and seed rows.
 */
import { config } from '@/config/env';
import { CategoryId, Listing, ListingStatus, PriceType } from '@/utils/types';
import { MOCK_LISTINGS } from '@/mocks/data';
import { api } from './api';

export interface ListingLocationInput {
  lat: number;
  lng: number;
  address: string;
  city: string;
  area: string;
}

export interface ListingCostInput {
  rent: number;
  depositMonths: number;
  monthlyMaintenance: number;
  estimatedUtilities: number;
}

export interface ListingFormInput {
  categoryId: CategoryId;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  location: ListingLocationInput;
  locationTags?: string[];
  cost: ListingCostInput;
  status?: 'draft' | 'active';
}

const AMORTIZATION_MONTHS = 12;

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function cloneListing(l: Listing): Listing {
  return {
    ...l,
    imageUrls: [...l.imageUrls],
    location: { ...l.location },
    locationTags: l.locationTags ? [...l.locationTags] : [],
    freshness: { ...l.freshness },
    costBreakdown: { ...l.costBreakdown },
  };
}

/** Mutable mock inventory — seeded once from MOCK_LISTINGS, then owned by mutations. */
const mockById = new Map<string, Listing>(
  MOCK_LISTINGS.map((l) => [l.listingId, cloneListing(l)]),
);
let mockSeq = MOCK_LISTINGS.length + 100;

function buildMockListing(agentId: string, input: ListingFormInput): Listing {
  const now = new Date('2026-07-27T09:00:00Z');
  const amortizedDeposit = (input.cost.rent * input.cost.depositMonths) / AMORTIZATION_MONTHS;
  const estimatedMonthlyTotal = Math.round(
    input.cost.rent + amortizedDeposit + input.cost.monthlyMaintenance + input.cost.estimatedUtilities,
  );
  mockSeq += 1;
  return {
    listingId: `lst-${String(mockSeq).padStart(3, '0')}`,
    agentId,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    price: input.price,
    priceType: input.priceType,
    area: input.area,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    imageUrls: input.imageUrls,
    location: input.location,
    locationTags: input.locationTags ?? [],
    status: (input.status ?? 'active') as ListingStatus,
    viewCount: 0,
    freshness: { status: 'fresh', daysSince: 0, lastVerifiedAt: now.toISOString() },
    costBreakdown: { ...input.cost, estimatedMonthlyTotal },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function applyCost(existing: Listing, cost: ListingCostInput): void {
  const amortizedDeposit = (cost.rent * cost.depositMonths) / AMORTIZATION_MONTHS;
  existing.costBreakdown = {
    ...cost,
    estimatedMonthlyTotal: Math.round(
      cost.rent + amortizedDeposit + cost.monthlyMaintenance + cost.estimatedUtilities,
    ),
  };
}

export const agentService = {
  async getMyListings(agentId: string): Promise<Listing[]> {
    if (config.useMockData) {
      const items = [...mockById.values()]
        .filter((l) => l.agentId === agentId)
        .map(cloneListing)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      return delay(items);
    }
    const { data } = await api.get('/agent/listings');
    return data.items as Listing[];
  },

  async getListing(listingId: string, agentId: string): Promise<Listing | null> {
    if (config.useMockData) {
      const listing = mockById.get(listingId);
      if (!listing || listing.agentId !== agentId) return delay(null);
      return delay(cloneListing(listing));
    }
    const { data } = await api.get('/agent/listings');
    const items = data.items as Listing[];
    return items.find((l) => l.listingId === listingId) ?? null;
  },

  async create(agentId: string, input: ListingFormInput): Promise<Listing> {
    if (config.useMockData) {
      const listing = buildMockListing(agentId, input);
      mockById.set(listing.listingId, listing);
      return delay(cloneListing(listing));
    }
    const { data } = await api.post('/agent/listings', input);
    return data.listing as Listing;
  },

  async update(listingId: string, input: Partial<ListingFormInput>): Promise<Listing | null> {
    if (config.useMockData) {
      const existing = mockById.get(listingId);
      if (!existing || existing.status === 'removed') return delay(null);
      if (input.categoryId !== undefined) existing.categoryId = input.categoryId;
      if (input.title !== undefined) existing.title = input.title;
      if (input.description !== undefined) existing.description = input.description;
      if (input.price !== undefined) existing.price = input.price;
      if (input.priceType !== undefined) existing.priceType = input.priceType;
      if (input.area !== undefined) existing.area = input.area;
      if (input.bedrooms !== undefined) existing.bedrooms = input.bedrooms;
      if (input.bathrooms !== undefined) existing.bathrooms = input.bathrooms;
      if (input.imageUrls !== undefined) existing.imageUrls = input.imageUrls;
      if (input.location !== undefined) existing.location = input.location;
      if (input.locationTags !== undefined) existing.locationTags = input.locationTags;
      if (input.cost !== undefined) applyCost(existing, input.cost);
      if (input.status !== undefined) existing.status = input.status;
      existing.updatedAt = new Date().toISOString();
      return delay(cloneListing(existing));
    }
    const { data } = await api.put(`/agent/listings/${listingId}`, input);
    return data.listing as Listing;
  },

  async remove(listingId: string): Promise<void> {
    if (config.useMockData) {
      const existing = mockById.get(listingId);
      if (existing) {
        existing.status = 'removed';
        existing.updatedAt = new Date().toISOString();
      }
      return delay(undefined);
    }
    await api.delete(`/agent/listings/${listingId}`);
  },

  /** Apply a freshness reset after agent verify (mock store only). */
  applyVerified(listingId: string, freshness: Listing['freshness']): void {
    if (!config.useMockData) return;
    const existing = mockById.get(listingId);
    if (existing) {
      existing.freshness = { ...freshness };
      existing.updatedAt = new Date().toISOString();
    }
  },
};
