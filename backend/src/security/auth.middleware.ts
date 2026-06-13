/* eslint-disable @typescript-eslint/no-namespace */
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/auth.service';
import { UnauthorizedError, ForbiddenError } from '../app/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Requires a valid access token in the Authorization header.
 * Populates req.user with the decoded payload on success.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return;
  }

  const token = header.slice(7);
  const payload = authService.verifyAccessToken(token);
  if (!payload) {
    next(new UnauthorizedError('Invalid or expired access token.'));
    return;
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

/**
 * Requires an authenticated user with admin role.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  if (req.user.role !== 'admin') {
    next(new ForbiddenError('Admin access required.'));
    return;
  }
  next();
}

/**
 * Optional auth — populates req.user if a valid token is present,
 * but does not reject unauthenticated requests.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  const payload = authService.verifyAccessToken(token);
  if (payload) {
    req.user = { id: payload.sub, role: payload.role };
  }
  next();
}
