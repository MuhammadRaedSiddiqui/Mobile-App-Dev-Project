import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, ErrorState, ListingCardSkeleton, Screen } from '@/components/common';
import { ListingCard } from '@/components/listing';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/store/slices/favoritesSlice';
import type { CategoryId, Listing } from '@/utils/types';
import type { MainStackParamList, SeekerTabParamList } from '@/navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useListings } from '../hooks/useListings';

/** Home is a tab screen that also pushes onto the parent stack (ListingDetail). */
type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<SeekerTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((s) => s.favorites.ids);
  const uid = useAppSelector((s) => s.auth.user?.uid);
  const userName = useAppSelector((s) => s.auth.user?.displayName?.split(' ')[0]);

  const [category, setCategory] = useState<CategoryId | undefined>(undefined);
  const query = useMemo(() => ({ category }), [category]);
  const {
    listings,
    categories,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    fromCache,
    cacheExpired,
    reload,
    refresh,
    loadMore,
  } = useListings(query, uid);

  const openListing = (listing: Listing) =>
    navigation.navigate('ListingDetail', { listingId: listing.listingId });

  const onToggleFavorite = (listing: Listing) =>
    dispatch(
      toggleFavorite({
        listingId: listing.listingId,
        currentlySaved: favoriteIds.includes(listing.listingId),
        uid,
      }),
    );

  const header = (
    <View>
      <Text style={styles.greeting}>{userName ? `Hi ${userName}` : 'Find your place'}</Text>
      <Text style={styles.subGreeting}>Verified rentals in Karachi</Text>

      {fromCache ? (
        <Text style={styles.cacheNote}>
          {cacheExpired
            ? 'Showing cached results — freshness may be outdated (over 1 hour).'
            : 'Showing cached results while offline.'}
        </Text>
      ) : null}

      <Pressable style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Search area, e.g. Gulshan, Johar…</Text>
      </Pressable>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ categoryId: undefined, name: 'All' }, ...categories]}
        keyExtractor={(item) => item.categoryId ?? 'all'}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => {
          const active = category === item.categoryId;
          return (
            <Pressable
              onPress={() => setCategory(item.categoryId as CategoryId | undefined)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  if (error) {
    return (
      <Screen>
        <ErrorState onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {loading ? (
        <View style={styles.loadingWrap}>
          {header}
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.listingId}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={() => hasMore && loadMore()}
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
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.textSecondary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No listings here yet"
              message="Try a different category or check back soon."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  footer: { paddingVertical: spacing.xl },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: { ...typography.heading, color: colors.textPrimary },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  cacheNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    ...shadows.search,
  },
  searchIcon: { fontSize: 18, color: colors.textSecondary },
  searchPlaceholder: { ...typography.body, color: colors.textDisabled },
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },
});
