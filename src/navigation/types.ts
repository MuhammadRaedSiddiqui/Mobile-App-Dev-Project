import type { NavigatorScreenParams } from '@react-navigation/native';

/** Unauthenticated flow. */
export type AuthStackParamList = {
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
  Listings: undefined;
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
  NotFound: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};
