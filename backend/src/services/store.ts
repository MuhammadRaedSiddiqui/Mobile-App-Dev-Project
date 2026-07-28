/**
 * In-memory data store for MOCK_MODE. Mirrors the shapes the Firestore data layer
 * returns in live mode, and — critically — routes every read through the SAME pure
 * business logic (computeFreshness / computeCostBreakdown / isVisibleInDefaultBrowse)
 * the live path uses, so behavior is identical when Firestore is swapped in.
 *
 * This is the ONLY place mock persistence lives. It is not exported to clients.
 */
import { computeCostBreakdown } from './cost';
import { computeFreshness } from './freshness';
import {
  dispatchSavedSearchAlert,
  listingMatchesSavedSearch,
  type NotificationPreferences,
  type SavedSearchRecord,
} from './notifications';
import { isVisibleInDefaultBrowse } from './visibility';
import { encodeGeohash, isWithinRadiusKm } from '@/utils/geo';
import { tokenize } from '@/utils/tokenize';
import { CostInput, FreshnessStatus, ListingStatus, PriceType, UserRole } from '@/utils/types';

export const MOCK_TOKEN_PREFIX = 'mock-token-';

/** Unique views are deduplicated per viewer within this window (Docs §3.4). */
export const VIEW_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

interface StoredUser {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
}

interface StoredListing {
  listingId: string;
  agentId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  location: { lat: number; lng: number; address: string; city: string; area: string };
  locationTags: string[];
  geohash: string;
  status: ListingStatus;
  viewCount: number;
  lastVerifiedAt: Date;
  cost: CostInput;
  createdAt: string;
  updatedAt: string;
  reporters: Set<string>;
  /** viewerUid -> last counted-view timestamp (ms), for unique-view dedup. */
  viewers: Map<string, number>;
}

const users: StoredUser[] = [
  {
    uid: 'seeker-ayesha',
    email: 'ayesha@example.com',
    password: 'password123',
    displayName: 'Ayesha Khan',
    role: 'seeker',
  },
  {
    uid: 'agent-danish',
    email: 'danish@example.com',
    password: 'password123',
    displayName: 'Danish Ahmed',
    role: 'agent',
    phone: '0300-1234567',
  },
  {
    uid: 'agent-sara',
    email: 'sara@example.com',
    password: 'password123',
    displayName: 'Sara Malik',
    role: 'agent',
    phone: '0321-7654321',
  },
];

const categories = [
  { categoryId: 'one-bed', name: '1-Bed Flats', slug: 'one-bed', iconName: 'bed', sortOrder: 1 },
  { categoryId: 'portion', name: 'Portions', slug: 'portion', iconName: 'home', sortOrder: 2 },
  { categoryId: 'shared', name: 'Shared / Roommate', slug: 'shared', iconName: 'users', sortOrder: 3 },
  { categoryId: 'studio', name: 'Studios', slug: 'studio', iconName: 'square', sortOrder: 4 },
];

