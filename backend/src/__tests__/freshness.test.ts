import { classifyFreshness, computeFreshness, daysBetween } from '@/services/freshness';

const thresholds = { freshThresholdDays: 7, agingThresholdDays: 14 };

describe('daysBetween', () => {
  it('counts whole days elapsed', () => {
    const a = new Date('2026-07-01T00:00:00Z');
    const b = new Date('2026-07-04T00:00:00Z');
    expect(daysBetween(a, b)).toBe(3);
  });

  it('floors partial days', () => {
    const a = new Date('2026-07-01T00:00:00Z');
    const b = new Date('2026-07-02T23:00:00Z'); // 1d 23h
    expect(daysBetween(a, b)).toBe(1);
  });

  it('never returns negative for future verification', () => {
    const a = new Date('2026-07-10T00:00:00Z');
    const b = new Date('2026-07-01T00:00:00Z');
    expect(daysBetween(a, b)).toBe(0);
  });
});

describe('classifyFreshness', () => {
  it('is fresh at and below the fresh threshold', () => {
    expect(classifyFreshness(0, thresholds)).toBe('fresh');
    expect(classifyFreshness(7, thresholds)).toBe('fresh');
  });

  it('is aging just past fresh up to the aging threshold', () => {
    expect(classifyFreshness(8, thresholds)).toBe('aging');
    expect(classifyFreshness(14, thresholds)).toBe('aging');
  });

  it('is stale past the aging threshold', () => {
    expect(classifyFreshness(15, thresholds)).toBe('stale');
    expect(classifyFreshness(100, thresholds)).toBe('stale');
  });
});

describe('computeFreshness', () => {
  it('returns status, ISO timestamp, and daysSince together', () => {
    const verified = new Date('2026-07-10T09:00:00Z');
    const now = new Date('2026-07-27T09:00:00Z'); // 17 days
    const result = computeFreshness(verified, now, thresholds);
    expect(result).toEqual({
      status: 'stale',
      lastVerifiedAt: '2026-07-10T09:00:00.000Z',
      daysSince: 17,
    });
  });
});
