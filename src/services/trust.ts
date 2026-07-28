/**
 * Trust module service: freshness re-verification (agent) and report-as-unavailable
 * (seeker). Both are WRITES → Express only.
 */
import { config } from '@/config/env';
import { Freshness } from '@/utils/types';
import { markReported } from '@/utils/reportedListings';
import { api } from './api';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Mock reporter counts so three distinct seekers can suppress a listing in demos. */
const mockReportCounts = new Map<string, Set<string>>();

export const trustService = {
  /** Agent-owner one-tap re-verify. Clears reports and resets freshness to today. */
  async verify(listingId: string): Promise<{ freshness: Freshness }> {
    if (config.useMockData) {
      mockReportCounts.delete(listingId);
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
   */
  async report(
    listingId: string,
    reporterUid?: string,
  ): Promise<{ unavailableReports: number; alreadyReported: boolean }> {
    if (config.useMockData) {
      const uid = reporterUid ?? 'anonymous';
      const set = mockReportCounts.get(listingId) ?? new Set<string>();
      const alreadyReported = set.has(uid);
      set.add(uid);
      mockReportCounts.set(listingId, set);
      if (reporterUid) await markReported(reporterUid, listingId);
      return delay({ unavailableReports: set.size, alreadyReported });
    }
    const { data } = await api.post(`/listings/${listingId}/report`);
    if (reporterUid) await markReported(reporterUid, listingId);
    return {
      unavailableReports: data.unavailableReports,
      alreadyReported: Boolean(data.alreadyReported),
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
