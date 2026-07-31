import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, ErrorState, Skeleton, Badge } from '@/components/common';
import { CostBreakdown, FreshnessBadge } from '@/components/listing';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleFavorite } from '@/store/slices/favoritesSlice';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { agentService, listingsService, trustService } from '@/services';
import { formatArea, formatPkr } from '@/utils/format';
import { hasLocalReport, markReported } from '@/utils/reportedListings';
import { LIVABILITY_LABELS, splitLocationTags } from '@/utils/livabilityTags';
import { shareListing } from '@/utils/shareListing';
import type { Freshness, Listing, ListingDetail } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ListingDetail'>;

export function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const dispatch = useAppDispatch();
  const favoriteIds = useAppSelector((s) => s.favorites.ids);
  const user = useAppSelector((s) => s.auth.user);

  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reported, setReported] = useState(false);
  // Only known once this device reports — the read path doesn't return the count.
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [suppressed, setSuppressed] = useState(false);
  const [suppressionThreshold, setSuppressionThreshold] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    listingsService
      .getListingById(listingId)
      .then((d) => {
        setDetail(d);
        setFreshness(d.listing.freshness);
        setViewCount(d.listing.viewCount);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, [listingId]);

  useEffect(() => {
    let active = true;
    setSimilar([]);
    setSimilarLoading(true);
    listingsService
      .getSimilar(listingId, 6)
      .then((items) => {
        if (active) setSimilar(items);
      })
      .catch(() => {
        if (active) setSimilar([]);
      })
      .finally(() => {
        if (active) setSimilarLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listingId]);

  useEffect(() => {
    let active = true;
    listingsService
      .recordView(listingId)
      .then((res) => {
        if (active && res) setViewCount(res.viewCount);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [listingId]);

  // Restore already-reported state (local + server soft-check).
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.uid || user.role !== 'seeker') return;
      const local = await hasLocalReport(user.uid, listingId);
      if (local && active) {
        setReported(true);
        return;
      }
      const remote = await trustService.hasReported(listingId);
      if (remote && active) {
        setReported(true);
        await markReported(user.uid, listingId);
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId, user?.uid, user?.role]);

  // The report screen hands its result back as a param — apply it once, then
  // clear it so a later re-render (or a re-verify) doesn't resurrect it.
  const reportResult = route.params.reportResult;
  useEffect(() => {
    if (!reportResult) return;
    setReported(true);
    setReportCount(reportResult.count);
    setSuppressed(reportResult.suppressed);
    setSuppressionThreshold(reportResult.suppressionThreshold);
    if (reportResult.alreadyReported) {
      Alert.alert('Already reported', 'You’ve already flagged this listing.');
    }
    navigation.setParams({ reportResult: undefined });
  }, [reportResult, navigation]);

  const isFavorite = favoriteIds.includes(listingId);
  const isOwner = user?.role === 'agent' && detail?.listing.agentId === user.uid;
  const canReport = user?.role === 'seeker' && !isOwner;
  const isVerified = user?.verificationStatus === 'verified';

  const promptVerification = () => {
    Alert.alert('Verify your identity', 'Complete identity verification to use this feature.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Verify now', onPress: () => navigation.navigate('IdentityVerification') },
    ]);
  };

  const onReport = () => {
    if (!isVerified) return promptVerification();
    navigation.navigate('ReportListing', { listingId });
  };

  const onVerify = async () => {
    setBusy(true);
    try {
      const res = await trustService.verify(listingId);
      setFreshness(res.freshness);
      // Re-verifying wipes the outstanding reports, so drop the local echo too.
      setReportCount(null);
      setSuppressed(false);
      setSuppressionThreshold(null);
      agentService.applyVerified(listingId, res.freshness);
      dispatch(invalidateBrowse());
    } catch {
      Alert.alert('Couldn’t verify', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <BackBar onBack={() => navigation.goBack()} />
        <ErrorState onRetry={load} />
      </SafeAreaView>
    );
  }

  if (loading || !detail || !freshness) {
    return (
      <SafeAreaView style={styles.safe}>
        <BackBar onBack={() => navigation.goBack()} />
        <View style={styles.body}>
          <Skeleton height={240} radius={radii.card} />
          <View style={{ height: spacing.lg }} />
          <Skeleton width="80%" height={22} />
          <View style={{ height: spacing.sm }} />
          <Skeleton width="50%" height={16} />
        </View>
      </SafeAreaView>
    );
  }

  const { listing, agent } = detail;
  const { livability, amenities } = splitLocationTags(listing.locationTags);

  const onShare = async () => {
    await shareListing({
      listingId,
      title: listing.title,
      area: listing.location.area,
      priceLabel: formatPkr(listing.price),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BackBar
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.backActions}>
            <Pressable hitSlop={8} accessibilityLabel="Share listing" onPress={onShare}>
              <Text style={styles.shareGlyph}>↗</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              onPress={() =>
                dispatch(
                  toggleFavorite({
                    listingId,
                    currentlySaved: isFavorite,
                    uid: user?.uid,
                  }),
                )
              }
            >
              <Text style={[styles.heart, isFavorite && styles.heartActive]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </Pressable>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Gallery images={listing.imageUrls} />

        <View style={styles.body}>
          <FreshnessBadge freshness={freshness} />

          {reportCount != null && reportCount > 0 ? (
            <View style={[styles.reportBanner, suppressed && styles.reportBannerStrong]}>
              <Text style={styles.reportBannerText}>
                {suppressed
                  ? `Reported as unavailable by ${reportCount} ${
                      reportCount === 1 ? 'person' : 'people'
                    }. It’s been hidden from browse and search until the agent re-verifies it.`
                  : `Reported as unavailable by ${reportCount} ${
                      reportCount === 1 ? 'person' : 'people'
                    }. ${(suppressionThreshold ?? reportCount) - reportCount} more and it drops out of browse.`}
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.meta}>
            {listing.location.area} · {formatArea(listing.area)}
            {listing.bedrooms ? ` · ${listing.bedrooms} bed` : ''}
            {listing.bathrooms ? ` · ${listing.bathrooms} bath` : ''}
          </Text>
          {viewCount != null ? (
            <Text style={styles.views}>
              {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
            </Text>
          ) : null}

          <View style={styles.section}>
            <CostBreakdown cost={listing.costBreakdown} rentPeriodLabel={listing.priceType} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this place</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {livability.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Area livability</Text>
              <Text style={styles.livabilityLead}>
                Practical signals reported for this neighbourhood.
              </Text>
              <View style={styles.tagRow}>
                {livability.map((tag) => (
                  <Badge key={tag} label={LIVABILITY_LABELS[tag]} tone="muted" />
                ))}
              </View>
            </View>
          ) : null}

          {amenities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.tagRow}>
                {amenities.map((tag) => (
                  <Badge key={tag} label={tag.replace(/-/g, ' ')} tone="neutral" />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            style={styles.agentCard}
            onPress={() => navigation.navigate('AgentProfile', { agentId: agent.uid })}
            accessibilityRole="button"
            accessibilityLabel={`View ${agent.displayName}'s listings`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{agent.displayName.charAt(0)}</Text>
            </View>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{agent.displayName}</Text>
              <Text style={styles.agentRole}>
                Listing agent{agent.phone ? ` · ${agent.phone}` : ''}
              </Text>
            </View>
            <Text style={styles.agentChevron}>›</Text>
          </Pressable>

          {isOwner ? (
            <Button
              label={freshness.status === 'fresh' ? 'Verified' : 'Re-verify this listing'}
              onPress={onVerify}
              loading={busy}
              disabled={freshness.status === 'fresh'}
              fullWidth
              style={styles.action}
            />
          ) : canReport && reported ? (
            <Text style={styles.reportedNote}>
              {suppressed
                ? 'Thanks — enough people have reported this that we’ve stopped showing it in browse. The agent has been asked to re-verify.'
                : 'Thanks — we’ve flagged this for the agent to re-verify.'}
            </Text>
          ) : canReport ? (
            <Button
              label={isVerified ? 'Report this listing' : 'Verify identity to report'}
              variant="ghost"
              onPress={onReport}
              fullWidth
              style={styles.action}
            />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar listings</Text>
            {similarLoading ? (
              <Text style={styles.similarEmpty}>Finding nearby matches…</Text>
            ) : similar.length === 0 ? (
              <Text style={styles.similarEmpty}>No similar listings in this area right now.</Text>
            ) : (
              <View style={styles.similarList}>
                {similar.map((item) => (
                  <Pressable
                    key={item.listingId}
                    style={styles.similarRow}
                    onPress={() =>
                      navigation.push('ListingDetail', { listingId: item.listingId })
                    }
                  >
                    <View style={styles.similarBody}>
                      <Text style={styles.similarTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.similarMeta} numberOfLines={1}>
                        {item.location.area} · {formatPkr(item.price)} · {item.freshness.status}
                      </Text>
                    </View>
                    <Text style={styles.similarChevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!isOwner && user?.role === 'seeker' ? (
        <View style={styles.contactBar}>
          <Button
            label={isVerified ? 'Message agent' : 'Verify identity to message'}
            fullWidth
            onPress={() => {
              if (!isVerified) return promptVerification();
              navigation.navigate('MessageThread', {
                threadId: `thread-${listingId}-${user.uid}-${agent.uid}`,
                listingId,
                agentId: agent.uid,
                listingTitle: listing.title,
                agentName: agent.displayName,
              });
            }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function BackBar({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      {right ?? <View style={{ width: 24 }} />}
    </View>
  );
}

const HERO_WIDTH = Dimensions.get('window').width;

function Gallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const sources = images.length ? images : [''];

  if (sources.length === 1) {
    return <Image source={{ uri: sources[0] }} style={styles.hero} resizeMode="cover" />;
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / HERO_WIDTH);
    if (next !== index) setIndex(next);
  };

  return (
    <View>
      <FlatList
        data={sources}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.hero, { width: HERO_WIDTH }]}
            resizeMode="cover"
          />
        )}
      />
      <View style={styles.dots}>
        {sources.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backGlyph: { fontSize: 32, color: colors.textPrimary, lineHeight: 32 },
  backActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shareGlyph: { fontSize: 22, color: colors.textPrimary, fontWeight: '600' },
  heart: { fontSize: 26, color: colors.textPrimary },
  heartActive: { color: colors.primary },
  scroll: { paddingBottom: spacing.huge },
  hero: { width: '100%', height: 260, backgroundColor: colors.surfaceMuted },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: { backgroundColor: colors.white },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  title: { ...typography.headingSm, color: colors.textPrimary, marginTop: spacing.md },
  meta: { ...typography.body, color: colors.textSecondary },
  views: { ...typography.caption, color: colors.textSecondary },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sectionTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  livabilityLead: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyStrong, color: colors.textInverse },
  agentInfo: { flex: 1 },
  agentName: { ...typography.bodyStrong, color: colors.textPrimary },
  agentRole: { ...typography.caption, color: colors.textSecondary },
  agentChevron: { fontSize: 24, color: colors.textSecondary },
  action: { marginTop: spacing.xl },
  reportedNote: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  reportBanner: {
    backgroundColor: colors.staleBg,
    borderRadius: radii.card,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  reportBannerStrong: { borderWidth: 1, borderColor: colors.stale },
  reportBannerText: { ...typography.caption, color: colors.stale },
  similarEmpty: { ...typography.body, color: colors.textSecondary },
  similarList: { gap: spacing.sm, marginTop: spacing.sm },
  similarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  similarBody: { flex: 1, gap: 2 },
  similarTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  similarMeta: { ...typography.caption, color: colors.textSecondary },
  similarChevron: { fontSize: 22, color: colors.textSecondary, paddingLeft: spacing.sm },
  contactBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
});
