/**
 * Area livability tags (Phase 8) — practical neighbourhood signals stored in
 * `locationTags` alongside amenity tags.
 */

export const LIVABILITY_TAG_IDS = [
  'water-24-7',
  'water-tanker',
  'loadshedding-low',
  'loadshedding-high',
  'fiber-internet',
  'cable-internet',
] as const;

export type LivabilityTagId = (typeof LIVABILITY_TAG_IDS)[number];

export const LIVABILITY_LABELS: Record<LivabilityTagId, string> = {
  'water-24-7': 'Water 24/7',
  'water-tanker': 'Tanker water',
  'loadshedding-low': 'Low load-shedding',
  'loadshedding-high': 'High load-shedding',
  'fiber-internet': 'Fiber internet',
  'cable-internet': 'Cable internet',
};

export function isLivabilityTag(tag: string): tag is LivabilityTagId {
  return (LIVABILITY_TAG_IDS as readonly string[]).includes(tag);
}

export function splitLocationTags(tags: string[] = []) {
  const livability: LivabilityTagId[] = [];
  const amenities: string[] = [];
  for (const tag of tags) {
    if (isLivabilityTag(tag)) livability.push(tag);
    else amenities.push(tag);
  }
  return { livability, amenities };
}
