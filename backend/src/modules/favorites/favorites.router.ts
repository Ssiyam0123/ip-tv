import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../security/auth.middleware';
import { paginationSchema, sendPaginated } from '../../app/pagination';
import { sendData, sendDeleted } from '../../app/response';
import { NotFoundError } from '../../app/errors';

export function createFavoritesRouter(prisma: PrismaClient) {
  const router = Router();
  // All favorites routes require authentication
  router.use(requireAuth);

  // ─── GET /favorites ──────────────────────────────────────────────────

  router.get('/', async (req, res, next) => {
    try {
      const query = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = { userId: req.user!.id };
      if (query.cursor) {
        where.id = { gt: query.cursor };
      }

      const favorites = await prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit + 1,
        select: {
          id: true,
          createdAt: true,
          channel: {
            select: {
              id: true,
              title: true,
              slug: true,
              logoUrl: true,
              status: true,
              category: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      sendPaginated(res, favorites, query.limit, (f) => f.id);
    } catch (err) {
      next(err);
    }
  });

  // ─── PUT /favorites/:channelId ───────────────────────────────────────

  router.put('/:channelId', async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);

      // Verify channel exists
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        throw new NotFoundError('Channel', channelId);
      }

      // Upsert favorite (idempotent)
      const favorite = await prisma.favorite.upsert({
        where: {
          userId_channelId: { userId: req.user!.id, channelId },
        },
        create: {
          userId: req.user!.id,
          channelId,
        },
        update: {},
        select: {
          id: true,
          createdAt: true,
          channel: {
            select: {
              id: true,
              title: true,
              slug: true,
              logoUrl: true,
              status: true,
            },
          },
        },
      });

      sendData(res, favorite, 201);
    } catch (err) {
      next(err);
    }
  });

  // ─── DELETE /favorites/:channelId ─────────────────────────────────────

  router.delete('/:channelId', async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);

      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_channelId: { userId: req.user!.id, channelId },
        },
      });

      if (!favorite) {
        throw new NotFoundError('Favorite');
      }

      await prisma.favorite.delete({ where: { id: favorite.id } });
      sendDeleted(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
