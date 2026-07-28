/**
 * Persisted search filter state (per-user). Survives leave/re-enter Search tab;
 * cleared only when the user hits Clear all or logs out (key is uid-scoped).
 */
import { STORAGE_KEYS } from './constants';
import { clearCache, readCache, writeCache } from './cache';

const FILTER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface PersistedSearchFilters {
  minPrice: string;
  maxPrice: string;
  city: string;
  minArea: string;
  maxArea: string;
  freshness: Array<'fresh' | 'aging' | 'stale'>;
  bedrooms: 'any' | '1' | '2' | '3+';
  tags: string[];
  showFilters?: boolean;
}

export const EMPTY_SEARCH_FILTERS: PersistedSearchFilters = {
  minPrice: '',
  maxPrice: '',
  city: '',
  minArea: '',
  maxArea: '',
  freshness: [],
  bedrooms: 'any',
  tags: [],
  showFilters: false,
};

export async function loadSearchFilters(uid: string): Promise<PersistedSearchFilters> {
  if (!uid) return { ...EMPTY_SEARCH_FILTERS };
  const cached = await readCache<PersistedSearchFilters>(
    STORAGE_KEYS.searchFilters(uid),
    FILTER_TTL_MS,
  );
  if (!cached || cached.expired || !cached.data) return { ...EMPTY_SEARCH_FILTERS };
  return { ...EMPTY_SEARCH_FILTERS, ...cached.data };
}

export async function saveSearchFilters(
  uid: string,
  filters: PersistedSearchFilters,
): Promise<void> {
  if (!uid) return;
  await writeCache(STORAGE_KEYS.searchFilters(uid), filters);
}

export async function clearSearchFilters(uid: string): Promise<void> {
  if (!uid) return;
  await clearCache(STORAGE_KEYS.searchFilters(uid));
}
