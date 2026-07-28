import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { Errors } from '@/utils/errors';
import {
  getListing,
  listCategories,
  listListings,
  listSimilarListings,
  recordView,
} from '@/services/store';

const router = Router();

/**
 * READS + the view-count write. In live mode the client reads listings directly
 * from Firestore; these endpoints exist for parity, server-side search, and
 * non-Firestore consumers.
 */

const FRESHNESS = ['fresh', 'aging', 'stale'] as const;

const listQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  city: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean) : undefined)),
  fresh: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
      const invalid = parts.filter((p) => !FRESHNESS.includes(p as (typeof FRESHNESS)[number]));
      if (invalid.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `invalid freshness: ${invalid.join(',')}`,
        });
        return z.NEVER;
      }
      return parts as Array<(typeof FRESHNESS)[number]>;
    }),
  includeStale: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  minBedrooms: z.coerce.number().int().nonnegative().optional(),
  minArea: z.coerce.number().nonnegative().optional(),
  maxArea: z.coerce.number().nonnegative().optional(),
  minLat: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
  minLng: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
  centerLat: z.coerce.number().optional(),
  centerLng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().max(50).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().optional(),
});

router.get('/categories', (_req: Request, res: Response) => {
  res.json({ success: true, categories: listCategories() });
});

router.get('/', validate(listQuerySchema, 'query'), (req: Request, res: Response) => {
  const q = req.query as unknown as {
    category?: string;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    tags?: string[];
    fresh?: Array<'fresh' | 'aging' | 'stale'>;
    includeStale?: boolean;
    bedrooms?: number;
    minBedrooms?: number;
    minArea?: number;
    maxArea?: number;
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    centerLat?: number;
    centerLng?: number;
    radiusKm?: number;
    limit?: number;
    cursor?: string;
  };
  const page = listListings({
    category: q.category,
    q: q.q,
    minPrice: q.minPrice,
    maxPrice: q.maxPrice,
    city: q.city,
    tags: q.tags,
    freshness: q.fresh,
    includeStale: q.includeStale,
    bedrooms: q.bedrooms,
    minBedrooms: q.minBedrooms,
    minArea: q.minArea,
    maxArea: q.maxArea,
    minLat: q.minLat,
    maxLat: q.maxLat,
    minLng: q.minLng,
    maxLng: q.maxLng,
    centerLat: q.centerLat,
    centerLng: q.centerLng,
    radiusKm: q.radiusKm,
    limit: q.limit,
    cursor: q.cursor,
  });
  res.json({
    success: true,
    items: page.items,
    total: page.total,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  });
});

/** Similar listings rail — must be registered before `/:id`. */
router.get('/:id/similar', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const result = listSimilarListings(req.params.id, limit);
  if (!result.ok) throw Errors.notFound('This listing could not be found.');
  res.json({ success: true, items: result.items, total: result.total });
});

router.get('/:id', (req: Request, res: Response) => {
  const result = getListing(req.params.id);
  if (!result) throw Errors.notFound('This listing could not be found.');
  res.json({ success: true, ...result });
});

router.post('/:id/view', authenticate, (req: Request, res: Response) => {
  const result = recordView(req.params.id, req.user!.uid);
  if (!result.ok) throw Errors.notFound('This listing could not be found.');
  res.json({ success: true, viewCount: result.viewCount, counted: result.counted });
});

export default router;
