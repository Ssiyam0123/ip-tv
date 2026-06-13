import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  checks: Record<string, { status: string; message?: string }>;
}

const startupTime = Date.now();

export function createHealthRouter(prisma: PrismaClient) {
  const router = Router();

  // Liveness check — is the process alive?
  router.get('/live', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startupTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check — are dependencies available?
  router.get('/ready', async (_req, res) => {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: HealthStatus['status'] = 'ok';

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch (err) {
      checks.database = {
        status: 'down',
        message: err instanceof Error ? err.message : 'Database connection failed',
      };
      overallStatus = 'down';
    }

    const status: HealthStatus = {
      status: overallStatus,
      uptime: Math.floor((Date.now() - startupTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };

    const httpStatus = overallStatus === 'ok' ? 200 : 503;
    res.status(httpStatus).json(status);
  });

  return router;
}

