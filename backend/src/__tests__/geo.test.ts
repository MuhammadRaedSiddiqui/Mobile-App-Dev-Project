import { encodeGeohash, haversineDistanceKm, isWithinRadiusKm } from '@/utils/geo';

describe('geo utilities', () => {
  it('computes haversine distance between two Karachi points', () => {
    // Gulshan ~ PECHS is roughly 6–8 km apart
    const km = haversineDistanceKm(24.9213, 67.0871, 24.8721, 67.0645);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(10);
  });

  it('includes a point at the exact centre of a radius search', () => {
    expect(isWithinRadiusKm(24.86, 67.01, 24.86, 67.01, 2)).toBe(true);
  });

  it('excludes a far point outside a small radius', () => {
    expect(isWithinRadiusKm(24.86, 67.01, 24.7985, 67.045, 2)).toBe(false);
  });

  it('encodes a stable geohash for listing backfill', () => {
    expect(encodeGeohash(24.9213, 67.0871, 9)).toMatch(/^[0-9b-hjkmnp-z]{9}$/);
    expect(encodeGeohash(24.9213, 67.0871, 9)).toBe(encodeGeohash(24.9213, 67.0871, 9));
  });
});
