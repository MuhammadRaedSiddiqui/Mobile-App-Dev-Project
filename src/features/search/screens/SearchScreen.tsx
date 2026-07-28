import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { EmptyState, ErrorState, ListingCardSkeleton, Screen } from '@/components/common';
import { ListingCard } from '@/components/listing';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/store/slices/favoritesSlice';
import { useListings } from '@/features/listings/hooks/useListings';
import type { Listing } from '@/utils/types';
import type { MainStackParamList, SeekerTabParamList } from '@/navigation/types';
import {
  getRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
} from '@/utils/recentSearches';
import {
  clearSearchFilters,
  loadSearchFilters,
  saveSearchFilters,
  type PersistedSearchFilters,
} from '@/utils/searchFilters';
import { LIVABILITY_LABELS, LIVABILITY_TAG_IDS } from '@/utils/livabilityTags';
import { notificationsService } from '@/services';

type SearchNav = CompositeNavigationProp<
  BottomTabNavigationProp<SeekerTabParamList, 'Search'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type FreshnessFilter = 'fresh' | 'aging' | 'stale';
type BedroomChip = PersistedSearchFilters['bedrooms'];

const FRESHNESS_LABELS: Record<FreshnessFilter, string> = {
  fresh: 'Fresh (≤7d)',
  aging: 'Aging (≤14d)',
  stale: 'Stale (>14d)',
};

const BUDGET_PRESETS: Array<{ id: string; label: string; min: string; max: string }> = [
  { id: 'u25', label: 'Under 25k', min: '', max: '25000' },
  { id: '25-40', label: '25–40k', min: '25000', max: '40000' },
  { id: '40-60', label: '40–60k', min: '40000', max: '60000' },
  { id: '60p', label: '60k+', min: '60000', max: '' },
];

/** Curated location tags present in seed data — multi-select any-match. */
const TAG_OPTIONS = [
  'near-metro',
  'furnished',
  'parking',
  'gated',
  'roommate',
  'lift',
  'renovated',
  'beach',
  'sea-view',
  'quiet',
] as const;

const BEDROOM_OPTIONS: Array<{ id: BedroomChip; label: string }> = [
  { id: 'any', label: 'Any beds' },
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3+', label: '3+' },
];

const DEBOUNCE_MS = 400;

