import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { Errors } from '@/utils/errors';
import {
  deletePushToken,
  deleteSavedSearch,
  getNotificationPreferences,
  listSavedSearches,
  registerPushToken,
  saveSavedSearch,
  updateNotificationPreferences,
} from '@/services/store';

const router = Router();

router.use(authenticate);
router.use(requireRole('seeker'));

const pushTokenSchema = z.object({
  token: z.string().min(8).max(512),
  platform: z.enum(['ios', 'android', 'web']).optional().default('android'),
});

router.post('/push-token', validate(pushTokenSchema), (req: Request, res: Response) => {
  registerPushToken(req.user!.uid, req.body.token, req.body.platform);
  res.status(201).json({ success: true });
});

router.delete('/push-token', (req: Request, res: Response) => {
  deletePushToken(req.user!.uid);
  res.json({ success: true });
});

const prefsSchema = z.object({
  pushEnabled: z.boolean(),
  savedSearchAlerts: z.boolean(),
});

router.get('/preferences', (req: Request, res: Response) => {
  res.json({ success: true, preferences: getNotificationPreferences(req.user!.uid) });
});

router.put('/preferences', validate(prefsSchema), (req: Request, res: Response) => {
  const preferences = updateNotificationPreferences(req.user!.uid, req.body);
  res.json({ success: true, preferences });
});

const savedSearchSchema = z.object({
  label: z.string().min(1).max(80),
  notifyOnNewListings: z.boolean().optional().default(true),
  query: z
    .object({
      q: z.string().optional(),
      minPrice: z.number().nonnegative().optional(),
      maxPrice: z.number().nonnegative().optional(),
      city: z.string().optional(),
      tags: z.array(z.string()).optional(),
      fresh: z.array(z.enum(['fresh', 'aging', 'stale'])).optional(),
      bedrooms: z.number().int().nonnegative().optional(),
      minBedrooms: z.number().int().nonnegative().optional(),
      minArea: z.number().nonnegative().optional(),
      maxArea: z.number().nonnegative().optional(),
      category: z.string().optional(),
    })
    .default({}),
});

router.get('/saved-searches', (req: Request, res: Response) => {
  res.json({ success: true, items: listSavedSearches(req.user!.uid) });
});

router.post('/saved-searches', validate(savedSearchSchema), (req: Request, res: Response) => {
  const saved = saveSavedSearch(req.user!.uid, req.body);
  res.status(201).json({ success: true, savedSearch: saved });
});

router.delete('/saved-searches/:id', (req: Request, res: Response) => {
  const ok = deleteSavedSearch(req.user!.uid, req.params.id);
  if (!ok) throw Errors.notFound('Saved search not found.');
  res.json({ success: true });
});

export default router;
