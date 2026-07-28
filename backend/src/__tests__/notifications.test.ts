import {
  dispatchSavedSearchAlert,
  listingMatchesSavedSearch,
  type SavedSearchRecord,
} from '@/services/notifications';
import type { SerializedListing } from '@/services/store';

const baseListing = {
  listingId: 'lst-x',
  agentId: 'agent-danish',
  categoryId: 'one-bed',
  title: 'Gulshan flat',
  titleKeywords: ['gulshan', 'flat'],
  description: 'Test',
  price: 38000,
  priceType: 'monthly' as const,
  area: 650,
  bedrooms: 1,
  bathrooms: 1,
  imageUrls: [],
  location: { lat: 24.92, lng: 67.09, address: 'A', city: 'Karachi', area: 'Gulshan-e-Iqbal' },
  locationTags: ['water-24-7'],
  geohash: 'tt',
  status: 'active' as const,
  viewCount: 0,
  freshness: { status: 'fresh' as const, lastVerifiedAt: '2026-07-27T09:00:00Z', daysSince: 1 },
  costBreakdown: {
    rent: 38000,
    depositMonths: 2,
    monthlyMaintenance: 0,
    estimatedUtilities: 0,
    estimatedMonthlyTotal: 38000,
  },
  createdAt: '2026-07-01T09:00:00Z',
  updatedAt: '2026-07-25T09:00:00Z',
} satisfies SerializedListing;

describe('saved-search notifications', () => {
  it('matches listing against tag and price filters', () => {
    expect(
      listingMatchesSavedSearch(baseListing, { tags: ['water-24-7'], maxPrice: 40000 }),
    ).toBe(true);
    expect(listingMatchesSavedSearch(baseListing, { maxPrice: 30000 })).toBe(false);
  });

  it('does not deliver without consent', () => {
    const search: SavedSearchRecord = {
      id: 'ss-1',
      uid: 'seeker-ayesha',
      label: 'Gulshan',
      query: { city: 'Karachi' },
      notifyOnNewListings: true,
      createdAt: '2026-07-27T09:00:00Z',
    };
    const result = dispatchSavedSearchAlert({
      uid: 'seeker-ayesha',
      token: 'mock-push',
      prefs: { pushEnabled: false, savedSearchAlerts: true },
      search,
      listing: baseListing,
    });
    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('no_consent');
  });

  it('delivers when consent, token, and search alerts are enabled', () => {
    const search: SavedSearchRecord = {
      id: 'ss-1',
      uid: 'seeker-ayesha',
      label: 'Gulshan',
      query: { tags: ['water-24-7'] },
      notifyOnNewListings: true,
      createdAt: '2026-07-27T09:00:00Z',
    };
    const result = dispatchSavedSearchAlert({
      uid: 'seeker-ayesha',
      token: 'mock-push',
      prefs: { pushEnabled: true, savedSearchAlerts: true },
      search,
      listing: baseListing,
    });
    expect(result.delivered).toBe(true);
  });
});
