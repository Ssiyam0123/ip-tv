import { logger } from '../../observability/logger';

// ─── Domain models ──────────────────────────────────────────────────────────

export interface NormalizedMatch {
  externalId: string;
  sport: 'football' | 'cricket';
  state: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  currentPeriod?: string;
  startTime: string;
  competition: string;
}

export interface ScoreProviderResult {
  matches: NormalizedMatch[];
  fetchedAt: string;
}

// ─── Provider interface ────────────────────────────────────────────────────

export interface ScoreProvider {
  readonly name: string;
  fetchLiveMatches(): Promise<ScoreProviderResult>;
  fetchMatchesByDate(date: string): Promise<ScoreProviderResult>;
}

// ─── Mock provider for development ──────────────────────────────────────────

export class MockScoreProvider implements ScoreProvider {
  readonly name = 'mock-provider';

  // Keep state in memory to simulate changing scores
  private footballHomeScore = 2;
  private footballAwayScore = 1;
  private cricketHomeScore = 145;
  private cricketAwayScore = 120;
  private cricketWickets = 3;

  async fetchLiveMatches(): Promise<ScoreProviderResult> {
    logger.info('Fetching live matches from mock provider');

    // FIFA World Cup 2026 live match: 10% chance to score on each poll
    if (Math.random() < 0.1) {
      if (Math.random() < 0.5) {
        this.footballHomeScore += 1;
      } else {
        this.footballAwayScore += 1;
      }
    }

    // Cricket T20 World Cup: Increase runs by 1–6 on every poll
    this.cricketHomeScore += Math.floor(Math.random() * 6) + 1;
    // 5% chance to lose a wicket (max 10)
    if (Math.random() < 0.05 && this.cricketWickets < 10) {
      this.cricketWickets += 1;
    }

    const now = new Date();

    return {
      matches: [
        // ── LIVE ────────────────────────────────────────────────────────────
        {
          externalId: 'wc2026-live-1',
          sport: 'football',
          state: 'live',
          homeTeam: 'Brazil',
          awayTeam: 'Argentina',
          homeScore: this.footballHomeScore,
          awayScore: this.footballAwayScore,
          currentPeriod: '67\'',
          startTime: new Date(now.getTime() - 67 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group F',
        },
        {
          externalId: 'wc2026-live-2',
          sport: 'football',
          state: 'live',
          homeTeam: 'France',
          awayTeam: 'Germany',
          homeScore: 1,
          awayScore: 1,
          currentPeriod: '45+2\'',
          startTime: new Date(now.getTime() - 47 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group D',
        },
        {
          externalId: 't20wc-live-1',
          sport: 'cricket',
          state: 'live',
          homeTeam: 'India',
          awayTeam: 'Pakistan',
          homeScore: this.cricketHomeScore,
          awayScore: this.cricketAwayScore,
          currentPeriod: `T20 WC – Over 14.3 (${this.cricketWickets} Wkts)`,
          startTime: new Date(now.getTime() - 87 * 60 * 1000).toISOString(),
          competition: 'ICC T20 World Cup 2026 – Super 8',
        },
        // ── UPCOMING / SCHEDULED ────────────────────────────────────────────
        {
          externalId: 'wc2026-sched-1',
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'England',
          awayTeam: 'Spain',
          startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group C',
        },
        {
          externalId: 'wc2026-sched-2',
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'Portugal',
          awayTeam: 'Morocco',
          startTime: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group B',
        },
        {
          externalId: 'wc2026-sched-3',
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'USA',
          awayTeam: 'Mexico',
          startTime: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group A',
        },
        {
          externalId: 'wc2026-sched-4',
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'Netherlands',
          awayTeam: 'Senegal',
          startTime: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group E',
        },
        {
          externalId: 't20wc-sched-1',
          sport: 'cricket',
          state: 'scheduled',
          homeTeam: 'Australia',
          awayTeam: 'England',
          startTime: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          competition: 'ICC T20 World Cup 2026 – Super 8',
        },
        // ── FINISHED ────────────────────────────────────────────────────────
        {
          externalId: 'wc2026-fin-1',
          sport: 'football',
          state: 'finished',
          homeTeam: 'Spain',
          awayTeam: 'Croatia',
          homeScore: 3,
          awayScore: 0,
          currentPeriod: 'FT',
          startTime: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group C',
        },
        {
          externalId: 'wc2026-fin-2',
          sport: 'football',
          state: 'finished',
          homeTeam: 'Argentina',
          awayTeam: 'Saudi Arabia',
          homeScore: 2,
          awayScore: 1,
          currentPeriod: 'FT',
          startTime: new Date(now.getTime() - 46 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group F',
        },
        {
          externalId: 'wc2026-fin-3',
          sport: 'football',
          state: 'finished',
          homeTeam: 'Japan',
          awayTeam: 'Germany',
          homeScore: 2,
          awayScore: 1,
          currentPeriod: 'FT',
          startTime: new Date(now.getTime() - 70 * 60 * 60 * 1000).toISOString(),
          competition: 'FIFA World Cup 2026 – Group D',
        },
        {
          externalId: 't20wc-fin-1',
          sport: 'cricket',
          state: 'finished',
          homeTeam: 'West Indies',
          awayTeam: 'Bangladesh',
          homeScore: 182,
          awayScore: 165,
          currentPeriod: 'Result',
          startTime: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(),
          competition: 'ICC T20 World Cup 2026 – Group Stage',
        },
      ],
      fetchedAt: now.toISOString(),
    };
  }

  async fetchMatchesByDate(date: string): Promise<ScoreProviderResult> {
    logger.info({ date }, 'Fetching matches by date from mock provider');
    const d = new Date(date);
    return {
      matches: [
        {
          externalId: `wc2026-day-${date}-1`,
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'Brazil',
          awayTeam: 'Switzerland',
          startTime: new Date(d.setHours(15, 0, 0, 0)).toISOString(),
          competition: 'FIFA World Cup 2026 – Group F',
        },
        {
          externalId: `wc2026-day-${date}-2`,
          sport: 'football',
          state: 'scheduled',
          homeTeam: 'Uruguay',
          awayTeam: 'South Korea',
          startTime: new Date(d.setHours(19, 0, 0, 0)).toISOString(),
          competition: 'FIFA World Cup 2026 – Group H',
        },
      ],
      fetchedAt: new Date().toISOString(),
    };
  }
}
