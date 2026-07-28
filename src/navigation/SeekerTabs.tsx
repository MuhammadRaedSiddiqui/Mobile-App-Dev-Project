import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/features/listings/screens/HomeScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { MapScreen } from '@/features/map/screens/MapScreen';
import { FavoritesScreen } from '@/features/favorites/screens/FavoritesScreen';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';
import { colors, typography } from '@/theme';
import type { SeekerTabParamList } from './types';

const Tab = createBottomTabNavigator<SeekerTabParamList>();

/** Glyph tab icon — keeps the shell dependency-free until an icon set is added. */
function tabIcon(glyph: string) {
  const Icon = ({ color }: { color: string }) => (
    <Text style={[styles.icon, { color }]}>{glyph}</Text>
  );
  Icon.displayName = `TabIcon(${glyph})`;
  return Icon;
}

const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarLabelStyle: { ...typography.caption, fontWeight: '600' as const },
  tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface },
};

export function SeekerTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('⌂') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: tabIcon('⌕') }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarIcon: tabIcon('◎') }} />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ tabBarIcon: tabIcon('♥'), tabBarLabel: 'Saved' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('☺') }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 20 },
});
