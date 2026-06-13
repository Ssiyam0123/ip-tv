import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PlaybackService } from './playback.service';
import { sendData } from '../../app/response';
import { NotFoundError } from '../../app/errors';
import { optionalAuth } from '../../security/auth.middleware';
import { logger } from '../../observability/logger';

// Simple in-memory rate limiter: max 10 session requests per user/IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;

  entry.count++;
  return true;
}

export function createPlaybackRouter(prisma: PrismaClient) {
  const router = Router();
  const playbackService = new PlaybackService(prisma);

  // ─── POST /channels/:channelId/playback-session ──────────────────────────

  router.post('/channels/:channelId/playback-session', optionalAuth, async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);

      // Rate limit by userId or IP
      const rateLimitKey = (req as { user?: { id?: string } }).user?.id ?? req.ip ?? 'anonymous';
      if (!checkRateLimit(rateLimitKey)) {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many playback session requests. Please wait a moment.',
            requestId: '',
            details: {},
          },
        });
        return;
      }

      // Verify channel exists
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        throw new NotFoundError('Channel', channelId);
      }

      const session = await playbackService.createSession(channelId);
      sendData(res, session);
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_PLAYABLE_SOURCE') {
        next(new NotFoundError('No playable source', Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId));
        return;
      }
      next(err);
    }
  });

  // ─── GET /proxy/stream ───────────────────────────────────────────────────
  // Proxies HLS manifests to avoid CORS issues and hide raw stream URLs.
  // Usage: /api/v1/proxy/stream?url=<encoded-m3u8-url>

  router.get('/proxy/stream', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string | undefined;

    if (!rawUrl) {
      res.status(400).json({ error: { code: 'MISSING_URL', message: 'Missing url query param', requestId: '', details: {} } });
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(rawUrl);
      new URL(targetUrl); // validate URL format
    } catch {
      res.status(400).json({ error: { code: 'INVALID_URL', message: 'Invalid stream URL', requestId: '', details: {} } });
      return;
    }

    // Only allow HTTP(S) URLs
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      res.status(400).json({ error: { code: 'INVALID_PROTOCOL', message: 'Only HTTP(S) URLs are supported', requestId: '', details: {} } });
      return;
    }

    try {
      logger.debug({ targetUrl }, 'Proxying stream request');

      const upstream = await fetch(targetUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Proxy/1.0)',
          'Accept': '*/*',
        },
      });

      const contentType = upstream.headers.get('content-type') ?? 'application/vnd.apple.mpegurl';

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store');

      // For M3U8 manifests: rewrite relative URLs to go through the proxy
      if (contentType.includes('mpegurl') || targetUrl.endsWith('.m3u8')) {
        const text = await upstream.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

        // Rewrite segment/playlist URLs to use our proxy
        const rewritten = text
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return line;

            // If it's a relative URL, make it absolute then proxy it
            const absoluteUrl = trimmed.startsWith('http')
              ? trimmed
              : `${baseUrl}${trimmed}`;

            return `/api/v1/proxy/stream?url=${encodeURIComponent(absoluteUrl)}`;
          })
          .join('\n');

        res.send(rewritten);
      } else {
        // For segments (.ts files), pipe the binary through
        const buffer = await upstream.arrayBuffer();
        res.setHeader('Content-Length', buffer.byteLength);
        res.end(Buffer.from(buffer));
      }
    } catch (err) {
      logger.error({ err, targetUrl }, 'Stream proxy error');
      if (!res.headersSent) {
        res.status(502).json({
          error: {
            code: 'PROXY_ERROR',
            message: 'Failed to fetch stream from upstream',
            requestId: '',
            details: {},
          },
        });
      }
    }
  });

  return router;
}
