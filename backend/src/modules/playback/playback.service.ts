import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface PlaybackSession {
  sessionId: string;
  channelId: string;
  expiresAt: string;
  sources: PlaybackSource[];
}

export interface PlaybackSource {
  sourceId: string;
  playbackUrl: string;
  quality: string;
  priority: number;
}

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class PlaybackService {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(channelId: string): Promise<PlaybackSession> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId, status: { in: ['active', 'degraded'] } },
      include: {
        streamSources: {
          where: { status: { in: ['active', 'degraded'] } },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!channel || channel.streamSources.length === 0) {
      throw new Error('NO_PLAYABLE_SOURCE');
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const sources: PlaybackSource[] = channel.streamSources.map((source) => ({
      sourceId: source.id,
      playbackUrl: source.url,
      quality: source.quality,
      priority: source.priority,
    }));

    // In production, the playbackUrl would be a signed, short-lived proxy URL
    // instead of the raw source URL.

    return {
      sessionId,
      channelId,
      expiresAt: expiresAt.toISOString(),
      sources,
    };
  }
}
