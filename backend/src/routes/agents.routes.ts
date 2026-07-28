import { Request, Response, Router } from 'express';
import { Errors } from '@/utils/errors';
import { getPublicAgentProfile } from '@/services/store';

const router = Router();

/** Public agent page — active listings only, no drafts or PII beyond profile fields. */
router.get('/:uid', (req: Request, res: Response) => {
  const result = getPublicAgentProfile(req.params.uid);
  if (!result) throw Errors.notFound('This agent could not be found.');
  res.json({ success: true, ...result });
});

export default router;
