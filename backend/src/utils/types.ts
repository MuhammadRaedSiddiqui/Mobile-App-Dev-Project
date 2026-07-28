export type UserRole = 'seeker' | 'agent';
export type PriceType = 'monthly' | 'yearly';
export type ListingStatus = 'active' | 'rented' | 'draft' | 'removed';
export type FreshnessStatus = 'fresh' | 'aging' | 'stale';

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
}
