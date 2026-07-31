import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { Errors } from '@/utils/errors';
import {
  createMessage,
  findUserByUid,
  getListing,
  getMessageThread,
  hasMessageThread,
  listMessageThreads,
  markThreadRead,
} from '@/services/store';

const router = Router();

router.use(authenticate);

const sendSchema = z.object({
  listingId: z.string().min(1),
  text: z.string().min(1).max(2000),
  seekerUid: z.string().min(1).optional(),
});

router.post('/', validate(sendSchema), (req: Request, res: Response) => {
  const { listingId, text } = req.body;
  const user = req.user!;

  const detail = getListing(listingId);
  if (!detail) throw Errors.notFound('Listing not found.');

  let fromUid: string;
  let toUid: string;

  if (user.role === 'seeker') {
    fromUid = user.uid;
    toUid = detail.agent.uid;
  } else if (user.role === 'agent') {
    if (detail.listing.agentId !== user.uid) {
      throw Errors.forbidden('You can only reply on your own listings.');
    }
    fromUid = user.uid;
    // Agent replying — need to know which seeker. Accept seekerUid in body for replies.
    const seekerUid = req.body.seekerUid;
    if (!seekerUid) throw Errors.validation('seekerUid is required for agent replies.');
    const seeker = findUserByUid(seekerUid);
    if (!seeker || seeker.role !== 'seeker') throw Errors.notFound('Seeker not found.');
    if (!hasMessageThread(listingId, seekerUid, user.uid)) {
      throw Errors.forbidden('You can only reply to seekers who contacted you about this listing.');
    }
    toUid = seekerUid;
  } else {
    throw Errors.forbidden();
  }

  const message = createMessage({ listingId, fromUid, toUid, text });
  res.status(201).json({ success: true, message });
});

router.get('/', (req: Request, res: Response) => {
  const threads = listMessageThreads(req.user!.uid);
  res.json({ success: true, threads });
});

router.get('/:threadId', (req: Request, res: Response) => {
  const msgs = getMessageThread(req.params.threadId, req.user!.uid);
  if (!msgs) throw Errors.notFound('Thread not found.');
  res.json({ success: true, messages: msgs });
});

router.put('/:threadId/read', (req: Request, res: Response) => {
  const ok = markThreadRead(req.params.threadId, req.user!.uid);
  if (!ok) throw Errors.notFound('Thread not found.');
  res.json({ success: true });
});

export default router;
