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
  /**
   * `reportResult` is handed back by ReportListing so the detail screen can show
   * the report banner without a refetch — the read path doesn't return the count.
   */
  ListingDetail: {
    listingId: string;
    reportResult?: {
      count: number;
      suppressed: boolean;
      alreadyReported: boolean;
      suppressionThreshold: number;
    };
  };
  ReportListing: { listingId: string };
  ListingForm: { listingId?: string } | undefined;
  ProfileEdit: undefined;
  AgentProfile: { agentId: string };
  NotificationSettings: undefined;
  IdentityVerification: undefined;
  VerificationResult: { outcome: 'success' | 'failed' };
  SavedSearches: undefined;
  Messages: undefined;
  MessageThread: { threadId: string; listingId: string; agentId: string; listingTitle?: string; agentName?: string };
  NotFound: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};
