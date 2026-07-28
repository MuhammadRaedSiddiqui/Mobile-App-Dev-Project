import { validateListingInput, ListingInput, LISTING_LIMITS } from '@/services/validation';

const validInput: ListingInput = {
  title: '1-Bed Flat, Block 13, Gulshan-e-Iqbal',
  description: 'A bright flat.',
  price: 38000,
  priceType: 'monthly',
  imageUrls: ['https://example.com/a.jpg'],
  location: {
    lat: 24.9213,
    lng: 67.0871,
    address: 'Block 13, Gulshan-e-Iqbal',
    city: 'Karachi',
    area: 'Gulshan-e-Iqbal',
  },
  cost: { rent: 38000, depositMonths: 2, monthlyMaintenance: 2500, estimatedUtilities: 6500 },
};

describe('validateListingInput', () => {
  it('accepts a well-formed listing', () => {
    const result = validateListingInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty title and one over the limit', () => {
    expect(validateListingInput({ ...validInput, title: '   ' }).valid).toBe(false);
    const long = 'x'.repeat(LISTING_LIMITS.titleMax + 1);
    expect(validateListingInput({ ...validInput, title: long }).valid).toBe(false);
  });

  it('accepts a title exactly at the limit (boundary)', () => {
    const exact = 'x'.repeat(LISTING_LIMITS.titleMax);
    expect(validateListingInput({ ...validInput, title: exact }).valid).toBe(true);
  });

  it('rejects a description over 2000 chars', () => {
    const long = 'x'.repeat(LISTING_LIMITS.descriptionMax + 1);
    expect(validateListingInput({ ...validInput, description: long }).valid).toBe(false);
  });

  it('rejects negative or non-numeric price', () => {
    expect(validateListingInput({ ...validInput, price: -1 }).valid).toBe(false);
    expect(validateListingInput({ ...validInput, price: NaN }).valid).toBe(false);
  });

  it('accepts price of exactly 0 (boundary)', () => {
    expect(validateListingInput({ ...validInput, price: 0 }).valid).toBe(true);
  });

  it('rejects an invalid price type', () => {
    // @ts-expect-error deliberately invalid
    expect(validateListingInput({ ...validInput, priceType: 'weekly' }).valid).toBe(false);
  });

  it('enforces image count bounds', () => {
    expect(validateListingInput({ ...validInput, imageUrls: [] }).valid).toBe(false);
    const eleven = Array.from({ length: LISTING_LIMITS.maxImages + 1 }, (_, i) => `u${i}`);
    expect(validateListingInput({ ...validInput, imageUrls: eleven }).valid).toBe(false);
    const ten = Array.from({ length: LISTING_LIMITS.maxImages }, (_, i) => `u${i}`);
    expect(validateListingInput({ ...validInput, imageUrls: ten }).valid).toBe(true);
  });

  it('rejects coordinates outside Karachi', () => {
    const lahore = { ...validInput.location, lat: 31.52, lng: 74.35 };
    expect(validateListingInput({ ...validInput, location: lahore }).valid).toBe(false);
  });

  it('rejects an incomplete location', () => {
    const noArea = { ...validInput.location, area: '' };
    expect(validateListingInput({ ...validInput, location: noArea }).valid).toBe(false);
  });

  it('rejects negative cost inputs', () => {
    const bad = { ...validInput.cost, monthlyMaintenance: -5 };
    expect(validateListingInput({ ...validInput, cost: bad }).valid).toBe(false);
  });

  it('collects multiple errors at once', () => {
    const result = validateListingInput({
      ...validInput,
      title: '',
      price: -1,
      imageUrls: [],
    });
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
