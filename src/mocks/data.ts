/**
 * DEV-ONLY mock data. Used while `config.useMockData` is true (Phase 0/1) so the
 * full vertical slice runs before real Firebase/Express are wired up.
 *
 * Freshness and cost are precomputed here to mimic the shapes the Express API will
 * return. This mirrors — but is NOT — the authoritative server logic (that lives in
 * /backend/src/services). Nothing here writes to Firestore.
 */
import {
  Category,
  CostBreakdown,
  Freshness,
  Listing,
  ListingAgent,
  UserProfile,
} from '@/utils/types';

/** Deposit amortization period (months) used for the true-cost estimate. */
const AMORTIZATION_MONTHS = 12;

function computeFreshness(daysSince: number): Freshness {
  const status = daysSince <= 7 ? 'fresh' : daysSince <= 14 ? 'aging' : 'stale';
  // Fixed reference date keeps mock output deterministic across runs.
  const ref = new Date('2026-07-27T09:00:00Z').getTime();
  const lastVerifiedAt = new Date(ref - daysSince * 86_400_000).toISOString();
  return { status, daysSince, lastVerifiedAt };
}

function computeCost(input: {
  rent: number;
  depositMonths: number;
  monthlyMaintenance: number;
  estimatedUtilities: number;
}): CostBreakdown {
  const amortizedDeposit = (input.rent * input.depositMonths) / AMORTIZATION_MONTHS;
  const estimatedMonthlyTotal = Math.round(
    input.rent + amortizedDeposit + input.monthlyMaintenance + input.estimatedUtilities,
  );
  return { ...input, estimatedMonthlyTotal };
}

export const MOCK_CATEGORIES: Category[] = [
  { categoryId: 'one-bed', name: '1-Bed Flats', slug: 'one-bed', iconName: 'bed', sortOrder: 1 },
  { categoryId: 'portion', name: 'Portions', slug: 'portion', iconName: 'home', sortOrder: 2 },
  {
    categoryId: 'shared',
    name: 'Shared / Roommate',
    slug: 'shared',
    iconName: 'users',
    sortOrder: 3,
  },
  { categoryId: 'studio', name: 'Studios', slug: 'studio', iconName: 'square', sortOrder: 4 },
];

export const MOCK_AGENTS: Record<string, ListingAgent> = {
  'agent-danish': { uid: 'agent-danish', displayName: 'Danish Ahmed', phone: '0300-1234567' },
  'agent-sara': { uid: 'agent-sara', displayName: 'Sara Malik', phone: '0321-7654321' },
};

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

interface Seed {
  id: string;
  agentId: string;
  categoryId: Listing['categoryId'];
  title: string;
  description: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  daysSince: number;
  image: string;
  /** Extra gallery images (ids); the detail screen shows image + these. */
  extraImages?: string[];
  areaName: string;
  address: string;
  lat: number;
  lng: number;
  deposit: number;
  maintenance: number;
  utilities: number;
  status?: Listing['status'];
  views: number;
  tags?: string[];
}

