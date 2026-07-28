import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorState, Screen } from '@/components/common';
import { ListingCard } from '@/components/listing';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { agentService } from '@/services/agent';
import { trustService } from '@/services/trust';
import type { Listing } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const CARD_GAP = spacing.sm;

export function AgentDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const [listings, setListings] = useState<Listing[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user?.uid) return;
    setLoading(true);
    setLoadError(false);
    agentService
      .getMyListings(user.uid)
      .then(setListings)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = listings.filter((l) => l.status === 'active');
  const needsVerifying = active.filter((l) => l.freshness.status !== 'fresh');
  const totalViews = active.reduce((sum, l) => sum + l.viewCount, 0);
  const viewLabel = totalViews > 999 ? `${(totalViews / 1000).toFixed(1)}k` : String(totalViews);

  const onVerify = async (listing: Listing) => {
    setVerifyingId(listing.listingId);
    try {
      const { freshness } = await trustService.verify(listing.listingId);
      agentService.applyVerified(listing.listingId, freshness);
      dispatch(invalidateBrowse());
      setListings((prev) =>
        prev.map((l) => (l.listingId === listing.listingId ? { ...l, freshness } : l)),
      );
    } catch {
      Alert.alert('Could not verify', 'Please try again in a moment.');
    } finally {
      setVerifyingId(null);
    }
  };

  if (loadError) {
    return (
      <Screen>
        <ErrorState onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>My listings</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Stats Bento Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active</Text>
            <View style={styles.statBottom}>
              <Text style={styles.statValue}>{loading ? '—' : String(active.length)}</Text>
              <Text style={styles.statIcon}>↗</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Views</Text>
            <View style={styles.statBottom}>
              <Text style={styles.statValue}>{loading ? '—' : viewLabel}</Text>
            </View>
          </View>
          <View style={[styles.statCard, styles.statCardAlert]}>
            <View style={styles.statAlertHeader}>
              <Text style={styles.statLabelAlert} numberOfLines={1}>
                Needs verify
              </Text>
              <Text style={styles.statAlertIcon}>⚠</Text>
            </View>
            <View style={styles.statBottom}>
              <Text style={styles.statValueAlert}>
                {loading ? '—' : String(needsVerifying.length)}
              </Text>
            </View>
          </View>
        </View>

        {/* Verification Queue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verification queue</Text>
          {needsVerifying.length > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>Action required</Text>
            </View>
          )}
        </View>

        {needsVerifying.length === 0 ? (
          <Text style={styles.emptyQueue}>All active listings look fresh. Nice work.</Text>
        ) : (
          needsVerifying.map((listing) => (
            <View key={listing.listingId} style={styles.queueRow}>
              <View style={styles.queueThumb}>
                {listing.imageUrls[0] ? (
                  <Image source={{ uri: listing.imageUrls[0] }} style={styles.queueThumbImg} />
                ) : (
                  <View style={styles.queueThumbPlaceholder} />
                )}
              </View>
              <View style={styles.queueInfo}>
                <Text style={styles.queueTitle} numberOfLines={2}>
                  {listing.title}
                </Text>
                <View style={styles.queueMeta}>
                  <Text style={styles.queueMetaIcon}>
                    {listing.freshness.status === 'stale' ? '⚠' : '⏱'}
                  </Text>
                  <View
                    style={[
                      styles.agingPill,
                      listing.freshness.status === 'stale'
                        ? styles.agingPillStale
                        : styles.agingPillAging,
                    ]}
                  >
                    <Text
                      style={[
                        styles.agingPillText,
                        listing.freshness.status === 'stale'
                          ? styles.agingPillTextStale
                          : styles.agingPillTextAging,
                      ]}
                    >
                      {listing.freshness.status === 'stale' ? 'Stale' : 'Aging'}{' '}
                      {listing.freshness.daysSince}d
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => onVerify(listing)}
                disabled={verifyingId === listing.listingId}
                style={styles.confirmBtn}
                hitSlop={8}
              >
                <Text style={styles.confirmBtnText}>
                  {verifyingId === listing.listingId ? '…' : '✓  Confirm'}
                </Text>
              </Pressable>
            </View>
          ))
        )}

        {/* All Listings */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xxl }]}>
          <Text style={styles.sectionTitle}>All listings</Text>
          <Pressable style={styles.filterBtn}>
            <Text style={styles.filterText}>Filter ☰</Text>
          </Pressable>
        </View>

        {listings.map((listing) => (
          <ListingCard
            key={listing.listingId}
            listing={listing}
            onPress={(l) => navigation.navigate('ListingForm', { listingId: l.listingId })}
          />
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('ListingForm', undefined)}
        accessibilityLabel="Add new listing"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heading: { ...typography.heading, color: colors.textPrimary },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.ui, color: colors.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: spacing.xxl },
  statCard: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    minHeight: 90,
  },
  statCardAlert: {
    backgroundColor: colors.staleBg,
    borderColor: colors.staleBg,
  },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statLabelAlert: { ...typography.caption, color: colors.textPrimary },
  statAlertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statAlertIcon: { fontSize: 12, color: colors.primary },
  statBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statValue: { ...typography.headingSm, color: colors.textPrimary },
  statValueAlert: { ...typography.headingSm, color: colors.primary },
  statIcon: { fontSize: 16, color: colors.textSecondary },

  // Verification queue
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.subheading, color: colors.textPrimary },
  actionBadge: {
    backgroundColor: colors.staleBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  actionBadgeText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  emptyQueue: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },

  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  queueThumb: { width: 56, height: 56, borderRadius: radii.input, overflow: 'hidden' },
  queueThumbImg: { width: '100%', height: '100%' },
  queueThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  queueInfo: { flex: 1, gap: 4 },
  queueTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  queueMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  queueMetaIcon: { fontSize: 12, color: colors.textSecondary },
  agingPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.pill },
  agingPillAging: { backgroundColor: '#fef3c7' },
  agingPillStale: { backgroundColor: colors.staleBg },
  agingPillText: { ...typography.caption, fontWeight: '600' },
  agingPillTextAging: { color: '#d97706' },
  agingPillTextStale: { color: colors.stale },
  confirmBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  confirmBtnText: { ...typography.ui, color: colors.textPrimary, fontSize: 14 },

  // Filter
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filterText: { ...typography.ui, color: colors.textSecondary },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabIcon: { fontSize: 28, fontWeight: '500', color: colors.onPrimary, marginTop: -2 },
});
