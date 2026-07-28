/**
 * Favorites service. All mutations are WRITES → Express only. Reads may be served
 * from Firestore/local cache. Mock mode keeps an in-memory set so the save/unsave
 * interaction works in the slice before the API exists.
 */
import { config } from '@/config/env';
import { Listing } from '@/utils/types';
import { MOCK_LISTINGS } from '@/mocks/data';
import { api } from './api';

const mockFavorites = new Set<string>(['lst-002']); // Ayesha has one saved by default

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const favoritesService = {
  async list(): Promise<string[]> {
    if (config.useMockData) return delay([...mockFavorites]);
    const { data } = await api.get('/favorites');
    return (data.listings as Array<{ listingId: string }>).map((l) => l.listingId);
  },

  async add(listingId: string): Promise<void> {
    if (config.useMockData) {
      mockFavorites.add(listingId);
      return delay(undefined);
    }
    await api.post(`/favorites/${listingId}`);
  },

  async remove(listingId: string): Promise<void> {
    if (config.useMockData) {
      mockFavorites.delete(listingId);
      return delay(undefined);
    }
    await api.delete(`/favorites/${listingId}`);
  },

  async check(listingId: string): Promise<boolean> {
    if (config.useMockData) return delay(mockFavorites.has(listingId));
    const { data } = await api.get(`/favorites/check/${listingId}`);
    return Boolean(data.isSaved);
  },

  /**
   * Returns full Listing objects for every saved ID, including soft-deleted
   * (status: 'removed') entries so the FavoritesScreen can render them as
   * unavailable rather than silently dropping them.
   */
  async listFull(): Promise<Listing[]> {
    if (config.useMockData) {
      const ids = [...mockFavorites];
      const results = ids
        .map((id) => MOCK_LISTINGS.find((l) => l.listingId === id))
        .filter((l): l is Listing => l !== undefined);
      return delay(results);
    }
    const { data } = await api.get('/favorites');
    return data.listings as Listing[];
  },
};
