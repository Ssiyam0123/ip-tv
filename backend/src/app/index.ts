import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createHelmetMiddleware, createCorsMiddleware, requestIdMiddleware } from '../security';
import { errorHandler } from './errors';
import { createHealthRouter } from './health';
import { createCatalogRouter } from '../modules/catalog';
import { createAuthRouter } from '../modules/auth';
import { createFavoritesRouter } from '../modules/favorites';
import { createPlaybackRouter } from '../modules/playback';
import { createScoresRouter } from '../modules/scores';
import { createAdminRouter } from '../modules/admin';
import { logger } from '../observability/logger';

export function createApp(prisma: PrismaClient) {
  const app = express();

  // Global middleware — order matters
  app.use(requestIdMiddleware);
  app.use(createHelmetMiddleware());
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info({ req }, `${req.method} ${req.path}`);
    next();
  });

  // ─── API v1 routes ─────────────────────────────────────────────────
  app.use('/api/v1/health', createHealthRouter(prisma));
  app.use('/api/v1', createCatalogRouter(prisma));
  app.use('/api/v1', createAuthRouter(prisma));
  app.use('/api/v1/favorites', createFavoritesRouter(prisma));
  app.use('/api/v1', createPlaybackRouter(prisma));
  app.use('/api/v1', createScoresRouter(prisma));
  app.use('/api/v1/admin', createAdminRouter(prisma));

  // 404 handler — must come before error handler
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint was not found.',
        requestId: _req.requestId || 'unknown',
        details: {},
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
