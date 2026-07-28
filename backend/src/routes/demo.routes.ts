import { Request, Response, Router } from 'express';
import { config } from '@/config/env';
import { Errors } from '@/utils/errors';
import { resetDemoState } from '@/services/store';

const router = Router();

/**
 * POST /v1/demo/reset — restore seeded listings, reports, and favorites.
 * Mock mode only. Used before demo rehearsals so walkthroughs start clean.
 */
router.post('/reset', (_req: Request, res: Response) => {
  if (!config.mockMode) {
    throw Errors.forbidden('Demo reset is only available when MOCK_MODE=true.');
  }
  const result = resetDemoState();
  res.json({ success: true, ...result });
});

export default router;
