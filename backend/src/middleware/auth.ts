import { NextFunction, Request, Response } from 'express';
import { config } from '@/config/env';
import { verifyIdToken } from '@/config/firebase';
import { Errors } from '@/utils/errors';
import { AuthedUser } from '@/utils/types';
import { findUserByUid, MOCK_TOKEN_PREFIX } from '@/services/store';

// Augment Express Request with the authenticated user.
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Authenticate the request from its Bearer token.
 * - mock mode: tokens look like `mock-token-<uid>`; resolve against the fixture.
 * - live mode: verify the Firebase ID token via the Admin SDK, then load the role.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) throw Errors.unauthorized();

    let uid: string;
    if (config.mockMode) {
      if (!token.startsWith(MOCK_TOKEN_PREFIX)) throw Errors.unauthorized();
      uid = token.slice(MOCK_TOKEN_PREFIX.length);
    } else {
      const decoded = await verifyIdToken(token);
      uid = decoded.uid;
    }

    const user = findUserByUid(uid);
    if (!user) throw Errors.unauthorized();

    req.user = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      verificationStatus: user.verificationStatus,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Gate a route to a specific role (e.g. agent-only writes). */
export function requireRole(role: AuthedUser['role']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Errors.unauthorized());
    if (req.user.role !== role) return next(Errors.forbidden(`This action is for ${role}s only.`));
    next();
  };
}

/** Sensitive writes require a completed identity-verification flow. */
export function requireVerified(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(Errors.unauthorized());
  if (req.user.verificationStatus !== 'verified') {
    return next(Errors.forbidden('Verify your identity before using this feature.'));
  }
  next();
}
