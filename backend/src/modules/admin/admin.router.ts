import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../../security/auth.middleware';
import { paginationSchema, sendPaginated } from '../../app/pagination';
import { sendData } from '../../app/response';
import { NotFoundError } from '../../app/errors';
import { logger } from '../../observability/logger';

export function createAdminRouter(prisma: PrismaClient) {
  const router = Router();
  // All admin routes require authentication + admin role
  router.use(requireAuth, requireAdmin);

  // ─── GET /admin/channels ─────────────────────────────────────────────

  router.get('/channels', async (req, res, next) => {
    try {
      const query = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (query.cursor) where.id = { gt: query.cursor };

      const channels = await prisma.channel.findMany({
        where,
        orderBy: { id: 'asc' },
        take: query.limit + 1,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          language: true,
          countryCode: true,
          category: { select: { id: true, name: true } },
          _count: { select: { streamSources: true, favorites: true } },
        },
      });

      sendPaginated(res, channels, query.limit, (c) => c.id);
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /admin/channels/:channelId ─────────────────────────────────

  const patchChannelSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    logoUrl: z.string().url().max(500).optional().nullable(),
    status: z.enum(['active', 'degraded', 'offline', 'disabled']).optional(),
    categoryId: z.string().uuid().optional(),
    language: z.string().max(10).optional(),
    countryCode: z.string().max(10).optional(),
  });

  router.patch('/channels/:channelId', async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);
      const body = patchChannelSchema.parse(req.body);

      const existing = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!existing) {
        throw new NotFoundError('Channel', channelId);
      }

      const channel = await prisma.channel.update({
        where: { id: channelId },
        data: body,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          language: true,
          countryCode: true,
          categoryId: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_CHANNEL',
          entity: 'Channel',
          entityId: channelId,
          userId: req.user!.id,
          metadata: { changes: body },
          ipAddress: req.ip,
        },
      });

      sendData(res, channel);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /admin/sources ──────────────────────────────────────────────

  router.get('/sources', async (req, res, next) => {
    try {
      const query = paginationSchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (query.cursor) where.id = { gt: query.cursor };

      const sources = await prisma.streamSource.findMany({
        where,
        orderBy: { id: 'asc' },
        take: query.limit + 1,
        select: {
          id: true,
          quality: true,
          priority: true,
          status: true,
          licenseStatus: true,
          channel: { select: { id: true, title: true, slug: true } },
          provider: { select: { id: true, name: true } },
          _count: { select: { streamHealthChecks: true } },
        },
      });

      sendPaginated(res, sources, query.limit, (s) => s.id);
    } catch (err) {
      next(err);
    }
  });

  // ─── PATCH /admin/sources/:sourceId ──────────────────────────────────

  const patchSourceSchema = z.object({
    quality: z.string().max(20).optional(),
    priority: z.number().int().optional(),
    status: z.enum(['active', 'degraded', 'offline', 'disabled']).optional(),
    licenseStatus: z.string().max(50).optional(),
    attribution: z.string().max(500).optional().nullable(),
    authorizationNotes: z.string().max(1000).optional().nullable(),
  });

  router.patch('/sources/:sourceId', async (req, res, next) => {
    try {
      const { sourceId } = z.object({ sourceId: z.string().uuid() }).parse(req.params);
      const body = patchSourceSchema.parse(req.body);

      const existing = await prisma.streamSource.findUnique({ where: { id: sourceId } });
      if (!existing) {
        throw new NotFoundError('Stream source', sourceId);
      }

      const source = await prisma.streamSource.update({
        where: { id: sourceId },
        data: {
          ...body,
          reviewedAt: body.licenseStatus ? new Date() : undefined,
        },
        select: {
          id: true,
          quality: true,
          priority: true,
          status: true,
          licenseStatus: true,
          attribution: true,
          authorizationNotes: true,
          reviewedAt: true,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_SOURCE',
          entity: 'StreamSource',
          entityId: sourceId,
          userId: req.user!.id,
          metadata: { changes: body },
          ipAddress: req.ip,
        },
      });

      sendData(res, source);
    } catch (err) {
      next(err);
    }
  });

  // ─── POST /admin/sync-runs ────────────────────────────────────────────

  router.post('/sync-runs', async (_req, res, next) => {
    try {
      const syncRun = await prisma.syncRun.create({
        data: {
          status: 'running',
          providerId: null, // runs across all providers
        },
      });

      // In production, this would trigger the catalog sync worker
      // via a message queue. For now, just log the intent.
      logger.info({ syncRunId: syncRun.id }, 'Sync run triggered');

      sendData(res, syncRun, 201);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /admin/sync-runs/:runId ─────────────────────────────────────

  router.get('/sync-runs/:runId', async (req, res, next) => {
    try {
      const { runId } = z.object({ runId: z.string().uuid() }).parse(req.params);

      const syncRun = await prisma.syncRun.findUnique({
        where: { id: runId },
        include: { provider: { select: { id: true, name: true } } },
      });

      if (!syncRun) {
        throw new NotFoundError('Sync run', runId);
      }

      sendData(res, syncRun);
    } catch (err) {
      next(err);
    }
  });

  // ─── GET /admin/health-checks ────────────────────────────────────────

  router.get('/health-checks', async (_req, res, next) => {
    try {
      const query = paginationSchema.parse(_req.query);
      const where: Record<string, unknown> = {};
      if (query.cursor) where.id = { gt: query.cursor };

      // Return most recent health checks grouped by channel
      const latestChecks = await prisma.streamHealthCheck.groupBy({
        by: ['channelId'],
        _max: { checkedAt: true, id: true },
        orderBy: { channelId: 'asc' },
        ...(query.cursor ? { where: { channelId: { gt: query.cursor } } } : {}),
        take: query.limit + 1,
      });

      const channels = await prisma.channel.findMany({
        where: {
          id: { in: latestChecks.map((c) => c.channelId) },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          streamHealthChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              httpStatus: true,
              latencyMs: true,
              failureReason: true,
              checkedAt: true,
            },
          },
        },
      });

      sendPaginated(res, channels, query.limit, (c) => c.id);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