export function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((s) => s.favorites.ids);
  const uid = useAppSelector((s) => s.auth.user?.uid ?? '');
  const role = useAppSelector((s) => s.auth.user?.role);

  const [inputValue, setInputValue] = useState('');
  const [committedQ, setCommittedQ] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [committedMinPrice, setCommittedMinPrice] = useState('');
  const [committedMaxPrice, setCommittedMaxPrice] = useState('');
  const [committedCity, setCommittedCity] = useState('');
  const [committedMinArea, setCommittedMinArea] = useState('');
  const [committedMaxArea, setCommittedMaxArea] = useState('');
  const [freshness, setFreshness] = useState<FreshnessFilter[]>([]);
  const [bedrooms, setBedrooms] = useState<BedroomChip>('any');
  const [tags, setTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) {
      setFiltersHydrated(true);
      return;
    }
    let active = true;
    (async () => {
      const [recent, saved] = await Promise.all([getRecentSearches(uid), loadSearchFilters(uid)]);
      if (!active) return;
      setRecentSearches(recent);
      setMinPrice(saved.minPrice);
      setMaxPrice(saved.maxPrice);
      setCity(saved.city);
      setMinArea(saved.minArea);
      setMaxArea(saved.maxArea);
      setCommittedMinPrice(saved.minPrice);
      setCommittedMaxPrice(saved.maxPrice);
      setCommittedCity(saved.city);
      setCommittedMinArea(saved.minArea);
      setCommittedMaxArea(saved.maxArea);
      setFreshness(saved.freshness);
      setBedrooms(saved.bedrooms);
      setTags(saved.tags);
      setShowFilters(Boolean(saved.showFilters));
      setFiltersHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  // Persist filter state whenever it changes (after hydrate).
  useEffect(() => {
    if (!uid || !filtersHydrated) return;
    const payload: PersistedSearchFilters = {
      minPrice,
      maxPrice,
      city,
      minArea,
      maxArea,
      freshness,
      bedrooms,
      tags,
      showFilters,
    };
    void saveSearchFilters(uid, payload);
  }, [
    uid,
    filtersHydrated,
    minPrice,
    maxPrice,
    city,
    minArea,
    maxArea,
    freshness,
    bedrooms,
    tags,
    showFilters,
  ]);

  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCommittedQ(text.trim());
    }, DEBOUNCE_MS);
  }, []);

  const commitSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      setInputValue(trimmed);
      setCommittedQ(trimmed);
      setShowRecent(false);
      if (trimmed && uid) {
        await saveRecentSearch(uid, trimmed);
        setRecentSearches(await getRecentSearches(uid));
      }
    },
    [uid],
  );

  const handleClearRecent = useCallback(async () => {
    if (uid) await clearRecentSearches(uid);
    setRecentSearches([]);
  }, [uid]);

  const handleRemoveRecent = useCallback(
    async (term: string) => {
      if (uid) await removeRecentSearch(uid, term);
      setRecentSearches((prev) => prev.filter((t) => t !== term));
    },
    [uid],
  );

  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setCommittedMinPrice(minPrice);
      setCommittedMaxPrice(maxPrice);
      setCommittedCity(city);
      setCommittedMinArea(minArea);
      setCommittedMaxArea(maxArea);
    }, DEBOUNCE_MS);
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, [minPrice, maxPrice, city, minArea, maxArea]);

  const query = useMemo(() => {
    const q: Parameters<typeof useListings>[0] = {};
    if (committedQ) q.q = committedQ;
    if (committedCity.trim()) q.city = committedCity.trim();
    if (committedMinPrice && !isNaN(Number(committedMinPrice))) q.minPrice = Number(committedMinPrice);
    if (committedMaxPrice && !isNaN(Number(committedMaxPrice))) q.maxPrice = Number(committedMaxPrice);
    if (committedMinArea && !isNaN(Number(committedMinArea))) q.minArea = Number(committedMinArea);
    if (committedMaxArea && !isNaN(Number(committedMaxArea))) q.maxArea = Number(committedMaxArea);
    if (tags.length) q.tags = tags;
    if (bedrooms === '1') q.bedrooms = 1;
    else if (bedrooms === '2') q.bedrooms = 2;
    else if (bedrooms === '3+') q.minBedrooms = 3;
    if (freshness.length) q.fresh = freshness;
    else q.fresh = ['fresh', 'aging', 'stale'];
    return q;
  }, [
    committedQ,
    committedCity,
    committedMinPrice,
    committedMaxPrice,
    committedMinArea,
    committedMaxArea,
    freshness,
    bedrooms,
    tags,
  ]);

  const { listings, loading, loadingMore, hasMore, error, reload, loadMore } = useListings(
    query,
    uid,
  );

  const hasActiveFilters =
    !!committedQ ||
    !!city.trim() ||
    !!minPrice ||
    !!maxPrice ||
    !!minArea ||
    !!maxArea ||
    freshness.length > 0 ||
    bedrooms !== 'any' ||
    tags.length > 0;

  const clearAll = useCallback(() => {
    setInputValue('');
    setCommittedQ('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setCommittedCity('');
    setCommittedMinPrice('');
    setCommittedMaxPrice('');
    setCommittedMinArea('');
    setCommittedMaxArea('');
    setFreshness([]);
    setBedrooms('any');
    setTags([]);
    if (uid) void clearSearchFilters(uid);
  }, [uid]);

  const toggleFreshnessFilter = useCallback((f: FreshnessFilter) => {
    setFreshness((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const applyBudgetPreset = useCallback((min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
  }, []);

  const openListing = useCallback(
    (listing: Listing) => navigation.navigate('ListingDetail', { listingId: listing.listingId }),
    [navigation],
  );

  const onToggleFavorite = useCallback(
    (listing: Listing) =>
      dispatch(
        toggleFavorite({
          listingId: listing.listingId,
          currentlySaved: favoriteIds.includes(listing.listingId),
          uid,
        }),
      ),
    [dispatch, favoriteIds, uid],
  );

  const buildSavedSearchQuery = useCallback(() => {
    const q: Parameters<typeof notificationsService.saveSearch>[0]['query'] = {};
    if (committedQ) q.q = committedQ;
    if (committedCity.trim()) q.city = committedCity.trim();
    if (committedMinPrice && !isNaN(Number(committedMinPrice))) q.minPrice = Number(committedMinPrice);
    if (committedMaxPrice && !isNaN(Number(committedMaxPrice))) q.maxPrice = Number(committedMaxPrice);
    if (committedMinArea && !isNaN(Number(committedMinArea))) q.minArea = Number(committedMinArea);
    if (committedMaxArea && !isNaN(Number(committedMaxArea))) q.maxArea = Number(committedMaxArea);
    if (tags.length) q.tags = tags;
    if (bedrooms === '1') q.bedrooms = 1;
    else if (bedrooms === '2') q.bedrooms = 2;
    else if (bedrooms === '3+') q.minBedrooms = 3;
    if (freshness.length) q.fresh = freshness;
    return q;
  }, [
    committedQ,
    committedCity,
    committedMinPrice,
    committedMaxPrice,
    committedMinArea,
    committedMaxArea,
    tags,
    bedrooms,
    freshness,
  ]);

  const saveCurrentSearch = useCallback(async () => {
    if (!hasActiveFilters) return;
    const label =
      committedQ.trim() ||
      [city.trim(), minPrice && `≥${minPrice}`, maxPrice && `≤${maxPrice}`]
        .filter(Boolean)
        .join(' · ') ||
      'Saved search';
    try {
      await notificationsService.saveSearch({
        label,
        query: buildSavedSearchQuery(),
        notifyOnNewListings: true,
      });
      Alert.alert('Search saved', 'Turn on alerts in Profile → Notifications if you want push updates.');
    } catch {
      Alert.alert('Couldn’t save', 'Please try again in a moment.');
    }
  }, [hasActiveFilters, committedQ, city, minPrice, maxPrice, buildSavedSearchQuery]);

  if (error) {
    return (
      <Screen>
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }

  const activeBudgetId = BUDGET_PRESETS.find((p) => p.min === minPrice && p.max === maxPrice)?.id;

  const header = (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search area, e.g. Gulshan, Johar…"
          placeholderTextColor={colors.textDisabled}
          value={inputValue}
          onChangeText={handleInputChange}
          onFocus={() => setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 150)}
          onSubmitEditing={() => commitSearch(inputValue)}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)}>
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleActive]}>
            Filters{showFilters ? ' ▲' : ' ▼'}
          </Text>
        </Pressable>
      </View>

      {showRecent && recentSearches.length > 0 && (
        <View style={styles.recentBox}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentLabel}>Recent</Text>
            <Pressable onPress={handleClearRecent}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          {recentSearches.map((term) => (
            <View key={term} style={styles.recentRow}>
              <Pressable style={styles.recentItem} onPress={() => commitSearch(term)}>
                <Text style={styles.recentItemText}>{term}</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                accessibilityLabel={`Remove ${term}`}
                onPress={() => handleRemoveRecent(term)}
                style={styles.recentRemove}
              >
                <Text style={styles.recentRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Budget</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {BUDGET_PRESETS.map((p) => {
              const active = activeBudgetId === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => applyBudgetPreset(p.min, p.max)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.filterRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min price"
              placeholderTextColor={colors.textDisabled}
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="numeric"
            />
            <Text style={styles.priceSep}>–</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max price"
              placeholderTextColor={colors.textDisabled}
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.filterLabel}>Bedrooms</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {BEDROOM_OPTIONS.map((opt) => {
              const active = bedrooms === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setBedrooms(opt.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Area (sq ft)</Text>
          <View style={styles.filterRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min area"
              placeholderTextColor={colors.textDisabled}
              value={minArea}
              onChangeText={setMinArea}
              keyboardType="numeric"
            />
            <Text style={styles.priceSep}>–</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max area"
              placeholderTextColor={colors.textDisabled}
              value={maxArea}
              onChangeText={setMaxArea}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.filterLabel}>Location tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {TAG_OPTIONS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Area livability</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {LIVABILITY_TAG_IDS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {LIVABILITY_LABELS[tag]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.cityInput}
            placeholder="City (e.g. Karachi)"
            placeholderTextColor={colors.textDisabled}
            value={city}
            onChangeText={setCity}
            autoCorrect={false}
          />

          <Text style={styles.filterLabel}>Freshness</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {(Object.keys(FRESHNESS_LABELS) as FreshnessFilter[]).map((f) => {
              const active = freshness.includes(f);
              return (
                <Pressable
                  key={f}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleFreshnessFilter(f)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {FRESHNESS_LABELS[f]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {hasActiveFilters && (
        <View style={styles.activeRow}>
          {committedQ ? (
            <Chip
              label={`"${committedQ}"`}
              onRemove={() => {
                setInputValue('');
                setCommittedQ('');
              }}
            />
          ) : null}
          {city.trim() ? <Chip label={city.trim()} onRemove={() => setCity('')} /> : null}
          {minPrice ? <Chip label={`≥ ${minPrice}`} onRemove={() => setMinPrice('')} /> : null}
          {maxPrice ? <Chip label={`≤ ${maxPrice}`} onRemove={() => setMaxPrice('')} /> : null}
          {minArea ? <Chip label={`≥ ${minArea} sqft`} onRemove={() => setMinArea('')} /> : null}
          {maxArea ? <Chip label={`≤ ${maxArea} sqft`} onRemove={() => setMaxArea('')} /> : null}
          {bedrooms !== 'any' ? (
            <Chip label={`${bedrooms} bed`} onRemove={() => setBedrooms('any')} />
          ) : null}
          {tags.map((t) => (
            <Chip key={t} label={t} onRemove={() => toggleTag(t)} />
          ))}
          {freshness.map((f) => (
            <Chip key={f} label={f} onRemove={() => toggleFreshnessFilter(f)} />
          ))}
          {role === 'seeker' ? (
            <Pressable onPress={saveCurrentSearch} style={styles.saveSearch}>
              <Text style={styles.saveSearchText}>Save search</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={clearAll} style={styles.clearAll}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </Pressable>
        </View>
      )}

      {!loading && (
        <Text style={styles.resultCount}>
          {listings.length === 0
            ? 'No results'
            : `${listings.length} listing${listings.length === 1 ? '' : 's'}`}
        </Text>
      )}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={loading || !filtersHydrated ? [] : listings}
        keyExtractor={(item) => item.listingId}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        onEndReached={() => !loading && hasMore && loadMore()}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={openListing}
            isFavorite={favoriteIds.includes(item.listingId)}
            onToggleFavorite={onToggleFavorite}
          />
        )}
        ListFooterComponent={
          loading || !filtersHydrated ? (
            <View style={styles.pad}>
              {[0, 1, 2].map((i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </View>
          ) : loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading || !filtersHydrated ? null : hasActiveFilters ? (
            <EmptyState
              title="No listings match"
              message="Try adjusting your filters or search term."
            />
          ) : (
            <EmptyState
              title="Search for a listing"
              message="Type an area name, or use the filters above."
            />
          )
        }
      />
    </Screen>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable style={styles.activeChip} onPress={onRemove}>
      <Text style={styles.activeChipText}>{label} ✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 80 },
  footer: { paddingVertical: spacing.xl },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterToggleText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  filterToggleActive: { color: colors.primary },

  recentBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  clearText: { ...typography.caption, color: colors.primary },
  recentRow: { flexDirection: 'row', alignItems: 'center' },
  recentItem: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  recentItemText: { ...typography.body, color: colors.textPrimary },
  recentRemove: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  recentRemoveText: { ...typography.caption, color: colors.textSecondary },

  filterPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceSep: { ...typography.body, color: colors.textSecondary },
  cityInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: { flexDirection: 'row' },

  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },

  activeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  activeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  activeChipText: { ...typography.caption, color: colors.textPrimary },
  clearAll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearAllText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  saveSearch: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  saveSearchText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },

  resultCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
