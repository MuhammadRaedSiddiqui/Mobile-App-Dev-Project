import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

async function loginAs(email: string): Promise<string> {
  const res = await request(app).post('/v1/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('Estate Ease API (mock mode)', () => {
  it('reports health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'ok', mockMode: true });
  });

  describe('auth', () => {
    it('logs in a seeded seeker', async () => {
      const res = await request(app).post('/v1/auth/login').send({
        email: 'ayesha@example.com',
        password: 'password123',
      });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ role: 'seeker', email: 'ayesha@example.com' });
      expect(res.body.token).toMatch(/^mock-token-/);
    });

    it('rejects bad credentials with a friendly code', async () => {
      const res = await request(app).post('/v1/auth/login').send({
        email: 'ayesha@example.com',
        password: 'wrong',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('validates the register payload', async () => {
      const res = await request(app).post('/v1/auth/register').send({ email: 'x', password: '1' });
      expect(res.status).toBe(422);
    });

    it('updates the authenticated user profile', async () => {
      const token = await loginAs('ayesha@example.com');
      const res = await request(app)
        .put('/v1/auth/profile')
        .set({ Authorization: `Bearer ${token}` })
        .send({ displayName: 'Ayesha K.' });
      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Ayesha K.');

      const me = await request(app).get('/v1/auth/me').set({ Authorization: `Bearer ${token}` });
      expect(me.body.user.displayName).toBe('Ayesha K.');
    });

    it('rejects unauthenticated profile updates', async () => {
      const res = await request(app).put('/v1/auth/profile').send({ displayName: 'Nope' });
      expect(res.status).toBe(401);
    });
  });

  describe('demo reset', () => {
    it('restores seeded listing/report state in mock mode', async () => {
      const token = await loginAs('ayesha@example.com');
      await request(app).post('/v1/listings/lst-001/report').set({ Authorization: `Bearer ${token}` });

      const reset = await request(app).post('/v1/demo/reset');
      expect(reset.status).toBe(200);
      expect(reset.body.success).toBe(true);
      expect(reset.body.listings).toBeGreaterThanOrEqual(14);

      // After reset, ayesha's prior report on lst-001 is cleared (seed has no report on lst-001).
      const reported = await request(app)
        .get('/v1/listings/lst-001/reported')
        .set({ Authorization: `Bearer ${token}` });
      expect(reported.body.reported).toBe(false);
    });
  });

  describe('listings (reads)', () => {
    it('excludes stale listings by default and sorts fresh-first', async () => {
      const res = await request(app).get('/v1/listings');
      expect(res.status).toBe(200);
      const ids = res.body.items.map((l: { listingId: string }) => l.listingId);
      expect(ids).toContain('lst-001');
      expect(ids).not.toContain('lst-006'); // 17 days => stale, hidden by default
      expect(res.body.items[0].freshness.status).toBe('fresh');
    });

    it('includes stale listings when explicitly requested', async () => {
      const res = await request(app)
        .get('/v1/listings')
        .query({ includeStale: 'true', limit: 50 });
      const ids = res.body.items.map((l: { listingId: string }) => l.listingId);
      expect(ids).toContain('lst-006');
    });

    it('hides a listing suppressed by the report threshold', async () => {
      const res = await request(app).get('/v1/listings').query({ limit: 50 });
      const ids = res.body.items.map((l: { listingId: string }) => l.listingId);
      expect(ids).not.toContain('lst-013'); // seeded with 3 reports (>= threshold)
    });

    it('paginates with an opaque cursor, ten per page, no overlap', async () => {
      const first = await request(app).get('/v1/listings');
      expect(first.body.items).toHaveLength(10);
      expect(first.body.hasMore).toBe(true);
      expect(first.body.nextCursor).toBeTruthy();

      const second = await request(app)
        .get('/v1/listings')
        .query({ cursor: first.body.nextCursor });
      const firstIds = new Set(first.body.items.map((l: { listingId: string }) => l.listingId));
      const secondIds = second.body.items.map((l: { listingId: string }) => l.listingId);
      expect(secondIds.every((id: string) => !firstIds.has(id))).toBe(true);
      expect(first.body.total).toBe(second.body.total);
    });


    it('returns a detail with computed cost breakdown', async () => {
      const res = await request(app).get('/v1/listings/lst-001');
      expect(res.status).toBe(200);
      expect(res.body.listing.costBreakdown.estimatedMonthlyTotal).toBe(53333);
      expect(res.body.agent.displayName).toBe('Danish Ahmed');
    });

    it('404s an unknown listing', async () => {
      const res = await request(app).get('/v1/listings/nope');
      expect(res.status).toBe(404);
    });

    it('returns similar listings in the same category and city, excluding self', async () => {
      const res = await request(app).get('/v1/listings/lst-001/similar').query({ limit: 6 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const similarIds = res.body.items.map((l: { listingId: string }) => l.listingId);
      expect(similarIds).not.toContain('lst-001');
      expect(
        res.body.items.every(
          (l: { categoryId: string; location: { city: string } }) =>
            l.categoryId === 'one-bed' && l.location.city.toLowerCase() === 'karachi',
        ),
      ).toBe(true);
    });
    it('returns 404 for similar on an unknown listing', async () => {
      const res = await request(app).get('/v1/listings/nope/similar');
      expect(res.status).toBe(404);
    });
  });

  describe('listings (search & filters)', () => {
    const ids = (res: { body: { items: Array<{ listingId: string }> } }) =>
      res.body.items.map((l) => l.listingId);

    it('filters by a price range', async () => {
      const res = await request(app).get('/v1/listings').query({ maxPrice: 20000, limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.items.every((l: { price: number }) => l.price <= 20000)).toBe(true);
      expect(ids(res)).toContain('lst-004'); // 18000
      expect(ids(res)).not.toContain('lst-003'); // 55000
    });

    it('filters by minPrice and maxPrice together', async () => {
      const res = await request(app)
        .get('/v1/listings')
        .query({ minPrice: 40000, maxPrice: 60000, limit: 50 });
      expect(
        res.body.items.every((l: { price: number }) => l.price >= 40000 && l.price <= 60000),
      ).toBe(true);
    });

    it('filters by city (case-insensitive) and returns empty for an unknown city', async () => {
      const karachi = await request(app).get('/v1/listings').query({ city: 'karachi', limit: 50 });
      expect(karachi.body.total).toBeGreaterThan(0);
      const lahore = await request(app).get('/v1/listings').query({ city: 'Lahore', limit: 50 });
      expect(lahore.body.total).toBe(0);
      expect(lahore.body.items).toHaveLength(0);
    });

    it('filters by a location tag (any-match)', async () => {
      const res = await request(app).get('/v1/listings').query({ tags: 'beach', limit: 50 });
      expect(ids(res)).toContain('lst-008');
      expect(ids(res)).not.toContain('lst-001');
    });

    it('surfaces only stale listings for an explicit freshness filter', async () => {
      const res = await request(app).get('/v1/listings').query({ fresh: 'stale', limit: 50 });
      expect(ids(res)).toContain('lst-006');
      expect(res.body.items.every((l: { freshness: { status: string } }) => l.freshness.status === 'stale')).toBe(
        true,
      );
    });

    it('filters by exact bedrooms', async () => {
      const res = await request(app).get('/v1/listings').query({ bedrooms: 2, limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.items.every((l: { bedrooms?: number }) => l.bedrooms === 2)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('filters by minBedrooms (3+)', async () => {
      const res = await request(app).get('/v1/listings').query({ minBedrooms: 3, limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.items.every((l: { bedrooms?: number }) => (l.bedrooms ?? 0) >= 3)).toBe(true);
    });

    it('filters by area range', async () => {
      const res = await request(app)
        .get('/v1/listings')
        .query({ minArea: 600, maxArea: 800, limit: 50 });
      expect(res.status).toBe(200);
      expect(
        res.body.items.every((l: { area: number }) => l.area >= 600 && l.area <= 800),
      ).toBe(true);
    });

    it('returns empty when bedroom filter matches nothing', async () => {
      const res = await request(app).get('/v1/listings').query({ bedrooms: 99, limit: 50 });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.items).toHaveLength(0);
    });

    it('rejects a non-numeric price filter', async () => {
      const res = await request(app).get('/v1/listings').query({ minPrice: 'cheap' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an unknown freshness value', async () => {
      const res = await request(app).get('/v1/listings').query({ fresh: 'ancient' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('favorites (writes, authed)', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/v1/favorites');
      expect(res.status).toBe(401);
    });

    it('adds, lists, and removes a favorite for the seeker', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };

      const add = await request(app).post('/v1/favorites/lst-001').set(auth);
      expect(add.status).toBe(201);

      const list = await request(app).get('/v1/favorites').set(auth);
      expect(list.body.listings.map((l: { listingId: string }) => l.listingId)).toContain('lst-001');

      const remove = await request(app).delete('/v1/favorites/lst-001').set(auth);
      expect(remove.status).toBe(200);
    });

    it('is idempotent — saving twice yields a single entry', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      await request(app).post('/v1/favorites/lst-005').set(auth);
      await request(app).post('/v1/favorites/lst-005').set(auth);
      const list = await request(app).get('/v1/favorites').set(auth);
      const count = list.body.listings.filter(
        (l: { listingId: string }) => l.listingId === 'lst-005',
      ).length;
      expect(count).toBe(1);
    });

    it('reflects saved state via the check endpoint', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      await request(app).post('/v1/favorites/lst-002').set(auth);
      const checkSaved = await request(app).get('/v1/favorites/check/lst-002').set(auth);
      expect(checkSaved.body.isSaved).toBe(true);
      await request(app).delete('/v1/favorites/lst-002').set(auth);
      const checkGone = await request(app).get('/v1/favorites/check/lst-002').set(auth);
      expect(checkGone.body.isSaved).toBe(false);
    });

    it('keeps a soft-deleted (removed) favorite, marked unavailable rather than dropped', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      // lst-014 is seeded as removed; it must remain referentially valid in favorites.
      const add = await request(app).post('/v1/favorites/lst-014').set(auth);
      expect(add.status).toBe(201);
      const list = await request(app).get('/v1/favorites').set(auth);
      const saved = list.body.listings.find((l: { listingId: string }) => l.listingId === 'lst-014');
      expect(saved).toBeDefined();
      expect(saved.status).toBe('removed');
      await request(app).delete('/v1/favorites/lst-014').set(auth);
    });

    it('404s when favoriting an unknown listing', async () => {
      const token = await loginAs('ayesha@example.com');
      const res = await request(app)
        .post('/v1/favorites/does-not-exist')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(404);
    });
  });

  describe('trust (writes)', () => {
    it('lets the owning agent re-verify and resets freshness to fresh', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/listings/lst-003/verify')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(200);
      expect(res.body.freshness.status).toBe('fresh');
      expect(res.body.freshness.daysSince).toBe(0);
    });

    it('forbids a seeker from verifying', async () => {
      const token = await loginAs('ayesha@example.com');
      const res = await request(app)
        .post('/v1/listings/lst-001/verify')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(403);
    });

    it('lets a seeker report a listing as unavailable (idempotent)', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      const first = await request(app).post('/v1/listings/lst-001/report').set(auth);
      const second = await request(app).post('/v1/listings/lst-001/report').set(auth);
      expect(first.status).toBe(200);
      expect(second.body.unavailableReports).toBe(first.body.unavailableReports); // same reporter
      expect(second.body.alreadyReported).toBe(true);
    });

    it('forbids an agent from reporting a listing', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/listings/lst-002/report')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(403);
    });
  });

  describe('viewport browse (map)', () => {
    it('filters listings to a latitude/longitude band', async () => {
      // Clifton / DHA band should include lst-008 (DHA ~24.80, 67.05) and exclude far Malir.
      const res = await request(app).get('/v1/listings').query({
        minLat: 24.78,
        maxLat: 24.82,
        minLng: 67.02,
        maxLng: 67.06,
        limit: 50,
      });
      expect(res.status).toBe(200);
      const ids = res.body.items.map((l: { listingId: string }) => l.listingId);
      expect(ids).toContain('lst-008');
      expect(ids).not.toContain('lst-012'); // Malir
    });
  });

  describe('view counting (authed write, deduped)', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/v1/listings/lst-002/view');
      expect(res.status).toBe(401);
    });

    it('counts a view once per viewer within the dedup window', async () => {
      const token = await loginAs('ayesha@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      const first = await request(app).post('/v1/listings/lst-002/view').set(auth);
      const second = await request(app).post('/v1/listings/lst-002/view').set(auth);
      expect(first.body.counted).toBe(true);
      expect(second.body.counted).toBe(false); // same viewer, still in window
      expect(second.body.viewCount).toBe(first.body.viewCount);
    });

    it('404s a view on an unknown listing', async () => {
      const token = await loginAs('ayesha@example.com');
      const res = await request(app)
        .post('/v1/listings/nope/view')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(404);
    });
  });

  describe('agent listing management (CRUD, authed + owned)', () => {
    const validListing = {
      categoryId: 'one-bed',
      title: 'New 1-Bed, Gulshan Block 4',
      description: 'A freshly listed 1-bed flat.',
      price: 40000,
      priceType: 'monthly',
      area: 680,
      bedrooms: 1,
      bathrooms: 1,
      imageUrls: ['https://images.unsplash.com/photo-1?auto=format'],
      location: {
        lat: 24.92,
        lng: 67.09,
        address: 'Block 4, Gulshan-e-Iqbal',
        city: 'Karachi',
        area: 'Gulshan-e-Iqbal',
      },
      locationTags: ['balcony'],
      cost: { rent: 40000, depositMonths: 2, monthlyMaintenance: 2500, estimatedUtilities: 6000 },
    };

    it('rejects an unauthenticated create', async () => {
      const res = await request(app).post('/v1/agent/listings').send(validListing);
      expect(res.status).toBe(401);
    });

    it('forbids a seeker from creating a listing', async () => {
      const token = await loginAs('ayesha@example.com');
      const res = await request(app)
        .post('/v1/agent/listings')
        .set({ Authorization: `Bearer ${token}` })
        .send(validListing);
      expect(res.status).toBe(403);
    });

    it('lets an agent create, list, edit, and soft-delete a listing', async () => {
      const token = await loginAs('danish@example.com');
      const auth = { Authorization: `Bearer ${token}` };

      const created = await request(app).post('/v1/agent/listings').set(auth).send(validListing);
      expect(created.status).toBe(201);
      const id = created.body.listing.listingId;
      expect(id).toMatch(/^lst-/);
      expect(created.body.listing.status).toBe('active');
      expect(created.body.listing.freshness.status).toBe('fresh'); // new = fresh
      expect(created.body.listing.viewCount).toBe(0);

      const mine = await request(app).get('/v1/agent/listings').set(auth);
      expect(mine.body.items.map((l: { listingId: string }) => l.listingId)).toContain(id);

      const edited = await request(app)
        .put(`/v1/agent/listings/${id}`)
        .set(auth)
        .send({ price: 44000 });
      expect(edited.status).toBe(200);
      expect(edited.body.listing.price).toBe(44000);

      const removed = await request(app).delete(`/v1/agent/listings/${id}`).set(auth);
      expect(removed.status).toBe(200);

      const detail = await request(app).get(`/v1/listings/${id}`);
      expect(detail.body.listing.status).toBe('removed');
    });

    it('rejects a create with an invalid (non-Karachi) location', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/agent/listings')
        .set({ Authorization: `Bearer ${token}` })
        .send({ ...validListing, location: { ...validListing.location, lat: 10, lng: 10 } });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a create with no images', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/agent/listings')
        .set({ Authorization: `Bearer ${token}` })
        .send({ ...validListing, imageUrls: [] });
      expect(res.status).toBe(422);
    });

    it('forbids editing another agent’s listing', async () => {
      const token = await loginAs('sara@example.com'); // lst-001 belongs to danish
      const res = await request(app)
        .put('/v1/agent/listings/lst-001')
        .set({ Authorization: `Bearer ${token}` })
        .send({ price: 1 });
      expect(res.status).toBe(403);
    });

    it('forbids deleting another agent’s listing', async () => {
      const token = await loginAs('sara@example.com');
      const res = await request(app)
        .delete('/v1/agent/listings/lst-001')
        .set({ Authorization: `Bearer ${token}` });
      expect(res.status).toBe(403);
    });

    it('404s editing a listing that does not exist', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .put('/v1/agent/listings/nope')
        .set({ Authorization: `Bearer ${token}` })
        .send({ price: 1 });
      expect(res.status).toBe(404);
    });

    it('creates a draft listing that stays out of public browse', async () => {
      const token = await loginAs('danish@example.com');
      const auth = { Authorization: `Bearer ${token}` };
      const created = await request(app)
        .post('/v1/agent/listings')
        .set(auth)
        .send({ ...validListing, title: 'Draft only flat', status: 'draft' });
      expect(created.status).toBe(201);
      expect(created.body.listing.status).toBe('draft');
      const id = created.body.listing.listingId;

      const publicList = await request(app).get('/v1/listings');
      const ids = publicList.body.items.map((l: { listingId: string }) => l.listingId);
      expect(ids).not.toContain(id);
    });
  });

  describe('agent image upload', () => {
    /** Minimal JPEG with a valid SOI marker for magic-byte sniffing. */
    const JPEG = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
      0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
      0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14,
      0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0xff, 0xd9,
    ]);

    it('rejects unauthenticated uploads', async () => {
      const res = await request(app)
        .post('/v1/agent/listings/images')
        .attach('images', JPEG, 'a.jpg');
      expect(res.status).toBe(401);
    });

    it('accepts a jpeg and returns a storage URL', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/agent/listings/images')
        .set({ Authorization: `Bearer ${token}` })
        .attach('images', JPEG, 'flat.jpg');
      expect(res.status).toBe(201);
      expect(res.body.urls).toHaveLength(1);
      expect(res.body.urls[0]).toMatch(/^https:\/\/cdn\.estateease\.local\/listings\/agent-danish\//);
      expect(res.body.urls[0]).toMatch(/\.jpeg$/);
    });

    it('rejects a spoofed non-image payload', async () => {
      const token = await loginAs('danish@example.com');
      const res = await request(app)
        .post('/v1/agent/listings/images')
        .set({ Authorization: `Bearer ${token}` })
        .attach('images', Buffer.from('hello-not-an-image'), 'fake.jpg');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Phase 8 — public agent profile', () => {
  it('returns an agent public profile with active listings only', async () => {
    const res = await request(app).get('/v1/agents/agent-danish');
    expect(res.status).toBe(200);
    expect(res.body.agent.displayName).toBe('Danish Ahmed');
    expect(res.body.stats.activeListingCount).toBeGreaterThan(0);
    expect(res.body.listings.every((l: { status: string }) => l.status === 'active')).toBe(true);
  });

  it('404s an unknown or non-agent uid', async () => {
    const res = await request(app).get('/v1/agents/nobody');
    expect(res.status).toBe(404);
    const seeker = await request(app).get('/v1/agents/seeker-ayesha');
    expect(seeker.status).toBe(404);
  });
});

describe('Phase 8 — radius search', () => {
  it('returns listings within a radius of a centre point', async () => {
    const res = await request(app).get('/v1/listings').query({
      centerLat: 24.9213,
      centerLng: 67.0871,
      radiusKm: 3,
      limit: 50,
    });
    expect(res.status).toBe(200);
    const ids = res.body.items.map((l: { listingId: string }) => l.listingId);
    expect(ids).toContain('lst-001');
    expect(ids).not.toContain('lst-008'); // DHA is far from Gulshan
  });
});

describe('Phase 8 — notifications & saved searches', () => {
  it('requires seeker auth for notification routes', async () => {
    const res = await request(app).get('/v1/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('registers push token, saves a search, and respects opt-out', async () => {
    const token = await loginAs('ayesha@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .post('/v1/notifications/push-token')
      .set(auth)
      .send({ token: 'mock-push-ayesha', platform: 'android' });
    expect((await request(app).get('/v1/notifications/preferences').set(auth)).body.preferences.pushEnabled).toBe(
      false,
    );

    const prefs = await request(app)
      .put('/v1/notifications/preferences')
      .set(auth)
      .send({ pushEnabled: true, savedSearchAlerts: true });
    expect(prefs.body.preferences.pushEnabled).toBe(true);

    const saved = await request(app)
      .post('/v1/notifications/saved-searches')
      .set(auth)
      .send({ label: 'Gulshan under 40k', query: { maxPrice: 40000, city: 'Karachi' } });
    expect(saved.status).toBe(201);

    const list = await request(app).get('/v1/notifications/saved-searches').set(auth);
    expect(list.body.items.some((s: { label: string }) => s.label === 'Gulshan under 40k')).toBe(true);

    await request(app).delete(`/v1/notifications/saved-searches/${saved.body.savedSearch.id}`).set(auth);
    const after = await request(app).get('/v1/notifications/saved-searches').set(auth);
    expect(after.body.items).toHaveLength(0);
  });

  it('forbids agents from notification endpoints', async () => {
    const token = await loginAs('danish@example.com');
    const res = await request(app)
      .get('/v1/notifications/preferences')
      .set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(403);
  });
});

describe('messages', () => {
  it('lets an agent reply to the seeker who opened a listing conversation', async () => {
    const seekerToken = await loginAs('ayesha@example.com');
    const agentToken = await loginAs('danish@example.com');

    const inquiry = await request(app)
      .post('/v1/messages')
      .set({ Authorization: `Bearer ${seekerToken}` })
      .send({ listingId: 'lst-001', text: 'Is this still available?' });
    expect(inquiry.status).toBe(201);

    const reply = await request(app)
      .post('/v1/messages')
      .set({ Authorization: `Bearer ${agentToken}` })
      .send({
        listingId: 'lst-001',
        seekerUid: 'seeker-ayesha',
        text: 'Yes, it is available.',
      });

    expect(reply.status).toBe(201);
    expect(reply.body.message).toMatchObject({
      fromUid: 'agent-danish',
      toUid: 'seeker-ayesha',
      threadId: inquiry.body.message.threadId,
    });
  });
});
