import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/features/listings/screens/HomeScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { MapScreen } from '@/features/map/screens/MapScreen';
import { FavoritesScreen } from '@/features/favorites/screens/FavoritesScreen';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';
import { TabIcon } from '@/components/common';
import { colors, typography } from '@/theme';
import type { SeekerTabParamList } from './types';

const Tab = createBottomTabNavigator<SeekerTabParamList>();

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
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'heart-filled' : 'heart'} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
