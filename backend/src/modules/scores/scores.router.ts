import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { paginationSchema, sendPaginated } from '../../app/pagination';
import { sendData } from '../../app/response';
import { NotFoundError } from '../../app/errors';

export function createScoresRouter(prisma: PrismaClient) {
  const router = Router();
  // ─── GET /matches ────────────────────────────────────────────────────

  const matchesQuerySchema = z.object({
    sport: z.enum(['football', 'cricket']).optional(),
    state: z.enum(['scheduled', 'live', 'finished', 'postponed', 'cancelled']).optional(),
    date: z.string().optional(), // ISO date string
  }).merge(paginationSchema);

  router.get('/matches', async (req, res, next) => {
    try {
      const query = matchesQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {};
      if (query.sport) where.sport = query.sport;
      if (query.state) where.state = query.state;
      if (query.date) {
        const dateStart = new Date(query.date);
        const dateEnd = new Date(dateStart);
        dateEnd.setDate(dateEnd.getDate() + 1);
        where.startTime = { gte: dateStart, lt: dateEnd };
      }
      if (query.cursor) {
        where.id = { gt: query.cursor };
      }

      const matches = await prisma.match.findMany({
        where,
        orderBy: [{ startTime: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        select: {
          id: true,
          sport: true,
          state: true,
          startTime: true,
          homeScore: true,
          awayScore: true,
          currentPeriod: true,
          competition: { select: { id: true, name: true, slug: true, sport: true } },
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
        },
      });

      sendPaginated(res, matches, query.limit, (m) => m.id);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /matches/:matchId ───────────────────────────────────────────

  router.get('/matches/:matchId', async (req, res, next) => {
    try {
      const { matchId } = z.object({ matchId: z.string().uuid() }).parse(req.params);

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          sport: true,
          state: true,
          startTime: true,
          homeScore: true,
          awayScore: true,
          currentPeriod: true,
          competition: {
            select: { id: true, name: true, slug: true, sport: true, country: true, logoUrl: true },
          },
          homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { version: true, capturedAt: true },
          },
        },
      });

      if (!match) {
        throw new NotFoundError('Match', matchId);
      }

      sendData(res, match);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
