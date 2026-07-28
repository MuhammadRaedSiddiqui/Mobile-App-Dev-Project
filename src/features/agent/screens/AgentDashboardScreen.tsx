import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge, Button, ErrorState, Screen } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { agentService } from '@/services/agent';
import { trustService } from '@/services/trust';
import type { Listing } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function AgentDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const name = user?.displayName?.split(' ')[0];

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
  const drafts = listings.filter((l) => l.status === 'draft');
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
    <Screen scroll>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{name ? `Hi ${name}` : 'Dashboard'}</Text>
        <Text style={styles.subGreeting}>Your listings at a glance</Text>

        <View style={styles.statRow}>
          <Stat value={loading ? '—' : String(active.length)} label="Active" />
          <Stat value={loading ? '—' : String(needsVerifying.length)} label="Needs verifying" />
          <Stat value={loading ? '—' : viewLabel} label="Total views" />
        </View>

        {drafts.length > 0 && (
          <Text style={styles.draftNote}>
            {drafts.length} draft{drafts.length === 1 ? '' : 's'} waiting to publish
          </Text>
        )}

        <View style={styles.queueHeader}>
          <Text style={styles.sectionTitle}>Verification queue</Text>
          <Button
            label="+ New"
            onPress={() => navigation.navigate('ListingForm', undefined)}
            style={styles.newBtn}
          />
        </View>

        {needsVerifying.length === 0 ? (
          <Text style={styles.emptyQueue}>All active listings look fresh. Nice work.</Text>
        ) : (
          needsVerifying.map((listing) => (
            <View key={listing.listingId} style={styles.queueRow}>
              <View style={styles.queueMain}>
                <Text style={styles.queueTitle} numberOfLines={1}>
                  {listing.title}
                </Text>
                <Badge
                  label={
                    listing.freshness.status.charAt(0).toUpperCase() +
                    listing.freshness.status.slice(1)
                  }
                  tone={listing.freshness.status === 'stale' ? 'alert' : 'muted'}
                  dot
                />
              </View>
              <Pressable
                onPress={() => onVerify(listing)}
                disabled={verifyingId === listing.listingId}
                style={styles.verifyBtn}
                hitSlop={8}
              >
                <Text style={styles.verifyText}>
                  {verifyingId === listing.listingId ? '…' : 'Verify'}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  stat: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: { ...typography.headingSm, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  draftNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.headingSm, color: colors.textPrimary },
  newBtn: { paddingHorizontal: spacing.lg },
  emptyQueue: { ...typography.body, color: colors.textSecondary },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  queueMain: { flex: 1, gap: spacing.xs },
  queueTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  verifyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
  },
  verifyText: { ...typography.caption, fontWeight: '700', color: colors.onPrimary },
});
