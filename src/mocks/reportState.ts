/**
 * In-memory unavailability reports for mock mode.
 *
 * This lives outside the service layer so that both `trustService` (which
 * records reports) and `listingsService` (which must stop surfacing a listing
 * once it crosses the threshold) can share it without importing each other.
 *
 * It mirrors the server rules: per-reporter de-dupe like
 * backend/src/services/store.ts, and the same suppression cut-off as
 * `isVisibleInDefaultBrowse` in backend/src/services/visibility.ts. Process-
 * scoped, exactly like the mock listings it guards.
 */
import { UNAVAILABLE_REPORT_THRESHOLD } from '@/utils/constants';
import { ReportReason } from '@/utils/types';

const reporters = new Map<string, Set<string>>();
/** Parallel to `reporters`: the reason each reporter gave, mirroring the server. */
const reasons = new Map<string, Map<string, ReportReason>>();

/** Record a report. Idempotent per reporter, so a second tap changes nothing. */
export function addMockReport(
  listingId: string,
  reporterUid: string,
  reason?: ReportReason,
): { unavailableReports: number; alreadyReported: boolean } {
  const set = reporters.get(listingId) ?? new Set<string>();
  const alreadyReported = set.has(reporterUid);
  set.add(reporterUid);
  reporters.set(listingId, set);
  if (reason && !alreadyReported) {
    const byReporter = reasons.get(listingId) ?? new Map<string, ReportReason>();
    byReporter.set(reporterUid, reason);
    reasons.set(listingId, byReporter);
  }
  return { unavailableReports: set.size, alreadyReported };
}

export function getMockReportCount(listingId: string): number {
  return reporters.get(listingId)?.size ?? 0;
}

/** Re-verification doubles as the dispute mechanism — it wipes the reports. */
export function clearMockReports(listingId: string): void {
  reporters.delete(listingId);
  reasons.delete(listingId);
}

/** True once a listing has collected enough reports to drop out of browse. */
export function isMockSuppressed(listingId: string): boolean {
  return getMockReportCount(listingId) >= UNAVAILABLE_REPORT_THRESHOLD;
}
