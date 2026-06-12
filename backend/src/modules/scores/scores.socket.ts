import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../observability/logger';

interface MatchSubscribeData {
  matchId: string;
}

interface MatchUpdate {
  matchId: string;
  version: number;
  state: string;
  homeScore?: number | null;
  awayScore?: number | null;
  currentPeriod?: string | null;
  timestamp: string;
}

/**
 * Manages Socket.IO namespace for real-time score updates.
 * In production, this would be driven by an external score provider
 * polling mechanism rather than client-triggered events.
 */
export function createScoresSocket(io: SocketServer, prisma: PrismaClient) {
  const namespace = io.of('/scores');

  namespace.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Score socket connected');

    // Handle match subscription
    socket.on('match:subscribe', async (data: MatchSubscribeData) => {
      try {
        if (!data.matchId) {
          socket.emit('match:error', { message: 'matchId is required' });
          return;
        }

        // Join a room specific to this match
        const room = `match:${data.matchId}`;
        socket.join(room);

        // Send current snapshot from database
        const match = await prisma.match.findUnique({
          where: { id: data.matchId },
          select: {
            id: true,
            state: true,
            homeScore: true,
            awayScore: true,
            currentPeriod: true,
            snapshots: {
              orderBy: { version: 'desc' },
              take: 1,
              select: { version: true },
            },
          },
        });

        if (match) {
          const snapshot: MatchUpdate = {
            matchId: match.id,
            version: match.snapshots[0]?.version ?? 0,
            state: match.state,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            currentPeriod: match.currentPeriod,
            timestamp: new Date().toISOString(),
          };
          socket.emit('match:snapshot', snapshot);
        }

        logger.info({ matchId: data.matchId, socketId: socket.id }, 'Subscribed to match');
      } catch (err) {
        logger.error({ err, matchId: data.matchId }, 'Error subscribing to match');
        socket.emit('match:error', { message: 'Failed to subscribe to match updates.' });
      }
    });

    // Handle match unsubscription
    socket.on('match:unsubscribe', (data: MatchSubscribeData) => {
      if (data.matchId) {
        socket.leave(`match:${data.matchId}`);
        logger.info({ matchId: data.matchId, socketId: socket.id }, 'Unsubscribed from match');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Score socket disconnected');
    });
  });

  /**
   * Publishes a match update to all subscribers.
   * Called by the score polling service when a match state changes.
   */
  function publishMatchUpdate(update: MatchUpdate): void {
    namespace.to(`match:${update.matchId}`).emit('match:update', update);
  }

  return { publishMatchUpdate };
}
