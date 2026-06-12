import http from 'http';
import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './observability/logger';
import { createScoresSocket } from './modules/scores';
import { ScorePoller } from './jobs/score-poller';
import { StreamHealthChecker } from './jobs/stream-health-checker';
import { CatalogSyncPoller } from './jobs/catalog-sync-poller';

async function main() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  const app = createApp(prisma);
  const server = http.createServer(app);

  // ─── Socket.IO ───────────────────────────────────────────────────────
  const io = new SocketServer(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  const scoresSocket = createScoresSocket(io, prisma);

  // ─── Background Jobs ────────────────────────────────────────────────
  const scorePoller = new ScorePoller(prisma, {
    publishMatchUpdate: (update) => scoresSocket.publishMatchUpdate(update),
  });

  const healthChecker = new StreamHealthChecker(prisma);
  const catalogSyncPoller = new CatalogSyncPoller(prisma);

  // Only start background jobs if not in test mode
  if (env.NODE_ENV !== 'test') {
    scorePoller.start();
    healthChecker.start();
    catalogSyncPoller.start(env.SYNC_INTERVAL_MS);
  }

  server.listen(env.PORT, env.HOST, () => {
    logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    scorePoller.stop();
    healthChecker.stop();
    catalogSyncPoller.stop();

    server.close(async () => {
      logger.info('HTTP server closed');
      await io.close();
      logger.info('Socket.IO closed');
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start application');
  process.exit(1);
});
