/**
 * Repeatable Firestore seed/import script (Plan Phase 2.1).
 *
 *   npm run seed        (from /backend, with MOCK_MODE=false + real credentials)
 *
 * Idempotent: uses fixed document IDs and `set()` so re-running overwrites rather
 * than duplicating. It writes ONLY through the Admin SDK — the same privileged
 * path Express uses — never the client. It refuses to run in mock mode or without
 * credentials so it can never target the wrong environment by accident.
 *
 * Seeds the four Phase 1 categories and a demo listing set covering every
 * category and freshness band, so all required UI states are demonstrable.
 */
import { config } from '@/config/env';
import { initFirebase, getDb } from '@/config/firebase';
import { tokenize } from '@/utils/tokenize';
import { FieldValue } from 'firebase-admin/firestore';

const CATEGORIES = [
  { categoryId: 'one-bed', name: '1-Bed Flats', slug: 'one-bed', iconName: 'bed', sortOrder: 1 },
  { categoryId: 'portion', name: 'Portions', slug: 'portion', iconName: 'home', sortOrder: 2 },
  { categoryId: 'shared', name: 'Shared / Roommate', slug: 'shared', iconName: 'users', sortOrder: 3 },
  { categoryId: 'studio', name: 'Studios', slug: 'studio', iconName: 'square', sortOrder: 4 },
];

interface SeedListing {
  listingId: string;
  agentId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  daysSinceVerified: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  location: { lat: number; lng: number; address: string; city: string; area: string };
  tags?: string[];
  cost: { rent: number; depositMonths: number; monthlyMaintenance: number; estimatedUtilities: number };
  status: 'active' | 'draft' | 'rented' | 'removed';
}

const LISTINGS: SeedListing[] = [
  {
    listingId: 'lst-001',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Flat, Block 13, Gulshan-e-Iqbal',
    description: 'Bright 1-bedroom flat with a small balcony, close to public transport.',
    price: 38000,
    daysSinceVerified: 2,
    area: 650,
    bedrooms: 1,
    bathrooms: 1,
    location: { lat: 24.9213, lng: 67.0871, address: 'Block 13, Gulshan-e-Iqbal', city: 'Karachi', area: 'Gulshan-e-Iqbal' },
    tags: ['near-transport', 'balcony'],
    cost: { rent: 38000, depositMonths: 2, monthlyMaintenance: 2500, estimatedUtilities: 6500 },
    status: 'active',
  },
  {
    listingId: 'lst-003',
    agentId: 'agent-danish',
    categoryId: 'portion',
    title: 'Ground Portion, PECHS Block 6',
    description: 'Spacious 2-bed ground portion with separate entrance and parking.',
    price: 55000,
    daysSinceVerified: 11,
    area: 1100,
    bedrooms: 2,
    bathrooms: 2,
    location: { lat: 24.8721, lng: 67.0645, address: 'Block 6, PECHS', city: 'Karachi', area: 'PECHS' },
    cost: { rent: 55000, depositMonths: 2, monthlyMaintenance: 3500, estimatedUtilities: 8000 },
    status: 'active',
  },
  {
    listingId: 'lst-006',
    agentId: 'agent-sara',
    categoryId: 'studio',
    title: 'Studio, Johar Block 15',
    description: 'Studio apartment near the main road. Awaiting re-verification.',
    price: 24000,
    daysSinceVerified: 17,
    area: 400,
    bathrooms: 1,
    location: { lat: 24.917, lng: 67.132, address: 'Block 15, Gulistan-e-Johar', city: 'Karachi', area: 'Gulistan-e-Johar' },
    cost: { rent: 24000, depositMonths: 1, monthlyMaintenance: 1600, estimatedUtilities: 3800 },
    status: 'active',
  },
];

const DAY = 86_400_000;

async function main(): Promise<void> {
  if (config.mockMode) {
    throw new Error('Refusing to seed: MOCK_MODE is true. Set MOCK_MODE=false and provide credentials.');
  }
  initFirebase();
  const db = getDb();
  if (!db) {
    throw new Error('Refusing to seed: Firestore is not initialized (missing credentials).');
  }

  const now = Date.now();
  const batch = db.batch();

  for (const c of CATEGORIES) {
    batch.set(db.collection('categories').doc(c.categoryId), c);
  }

  for (const l of LISTINGS) {
    const ref = db.collection('listings').doc(l.listingId);
    batch.set(ref, {
      agentId: l.agentId,
      categoryId: l.categoryId,
      title: l.title,
      titleKeywords: tokenize(l.title),
      description: l.description,
      price: l.price,
      priceType: 'monthly',
      area: l.area,
      bedrooms: l.bedrooms ?? null,
      bathrooms: l.bathrooms ?? null,
      location: l.location,
      locationTags: l.tags ?? [],
      status: l.status,
      viewCount: 0,
      cost: l.cost,
      lastVerifiedAt: new Date(now - l.daysSinceVerified * DAY),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  // eslint-disable-next-line no-console
  console.log(`[seed] wrote ${CATEGORIES.length} categories and ${LISTINGS.length} listings.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', err.message);
    process.exit(1);
  });
