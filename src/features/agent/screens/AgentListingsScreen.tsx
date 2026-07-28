import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Button, EmptyState, ErrorState, ListingCardSkeleton, Screen } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { agentService } from '@/services/agent';
import type { Listing } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function AgentListingsScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.user?.uid ?? '');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setListings(await agentService.getMyListings(uid));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = useCallback((listing: Listing) => {
    Alert.alert(
      'Remove listing?',
      `"${listing.title}" will be soft-deleted. Seekers who saved it will see it as unavailable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await agentService.remove(listing.listingId);
              dispatch(invalidateBrowse());
              setListings((prev) =>
                prev.map((l) =>
                  l.listingId === listing.listingId ? { ...l, status: 'removed' } : l,
                ),
              );
            } catch {
              Alert.alert('Error', 'Could not remove this listing.');
            }
          },
        },
      ],
    );
  }, [dispatch]);

  if (error) {
    return (
      <Screen>
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {loading ? (
        <View style={styles.pad}>
          <Text style={styles.title}>My Listings</Text>
          {[0, 1].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.listingId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>My Listings</Text>
              <Button label="+ New" onPress={() => navigation.navigate('ListingForm', undefined)} />
            </View>
          }
          renderItem={({ item }) => (
            <AgentListingRow
              listing={item}
              onEdit={() => navigation.navigate('ListingForm', { listingId: item.listingId })}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState title="No listings yet" message="Tap + New to create your first listing." />
          }
        />
      )}
    </Screen>
  );
}

function AgentListingRow({
  listing,
  onEdit,
  onDelete,
}: {
  listing: Listing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isRemoved = listing.status === 'removed';
  const isDraft = listing.status === 'draft';
  const freshnessToTone = { fresh: 'neutral', aging: 'muted', stale: 'alert' } as const;

  return (
    <View style={[styles.row, isRemoved && styles.rowRemoved]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.rowPrice}>PKR {listing.price.toLocaleString()}/mo</Text>
        <View style={styles.rowBadges}>
          {isRemoved ? (
            <Badge label="Removed" tone="alert" />
          ) : isDraft ? (
            <Badge label="Draft" tone="muted" />
          ) : (
            <Badge
              label={
                listing.freshness.status.charAt(0).toUpperCase() + listing.freshness.status.slice(1)
              }
              tone={freshnessToTone[listing.freshness.status]}
              dot
            />
          )}
        </View>
      </View>
      {!isRemoved && (
        <View style={styles.rowActions}>
          <Pressable onPress={onEdit} style={styles.actionBtn} hitSlop={8}>
            <Text style={styles.actionEdit}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.actionBtn} hitSlop={8}>
            <Text style={styles.actionDelete}>Remove</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading, color: colors.textPrimary },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  rowRemoved: { opacity: 0.5 },
  rowMain: { gap: spacing.xs },
  rowTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  rowPrice: { ...typography.body, color: colors.textSecondary },
  rowBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  rowActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  actionBtn: { paddingVertical: spacing.xs },
  actionEdit: { ...typography.caption, fontWeight: '600', color: colors.primary },
  actionDelete: { ...typography.caption, fontWeight: '600', color: colors.danger },
});
