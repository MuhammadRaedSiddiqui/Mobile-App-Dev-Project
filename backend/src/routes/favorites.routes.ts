import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '@/middleware/auth';
import { Errors } from '@/utils/errors';
import { addFavorite, isFavorite, listFavorites, removeFavorite } from '@/services/store';

const router = Router();

// Favorites are seeker-owned; agents cannot mutate another role's saved set.
router.use(authenticate, requireRole('seeker'));

router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, listings: listFavorites(req.user!.uid) });
});

router.get('/check/:id', (req: Request, res: Response) => {
  res.json({ success: true, isSaved: isFavorite(req.user!.uid, req.params.id) });
});

router.post('/:id', (req: Request, res: Response) => {
  const result = addFavorite(req.user!.uid, req.params.id);
  if (!result.ok) throw Errors.notFound('This listing could not be found.');
  res.status(201).json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  removeFavorite(req.user!.uid, req.params.id);
  res.json({ success: true });
});

export default router;
