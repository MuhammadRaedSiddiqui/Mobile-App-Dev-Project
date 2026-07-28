import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyState, ErrorState, Skeleton } from '@/components/common';
import { ListingCard } from '@/components/listing';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/store/slices/favoritesSlice';
import { agentsService } from '@/services';
import type { Listing } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'AgentProfile'>;

export function AgentProfileScreen({ route, navigation }: Props) {
  const { agentId } = route.params;
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((s) => s.favorites.ids);
  const uid = useAppSelector((s) => s.auth.user?.uid);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [stats, setStats] = useState({ activeListingCount: 0, freshCount: 0 });
  const [listings, setListings] = useState<Listing[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    agentsService
      .getPublicProfile(agentId)
      .then((profile) => {
        setDisplayName(profile.agent.displayName);
        setPhone(profile.agent.phone);
        setAvatarUrl(profile.agent.avatarUrl);
        setStats(profile.stats);
        setListings(profile.listings);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(load, [load]);

  if (error) {
    return (
      <View style={styles.safe}>
        <ErrorState onRetry={load} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={styles.header}>
          <Skeleton width={64} height={64} radius={radii.pill} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={14} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.safe}
      contentContainerStyle={styles.content}
      data={listings}
      keyExtractor={(item) => item.listingId}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.header}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{displayName}</Text>
              {phone ? <Text style={styles.phone}>{phone}</Text> : null}
              <Text style={styles.stats}>
                {stats.activeListingCount} active · {stats.freshCount} freshly verified
              </Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Active listings</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          isFavorite={favoriteIds.includes(item.listingId)}
          onPress={() => navigation.push('ListingDetail', { listingId: item.listingId })}
          onToggleFavorite={
            uid
              ? () =>
                  dispatch(
                    toggleFavorite({
                      listingId: item.listingId,
                      currentlySaved: favoriteIds.includes(item.listingId),
                      uid,
                    }),
                  )
              : undefined
          }
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No active listings"
          message="This agent has no published rentals right now."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xxl },
  headerBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: { ...typography.headingSm, color: colors.textInverse },
  info: { flex: 1, gap: 4 },
  name: { ...typography.headingSm, color: colors.textPrimary },
  phone: { ...typography.body, color: colors.textSecondary },
  stats: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});
