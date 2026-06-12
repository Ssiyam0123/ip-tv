import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { paginationSchema, sendPaginated } from '../../app/pagination';
import { sendData } from '../../app/response';
import { NotFoundError } from '../../app/errors';
import { optionalAuth } from '../../security/auth.middleware';

export function createCatalogRouter(prisma: PrismaClient) {
  const router = Router();
  // ─── GET /categories ─────────────────────────────────────────────────

  router.get('/categories', async (_req, res, next) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true, sortOrder: true },
      });
      sendData(res, categories);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /channels ───────────────────────────────────────────────────

  const channelsQuerySchema = z.object({
    category: z.string().max(100).optional(),
    query: z.string().max(200).optional(),
    status: z.enum(['active', 'degraded', 'offline', 'disabled']).optional(),
  }).merge(paginationSchema);

  router.get('/channels', async (req, res, next) => {
    try {
      const query = channelsQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {};
      
      // By default, filter by active or degraded status to only show working channels
      if (query.status) {
        where.status = query.status;
      } else {
        where.status = { in: ['active', 'degraded'] };
      }

      if (query.category) {
        if (query.category === 'live') {
          // 'live' category is already filtered by active/degraded status above
        } else {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.category);
          if (isUuid) {
            where.categoryId = query.category;
          } else {
            where.category = { slug: query.category };
          }
        }
      }
      
      if (query.query) {
        where.title = { contains: query.query, mode: 'insensitive' };
      }
      if (query.cursor) {
        where.id = { gt: query.cursor };
      }

      const channels = await prisma.channel.findMany({
        where,
        orderBy: { id: 'asc' },
        take: query.limit + 1, // fetch one extra to determine hasMore
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          language: true,
          countryCode: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      sendPaginated(res, channels, query.limit, (c) => c.id);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /channels/:channelId ─────────────────────────────────────────

  router.get('/channels/:channelId', optionalAuth, async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);

      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          language: true,
          countryCode: true,
          category: { select: { id: true, name: true, slug: true } },
          streamSources: {
            where: { status: { in: ['active', 'degraded'] } },
            orderBy: { priority: 'asc' },
            select: {
              id: true,
              quality: true,
              priority: true,
              status: true,
            },
          },
        },
      });

      if (!channel) {
        throw new NotFoundError('Channel', channelId);
      }

      sendData(res, channel);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
