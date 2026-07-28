/**
 * Freshness computation — the heart of Estate Ease's trust model. Pure function,
 * fully unit-tested. The server is the sole authority for freshness; clients only
 * render what this returns (Technical Docs §3.3).
 *
 *   daysSince <= freshThreshold           -> 'fresh'
 *   freshThreshold < daysSince <= aging   -> 'aging'
 *   daysSince > agingThreshold            -> 'stale'
 */
import { config } from '@/config/env';
import { Freshness, FreshnessStatus } from '@/utils/types';

export interface FreshnessThresholds {
  freshThresholdDays: number;
  agingThresholdDays: number;
}

/** Whole calendar days between two instants (floored, never negative). */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 86_400_000);
}

export function classifyFreshness(
  daysSince: number,
  thresholds: FreshnessThresholds = config.trust,
): FreshnessStatus {
  if (daysSince <= thresholds.freshThresholdDays) return 'fresh';
  if (daysSince <= thresholds.agingThresholdDays) return 'aging';
  return 'stale';
}

export function computeFreshness(
  lastVerifiedAt: Date,
  now: Date,
  thresholds: FreshnessThresholds = config.trust,
): Freshness {
  const daysSince = daysBetween(lastVerifiedAt, now);
  return {
    status: classifyFreshness(daysSince, thresholds),
    lastVerifiedAt: lastVerifiedAt.toISOString(),
    daysSince,
  };
}
