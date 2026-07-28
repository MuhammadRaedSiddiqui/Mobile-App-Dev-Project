import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { SplashScreen } from '@/components/common/SplashScreen';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { colors } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSession } from '@/store/slices/authSlice';
import { loadFavorites } from '@/store/slices/favoritesSlice';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import type { MainStackParamList } from './types';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.canvas, primary: colors.primary },
};

/**
 * Deep links (scheme `estateease://`).
 * Examples:
 *   estateease://listing/lst-001
 *   estateease://home
 *   estateease://search
 *   estateease://map
 *   estateease://saved
 *   estateease://profile
 */
const linking: LinkingOptions<MainStackParamList> = {
  prefixes: ['estateease://'],
  config: {
    screens: {
      SeekerTabs: {
        screens: {
          Home: 'home',
          Search: 'search',
          Map: 'map',
          Favorites: 'saved',
          Profile: 'profile',
        },
      },
      AgentTabs: {
        screens: {
          Dashboard: 'agent',
          Profile: 'agent/profile',
        },
      },
      ListingDetail: 'listing/:listingId',
      AgentProfile: 'agent/:agentId',
      ListingForm: 'agent/edit/:listingId?',
      ProfileEdit: 'profile/edit',
      NotFound: '*',
    },
  },
};

/**
 * Top-level route guard. Restores any persisted session on mount, holds on the
 * splash while status is 'restoring', then shows the auth flow or the
 * authenticated shell. Switching `status` swaps the whole tree, so there's no way
 * to land on a guarded screen while logged out (or the reverse).
 */
export function RootNavigator() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const uid = useAppSelector((s) => s.auth.user?.uid);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'authenticated' && uid) {
      dispatch(loadFavorites(uid));
    }
  }, [dispatch, status, uid]);

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <NavigationContainer
        theme={navTheme}
        linking={status === 'authenticated' ? linking : undefined}
        fallback={<SplashScreen />}
      >
        {status === 'restoring' ? (
          <SplashScreen />
        ) : status === 'authenticated' ? (
          <MainNavigator />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