const SEEDS: Seed[] = [
  {
    id: 'lst-001',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Flat, Block 13, Gulshan-e-Iqbal',
    description:
      'Bright 1-bedroom flat on the 3rd floor with a small balcony. Walking distance to the main commercial area and close to public transport.',
    price: 38000,
    area: 650,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 2,
    image: 'photo-1502672260266-1c1ef2d93688',
    extraImages: ['photo-1522708323590-d24dbb6b0267', 'photo-1484154218962-a197022b5858'],
    areaName: 'Gulshan-e-Iqbal',
    address: 'Block 13, Gulshan-e-Iqbal',
    lat: 24.9213,
    lng: 67.0871,
    deposit: 2,
    maintenance: 2500,
    utilities: 6500,
    views: 214,
    tags: ['near-metro', 'water-24-7', 'fiber-internet'],
  },
  {
    id: 'lst-002',
    agentId: 'agent-sara',
    categoryId: 'studio',
    title: 'Studio, Johar Town Block 15',
    description:
      'Compact fully-furnished studio, ideal for a single professional. Includes kitchenette.',
    price: 26000,
    area: 420,
    bathrooms: 1,
    daysSince: 4,
    image: 'photo-1560448204-e02f11c3d0e2',
    areaName: 'Gulistan-e-Johar',
    address: 'Block 15, Gulistan-e-Johar',
    lat: 24.9156,
    lng: 67.1301,
    deposit: 1,
    maintenance: 1800,
    utilities: 4200,
    views: 132,
    tags: ['furnished'],
  },
  {
    id: 'lst-003',
    agentId: 'agent-danish',
    categoryId: 'portion',
    title: 'Ground Portion, PECHS Block 6',
    description:
      'Spacious 2-bed ground portion with separate entrance and car parking. Quiet residential lane.',
    price: 55000,
    area: 1100,
    bedrooms: 2,
    bathrooms: 2,
    daysSince: 11,
    image: 'photo-1493809842364-78817add7ffb',
    areaName: 'PECHS',
    address: 'Block 6, PECHS',
    lat: 24.8721,
    lng: 67.0645,
    deposit: 2,
    maintenance: 3500,
    utilities: 8000,
    views: 187,
    tags: ['parking', 'gated'],
  },
  {
    id: 'lst-004',
    agentId: 'agent-sara',
    categoryId: 'shared',
    title: 'Shared Room, Gulshan Block 10',
    description:
      'Furnished room in a shared flat with one other tenant. Bills split. Roommate-friendly.',
    price: 18000,
    area: 300,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 3,
    image: 'photo-1522708323590-d24dbb6b0267',
    areaName: 'Gulshan-e-Iqbal',
    address: 'Block 10, Gulshan-e-Iqbal',
    lat: 24.9302,
    lng: 67.0951,
    deposit: 1,
    maintenance: 1500,
    utilities: 3000,
    views: 98,
    tags: ['furnished', 'roommate'],
  },
  {
    id: 'lst-005',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Flat, Johar Block 2',
    description: 'Modern 1-bed flat with lift access and 24/7 security. Close to universities.',
    price: 42000,
    area: 700,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 6,
    image: 'photo-1484154218962-a197022b5858',
    areaName: 'Gulistan-e-Johar',
    address: 'Block 2, Gulistan-e-Johar',
    lat: 24.9098,
    lng: 67.1422,
    deposit: 2,
    maintenance: 2800,
    utilities: 5700,
    views: 156,
    tags: ['gated', 'lift'],
  },
  {
    id: 'lst-006',
    agentId: 'agent-sara',
    categoryId: 'studio',
    title: 'Studio, Johar Block 15 (older listing)',
    description: 'Studio apartment near the main road. Awaiting agent re-verification.',
    price: 24000,
    area: 400,
    bathrooms: 1,
    daysSince: 17,
    image: 'photo-1560185007-cde436f6a4d0',
    areaName: 'Gulistan-e-Johar',
    address: 'Block 15, Gulistan-e-Johar',
    lat: 24.917,
    lng: 67.132,
    deposit: 1,
    maintenance: 1600,
    utilities: 3800,
    views: 61,
  },
  {
    id: 'lst-007',
    agentId: 'agent-danish',
    categoryId: 'portion',
    title: 'Upper Portion, Gulshan Block 5 (removed)',
    description: 'This listing has been removed by the agent.',
    price: 60000,
    area: 1200,
    bedrooms: 3,
    bathrooms: 2,
    daysSince: 9,
    image: 'photo-1560448076-e02f11c3d0e2',
    areaName: 'Gulshan-e-Iqbal',
    address: 'Block 5, Gulshan-e-Iqbal',
    lat: 24.925,
    lng: 67.089,
    deposit: 2,
    maintenance: 4000,
    utilities: 9000,
    views: 240,
    status: 'removed',
  },
  {
    id: 'lst-008',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Flat, Bahadurabad',
    description:
      'Renovated 1-bed on a main road with reliable water supply. Suits a small family or couple.',
    price: 45000,
    area: 720,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 1,
    image: 'photo-1567767292278-a4f21aa2d36e',
    extraImages: ['photo-1502005229762-cf1b2da7c5d6'],
    areaName: 'Bahadurabad',
    address: 'Main Bahadurabad',
    lat: 24.8801,
    lng: 67.0682,
    deposit: 2,
    maintenance: 3000,
    utilities: 6000,
    views: 74,
    tags: ['renovated'],
  },
  {
    id: 'lst-009',
    agentId: 'agent-sara',
    categoryId: 'portion',
    title: 'First-Floor Portion, North Nazimabad Block H',
    description:
      'Two-bed first-floor portion with a covered terrace. Family building, no commercial activity.',
    price: 48000,
    area: 950,
    bedrooms: 2,
    bathrooms: 2,
    daysSince: 5,
    image: 'photo-1512917774080-9991f1c4c750',
    areaName: 'North Nazimabad',
    address: 'Block H, North Nazimabad',
    lat: 24.9425,
    lng: 67.0369,
    deposit: 2,
    maintenance: 3200,
    utilities: 7000,
    views: 118,
    tags: ['terrace', 'family-building'],
  },
  {
    id: 'lst-010',
    agentId: 'agent-danish',
    categoryId: 'shared',
    title: 'Roommate Spot, DHA Phase 2',
    description:
      'Bed in a two-person shared room. Rent is all-inclusive — no separate maintenance or utility bills.',
    price: 22000,
    area: 260,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 8,
    image: 'photo-1595526114035-0d45ed16cfbf',
    areaName: 'DHA',
    address: 'Phase 2, DHA',
    lat: 24.8281,
    lng: 67.0648,
    deposit: 1,
    maintenance: 0,
    utilities: 0,
    views: 65,
    tags: ['all-inclusive', 'roommate'],
  },
  {
    id: 'lst-011',
    agentId: 'agent-sara',
    categoryId: 'studio',
    title: 'Studio Loft, Clifton Block 5',
    description:
      'Sunlit studio loft close to the seafront. Fully furnished with a compact modular kitchen.',
    price: 52000,
    area: 500,
    bathrooms: 1,
    daysSince: 6,
    image: 'photo-1554995207-c18c203602cb',
    extraImages: ['photo-1560448204-e02f11c3d0e2'],
    areaName: 'Clifton',
    address: 'Block 5, Clifton',
    lat: 24.8138,
    lng: 67.0301,
    deposit: 2,
    maintenance: 4000,
    utilities: 6500,
    views: 203,
    tags: ['furnished', 'sea-view'],
  },
  {
    id: 'lst-012',
    agentId: 'agent-danish',
    categoryId: 'one-bed',
    title: '1-Bed Apartment, Malir Cantt',
    description: 'Quiet 1-bed inside a secured cantonment area. Ideal for those wanting low noise.',
    price: 35000,
    area: 600,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 10,
    image: 'photo-1493809842364-78817add7ffb',
    areaName: 'Malir Cantt',
    address: 'Malir Cantt',
    lat: 24.8934,
    lng: 67.2011,
    deposit: 2,
    maintenance: 2200,
    utilities: 5000,
    views: 89,
    tags: ['gated', 'quiet'],
  },
  {
    id: 'lst-013',
    agentId: 'agent-sara',
    categoryId: 'portion',
    title: 'Ground Portion, Nazimabad Block 3',
    description: 'Independent ground portion with a small lawn and separate meter connections.',
    price: 40000,
    area: 900,
    bedrooms: 2,
    bathrooms: 1,
    daysSince: 12,
    image: 'photo-1449844908441-8829872d2607',
    areaName: 'Nazimabad',
    address: 'Block 3, Nazimabad',
    lat: 24.9126,
    lng: 67.0322,
    deposit: 2,
    maintenance: 2600,
    utilities: 5500,
    views: 141,
    tags: ['lawn', 'separate-meter'],
  },
  {
    id: 'lst-014',
    agentId: 'agent-danish',
    categoryId: 'shared',
    title: 'Shared Flat, Gulshan Block 7',
    description: 'Private room in a three-person shared flat. Common lounge and rooftop access.',
    price: 20000,
    area: 280,
    bedrooms: 1,
    bathrooms: 1,
    daysSince: 7,
    image: 'photo-1484154218962-a197022b5858',
    areaName: 'Gulshan-e-Iqbal',
    address: 'Block 7, Gulshan-e-Iqbal',
    lat: 24.9267,
    lng: 67.0982,
    deposit: 1,
    maintenance: 1200,
    utilities: 2800,
    views: 52,
    tags: ['roommate', 'rooftop'],
  },
];

