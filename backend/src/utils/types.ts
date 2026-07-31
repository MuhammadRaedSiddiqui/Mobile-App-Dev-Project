export type UserRole = 'seeker' | 'agent';
export type PriceType = 'monthly' | 'yearly';
export type ListingStatus = 'active' | 'rented' | 'draft' | 'removed';
export type FreshnessStatus = 'fresh' | 'aging' | 'stale';

/**
 * Why a seeker reported a listing. Recorded with the report, but every reason
 * counts the same toward the browse-suppression threshold — nothing routes
 * 'scam' or 'offensive' to moderation yet.
 */
export type ReportReason = 'inaccurate' | 'unavailable' | 'scam' | 'offensive' | 'other';

export const REPORT_REASONS: ReportReason[] = [
  'inaccurate',
  'unavailable',
  'scam',
  'offensive',
  'other',
];

export interface Freshness {
  status: FreshnessStatus;
  lastVerifiedAt: string;
  daysSince: number;
}

export interface CostInput {
  rent: number;
  depositMonths: number;
  monthlyMaintenance: number;
  estimatedUtilities: number;
}

export interface CostBreakdown extends CostInput {
  estimatedMonthlyTotal: number;
}

export interface AuthedUser {
  uid: string;
  email?: string;
  role: UserRole;
  displayName: string;
  verificationStatus: 'unverified' | 'verified';
}
