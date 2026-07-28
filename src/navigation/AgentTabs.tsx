import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AgentDashboardScreen } from '@/features/agent/screens/AgentDashboardScreen';
import { AgentListingsScreen } from '@/features/agent/screens/AgentListingsScreen';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';
import { colors, typography } from '@/theme';
import type { AgentTabParamList } from './types';

const Tab = createBottomTabNavigator<AgentTabParamList>();

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

export function AgentTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={AgentDashboardScreen}
        options={{ tabBarIcon: tabIcon('▦') }}
      />
      <Tab.Screen
        name="Listings"
        component={AgentListingsScreen}
        options={{ tabBarIcon: tabIcon('≣') }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('☺') }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 20 },
});
