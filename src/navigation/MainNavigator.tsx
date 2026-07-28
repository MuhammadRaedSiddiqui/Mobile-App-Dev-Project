import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListingDetailScreen } from '@/features/listings/screens/ListingDetailScreen';
import { ListingFormScreen } from '@/features/agent/screens/ListingFormScreen';
import { ProfileEditScreen } from '@/features/auth/screens/ProfileEditScreen';
import { NotificationSettingsScreen } from '@/features/auth/screens/NotificationSettingsScreen';
import { SavedSearchesScreen } from '@/features/search/screens/SavedSearchesScreen';
import { AgentProfileScreen } from '@/features/agent/screens/AgentProfileScreen';
import { NotFoundScreen } from '@/features/auth/screens/NotFoundScreen';
import { useAppSelector } from '@/store/hooks';
import { SeekerTabs } from './SeekerTabs';
import { AgentTabs } from './AgentTabs';
import type { MainStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<MainStackParamList>();

/** Agent-only gate for the listing create/edit form. */
function AgentListingForm(props: NativeStackScreenProps<MainStackParamList, 'ListingForm'>) {
  const role = useAppSelector((s) => s.auth.user?.role);
  useEffect(() => {
    if (role !== 'agent') {
      props.navigation.replace('NotFound');
    }
  }, [role, props.navigation]);
  if (role !== 'agent') return null;
  return <ListingFormScreen {...props} />;
}

export function MainNavigator() {
  const role = useAppSelector((s) => s.auth.user?.role);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === 'agent' ? (
        <Stack.Screen name="AgentTabs" component={AgentTabs} />
      ) : (
        <Stack.Screen name="SeekerTabs" component={SeekerTabs} />
      )}
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen
        name="ListingForm"
        component={AgentListingForm}
        options={{ headerShown: true, title: 'Listing' }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ headerShown: true, title: 'Edit profile' }}
      />
      <Stack.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ headerShown: true, title: 'Agent' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: true, title: 'Notifications' }}
      />
      <Stack.Screen
        name="SavedSearches"
        component={SavedSearchesScreen}
        options={{ headerShown: true, title: 'Saved searches' }}
      />
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </Stack.Navigator>
  );
}
