/**
 * Browse-visibility and report-threshold decisions — pure and unit-tested.
 *
 * These encode the product rules for what a seeker sees by default (Technical
 * Docs §3.3 / Plan Phase 2.2 "visible/default-browse decision"):
 *
 *   - Only `active` listings are publicly readable; `draft`/`removed`/`rented`
 *     never appear in public browse or search.
 *   - Once a listing accumulates enough unavailability reports it is suppressed
 *     from the default view until the owner re-verifies (which clears reports).
 *   - `stale` listings (>14 days unverified) are hidden from the default view but
 *     may be surfaced explicitly via `includeStale` where product allows.
 */
import { config } from '@/config/env';
import { FreshnessStatus, ListingStatus } from '@/utils/types';

/** A listing is publicly readable only while active. */
export function isPubliclyVisible(status: ListingStatus): boolean {
  return status === 'active';
}

/** True once unavailability reports reach the configured threshold. */
export function reportThresholdReached(
  reportCount: number,
  threshold: number = config.trust.unavailableReportThreshold,
): boolean {
  return reportCount >= threshold;
}

export interface BrowseVisibilityInput {
  status: ListingStatus;
  freshnessStatus: FreshnessStatus;
  reportCount: number;
}

export interface BrowseVisibilityOptions {
  /** Surface stale listings too (non-default views). */
  includeStale?: boolean;
  threshold?: number;
}

/**
 * The single source of truth for "does this listing belong in default browse?".
 * Both the mock store and the live Firestore read path funnel through this so the
 * two behave identically.
 */
export function isVisibleInDefaultBrowse(
  input: BrowseVisibilityInput,
  options: BrowseVisibilityOptions = {},
): boolean {
  if (!isPubliclyVisible(input.status)) return false;
  if (reportThresholdReached(input.reportCount, options.threshold)) return false;
  if (!options.includeStale && input.freshnessStatus === 'stale') return false;
  return true;
}
