import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, typography } from '@/theme';
import { useAppDispatch } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';

/**
 * Thin offline strip. Sits above navigators so every screen can see connectivity
 * without each one wiring NetInfo. On the offline→online transition it also
 * invalidates browse so cached (possibly stale) data is refetched on reconnect.
 */
export function OfflineBanner() {
  const dispatch = useAppDispatch();
  const [offline, setOffline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setOffline(!connected);
      if (connected && wasOffline.current) {
        // Connectivity just came back — refetch browse rather than serve stale cache.
        dispatch(invalidateBrowse());
      }
      wasOffline.current = !connected;
    });
    return unsub;
  }, [dispatch]);

  if (!offline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>You&apos;re offline — showing cached data when available</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    ...typography.caption,
    color: colors.textInverse,
    textAlign: 'center',
    fontWeight: '600',
  },
});
