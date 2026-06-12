import { PrismaClient } from '@prisma/client';
import { type ScoreProvider, type NormalizedMatch, MockScoreProvider } from '../integrations/scores';
import { logger } from '../observability/logger';

export interface ScoreUpdatePublisher {
  publishMatchUpdate(update: {
    matchId: string;
    version: number;
    state: string;
    homeScore?: number | null;
    awayScore?: number | null;
    currentPeriod?: string | null;
    timestamp: string;
  }): void;
}

/**
 * Polls the score provider at configurable intervals and persists
 * normalized match data to the database. Publishes changes via Socket.IO.
 */
export class ScorePoller {
  private provider: ScoreProvider;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: ScoreUpdatePublisher,
    provider?: ScoreProvider,
  ) {
    this.provider = provider ?? new MockScoreProvider();
    this.intervalMs = 15000;
  }

  start(): void {
    logger.info({ provider: this.provider.name, intervalMs: this.intervalMs }, 'Score poller started');
    this.poll();
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Score poller stopped');
  }

  private async poll(): Promise<void> {
    try {
      const result = await this.provider.fetchLiveMatches();

      for (const match of result.matches) {
        try {
          await this.processMatch(match);
        } catch (err) {
          logger.error({ err, matchId: match.externalId }, 'Failed to process match');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Score poll iteration failed');
    }
  }

  private async processMatch(match: NormalizedMatch): Promise<void> {
    const existingMatch = await this.prisma.match.findFirst({
      where: { externalId: match.externalId },
      include: {
        snapshots: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    // Ensure competition exists
    let competition = await this.prisma.competition.findFirst({
      where: { name: match.competition },
    });

    if (!competition) {
      competition = await this.prisma.competition.create({
        data: {
          name: match.competition,
          slug: match.competition.toLowerCase().replace(/\s+/g, '-'),
          sport: match.sport,
        },
      });
    }

    // Ensure teams exist
    const homeTeam = await this.ensureTeam(match.homeTeam, match.sport);
    const awayTeam = await this.ensureTeam(match.awayTeam, match.sport);

    if (existingMatch) {
      const lastVersion = existingMatch.snapshots[0]?.version ?? 0;

      if (
        existingMatch.state !== match.state ||
        existingMatch.homeScore !== match.homeScore ||
        existingMatch.awayScore !== match.awayScore
      ) {
        await this.prisma.match.update({
          where: { id: existingMatch.id },
          data: {
            state: match.state,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            currentPeriod: match.currentPeriod,
          },
        });

        const newVersion = lastVersion + 1;
        await this.prisma.matchSnapshot.create({
          data: {
            matchId: existingMatch.id,
            version: newVersion,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            state: match.state,
            period: match.currentPeriod,
            capturedAt: new Date(),
          },
        });

        this.publisher.publishMatchUpdate({
          matchId: existingMatch.id,
          version: newVersion,
          state: match.state,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          currentPeriod: match.currentPeriod,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      const newMatch = await this.prisma.match.create({
        data: {
          competitionId: competition.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          state: match.state,
          sport: match.sport,
          startTime: new Date(match.startTime),
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          currentPeriod: match.currentPeriod,
          externalId: match.externalId,
        },
      });

      await this.prisma.matchSnapshot.create({
        data: {
          matchId: newMatch.id,
          version: 1,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          state: match.state,
          period: match.currentPeriod,
          capturedAt: new Date(),
        },
      });
    }
  }

  private async ensureTeam(name: string, sport: string) {
    let team = await this.prisma.team.findFirst({
      where: { name, sport },
    });

    if (!team) {
      team = await this.prisma.team.create({
        data: {
          name,
          shortName: name.split(' ').pop() || name,
          sport,
        },
      });
    }

    return team;
  }
}
