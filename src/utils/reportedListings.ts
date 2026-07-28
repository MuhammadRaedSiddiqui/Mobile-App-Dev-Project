/**
 * Persisted "already reported" flags per seeker. Complements the server
 * idempotency check so the detail UI can disable the action after remount
 * without exposing other reporters.
 */
import { STORAGE_KEYS } from './constants';
import { readCache, writeCache } from './cache';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getReportedIds(uid: string): Promise<string[]> {
  if (!uid) return [];
  const cached = await readCache<string[]>(STORAGE_KEYS.reported(uid), TTL_MS);
  return cached?.data ?? [];
}

export async function markReported(uid: string, listingId: string): Promise<void> {
  if (!uid || !listingId) return;
  const existing = await getReportedIds(uid);
  if (existing.includes(listingId)) return;
  await writeCache(STORAGE_KEYS.reported(uid), [...existing, listingId]);
}

export async function hasLocalReport(uid: string, listingId: string): Promise<boolean> {
  const ids = await getReportedIds(uid);
  return ids.includes(listingId);
}
