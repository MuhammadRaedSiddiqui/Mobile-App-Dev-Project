import {
  isPubliclyVisible,
  isVisibleInDefaultBrowse,
  reportThresholdReached,
} from '@/services/visibility';

describe('visibility', () => {
  describe('isPubliclyVisible', () => {
    it('is true only for active listings', () => {
      expect(isPubliclyVisible('active')).toBe(true);
      expect(isPubliclyVisible('draft')).toBe(false);
      expect(isPubliclyVisible('rented')).toBe(false);
      expect(isPubliclyVisible('removed')).toBe(false);
    });
  });

  describe('reportThresholdReached', () => {
    it('is false below and true at/above the threshold', () => {
      expect(reportThresholdReached(0, 3)).toBe(false);
      expect(reportThresholdReached(2, 3)).toBe(false);
      expect(reportThresholdReached(3, 3)).toBe(true);
      expect(reportThresholdReached(5, 3)).toBe(true);
    });
  });

  describe('isVisibleInDefaultBrowse', () => {
    const base = { status: 'active' as const, freshnessStatus: 'fresh' as const, reportCount: 0 };

    it('shows an active, fresh, unreported listing', () => {
      expect(isVisibleInDefaultBrowse(base)).toBe(true);
    });

    it('hides aging but still shows it (aging is visible)', () => {
      expect(isVisibleInDefaultBrowse({ ...base, freshnessStatus: 'aging' })).toBe(true);
    });

    it('hides stale by default and shows it with includeStale', () => {
      expect(isVisibleInDefaultBrowse({ ...base, freshnessStatus: 'stale' })).toBe(false);
      expect(
        isVisibleInDefaultBrowse({ ...base, freshnessStatus: 'stale' }, { includeStale: true }),
      ).toBe(true);
    });

    it('hides non-active listings regardless of freshness', () => {
      expect(isVisibleInDefaultBrowse({ ...base, status: 'removed' })).toBe(false);
      expect(isVisibleInDefaultBrowse({ ...base, status: 'draft' })).toBe(false);
    });

    it('hides listings that reached the report threshold', () => {
      expect(isVisibleInDefaultBrowse({ ...base, reportCount: 3 }, { threshold: 3 })).toBe(false);
      expect(isVisibleInDefaultBrowse({ ...base, reportCount: 2 }, { threshold: 3 })).toBe(true);
    });
  });
});