// Fixed reference so daysSince is deterministic relative to seeded verify dates.
const DAY = 86_400_000;
const NOW = new Date('2026-07-27T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

interface Seed {
  id: string;
  agentId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  daysSince: number;
  image: string;
  areaName: string;
  address: string;
  lat: number;
  lng: number;
  deposit: number;
  maintenance: number;
  utilities: number;
  views: number;
  status?: ListingStatus;
  reporters?: string[];
  tags?: string[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

// >10 active listings across all four categories and every freshness band, plus a
// stale, a report-suppressed, a zero-optional-cost, and a removed listing.
const SEEDS: Seed[] = [
  { id: 'lst-001', agentId: 'agent-danish', categoryId: 'one-bed', title: '1-Bed Flat, Block 13, Gulshan-e-Iqbal', description: 'Bright 1-bedroom flat with a small balcony, close to public transport.', price: 38000, area: 650, bedrooms: 1, bathrooms: 1, daysSince: 2, image: 'photo-1502672260266-1c1ef2d93688', areaName: 'Gulshan-e-Iqbal', address: 'Block 13, Gulshan-e-Iqbal', lat: 24.9213, lng: 67.0871, deposit: 2, maintenance: 2500, utilities: 6500, views: 214, tags: ['near-transport', 'balcony', 'water-24-7', 'fiber-internet'] },
  { id: 'lst-002', agentId: 'agent-sara', categoryId: 'studio', title: 'Studio, Johar Town Block 15', description: 'Compact fully-furnished studio, ideal for a single professional.', price: 26000, area: 420, bathrooms: 1, daysSince: 4, image: 'photo-1560448204-e02f11c3d0e2', areaName: 'Gulistan-e-Johar', address: 'Block 15, Gulistan-e-Johar', lat: 24.9156, lng: 67.1301, deposit: 1, maintenance: 1800, utilities: 4200, views: 132, tags: ['furnished', 'loadshedding-low'] },
  { id: 'lst-003', agentId: 'agent-danish', categoryId: 'portion', title: 'Ground Portion, PECHS Block 6', description: 'Spacious 2-bed ground portion with separate entrance and parking.', price: 55000, area: 1100, bedrooms: 2, bathrooms: 2, daysSince: 11, image: 'photo-1493809842364-78817add7ffb', areaName: 'PECHS', address: 'Block 6, PECHS', lat: 24.8721, lng: 67.0645, deposit: 2, maintenance: 3500, utilities: 8000, views: 187, tags: ['parking', 'water-tanker', 'loadshedding-high'] },
  { id: 'lst-004', agentId: 'agent-sara', categoryId: 'shared', title: 'Shared Room, Gulshan Block 10', description: 'Furnished room in a shared flat with one other tenant. Bills split.', price: 18000, area: 300, bedrooms: 1, bathrooms: 1, daysSince: 3, image: 'photo-1522708323590-d24dbb6b0267', areaName: 'Gulshan-e-Iqbal', address: 'Block 10, Gulshan-e-Iqbal', lat: 24.9302, lng: 67.0951, deposit: 1, maintenance: 1500, utilities: 3000, views: 98, tags: ['furnished', 'shared'] },
  { id: 'lst-005', agentId: 'agent-danish', categoryId: 'one-bed', title: '1-Bed Flat, Johar Block 2', description: 'Modern 1-bed flat with lift access and 24/7 security.', price: 42000, area: 700, bedrooms: 1, bathrooms: 1, daysSince: 6, image: 'photo-1484154218962-a197022b5858', areaName: 'Gulistan-e-Johar', address: 'Block 2, Gulistan-e-Johar', lat: 24.9098, lng: 67.1422, deposit: 2, maintenance: 2800, utilities: 5700, views: 156 },
  { id: 'lst-006', agentId: 'agent-sara', categoryId: 'studio', title: 'Studio, Johar Block 15 (older)', description: 'Studio apartment near the main road. Awaiting agent re-verification.', price: 24000, area: 400, bathrooms: 1, daysSince: 17, image: 'photo-1560185007-cde436f6a4d0', areaName: 'Gulistan-e-Johar', address: 'Block 15, Gulistan-e-Johar', lat: 24.917, lng: 67.132, deposit: 1, maintenance: 1600, utilities: 3800, views: 61 },
  { id: 'lst-007', agentId: 'agent-danish', categoryId: 'portion', title: 'Upper Portion, Gulshan Block 5', description: 'Three-bed upper portion with roof access. Family-friendly lane.', price: 60000, area: 1200, bedrooms: 3, bathrooms: 2, daysSince: 9, image: 'photo-1512917774080-9991f1c4c750', areaName: 'Gulshan-e-Iqbal', address: 'Block 5, Gulshan-e-Iqbal', lat: 24.925, lng: 67.089, deposit: 2, maintenance: 4000, utilities: 9000, views: 240 },
  { id: 'lst-008', agentId: 'agent-sara', categoryId: 'one-bed', title: '1-Bed Flat, DHA Phase 6', description: 'Renovated 1-bed near the beach with covered parking.', price: 65000, area: 750, bedrooms: 1, bathrooms: 1, daysSince: 1, image: 'photo-1493663284031-b7e3aaa4c4b8', areaName: 'DHA', address: 'Phase 6, DHA', lat: 24.7985, lng: 67.045, deposit: 2, maintenance: 3000, utilities: 7000, views: 320, tags: ['parking', 'beach', 'renovated', 'water-24-7', 'loadshedding-low', 'cable-internet'] },
  { id: 'lst-009', agentId: 'agent-danish', categoryId: 'shared', title: 'Shared Flat Room, North Nazimabad', description: 'Single room in a 3-tenant flat. Quiet, students welcome.', price: 15000, area: 250, bedrooms: 1, bathrooms: 1, daysSince: 5, image: 'photo-1505691938895-1758d7feb511', areaName: 'North Nazimabad', address: 'Block H, North Nazimabad', lat: 24.9412, lng: 67.0389, deposit: 1, maintenance: 1000, utilities: 2500, views: 74 },
  { id: 'lst-010', agentId: 'agent-sara', categoryId: 'portion', title: 'Lower Portion, Bahadurabad', description: 'Two-bed lower portion with a small lawn. No maintenance charges.', price: 48000, area: 950, bedrooms: 2, bathrooms: 2, daysSince: 8, image: 'photo-1560184897-ae75f418493e', areaName: 'Bahadurabad', address: 'Bahadurabad Chowrangi', lat: 24.8785, lng: 67.0712, deposit: 2, maintenance: 0, utilities: 0, views: 143, tags: ['no-maintenance', 'lawn'] },
  { id: 'lst-011', agentId: 'agent-danish', categoryId: 'studio', title: 'Studio Loft, Clifton Block 2', description: 'Open-plan studio loft with sea-facing window.', price: 58000, area: 480, bathrooms: 1, daysSince: 13, image: 'photo-1536376072261-38c75010e6c9', areaName: 'Clifton', address: 'Block 2, Clifton', lat: 24.8125, lng: 67.0301, deposit: 2, maintenance: 3500, utilities: 6000, views: 201, tags: ['sea-view', 'furnished', 'fiber-internet', 'loadshedding-low'] },
  { id: 'lst-012', agentId: 'agent-sara', categoryId: 'one-bed', title: '1-Bed Flat, Malir Cantt', description: 'Affordable 1-bed in a secure cantonment complex.', price: 30000, area: 600, bedrooms: 1, bathrooms: 1, daysSince: 7, image: 'photo-1560448205-4d9b3e6bb6db', areaName: 'Malir', address: 'Malir Cantt', lat: 24.8935, lng: 67.1902, deposit: 1, maintenance: 2000, utilities: 4000, views: 89 },
  { id: 'lst-013', agentId: 'agent-danish', categoryId: 'shared', title: 'Roommate Room, Gulistan-e-Johar', description: 'Shared 2-bed, one room available. Reported unavailable by several seekers.', price: 16000, area: 280, bedrooms: 1, bathrooms: 1, daysSince: 4, image: 'photo-1598928506311-c55ded91a20c', areaName: 'Gulistan-e-Johar', address: 'Block 7, Gulistan-e-Johar', lat: 24.9201, lng: 67.1355, deposit: 1, maintenance: 1200, utilities: 2800, views: 45, reporters: ['seeker-ayesha', 'seeker-b', 'seeker-c'] },
  { id: 'lst-014', agentId: 'agent-sara', categoryId: 'portion', title: 'Upper Portion, Gulshan Block 5 (removed)', description: 'This listing has been removed by the agent.', price: 60000, area: 1200, bedrooms: 3, bathrooms: 2, daysSince: 9, image: 'photo-1560448076-e02f11c3d0e2', areaName: 'Gulshan-e-Iqbal', address: 'Block 5, Gulshan-e-Iqbal', lat: 24.925, lng: 67.089, deposit: 2, maintenance: 4000, utilities: 9000, views: 240, status: 'removed' },
];

const listings: StoredListing[] = SEEDS.map((s) => ({
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
  imageUrls: [IMG(s.image)],
  location: { lat: s.lat, lng: s.lng, address: s.address, city: 'Karachi', area: s.areaName },
  locationTags: s.tags ?? [],
  geohash: encodeGeohash(s.lat, s.lng),
  status: s.status ?? 'active',
  viewCount: s.views,
  lastVerifiedAt: daysAgo(s.daysSince),
  cost: { rent: s.price, depositMonths: s.deposit, monthlyMaintenance: s.maintenance, estimatedUtilities: s.utilities },
  createdAt: '2026-07-01T09:00:00Z',
  updatedAt: '2026-07-25T09:00:00Z',
  reporters: new Set(s.reporters ?? []),
  viewers: new Map(),
}));

// favorites: uid -> set of listingIds
const favorites = new Map<string, Set<string>>([['seeker-ayesha', new Set()]]);

// ---- Messages / Inquiries ----

export interface MessageRecord {
  id: string;
  threadId: string;
  listingId: string;
  fromUid: string;
  toUid: string;
  text: string;
  createdAt: string;
  readAt?: string;
}

export interface MessageThreadSummary {
  threadId: string;
  listingId: string;
  listingTitle: string;
  otherPartyUid: string;
  otherPartyName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

const messages = new Map<string, MessageRecord[]>();
let messageCounter = 1;

function buildThreadId(listingId: string, seekerUid: string, agentUid: string): string {
  return `thread-${listingId}-${seekerUid}-${agentUid}`;
}

export function createMessage(input: {
  listingId: string;
  fromUid: string;
  toUid: string;
  text: string;
}): MessageRecord {
  const listing = rawListing(input.listingId);
  const seekerUid = findUserByUid(input.fromUid)?.role === 'seeker' ? input.fromUid : input.toUid;
  const agentUid = input.fromUid === seekerUid ? input.toUid : input.fromUid;
  const threadId = buildThreadId(input.listingId, seekerUid, agentUid);

  const record: MessageRecord = {
    id: `msg-${messageCounter++}`,
    threadId,
    listingId: input.listingId,
    fromUid: input.fromUid,
    toUid: input.toUid,
    text: input.text,
    createdAt: new Date().toISOString(),
  };

  const thread = messages.get(threadId) ?? [];
  thread.push(record);
  messages.set(threadId, thread);
  return record;
}

export function listMessageThreads(uid: string): MessageThreadSummary[] {
  const result: MessageThreadSummary[] = [];
  for (const [threadId, msgs] of messages.entries()) {
    const involved = msgs.some((m) => m.fromUid === uid || m.toUid === uid);
    if (!involved) continue;
    const last = msgs[msgs.length - 1];
    const otherUid = last.fromUid === uid ? last.toUid : last.fromUid;
    const otherUser = findUserByUid(otherUid);
    const listing = rawListing(last.listingId);
    const unread = msgs.filter((m) => m.toUid === uid && !m.readAt).length;
    result.push({
      threadId,
      listingId: last.listingId,
      listingTitle: listing?.title ?? 'Unknown listing',
      otherPartyUid: otherUid,
      otherPartyName: otherUser?.displayName ?? 'Unknown',
      lastMessage: last.text,
      lastMessageAt: last.createdAt,
      unreadCount: unread,
    });
  }
  return result.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function getMessageThread(threadId: string, uid: string): MessageRecord[] | null {
  const msgs = messages.get(threadId);
  if (!msgs) return null;
  const involved = msgs.some((m) => m.fromUid === uid || m.toUid === uid);
  if (!involved) return null;
  return [...msgs];
}

export function markThreadRead(threadId: string, uid: string): boolean {
  const msgs = messages.get(threadId);
  if (!msgs) return false;
  const involved = msgs.some((m) => m.fromUid === uid || m.toUid === uid);
  if (!involved) return false;
  const now = new Date().toISOString();
  for (const m of msgs) {
    if (m.toUid === uid && !m.readAt) m.readAt = now;
  }
  return true;
}

/** Push tokens and saved-search notification state (Phase 8). */
const pushTokens = new Map<string, { token: string; platform: string; updatedAt: string }>();
const notificationPrefs = new Map<string, NotificationPreferences>();
const savedSearches = new Map<string, SavedSearchRecord[]>();
let savedSearchCounter = 1;

/** Serialize a stored listing into the API shape, computing freshness/cost now. */
export function serializeListing(l: StoredListing, now: Date = new Date()) {
  return {
    listingId: l.listingId,
    agentId: l.agentId,
    categoryId: l.categoryId,
    title: l.title,
    titleKeywords: tokenize(l.title),
    description: l.description,
    price: l.price,
    priceType: l.priceType,
    area: l.area,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    imageUrls: l.imageUrls,
    location: l.location,
    locationTags: l.locationTags,
    geohash: l.geohash,
    status: l.status,
    viewCount: l.viewCount,
    freshness: computeFreshness(l.lastVerifiedAt, now),
    costBreakdown: computeCostBreakdown(l.cost),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export type SerializedListing = ReturnType<typeof serializeListing>;

// ---- Users ----
export function findUserByUid(uid: string): StoredUser | undefined {
  return users.find((u) => u.uid === uid);
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function createUser(input: Omit<StoredUser, 'uid'>): StoredUser {
  const uid = `mock-${users.length + 1}-${input.role}`;
  const user: StoredUser = { ...input, uid };
  users.push(user);
  favorites.set(uid, new Set());
  return user;
}

export function publicUser(u: StoredUser) {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
  };
}

export function updateUserProfile(
  uid: string,
  patch: { displayName?: string; phone?: string; avatarUrl?: string | null },
) {
  const user = findUserByUid(uid);
  if (!user) return { ok: false as const, reason: 'not_found' as const };
  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim();
    if (name.length < 2) return { ok: false as const, reason: 'validation' as const };
    user.displayName = name;
  }
  if (patch.phone !== undefined) {
    user.phone = user.role === 'agent' ? patch.phone.trim() || undefined : undefined;
  }
  if (patch.avatarUrl !== undefined) {
    user.avatarUrl = patch.avatarUrl || undefined;
  }
  return { ok: true as const, user };
}

export function mockTokenFor(uid: string): string {
  return `${MOCK_TOKEN_PREFIX}${uid}`;
}

// ---- Categories & listings ----
export function listCategories() {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface ListingFilter {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  /** Match listings carrying ANY of these location tags. */
  tags?: string[];
  /** Explicit freshness inclusion set; when omitted the default browse hides stale. */
  freshness?: FreshnessStatus[];
  includeStale?: boolean;
  /** Exact bedroom count; use minBedrooms for "N+" style filters. */
  bedrooms?: number;
  /** Inclusive lower bound on bedrooms (e.g. 3 → 3+). */
  minBedrooms?: number;
  minArea?: number;
  maxArea?: number;
  /** Viewport latitude band (Firestore-friendly). Longitude may also be applied here in mock/Express. */
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  /** Radius search centre (km). Requires centerLat + centerLng. Viewport bounds ignored when set. */
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  now?: Date;
  limit?: number;
  cursor?: string;
  /** Exclude a listing id (used by similar-listings). */
  excludeId?: string;
}

export interface ListingPage {
  items: SerializedListing[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Opaque cursor. In mock mode this encodes a numeric offset; the live Firestore
 * path will instead encode the last document snapshot for `startAfter(...)`. The
 * client treats it as opaque either way.
 */
function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`).toString('base64url');
}

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const match = /^o:(\d+)$/.exec(decoded);
    const offset = match ? Number(match[1]) : 0;
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

const DEFAULT_LIMIT = 10;

export function listListings(filter: ListingFilter = {}): ListingPage {
  const now = filter.now ?? new Date();
  const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 200) : DEFAULT_LIMIT;

  // An explicit freshness set that includes 'stale' also surfaces stale listings
  // past the default-browse suppression; otherwise honor the includeStale toggle.
  const freshnessFilter = filter.freshness;
  const includeStale = filter.includeStale || (freshnessFilter?.includes('stale') ?? false);

  let items = listings
    .filter((l) =>
      isVisibleInDefaultBrowse(
        {
          status: l.status,
          freshnessStatus: computeFreshness(l.lastVerifiedAt, now).status,
          reportCount: l.reporters.size,
        },
        { includeStale },
      ),
    )
    .map((l) => serializeListing(l, now));

  if (filter.category) items = items.filter((l) => l.categoryId === filter.category);
  if (filter.minPrice != null) items = items.filter((l) => l.price >= filter.minPrice!);
  if (filter.maxPrice != null) items = items.filter((l) => l.price <= filter.maxPrice!);
  if (filter.city) {
    const city = filter.city.trim().toLowerCase();
    items = items.filter((l) => l.location.city.toLowerCase() === city);
  }
  if (filter.tags && filter.tags.length) {
    const wanted = filter.tags.map((t) => t.toLowerCase());
    items = items.filter((l) => l.locationTags.some((t) => wanted.includes(t.toLowerCase())));
  }
  if (filter.bedrooms != null) {
    items = items.filter((l) => (l.bedrooms ?? 0) === filter.bedrooms);
  }
  if (filter.minBedrooms != null) {
    items = items.filter((l) => (l.bedrooms ?? 0) >= filter.minBedrooms!);
  }
  if (filter.minArea != null) items = items.filter((l) => l.area >= filter.minArea!);
  if (filter.maxArea != null) items = items.filter((l) => l.area <= filter.maxArea!);
  if (filter.excludeId) items = items.filter((l) => l.listingId !== filter.excludeId);
  if (freshnessFilter && freshnessFilter.length) {
    items = items.filter((l) => freshnessFilter.includes(l.freshness.status));
  }
  if (filter.q && filter.q.trim()) {
    const tokens = tokenize(filter.q);
    items = items.filter((l) => tokens.some((t) => l.titleKeywords.includes(t)));
  }

  const radiusActive =
    filter.centerLat != null &&
    filter.centerLng != null &&
    filter.radiusKm != null &&
    filter.radiusKm > 0;

  if (radiusActive) {
    items = items.filter((l) =>
      isWithinRadiusKm(
        filter.centerLat!,
        filter.centerLng!,
        l.location.lat,
        l.location.lng,
        filter.radiusKm!,
      ),
    );
  } else {
    if (filter.minLat != null) items = items.filter((l) => l.location.lat >= filter.minLat!);
    if (filter.maxLat != null) items = items.filter((l) => l.location.lat <= filter.maxLat!);
    if (filter.minLng != null) items = items.filter((l) => l.location.lng >= filter.minLng!);
    if (filter.maxLng != null) items = items.filter((l) => l.location.lng <= filter.maxLng!);
  }

  // Default browse ranking: fresh/aging above stale, then most-recently verified.
  const rank = { fresh: 0, aging: 1, stale: 2 } as const;
  items.sort((a, b) =>
    rank[a.freshness.status] !== rank[b.freshness.status]
      ? rank[a.freshness.status] - rank[b.freshness.status]
      : a.freshness.daysSince - b.freshness.daysSince,
  );

  const total = items.length;
  const offset = decodeCursor(filter.cursor);
  const paged = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const hasMore = nextOffset < total;
  return { items: paged, total, hasMore, nextCursor: hasMore ? encodeCursor(nextOffset) : null };
}

export function getListing(listingId: string, now: Date = new Date()) {
  const l = listings.find((x) => x.listingId === listingId);
  if (!l) return null;
  const agent = findUserByUid(l.agentId);
  return {
    listing: serializeListing(l, now),
    agent: agent
      ? { uid: agent.uid, displayName: agent.displayName, phone: agent.phone }
      : { uid: l.agentId, displayName: 'Estate Ease Agent' },
  };
}

/**
 * Similar listings: same category + city, exclude draft/removed/self, freshness order.
 * Bounded to `limit` (default 6) for detail-rail use.
 */
export function listSimilarListings(listingId: string, limit = 6, now: Date = new Date()) {
  const source = rawListing(listingId);
  if (!source || source.status === 'removed' || source.status === 'draft') {
    return { ok: false as const, reason: 'not_found' as const };
  }
  const page = listListings({
    category: source.categoryId,
    city: source.location.city,
    excludeId: listingId,
    includeStale: true,
    freshness: ['fresh', 'aging', 'stale'],
    limit,
    now,
  });
  return { ok: true as const, items: page.items, total: page.total };
}

function rawListing(listingId: string): StoredListing | undefined {
  return listings.find((x) => x.listingId === listingId);
}

// ---- View counting (write) ----
/**
 * Record a listing view. A view is only counted once per viewer per
 * VIEW_DEDUP_WINDOW_MS (24h) to avoid inflated counts (Docs §3.4). Returns the
 * current count and whether this call incremented it.
 */
export function recordView(listingId: string, viewerUid: string, now: Date = new Date()) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  const last = l.viewers.get(viewerUid);
  const nowMs = now.getTime();
  const counted = last == null || nowMs - last >= VIEW_DEDUP_WINDOW_MS;
  if (counted) {
    l.viewCount += 1;
    l.viewers.set(viewerUid, nowMs);
  }
  return { ok: true as const, viewCount: l.viewCount, counted };
}

// ---- Trust actions (writes) ----
export function verifyListing(listingId: string, agentUid: string, now: Date = new Date()) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  if (l.agentId !== agentUid) return { ok: false as const, reason: 'forbidden' as const };
  l.lastVerifiedAt = now;
  l.reporters.clear();
  return { ok: true as const, freshness: serializeListing(l, now).freshness };
}

export function reportListing(
  listingId: string,
  reporterUid: string,
  reporterRole: 'seeker' | 'agent',
) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  if (reporterRole !== 'seeker') return { ok: false as const, reason: 'forbidden' as const };
  if (l.agentId === reporterUid) return { ok: false as const, reason: 'own_listing' as const };
  if (l.status !== 'active') return { ok: false as const, reason: 'not_found' as const };

  const alreadyReported = l.reporters.has(reporterUid);
  l.reporters.add(reporterUid); // idempotent per reporter
  return {
    ok: true as const,
    unavailableReports: l.reporters.size,
    alreadyReported,
  };
}

/** Whether this seeker has already reported the listing (no reporter identities leaked). */
export function hasReported(listingId: string, reporterUid: string) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  return { ok: true as const, reported: l.reporters.has(reporterUid) };
}

// ---- Favorites ----
export function listFavorites(uid: string, now: Date = new Date()) {
  const ids = favorites.get(uid) ?? new Set<string>();
  return [...ids]
    .map((id) => listings.find((l) => l.listingId === id))
    .filter((l): l is StoredListing => Boolean(l))
    .map((l) => serializeListing(l, now));
}

export function addFavorite(uid: string, listingId: string) {
  if (!rawListing(listingId)) return { ok: false as const };
  const set = favorites.get(uid) ?? new Set<string>();
  set.add(listingId);
  favorites.set(uid, set);
  return { ok: true as const };
}

export function removeFavorite(uid: string, listingId: string) {
  favorites.get(uid)?.delete(listingId);
  return { ok: true as const };
}

export function isFavorite(uid: string, listingId: string) {
  return favorites.get(uid)?.has(listingId) ?? false;
}

// ---- Agent listing mutations ----

export interface CreateListingInput {
  agentId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls: string[];
  location: { lat: number; lng: number; address: string; city: string; area: string };
  locationTags?: string[];
  cost: CostInput;
  status?: 'draft' | 'active';
}

let listingCounter = listings.length + 1;

export function createListing(input: CreateListingInput, now: Date = new Date()) {
  const listingId = `lst-${String(listingCounter++).padStart(3, '0')}`;
  const l: StoredListing = {
    listingId,
    agentId: input.agentId,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    price: input.price,
    priceType: input.priceType,
    area: input.area,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    imageUrls: input.imageUrls,
    location: input.location,
    locationTags: input.locationTags ?? [],
    geohash: encodeGeohash(input.location.lat, input.location.lng),
    status: input.status ?? 'active',
    viewCount: 0,
    lastVerifiedAt: now,
    cost: input.cost,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    reporters: new Set(),
    viewers: new Map(),
  };
  listings.push(l);
  const serialized = serializeListing(l, now);
  if (l.status === 'active') {
    queueSavedSearchNotifications(serialized);
  }
  return { ok: true as const, listing: serialized };
}

export interface UpdateListingInput {
  categoryId?: string;
  title?: string;
  description?: string;
  price?: number;
  priceType?: PriceType;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls?: string[];
  location?: { lat: number; lng: number; address: string; city: string; area: string };
  locationTags?: string[];
  cost?: CostInput;
  status?: ListingStatus;
}

export function updateListing(
  listingId: string,
  agentUid: string,
  input: UpdateListingInput,
  now: Date = new Date(),
) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  if (l.agentId !== agentUid) return { ok: false as const, reason: 'forbidden' as const };
  if (l.status === 'removed') return { ok: false as const, reason: 'not_found' as const };

  if (input.categoryId !== undefined) l.categoryId = input.categoryId;
  if (input.title !== undefined) l.title = input.title;
  if (input.description !== undefined) l.description = input.description;
  if (input.price !== undefined) l.price = input.price;
  if (input.priceType !== undefined) l.priceType = input.priceType;
  if (input.area !== undefined) l.area = input.area;
  if (input.bedrooms !== undefined) l.bedrooms = input.bedrooms;
  if (input.bathrooms !== undefined) l.bathrooms = input.bathrooms;
  if (input.imageUrls !== undefined) l.imageUrls = input.imageUrls;
  if (input.location !== undefined) {
    l.location = input.location;
    l.geohash = encodeGeohash(input.location.lat, input.location.lng);
  }
  if (input.locationTags !== undefined) l.locationTags = input.locationTags;
  if (input.cost !== undefined) l.cost = input.cost;
  if (input.status !== undefined && input.status !== 'removed') l.status = input.status;
  l.updatedAt = now.toISOString();

  return { ok: true as const, listing: serializeListing(l, now) };
}

export function deleteListing(listingId: string, agentUid: string, now: Date = new Date()) {
  const l = rawListing(listingId);
  if (!l) return { ok: false as const, reason: 'not_found' as const };
  if (l.agentId !== agentUid) return { ok: false as const, reason: 'forbidden' as const };
  l.status = 'removed';
  l.updatedAt = now.toISOString();
  return { ok: true as const };
}

export function listAgentListings(agentUid: string, now: Date = new Date()) {
  return listings
    .filter((l) => l.agentId === agentUid)
    .map((l) => serializeListing(l, now));
}

/**
 * Restore demo inventory to the seeded snapshot: listing status/freshness/reports,
 * favorites emptied, runtime-created listings removed. Used by `npm run reset`.
 */
export function resetDemoState() {
  const seedIds = new Set(SEEDS.map((s) => s.id));
  for (let i = listings.length - 1; i >= 0; i -= 1) {
    if (!seedIds.has(listings[i].listingId)) listings.splice(i, 1);
  }

  for (const seed of SEEDS) {
    const l = listings.find((x) => x.listingId === seed.id);
    if (!l) continue;
    l.status = seed.status ?? 'active';
    l.lastVerifiedAt = daysAgo(seed.daysSince);
    l.viewCount = seed.views;
    l.reporters = new Set(seed.reporters ?? []);
    l.viewers = new Map();
    l.title = seed.title;
    l.description = seed.description;
    l.price = seed.price;
    l.imageUrls = [IMG(seed.image)];
    l.updatedAt = NOW.toISOString();
  }

  listingCounter = listings.length + 1;
  favorites.clear();
  favorites.set('seeker-ayesha', new Set());

  return {
    listings: listings.length,
    reportsCleared: true,
    favoritesReset: true,
  };
}

// ---- Public agent profile (Phase 8) ----

export function getPublicAgentProfile(agentUid: string, now: Date = new Date()) {
  const user = findUserByUid(agentUid);
  if (!user || user.role !== 'agent') return null;

  const activeListings = listings
    .filter((l) => l.agentId === agentUid && l.status === 'active')
    .map((l) => serializeListing(l, now))
    .sort((a, b) => {
      const r = { fresh: 0, aging: 1, stale: 2 } as const;
      return r[a.freshness.status] - r[b.freshness.status];
    });

  return {
    agent: {
      uid: user.uid,
      displayName: user.displayName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
    stats: {
      activeListingCount: activeListings.length,
      freshCount: activeListings.filter((l) => l.freshness.status === 'fresh').length,
    },
    listings: activeListings,
  };
}

// ---- Notifications & saved searches (Phase 8) ----

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: false,
  savedSearchAlerts: false,
};

export function getNotificationPreferences(uid: string): NotificationPreferences {
  return notificationPrefs.get(uid) ?? { ...DEFAULT_PREFS };
}

export function updateNotificationPreferences(
  uid: string,
  patch: NotificationPreferences,
): NotificationPreferences {
  const next = { ...getNotificationPreferences(uid), ...patch };
  notificationPrefs.set(uid, next);
  return next;
}

export function registerPushToken(uid: string, token: string, platform: string) {
  pushTokens.set(uid, { token, platform, updatedAt: new Date().toISOString() });
}

export function deletePushToken(uid: string) {
  pushTokens.delete(uid);
}

export function listSavedSearches(uid: string): SavedSearchRecord[] {
  return [...(savedSearches.get(uid) ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveSavedSearch(
  uid: string,
  input: {
    label: string;
    query: SavedSearchRecord['query'];
    notifyOnNewListings?: boolean;
  },
): SavedSearchRecord {
  const record: SavedSearchRecord = {
    id: `ss-${savedSearchCounter++}`,
    uid,
    label: input.label.trim(),
    query: input.query,
    notifyOnNewListings: input.notifyOnNewListings ?? true,
    createdAt: new Date().toISOString(),
  };
  const list = savedSearches.get(uid) ?? [];
  list.push(record);
  savedSearches.set(uid, list);
  return record;
}

export function deleteSavedSearch(uid: string, searchId: string): boolean {
  const list = savedSearches.get(uid);
  if (!list) return false;
  const next = list.filter((s) => s.id !== searchId);
  if (next.length === list.length) return false;
  savedSearches.set(uid, next);
  return true;
}

/** Fire-and-forget mock push for matching saved searches; never throws. */
function queueSavedSearchNotifications(listing: SerializedListing) {
  setImmediate(() => {
    try {
      for (const [uid, searches] of savedSearches.entries()) {
        const prefs = getNotificationPreferences(uid);
        const token = pushTokens.get(uid)?.token;
        for (const search of searches) {
          if (!listingMatchesSavedSearch(listing, search.query)) continue;
          dispatchSavedSearchAlert({ uid, token, prefs, search, listing });
        }
      }
    } catch {
      // Notification failures must not affect listing creation.
    }
  });
}
