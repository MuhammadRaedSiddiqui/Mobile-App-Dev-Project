/**
 * Listing input validation — pure and unit-tested (Plan Phase 2.2).
 *
 * This is the shared constraint layer the Express write path (Phase 4) will run
 * before any Firestore write. It is defined now so the rules are frozen and
 * covered by tests alongside the rest of the business logic. Returning a list of
 * human-readable errors (rather than throwing) keeps it composable; the route
 * layer maps a non-empty list to a 422 via the standard error envelope.
 */
import { CostInput, PriceType } from '@/utils/types';

export const LISTING_LIMITS = {
  titleMax: 120,
  descriptionMax: 2000,
  maxImages: 10,
  minImages: 1,
} as const;

const PRICE_TYPES: readonly PriceType[] = ['monthly', 'yearly'];

/** Approximate Karachi bounding box; keeps seed/agent input on the map. */
export const KARACHI_BOUNDS = {
  minLat: 24.75,
  maxLat: 25.2,
  minLng: 66.85,
  maxLng: 67.55,
} as const;

export interface ListingLocationInput {
  lat: number;
  lng: number;
  address: string;
  city: string;
  area: string;
}

export interface ListingInput {
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  imageUrls: string[];
  location: ListingLocationInput;
  cost: CostInput;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function locationInKarachi(loc: ListingLocationInput): boolean {
  return (
    loc.lat >= KARACHI_BOUNDS.minLat &&
    loc.lat <= KARACHI_BOUNDS.maxLat &&
    loc.lng >= KARACHI_BOUNDS.minLng &&
    loc.lng <= KARACHI_BOUNDS.maxLng
  );
}

export function validateListingInput(input: ListingInput): ValidationResult {
  const errors: string[] = [];

  const title = input.title?.trim() ?? '';
  if (title.length === 0) errors.push('Title is required.');
  else if (title.length > LISTING_LIMITS.titleMax)
    errors.push(`Title must be ${LISTING_LIMITS.titleMax} characters or fewer.`);

  if ((input.description?.length ?? 0) > LISTING_LIMITS.descriptionMax)
    errors.push(`Description must be ${LISTING_LIMITS.descriptionMax} characters or fewer.`);

  if (!isFiniteNumber(input.price) || input.price < 0)
    errors.push('Price must be a number of 0 or more.');

  if (!PRICE_TYPES.includes(input.priceType))
    errors.push('Price type must be monthly or yearly.');

  const images = input.imageUrls ?? [];
  if (images.length < LISTING_LIMITS.minImages)
    errors.push('At least one image is required.');
  else if (images.length > LISTING_LIMITS.maxImages)
    errors.push(`No more than ${LISTING_LIMITS.maxImages} images are allowed.`);

  const loc = input.location;
  if (!loc || !loc.address?.trim() || !loc.city?.trim() || !loc.area?.trim()) {
    errors.push('A complete location (address, city, area) is required.');
  } else if (!isFiniteNumber(loc.lat) || !isFiniteNumber(loc.lng) || !locationInKarachi(loc)) {
    errors.push('Location coordinates must be within Karachi.');
  }

  const cost = input.cost;
  const costFields: Array<[keyof CostInput, string]> = [
    ['rent', 'Rent'],
    ['depositMonths', 'Deposit months'],
    ['monthlyMaintenance', 'Maintenance'],
    ['estimatedUtilities', 'Utilities'],
  ];
  for (const [key, label] of costFields) {
    const value = cost?.[key];
    if (!isFiniteNumber(value) || value < 0)
      errors.push(`${label} must be a number of 0 or more.`);
  }

  return { valid: errors.length === 0, errors };
}
