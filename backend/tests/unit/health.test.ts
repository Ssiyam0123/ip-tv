import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  })),
}));

describe('Health Endpoints', () => {
  let app: ReturnType<typeof createApp>;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    app = createApp(prisma);
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 when database is connected', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        checks: {
          database: { status: 'ok' },
        },
      });
    });

    it('should return 503 when database is down', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'down',
        checks: {
          database: { status: 'down' },
        },
      });
    });
  });

  describe('Error responses', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
        },
      });
      expect(response.body.error).toHaveProperty('requestId');
    });
  });
});
