import { Request, Response, Router, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { Errors, AppError } from '@/utils/errors';
import {
  createListing,
  deleteListing,
  listAgentListings,
  updateListing,
} from '@/services/store';
import { validateListingInput, KARACHI_BOUNDS } from '@/services/validation';
import {
  IMAGE_LIMITS,
  storeListingImages,
  validateImageBuffers,
} from '@/services/upload';
import { uploadLimiter } from '@/middleware/rateLimit';

const router = Router();
router.use(authenticate, requireRole('agent'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_LIMITS.maxBytes,
    files: IMAGE_LIMITS.maxFiles,
  },
});

/** Map multer failures onto the standard AppError envelope. */
function runUpload(req: Request, res: Response, next: NextFunction): void {
  upload.array('images', IMAGE_LIMITS.maxFiles)(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          Errors.validation(
            `Each image must be ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB or smaller.`,
          ),
        );
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          Errors.validation(`No more than ${IMAGE_LIMITS.maxFiles} images can be uploaded at once.`),
        );
      }
      return next(Errors.validation(err.message));
    }
    return next(err instanceof Error ? err : Errors.validation('Upload failed.'));
  });
}

const locationSchema = z.object({
  lat: z.number().min(KARACHI_BOUNDS.minLat).max(KARACHI_BOUNDS.maxLat),
  lng: z.number().min(KARACHI_BOUNDS.minLng).max(KARACHI_BOUNDS.maxLng),
  address: z.string().min(1),
  city: z.string().min(1),
  area: z.string().min(1),
});

const costSchema = z.object({
  rent: z.number().nonnegative(),
  depositMonths: z.number().nonnegative(),
  monthlyMaintenance: z.number().nonnegative(),
  estimatedUtilities: z.number().nonnegative(),
});

const createSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(''),
  price: z.number().nonnegative(),
  priceType: z.enum(['monthly', 'yearly']),
  area: z.number().positive(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(10),
  location: locationSchema,
  locationTags: z.array(z.string()).optional().default([]),
  cost: costSchema,
  /** Internal statuses offered to agents; residential rental only. */
  status: z.enum(['draft', 'active']).optional().default('active'),
});

const updateSchema = createSchema
  .partial()
  .extend({
    status: z.enum(['draft', 'active', 'rented', 'removed']).optional(),
  });

/** GET /v1/agent/listings — agent's own listings (all statuses). */
router.get('/listings', (req: Request, res: Response) => {
  const items = listAgentListings(req.user!.uid);
  res.json({ success: true, items, total: items.length });
});

/**
 * POST /v1/agent/listings/images — multipart image upload.
 * Field name: `images` (1–10 files). MIME sniffed from magic bytes.
 */
router.post(
  '/listings/images',
  uploadLimiter,
  runUpload,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const validated = validateImageBuffers(
      files.map((f) => ({ buffer: f.buffer, originalname: f.originalname })),
    );
    const urls = await storeListingImages(req.user!.uid, validated);
    res.status(201).json({ success: true, urls });
  } catch (err) {
    next(err instanceof AppError ? err : err);
  }
});

/** POST /v1/agent/listings — create a new listing. */
router.post('/listings', validate(createSchema), (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createSchema>;

  const check = validateListingInput({
    title: body.title,
    description: body.description,
    price: body.price,
    priceType: body.priceType,
    imageUrls: body.imageUrls,
    location: body.location,
    cost: body.cost,
  });
  if (!check.valid) throw Errors.validation(check.errors.join(' '));

  const result = createListing({ ...body, agentId: req.user!.uid, status: body.status });
  res.status(201).json({ success: true, listing: result.listing });
});

/** PUT /v1/agent/listings/:id — update own listing. */
router.put('/listings/:id', validate(updateSchema), (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof updateSchema>;
  const result = updateListing(req.params.id, req.user!.uid, body);
  if (!result.ok) {
    if (result.reason === 'forbidden') throw Errors.forbidden('You can only edit your own listings.');
    throw Errors.notFound('This listing could not be found.');
  }
  res.json({ success: true, listing: result.listing });
});

/** DELETE /v1/agent/listings/:id — soft-delete own listing. */
router.delete('/listings/:id', (req: Request, res: Response) => {
  const result = deleteListing(req.params.id, req.user!.uid);
  if (!result.ok) {
    if (result.reason === 'forbidden') throw Errors.forbidden('You can only delete your own listings.');
    throw Errors.notFound('This listing could not be found.');
  }
  res.json({ success: true });
});

export default router;
