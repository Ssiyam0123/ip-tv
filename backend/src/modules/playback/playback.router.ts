import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PlaybackService } from './playback.service';
import { sendData } from '../../app/response';
import { NotFoundError } from '../../app/errors';
import { optionalAuth } from '../../security/auth.middleware';

export function createPlaybackRouter(prisma: PrismaClient) {
  const router = Router();
  const playbackService = new PlaybackService(prisma);

  // ─── POST /channels/:channelId/playback-session ──────────────────────

  router.post('/channels/:channelId/playback-session', optionalAuth, async (req, res, next) => {
    try {
      const { channelId } = z.object({ channelId: z.string().uuid() }).parse(req.params);

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

  return router;
}
