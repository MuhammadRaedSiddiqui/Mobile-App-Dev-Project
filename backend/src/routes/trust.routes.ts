import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth';
import { Errors } from '@/utils/errors';
import { reportLimiter } from '@/middleware/rateLimit';
import { hasReported, reportListing, verifyListing } from '@/services/store';

const router = Router();

/** Agent-owner re-verify. Resets freshness to now and clears reports. */
router.post('/:id/verify', authenticate, requireRole('agent'), (req: Request, res: Response) => {
  const result = verifyListing(req.params.id, req.user!.uid);
  if (!result.ok) {
    if (result.reason === 'not_found') throw Errors.notFound('This listing could not be found.');
    throw Errors.forbidden('You can only re-verify your own listings.');
  }
  res.json({ success: true, freshness: result.freshness });
});

/**
 * Seeker report-as-unavailable. Idempotent per reporter; agents and owners are
 * rejected. Does not expose other reporters' identities.
 */
router.post('/:id/report', authenticate, reportLimiter, (req: Request, res: Response) => {
  const result = reportListing(req.params.id, req.user!.uid, req.user!.role);
  if (!result.ok) {
    if (result.reason === 'forbidden') {
      throw Errors.forbidden('Only seekers can report a listing as unavailable.');
    }
    if (result.reason === 'own_listing') {
      throw Errors.forbidden('You can’t report your own listing.');
    }
    throw Errors.notFound('This listing could not be found.');
  }
  res.json({
    success: true,
    unavailableReports: result.unavailableReports,
    alreadyReported: result.alreadyReported,
  });
});

/** Soft check — has the current seeker already reported this listing? */
router.get('/:id/reported', authenticate, (req: Request, res: Response) => {
  if (req.user!.role !== 'seeker') {
    res.json({ success: true, reported: false });
    return;
  }
  const result = hasReported(req.params.id, req.user!.uid);
  if (!result.ok) throw Errors.notFound('This listing could not be found.');
  res.json({ success: true, reported: result.reported });
});

export default router;