export const MOCK_LISTINGS: Listing[] = SEEDS.map((s) => ({
  listingId: s.id,
  agentId: s.agentId,
  categoryId: s.categoryId,
  title: s.title,
  description: s.description,
  price: s.price,
  priceType: 'monthly',
  area: s.area,
  bedrooms: s.bedrooms,
  bathrooms: s.bathrooms,
  imageUrls: [UNSPLASH(s.image), ...(s.extraImages ?? []).map(UNSPLASH)],
  location: { lat: s.lat, lng: s.lng, address: s.address, city: 'Karachi', area: s.areaName },
  locationTags: s.tags ?? [],
  status: s.status ?? 'active',
  viewCount: s.views,
  freshness: computeFreshness(s.daysSince),
  costBreakdown: computeCost({
    rent: s.price,
    depositMonths: s.deposit,
    monthlyMaintenance: s.maintenance,
    estimatedUtilities: s.utilities,
  }),
  createdAt: '2026-07-01T09:00:00Z',
  updatedAt: '2026-07-20T09:00:00Z',
}));

/** Demo accounts for mock auth — one seeker, one agent. */
export const MOCK_USERS: Array<UserProfile & { password: string }> = [
  {
    uid: 'seeker-ayesha',
    email: 'ayesha@example.com',
    password: 'password123',
    displayName: 'Ayesha Khan',
    role: 'seeker',
    isActive: true,
    verificationStatus: 'verified',
  },
  {
    uid: 'agent-danish',
    email: 'danish@example.com',
    password: 'password123',
    displayName: 'Danish Ahmed',
    role: 'agent',
    phone: '0300-1234567',
    isActive: true,
    verificationStatus: 'verified',
  },
];
