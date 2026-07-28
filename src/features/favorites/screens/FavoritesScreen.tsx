import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { EmptyState, ErrorState, ListingCardSkeleton, Screen } from '@/components/common';
import { ListingCard } from '@/components/listing';
import { colors, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadFavorites, toggleFavorite } from '@/store/slices/favoritesSlice';
import { favoritesService } from '@/services';
import type { Listing } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.user?.uid);
  const { ids, loading: idsLoading, fromCache } = useAppSelector((s) => s.favorites);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await dispatch(loadFavorites(uid));
      const full = await favoritesService.listFull();
      setListings(full);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [dispatch, uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) {
    return (
      <Screen>
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  // Keep only listings whose id is in the saved set (removed ones stay in the list
  // because listFull() includes them; they render with status='removed').
  const saved = listings.filter((l) => ids.includes(l.listingId) || l.status === 'removed');

  return (
    <Screen padded={false}>
      {loading || idsLoading ? (
        <View style={styles.pad}>
          <Text style={styles.title}>Saved</Text>
          {[0, 1].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.listingId}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>Saved</Text>
              {fromCache ? (
                <Text style={styles.cacheNote}>Showing cached favorites while offline.</Text>
              ) : null}
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Listing }) => (
            <ListingCard
              listing={item}
              onPress={(l) => navigation.navigate('ListingDetail', { listingId: l.listingId })}
              isFavorite={item.status !== 'removed'}
              onToggleFavorite={(l) =>
                dispatch(
                  toggleFavorite({
                    listingId: l.listingId,
                    currentlySaved: true,
                    uid,
                  }),
                )
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No saved listings yet"
              message="Tap the heart on any listing to keep it here."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 80,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  cacheNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
});
