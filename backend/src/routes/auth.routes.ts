import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { config } from '@/config/env';
import { Errors } from '@/utils/errors';
import { authLimiter } from '@/middleware/rateLimit';
import {
  createUser,
  findUserByEmail,
  findUserByUid,
  mockTokenFor,
  publicUser,
  updateUserProfile,
} from '@/services/store';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
  role: z.enum(['seeker', 'agent']),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  phone: z.string().max(32).optional(),
  avatarUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
});

/**
 * NOTE: in live mode, Firebase Auth (client SDK) issues the ID token and this
 * endpoint would create the Firestore user profile / set custom claims. In mock
 * mode we mint a `mock-token-<uid>` so the client's Bearer flow works end-to-end.
 */
router.post('/register', authLimiter, validate(registerSchema), (req: Request, res: Response) => {
  if (!config.mockMode) throw Errors.validation('Registration runs through Firebase Auth in live mode.');
  const { email, password, displayName, role, phone } = req.body;
  if (findUserByEmail(email)) throw Errors.conflict('An account with this email already exists.');
  const user = createUser({
    email,
    password,
    displayName,
    role,
    phone: role === 'agent' ? phone : undefined,
  });
  res.status(201).json({ success: true, token: mockTokenFor(user.uid), user: publicUser(user) });
});

router.post('/login', authLimiter, validate(loginSchema), (req: Request, res: Response) => {
  if (!config.mockMode) throw Errors.validation('Login runs through Firebase Auth in live mode.');
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    throw Errors.invalidCredentials();
  }
  res.json({ success: true, token: mockTokenFor(user.uid), user: publicUser(user) });
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = findUserByUid(req.user!.uid);
  if (!user) throw Errors.notFound('User not found.');
  res.json({ success: true, user: publicUser(user) });
});

router.put('/profile', authenticate, validate(profileSchema), (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof profileSchema>;
  if (body.displayName === undefined && body.phone === undefined && body.avatarUrl === undefined) {
    throw Errors.validation('Provide at least one profile field to update.');
  }
  const result = updateUserProfile(req.user!.uid, body);
  if (!result.ok) {
    if (result.reason === 'validation') throw Errors.validation('Display name must be at least 2 characters.');
    throw Errors.notFound('User not found.');
  }
  res.json({ success: true, user: publicUser(result.user) });
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // Stateless tokens — the client discards its session. Endpoint kept for parity.
  res.json({ success: true });
});

export default router;
