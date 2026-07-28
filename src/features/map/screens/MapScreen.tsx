/**
 * Map discovery — viewport or radius search over Karachi with clustering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen, ErrorState } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { listingsService } from '@/services';
import { formatPkr } from '@/utils/format';
import type { Listing } from '@/utils/types';
import type { MainStackParamList, SeekerTabParamList } from '@/navigation/types';

type MapNav = CompositeNavigationProp<
  BottomTabNavigationProp<SeekerTabParamList, 'Map'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type SearchMode = 'viewport' | 'radius';

const KARACHI: Region = {
  latitude: 24.86,
  longitude: 67.01,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

const MAP_LIMIT = 200;
const PAN_DEBOUNCE_MS = 450;
const RADIUS_OPTIONS = [1, 2, 5] as const;

function regionToBounds(region: Region) {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;
  return { minLat, maxLat, minLng, maxLng };
}

export function MapScreen() {
  const navigation = useNavigation<MapNav>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<SearchMode>('viewport');
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(2);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionRef = useRef<Region>(KARACHI);

  const fetchListings = useCallback(async (region: Region, searchMode: SearchMode, radius: number) => {
    setLoading(true);
    setError(false);
    try {
      const page =
        searchMode === 'radius'
          ? await listingsService.getListings({
              centerLat: region.latitude,
              centerLng: region.longitude,
              radiusKm: radius,
              limit: MAP_LIMIT,
              fresh: ['fresh', 'aging'],
            })
          : await listingsService.getListings({
              ...regionToBounds(region),
              limit: MAP_LIMIT,
              fresh: ['fresh', 'aging'],
            });

      let items = page.items;
      if (searchMode === 'viewport') {
        const bounds = regionToBounds(region);
        items = items.filter(
          (l) => l.location.lng >= bounds.minLng && l.location.lng <= bounds.maxLng,
        );
      }
      setListings(items.slice(0, MAP_LIMIT));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(KARACHI, mode, radiusKm);
  }, [fetchListings, mode, radiusKm]);

  const onRegionChangeComplete = (region: Region) => {
    regionRef.current = region;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchListings(region, mode, radiusKm),
      PAN_DEBOUNCE_MS,
    );
  };

  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  const pins = useMemo(
    () =>
      listings.map((l) => (
        <Marker
          key={l.listingId}
          coordinate={{ latitude: l.location.lat, longitude: l.location.lng }}
          title={l.title}
          description={`${formatPkr(l.price)} · ${l.freshness.status}`}
          onCalloutPress={() =>
            navigation.navigate('ListingDetail', { listingId: l.listingId })
          }
          tracksViewChanges={false}
        />
      )),
    [listings, navigation],
  );

  const subLabel =
    mode === 'radius'
      ? loading
        ? `Searching within ${radiusKm} km…`
        : error
          ? 'Couldn’t load pins'
          : `${listings.length} within ${radiusKm} km`
      : loading
        ? 'Updating…'
        : error
          ? 'Couldn’t load pins'
          : `${listings.length} in view`;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.sub}>{subLabel}</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeChip, mode === 'viewport' && styles.modeChipActive]}
            onPress={() => setMode('viewport')}
          >
            <Text style={[styles.modeText, mode === 'viewport' && styles.modeTextActive]}>
              Viewport
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, mode === 'radius' && styles.modeChipActive]}
            onPress={() => setMode('radius')}
          >
            <Text style={[styles.modeText, mode === 'radius' && styles.modeTextActive]}>
              Radius
            </Text>
          </Pressable>
        </View>
        {mode === 'radius' ? (
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((km) => (
              <Pressable
                key={km}
                style={[styles.radiusChip, radiusKm === km && styles.modeChipActive]}
                onPress={() => setRadiusKm(km)}
              >
                <Text style={[styles.modeText, radiusKm === km && styles.modeTextActive]}>
                  {km} km
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {error && !loading ? (
        <View style={styles.errorWrap}>
          <ErrorState onRetry={() => fetchListings(regionRef.current, mode, radiusKm)} />
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <ClusteredMapView
            style={styles.map}
            provider={provider}
            initialRegion={KARACHI}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={false}
            showsMyLocationButton={false}
            moveOnMarkerPress={false}
            clusteringEnabled
            radius={48}
            extent={512}
            minPoints={2}
            clusterColor={colors.textPrimary}
            clusterTextColor={colors.textInverse}
            animationEnabled={false}
            spiralEnabled={false}
          >
            {pins}
          </ClusteredMapView>

          {loading && (
            <View style={styles.loadingChip} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.textInverse} />
              <Text style={styles.loadingText}>
                {mode === 'radius' ? `Within ${radiusKm} km` : 'Searching this area'}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.hint}>
        {mode === 'radius'
          ? 'Pan to move the centre · radius search uses map centre'
          : 'Pan to search · tap a cluster to expand · tap a pin for details'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  title: { ...typography.heading, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  radiusRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  modeChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  modeText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  modeTextActive: { color: colors.textInverse },
  errorWrap: { flex: 1, justifyContent: 'center' },
  mapWrap: { flex: 1, backgroundColor: colors.surfaceMuted },
  map: { ...StyleSheet.absoluteFill },
  loadingChip: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  loadingText: { ...typography.caption, color: colors.textInverse, fontWeight: '600' },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
});
