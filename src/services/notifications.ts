import { Platform } from 'react-native';
import { config } from '@/config/env';
import { api } from './api';

export interface NotificationPreferences {
  pushEnabled: boolean;
  savedSearchAlerts: boolean;
}

export interface SavedSearchQuery {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  tags?: string[];
  fresh?: Array<'fresh' | 'aging' | 'stale'>;
  bedrooms?: number;
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  category?: string;
}

export interface SavedSearch {
  id: string;
  uid: string;
  label: string;
  query: SavedSearchQuery;
  notifyOnNewListings: boolean;
  createdAt: string;
}

const mockPrefs: NotificationPreferences = {
  pushEnabled: false,
  savedSearchAlerts: false,
};
const mockSaved: SavedSearch[] = [];
let mockCounter = 1;

/** Mock push token until expo-notifications is wired for live builds. */
export function mockPushToken(uid: string): string {
  return `mock-push-${uid}-${Platform.OS}`;
}

export const notificationsService = {
  async registerPushToken(token: string): Promise<void> {
    if (config.useMockData) return;
    await api.post('/notifications/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    });
  },

  async unregisterPushToken(): Promise<void> {
    if (config.useMockData) return;
    await api.delete('/notifications/push-token');
  },

  async getPreferences(): Promise<NotificationPreferences> {
    if (config.useMockData) return { ...mockPrefs };
    const { data } = await api.get('/notifications/preferences');
    return data.preferences;
  },

  async updatePreferences(patch: NotificationPreferences): Promise<NotificationPreferences> {
    if (config.useMockData) {
      Object.assign(mockPrefs, patch);
      return { ...mockPrefs };
    }
    const { data } = await api.put('/notifications/preferences', patch);
    return data.preferences;
  },

  async listSavedSearches(): Promise<SavedSearch[]> {
    if (config.useMockData) return [...mockSaved];
    const { data } = await api.get('/notifications/saved-searches');
    return data.items;
  },

  async saveSearch(input: {
    label: string;
    query: SavedSearchQuery;
    notifyOnNewListings?: boolean;
  }): Promise<SavedSearch> {
    if (config.useMockData) {
      const record: SavedSearch = {
        id: `ss-mock-${mockCounter++}`,
        uid: 'mock',
        label: input.label,
        query: input.query,
        notifyOnNewListings: input.notifyOnNewListings ?? true,
        createdAt: new Date().toISOString(),
      };
      mockSaved.unshift(record);
      return record;
    }
    const { data } = await api.post('/notifications/saved-searches', input);
    return data.savedSearch;
  },

  async deleteSavedSearch(id: string): Promise<void> {
    if (config.useMockData) {
      const idx = mockSaved.findIndex((s) => s.id === id);
      if (idx >= 0) mockSaved.splice(idx, 1);
      return;
    }
    await api.delete(`/notifications/saved-searches/${id}`);
  },
};
