import type { NavigatorScreenParams } from '@react-navigation/native';

/** Unauthenticated flow. */
export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

/** Seeker bottom tabs. */
export type SeekerTabParamList = {
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Favorites: undefined;
  Profile: undefined;
};

/** Agent bottom tabs. */
export type AgentTabParamList = {
  Dashboard: undefined;
  Inbox: undefined;
  Profile: undefined;
};

/**
 * Root stack after auth. Listing detail is pushed above the tabs so it can be
 * reached from any tab (Home, Search, Favorites, Map).
 */
export type MainStackParamList = {
  SeekerTabs: NavigatorScreenParams<SeekerTabParamList>;
  AgentTabs: NavigatorScreenParams<AgentTabParamList>;
  ListingDetail: { listingId: string };
  ListingForm: { listingId?: string } | undefined;
  ProfileEdit: undefined;
  AgentProfile: { agentId: string };
  NotificationSettings: undefined;
  SavedSearches: undefined;
  Messages: undefined;
  MessageThread: { threadId: string; listingId: string; agentId: string; listingTitle?: string; agentName?: string };
  NotFound: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};
