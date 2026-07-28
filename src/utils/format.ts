import { FreshnessStatus } from './types';

/** Format a PKR amount with thousands separators, e.g. 47000 -> "PKR 47,000". */
export function formatPkr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `PKR ${safe.toLocaleString('en-US')}`;
}

/** Human freshness label shown on badges, e.g. "Verified 2 days ago" / "Needs verifying". */
export function freshnessLabel(status: FreshnessStatus, daysSince: number): string {
  if (status === 'stale') return 'Needs verifying';
  if (daysSince <= 0) return 'Verified today';
  if (daysSince === 1) return 'Verified 1 day ago';
  return `Verified ${daysSince} days ago`;
}

/** Compact area label, e.g. 650 -> "650 sq ft". */
export function formatArea(area: number): string {
  return `${Math.round(area)} sq ft`;
}
