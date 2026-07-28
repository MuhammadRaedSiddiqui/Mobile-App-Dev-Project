/**
 * Geospatial helpers for radius search (Phase 8).
 * Live Firestore can index `geohash` for bounded queries; mock/Express uses haversine.
 */

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres between two WGS-84 points. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Whether a point lies within `radiusKm` of a centre (inclusive). */
export function isWithinRadiusKm(
  centerLat: number,
  centerLng: number,
  lat: number,
  lng: number,
  radiusKm: number,
): boolean {
  if (radiusKm <= 0) return false;
  return haversineDistanceKm(centerLat, centerLng, lat, lng) <= radiusKm;
}

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode lat/lng to a geohash string (standard base32 alphabet).
 * Stored on listings for future geospatial index backfill.
 */
export function encodeGeohash(lat: number, lng: number, precision = 9): string {
  let idx = 0;
  let bit = 0;
  let even = true;
  let hash = '';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}
