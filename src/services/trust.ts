/**
 * Trust module service: freshness re-verification (agent) and report-as-unavailable
 * (seeker). Both are WRITES → Express only.
 */
import { config } from '@/config/env';
import { Freshness, ReportReason } from '@/utils/types';
import { markReported } from '@/utils/reportedListings';
import { UNAVAILABLE_REPORT_THRESHOLD } from '@/utils/constants';
import { addMockReport, clearMockReports } from '@/mocks/reportState';
import { api } from './api';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const trustService = {
  /** Agent-owner one-tap re-verify. Clears reports and resets freshness to today. */
  async verify(listingId: string): Promise<{ freshness: Freshness }> {
    if (config.useMockData) {
      clearMockReports(listingId);
      return delay({
        freshness: {
          status: 'fresh',
          daysSince: 0,
          lastVerifiedAt: new Date().toISOString(),
        },
      });
    }
    const { data } = await api.post(`/listings/${listingId}/verify`);
    return { freshness: data.freshness };
  },

  /**
   * Seeker report-as-unavailable. Idempotent per reporter.
   * Pass reporterUid so mock mode can de-dupe like the server.
   *
   * `reason` is recorded alongside the report but does not change the count —
   * every reason counts the same toward UNAVAILABLE_REPORT_THRESHOLD.
   *
   * `suppressed` is true once the listing has collected enough reports to drop
   * out of default browse, so the caller can say so instead of guessing.
   */
  async report(
    listingId: string,
    reporterUid?: string,
    reason?: ReportReason,
  ): Promise<{
    unavailableReports: number;
    alreadyReported: boolean;
    suppressed: boolean;
    suppressionThreshold: number;
  }> {
    if (config.useMockData) {
      const result = addMockReport(listingId, reporterUid ?? 'anonymous', reason);
      if (reporterUid) await markReported(reporterUid, listingId);
      return delay({
        ...result,
        suppressed: result.unavailableReports >= UNAVAILABLE_REPORT_THRESHOLD,
        suppressionThreshold: UNAVAILABLE_REPORT_THRESHOLD,
      });
    }
    const { data } = await api.post(`/listings/${listingId}/report`, { reason });
    if (reporterUid) await markReported(reporterUid, listingId);
    return {
      unavailableReports: Number(data.unavailableReports ?? 0),
      alreadyReported: Boolean(data.alreadyReported),
      suppressed: Boolean(data.suppressed),
      suppressionThreshold: Number(data.suppressionThreshold),
    };
  },

  async hasReported(listingId: string): Promise<boolean> {
    if (config.useMockData) return false;
    try {
      const { data } = await api.get(`/listings/${listingId}/reported`);
      return Boolean(data.reported);
    } catch {
      return false;
    }
  },
};
