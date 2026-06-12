import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authService } from './auth.service';
import { requireAuth } from '../../security/auth.middleware';
import { sendData, sendDeleted } from '../../app/response';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../../app/errors';
import { env } from '../../config/env';

// ─── Validation schemas ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

function genericAuthError(): AppError {
  return new UnauthorizedError('Invalid email or password.');
}

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();
  router.post('/auth/register', async (req, res, next) => {
    try {
      const body = registerSchema.parse(req.body);

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        throw new ConflictError('An account with this email already exists.');
      }

      const passwordHash = await authService.hashPassword(body.password);
      const tokenFamily = authService.generateTokenFamily();

      const user = await prisma.user.create({
        data: {
          email: body.email,
          displayName: body.displayName ?? body.email.split('@')[0],
          authIdentities: {
            create: {
              provider: 'local',
              providerId: body.email,
              passwordHash,
            },
          },
        },
      });

      const tokens = authService.createTokenPair(user.id, user.role, tokenFamily);

      await prisma.refreshSession.create({
        data: {
          tokenFamily,
          refreshToken: tokens.refreshToken,
          userId: user.id,
          deviceInfo: req.headers['user-agent']?.slice(0, 255),
          ipAddress: req.ip,
          expiresAt: tokens.expiresAt,
        },
      });

      sendData(res, {
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
        ...tokens,
      }, 201);
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /auth/login ─────────────────────────────────────────────────

  router.post('/auth/login', async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
        include: { authIdentities: { where: { provider: 'local' } } },
      });

      if (!user || user.authIdentities.length === 0) {
        throw genericAuthError();
      }

      const identity = user.authIdentities[0];
      if (!identity.passwordHash) {
        throw genericAuthError();
      }

      const valid = await authService.verifyPassword(body.password, identity.passwordHash);
      if (!valid) {
        throw genericAuthError();
      }

      const tokenFamily = authService.generateTokenFamily();
      const tokens = authService.createTokenPair(user.id, user.role, tokenFamily);

      await prisma.refreshSession.create({
        data: {
          tokenFamily,
          refreshToken: tokens.refreshToken,
          userId: user.id,
          deviceInfo: req.headers['user-agent']?.slice(0, 255),
          ipAddress: req.ip,
          expiresAt: tokens.expiresAt,
        },
      });

      sendData(res, {
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────────

  router.post('/auth/refresh', async (req, res, next) => {
    try {
      const body = refreshSchema.parse(req.body);
      const payload = authService.verifyRefreshToken(body.refreshToken);

      if (!payload) {
        throw new UnauthorizedError('Invalid or expired refresh token.');
      }

      // Find the session
      const session = await prisma.refreshSession.findFirst({
        where: {
          refreshToken: body.refreshToken,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedError('Refresh token has been revoked or expired.');
      }

      // Verify token family matches
      if (session.tokenFamily !== payload.tokenFamily) {
        // Token reuse detected — revoke entire family
        await prisma.refreshSession.updateMany({
          where: { tokenFamily: payload.tokenFamily, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedError('Token family revoked due to suspected reuse.');
      }

      // Revoke old session
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      // Get user
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedError('User no longer exists.');
      }

      // Issue new tokens
      const newTokenFamily = authService.generateTokenFamily();
      const tokens = authService.createTokenPair(user.id, user.role, newTokenFamily);

      await prisma.refreshSession.create({
        data: {
          tokenFamily: newTokenFamily,
          refreshToken: tokens.refreshToken,
          userId: user.id,
          deviceInfo: req.headers['user-agent']?.slice(0, 255),
          ipAddress: req.ip,
          expiresAt: tokens.expiresAt,
        },
      });

      sendData(res, {
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /auth/logout ────────────────────────────────────────────────

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const body = refreshSchema.parse(req.body);
      const payload = authService.verifyRefreshToken(body.refreshToken);

      if (payload) {
        // Revoke all sessions in the token family
        await prisma.refreshSession.updateMany({
          where: { tokenFamily: payload.tokenFamily, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /auth/google ────────────────────────────────────────────────

  router.post('/auth/google', async (req, res, next) => {
    try {
      const body = z.object({
        idToken: z.string().min(1),
      }).parse(req.body);

      // Verify Google ID token using google-auth-library
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

      const ticket = await client.verifyIdToken({
        idToken: body.idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedError('Invalid Google ID token.');
      }

      const googleSub = payload.sub;
      const email = payload.email.toLowerCase().trim();
      const name = payload.name ?? email.split('@')[0];

      if (!googleSub || !email) {
        throw new UnauthorizedError('ID token missing required claims.');
      }

      // Check if identity already exists
      let identity = await prisma.authIdentity.findUnique({
        where: { provider_providerId: { provider: 'google', providerId: googleSub } },
        include: { user: true },
      });

      if (identity) {
        // Existing identity — login
        const tokenFamily = authService.generateTokenFamily();
        const tokens = authService.createTokenPair(identity.user.id, identity.user.role, tokenFamily);

        await prisma.refreshSession.create({
          data: {
            tokenFamily,
            refreshToken: tokens.refreshToken,
            userId: identity.user.id,
            deviceInfo: req.headers['user-agent']?.slice(0, 255),
            ipAddress: req.ip,
            expiresAt: tokens.expiresAt,
          },
        });

        sendData(res, {
          user: {
            id: identity.user.id,
            email: identity.user.email,
            displayName: identity.user.displayName,
            role: identity.user.role,
          },
          ...tokens,
        });
        return;
      }

      // Check if email already has a local account
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictError(
          'An account with this email already exists. Sign in with your password instead.',
        );
      }

      // Create new user + identity
      const tokenFamily = authService.generateTokenFamily();
      const user = await prisma.user.create({
        data: {
          email,
          displayName: name,
          authIdentities: {
            create: {
              provider: 'google',
              providerId: googleSub,
            },
          },
        },
      });

      const tokens = authService.createTokenPair(user.id, user.role, tokenFamily);

      await prisma.refreshSession.create({
        data: {
          tokenFamily,
          refreshToken: tokens.refreshToken,
          userId: user.id,
          deviceInfo: req.headers['user-agent']?.slice(0, 255),
          ipAddress: req.ip,
          expiresAt: tokens.expiresAt,
        },
      });

      sendData(res, {
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
        ...tokens,
      }, 201);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /me ───────────────────────────────────────────────────────────

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      sendData(res, user);
    } catch (err) {
      next(err);
    }
  });

  // ─── DELETE /me ────────────────────────────────────────────────────────

  router.delete('/me', requireAuth, async (req, res, next) => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.refreshSession.deleteMany({ where: { userId: req.user!.id } });
        await tx.authIdentity.deleteMany({ where: { userId: req.user!.id } });
        await tx.favorite.deleteMany({ where: { userId: req.user!.id } });
        await tx.user.delete({ where: { id: req.user!.id } });
      });

      sendDeleted(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
