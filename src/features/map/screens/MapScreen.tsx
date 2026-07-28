/**
 * Map discovery — viewport or radius search over Karachi.
 * Uses the Maps JavaScript API so a no-billing Maps Demo Key can be used.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen, ErrorState } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { listingsService } from '@/services';
import type { Listing } from '@/utils/types';
import type { MainStackParamList, SeekerTabParamList } from '@/navigation/types';

type MapNav = CompositeNavigationProp<
  BottomTabNavigationProp<SeekerTabParamList, 'Map'>,
  NativeStackNavigationProp<MainStackParamList>
>;
type SearchMode = 'viewport' | 'radius';

const KARACHI = { latitude: 24.86, longitude: 67.01, latitudeDelta: 0.28, longitudeDelta: 0.28 };
const MAP_LIMIT = 200;
const PAN_DEBOUNCE_MS = 450;
const RADIUS_OPTIONS = [1, 2, 5] as const;
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function regionToBounds(region: typeof KARACHI) {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

function mapHtml(apiKey: string) {
  return `<!doctype html><html><head><meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no"/><style>html,body,#map{height:100%;margin:0}</style></head><body><div id="map"></div><script>
let map,markers=[];const send=(m)=>window.ReactNativeWebView.postMessage(JSON.stringify(m));
window.setListings=(items)=>{if(!map)return;markers.forEach((m)=>m.setMap(null));markers=items.map((item)=>{const marker=new google.maps.Marker({position:{lat:item.lat,lng:item.lng},map,title:item.title});marker.addListener('click',()=>send({type:'listing',listingId:item.listingId}));return marker;});};
window.initMap=()=>{map=new google.maps.Map(document.getElementById('map'),{center:{lat:24.86,lng:67.01},zoom:11,mapTypeControl:false,streetViewControl:false});map.addListener('idle',()=>{const c=map.getCenter(),b=map.getBounds();if(!c||!b)return;const ne=b.getNorthEast(),sw=b.getSouthWest();send({type:'region',region:{latitude:c.lat(),longitude:c.lng(),latitudeDelta:ne.lat()-sw.lat(),longitudeDelta:ne.lng()-sw.lng()}});});send({type:'ready'});};
</script><script async src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap"></script></body></html>`;
}

export function MapScreen() {
  const navigation = useNavigation<MapNav>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<SearchMode>('viewport');
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(2);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionRef = useRef(KARACHI);
  const webViewRef = useRef<WebView>(null);

  const fetchListings = useCallback(
    async (region: typeof KARACHI, searchMode: SearchMode, radius: number) => {
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
            (listing) =>
              listing.location.lng >= bounds.minLng && listing.location.lng <= bounds.maxLng,
          );
        }
        setListings(items.slice(0, MAP_LIMIT));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchListings(KARACHI, mode, radiusKm);
  }, [fetchListings, mode, radiusKm]);
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onRegionChangeComplete = (region: typeof KARACHI) => {
    regionRef.current = region;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchListings(region, mode, radiusKm), PAN_DEBOUNCE_MS);
  };

  const mapListings = useMemo(
    () =>
      listings.map((listing) => ({
        listingId: listing.listingId,
        title: listing.title,
        lat: listing.location.lat,
        lng: listing.location.lng,
      })),
    [listings],
  );
  const updateWebMapPins = useCallback(() => {
    const payload = JSON.stringify(mapListings).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(`window.setListings(${payload}); true;`);
  }, [mapListings]);
  useEffect(() => {
    updateWebMapPins();
  }, [updateWebMapPins]);

  const onMapMessage = (raw: string) => {
    try {
      const message = JSON.parse(raw) as {
        type: string;
        listingId?: string;
        region?: typeof KARACHI;
      };
      if (message.type === 'listing' && message.listingId)
        navigation.navigate('ListingDetail', { listingId: message.listingId });
      if (message.type === 'region' && message.region) onRegionChangeComplete(message.region);
      if (message.type === 'ready') updateWebMapPins();
    } catch {
      /* Ignore malformed messages from the embedded map. */
    }
  };

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
          {(['viewport', 'radius'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.modeChip, mode === item && styles.modeChipActive]}
              onPress={() => setMode(item)}
            >
              <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                {item === 'viewport' ? 'Viewport' : 'Radius'}
              </Text>
            </Pressable>
          ))}
        </View>
        {mode === 'radius' && (
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
        )}
      </View>
      {error && !loading ? (
        <View style={styles.errorWrap}>
          <ErrorState onRetry={() => fetchListings(regionRef.current, mode, radiusKm)} />
        </View>
      ) : (
        <View style={styles.mapWrap}>
          {googleMapsKey ? (
            <WebView
              ref={webViewRef}
              style={styles.map}
              source={{ html: mapHtml(googleMapsKey) }}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={updateWebMapPins}
              onMessage={(event) => onMapMessage(event.nativeEvent.data)}
            />
          ) : (
            <View style={styles.mapKeyError}>
              <Text style={styles.mapKeyErrorText}>
                Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env to load the map.
              </Text>
            </View>
          )}
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
          : 'Pan to search · tap a pin for details'}
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
  map: { flex: 1 },
  mapKeyError: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  mapKeyErrorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
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
