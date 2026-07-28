import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AgentDashboardScreen } from '@/features/agent/screens/AgentDashboardScreen';
import { MessagesScreen } from '@/features/messages/screens/MessagesScreen';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';
import { TabIcon } from '@/components/common';
import { colors, typography } from '@/theme';
import type { AgentTabParamList } from './types';

const Tab = createBottomTabNavigator<AgentTabParamList>();

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
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-work" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="mail" color={color} focused={focused} />
          ),
          tabBarLabel: 'Inbox',
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
