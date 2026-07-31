/**
 * Per-user recent search history. Keys follow ee:search-history:{uid} so logout
 * clears the correct user's terms and users never see each other's history.
 */
import { STORAGE_KEYS } from './constants';
import { clearCache, readCache, writeCache } from './cache';

const MAX = 8;
/** Recent searches may live longer than freshness data (30 days). */
const SEARCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function debug(event: string, details: Record<string, unknown>): void {
  if (__DEV__) console.log(`[recent-searches] ${event}`, details);
}

export async function getRecentSearches(uid: string): Promise<string[]> {
  if (!uid) return [];
  const cached = await readCache<string[]>(STORAGE_KEYS.searchHistory(uid), SEARCH_TTL_MS);
  if (!cached || cached.expired) return [];
  return cached.data;
}

export async function saveRecentSearch(uid: string, term: string): Promise<void> {
  const trimmed = term.trim();
  if (!uid || !trimmed) return;
  const existing = await getRecentSearches(uid);
  const next = [trimmed, ...existing.filter((t) => t !== trimmed)].slice(0, MAX);
  debug('save', { uid, key: STORAGE_KEYS.searchHistory(uid), terms: next });
  await writeCache(STORAGE_KEYS.searchHistory(uid), next);
}

export async function clearRecentSearches(uid: string): Promise<void> {
  if (!uid) return;
  const key = STORAGE_KEYS.searchHistory(uid);
  debug('clear:start', { uid, key });
  await clearCache(key);
  const remaining = await readCache<string[]>(key, SEARCH_TTL_MS);
  debug('clear:complete', { uid, key, remaining: remaining?.data ?? [] });
}

/** Remove a single recent term; no-op if missing. */
export async function removeRecentSearch(uid: string, term: string): Promise<void> {
  if (!uid || !term) return;
  const existing = await getRecentSearches(uid);
  const next = existing.filter((t) => t !== term);
  if (next.length === 0) {
    await clearCache(STORAGE_KEYS.searchHistory(uid));
    return;
  }
  await writeCache(STORAGE_KEYS.searchHistory(uid), next);
}
