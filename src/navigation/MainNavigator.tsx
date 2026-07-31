import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListingDetailScreen } from '@/features/listings/screens/ListingDetailScreen';
import { ReportListingScreen } from '@/features/listings/screens/ReportListingScreen';
import { ListingFormScreen } from '@/features/agent/screens/ListingFormScreen';
import { ProfileEditScreen } from '@/features/auth/screens/ProfileEditScreen';
import { NotificationSettingsScreen } from '@/features/auth/screens/NotificationSettingsScreen';
import { IdentityVerificationScreen } from '@/features/auth/screens/IdentityVerificationScreen';
import { VerificationResultScreen } from '@/features/auth/screens/VerificationResultScreen';
import { SupportScreen } from '@/features/auth/screens/SupportScreen';
import { SavedSearchesScreen } from '@/features/search/screens/SavedSearchesScreen';
import { AgentProfileScreen } from '@/features/agent/screens/AgentProfileScreen';
import { MessagesScreen } from '@/features/messages/screens/MessagesScreen';
import { MessageThreadScreen } from '@/features/messages/screens/MessageThreadScreen';
import { NotFoundScreen } from '@/features/auth/screens/NotFoundScreen';
import { useAppSelector } from '@/store/hooks';
import { SeekerTabs } from './SeekerTabs';
import { AgentTabs } from './AgentTabs';
import type { MainStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<MainStackParamList>();

/** Agent-only gate for the listing create/edit form. */
function AgentListingForm(props: NativeStackScreenProps<MainStackParamList, 'ListingForm'>) {
  const user = useAppSelector((s) => s.auth.user);
  useEffect(() => {
    if (user?.role !== 'agent') {
      props.navigation.replace('NotFound');
    } else if (user.verificationStatus !== 'verified') {
      props.navigation.replace('IdentityVerification');
    }
  }, [user, props.navigation]);
  if (user?.role !== 'agent' || user.verificationStatus !== 'verified') return null;
  return <ListingFormScreen {...props} />;
}

/** Seeker-only gate: agents re-verify their own listings, they don't report them. */
function SeekerReportListing(props: NativeStackScreenProps<MainStackParamList, 'ReportListing'>) {
  const user = useAppSelector((s) => s.auth.user);
  useEffect(() => {
    if (user?.role !== 'seeker') {
      props.navigation.replace('NotFound');
    } else if (user.verificationStatus !== 'verified') {
      props.navigation.replace('IdentityVerification');
    }
  }, [user, props.navigation]);
  if (user?.role !== 'seeker' || user.verificationStatus !== 'verified') return null;
  return <ReportListingScreen {...props} />;
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
      <Stack.Screen name="ReportListing" component={SeekerReportListing} />
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
      <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
      <Stack.Screen name="VerificationResult" component={VerificationResultScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen
        name="SavedSearches"
        component={SavedSearchesScreen}
        options={{ headerShown: true, title: 'Saved searches' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ headerShown: true, title: 'Messages' }}
      />
      <Stack.Screen
        name="MessageThread"
        component={MessageThreadScreen}
        options={{ headerShown: true, title: 'Conversation' }}
      />
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </Stack.Navigator>
  );
}
