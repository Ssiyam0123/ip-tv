// ─── Common ──────────────────────────────────────────────────────────────────

export interface Pagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: Pagination;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
  role: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
  tokenType: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Channel {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: 'active' | 'degraded' | 'offline' | 'disabled';
  language: string | null;
  countryCode: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ChannelDetail extends Channel {
  streamSources: StreamSource[];
}

export interface StreamSource {
  id: string;
  quality: string;
  priority: number;
  status: 'active' | 'degraded' | 'offline' | 'disabled';
}

export interface ChannelsQuery {
  category?: string;
  query?: string;
  status?: 'active' | 'degraded' | 'offline' | 'disabled';
  cursor?: string;
  limit?: number;
}

// ─── Playback ────────────────────────────────────────────────────────────────

export interface PlaybackSource {
  sourceId: string;
  playbackUrl: string;
  quality: string;
  priority: number;
}

export interface PlaybackSession {
  sessionId: string;
  channelId: string;
  expiresAt: string;
  sources: PlaybackSource[];
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export interface FavoriteItem {
  id: string;
  createdAt: string;
  channel: {
    id: string;
    title: string;
    slug: string;
    logoUrl: string | null;
    status: string;
    description?: string | null;
    language?: string | null;
    countryCode?: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface Favorite {
  id: string;
  createdAt: string;
  channel: {
    id: string;
    title: string;
    slug: string;
    logoUrl: string | null;
    status: string;
    description?: string | null;
    language?: string | null;
    countryCode?: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface FavoriteInput {
  channelId: string;
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export type Sport = 'football' | 'cricket';
export type MatchState = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

export interface Competition {
  id: string;
  name: string;
  slug: string;
  sport: Sport;
  country?: string | null;
  logoUrl?: string | null;
}

export interface Match {
  id: string;
  sport: Sport;
  state: MatchState;
  startTime: string;
  homeScore: number | null;
  awayScore: number | null;
  currentPeriod: string | null;
  competition: Competition;
  homeTeam: Team;
  awayTeam: Team;
  snapshots?: { version: number; capturedAt: string }[];
}

export interface MatchesQuery {
  sport?: Sport;
  state?: MatchState;
  date?: string;
  cursor?: string;
  limit?: number;
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export interface AdminChannel {
  id: string;
  title: string;
  slug: string;
  status: string;
  language: string | null;
  countryCode: string | null;
  category: { id: string; name: string };
  _count: { streamSources: number; favorites: number };
}

export interface AdminSource {
  id: string;
  quality: string;
  priority: number;
  status: string;
  licenseStatus: string | null;
  channel: { id: string; title: string; slug: string };
  provider: { id: string; name: string };
  _count: { streamHealthChecks: number };
}

export interface PatchChannelInput {
  title?: string;
  description?: string;
  logoUrl?: string | null;
  status?: 'active' | 'degraded' | 'offline' | 'disabled';
  categoryId?: string;
  language?: string;
  countryCode?: string;
}

export interface PatchSourceInput {
  quality?: string;
  priority?: number;
  status?: 'active' | 'degraded' | 'offline' | 'disabled';
  licenseStatus?: string;
  attribution?: string | null;
  authorizationNotes?: string | null;
}

export interface SyncRun {
  id: string;
  status: string;
  channelsFound: number;
  channelsAdded: number;
  channelsUpdated: number;
  failures: number;
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  provider?: { id: string; name: string } | null;
}

export interface HealthCheckChannel {
  id: string;
  title: string;
  slug: string;
  status: string;
  streamHealthChecks: Array<{
    id: string;
    httpStatus: number | null;
    latencyMs: number | null;
    failureReason: string | null;
    checkedAt: string;
  }>;
}

// ─── Socket Score Events ─────────────────────────────────────────────────────

export interface MatchUpdate {
  matchId: string;
  version: number;
  state: string;
  homeScore?: number | null;
  awayScore?: number | null;
  currentPeriod?: string | null;
  timestamp: string;
}
