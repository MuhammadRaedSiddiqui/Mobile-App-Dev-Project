/**
 * Namespaced AsyncStorage helpers with TTL.
 * Freshness-bearing payloads must use CACHE_TTL_MS (1h) so stale trust signals
 * are never presented as current.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_TTL_MS } from './constants';

export interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

export interface CacheRead<T> {
  data: T;
  savedAt: number;
  ageMs: number;
  /** True when age exceeds maxAge — caller should label as cached / refresh. */
  expired: boolean;
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Cache write failures are non-fatal.
  }
}

export async function readCache<T>(
  key: string,
  maxAgeMs: number = CACHE_TTL_MS,
): Promise<CacheRead<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || typeof envelope.savedAt !== 'number') return null;
    const ageMs = Date.now() - envelope.savedAt;
    return {
      data: envelope.data,
      savedAt: envelope.savedAt,
      ageMs,
      expired: ageMs > maxAgeMs,
    };
  } catch {
    return null;
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
