import { useCallback, useEffect, useRef, useState } from 'react';
import { listingsService, type ListingQuery } from '@/services';
import { STORAGE_KEYS, CACHE_TTL_MS } from '@/utils/constants';
import { readCache, writeCache } from '@/utils/cache';
import { useAppSelector } from '@/store/hooks';
import type { Category, Listing } from '@/utils/types';

interface UseListingsResult {
  listings: Listing[];
  categories: Category[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  /** True when showing last successful browse from AsyncStorage. */
  fromCache: boolean;
  /** True when cached freshness is older than 1 hour. */
  cacheExpired: boolean;
  reload: () => void;
  refresh: () => void;
  loadMore: () => void;
}

interface BrowseCache {
  items: Listing[];
  queryKey: string;
}

/**
 * Loads categories once and listings whenever the query changes, with opaque
 * cursor pagination and a 1-hour browse cache for offline resilience.
 */
export function useListings(query: ListingQuery, uid?: string): UseListingsResult {
  const browseGeneration = useAppSelector((s) => s.meta.browseGeneration);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheExpired, setCacheExpired] = useState(false);

  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);

  const key = JSON.stringify(query);

  const fetchFirstPage = useCallback(
    async (mode: 'load' | 'refresh') => {
      mode === 'refresh' ? setRefreshing(true) : setLoading(true);
      setError(false);
      try {
        const result = await listingsService.getListings({ ...query, cursor: undefined });
        setListings(result.items);
        cursorRef.current = result.nextCursor;
        hasMoreRef.current = result.hasMore;
        setHasMore(result.hasMore);
        setFromCache(false);
        setCacheExpired(false);
        if (uid) {
          await writeCache(STORAGE_KEYS.lastBrowse(uid), {
            items: result.items,
            queryKey: key,
          } satisfies BrowseCache);
        }
      } catch {
        if (uid) {
          const cached = await readCache<BrowseCache>(STORAGE_KEYS.lastBrowse(uid), CACHE_TTL_MS);
          if (cached && cached.data.queryKey === key) {
            setListings(cached.data.items);
            setFromCache(true);
            setCacheExpired(cached.expired);
            setError(false);
            hasMoreRef.current = false;
            setHasMore(false);
            cursorRef.current = undefined;
          } else if (cached) {
            // Different query — still show last browse as a soft fallback.
            setListings(cached.data.items);
            setFromCache(true);
            setCacheExpired(true);
            setError(false);
            hasMoreRef.current = false;
            setHasMore(false);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, uid, browseGeneration],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current || fromCache) return;
    setLoadingMore(true);
    try {
      const result = await listingsService.getListings({ ...query, cursor: cursorRef.current });
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.listingId));
        return [...prev, ...result.items.filter((l) => !seen.has(l.listingId))];
      });
      cursorRef.current = result.nextCursor;
      hasMoreRef.current = result.hasMore;
      setHasMore(result.hasMore);
    } catch {
      // Keep what we have; a failed page-append is non-fatal.
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loadingMore, fromCache]);

  useEffect(() => {
    let active = true;
    listingsService
      .getCategories()
      .then((c) => active && setCategories(c))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchFirstPage('load');
  }, [fetchFirstPage]);

  return {
    listings,
    categories,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    fromCache,
    cacheExpired,
    reload: () => fetchFirstPage('load'),
    refresh: () => fetchFirstPage('refresh'),
    loadMore,
  };
}
