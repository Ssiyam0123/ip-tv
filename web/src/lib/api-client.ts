import { env } from './env';
import type {
  AuthResponse,
  RegisterInput,
  LoginInput,
  PaginatedResponse,
  Category,
  Channel,
  ChannelDetail,
  ChannelsQuery,
  PlaybackSession,
  Favorite,
  Match,
  MatchesQuery,
  User,
  ApiError,
  FavoriteItem,
  AdminChannel,
  AdminSource,
  PatchChannelInput,
  PatchSourceInput,
  SyncRun,
  HealthCheckChannel,
} from './api.types';

// ─── Token Store ─────────────────────────────────────────────────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ─── CSRF Token ──────────────────────────────────────────────────────────────

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

class ApiErrorError extends Error {
  public code: string;
  public requestId: string;
  public details: Record<string, unknown>;

  constructor(apiError: ApiError['error']) {
    super(apiError.message);
    this.name = 'ApiError';
    this.code = apiError.code;
    this.requestId = apiError.requestId;
    this.details = apiError.details ?? {};
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { skipAuth?: boolean; params?: Record<string, string | undefined> },
): Promise<T> {
  const url = new URL(`${env.API_BASE_URL}${path}`);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options?.skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (csrfToken && body !== undefined && method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!res.ok) {
    let apiError: ApiError;
    try {
      apiError = await res.json();
    } catch {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    throw new ApiErrorError(apiError.error);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  register: (input: RegisterInput) =>
    request<{ data: AuthResponse }>('POST', '/auth/register', input),

  login: (input: LoginInput) =>
    request<{ data: AuthResponse }>('POST', '/auth/login', input),

  googleAuth: (idToken: string) =>
    request<{ data: AuthResponse }>('POST', '/auth/google', { idToken }),

  refresh: (refreshToken: string) =>
    request<{ data: AuthResponse }>('POST', '/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    request<void>('POST', '/auth/logout', { refreshToken }),

  getMe: () =>
    request<{ data: User }>('GET', '/me'),

  deleteAccount: () =>
    request<void>('DELETE', '/me'),
};

// ─── Catalog API ─────────────────────────────────────────────────────────────

export const catalogApi = {
  getCategories: () =>
    request<{ data: Category[] }>('GET', '/categories'),

  getChannels: (query: ChannelsQuery) =>
    request<PaginatedResponse<Channel>>('GET', '/channels', undefined, {
      params: {
        category: query.category,
        query: query.query,
        status: query.status,
        cursor: query.cursor,
        limit: query.limit?.toString(),
      },
    }),

  getChannel: (channelId: string) =>
    request<{ data: ChannelDetail }>('GET', `/channels/${channelId}`),
};

// ─── Playback API ────────────────────────────────────────────────────────────

export const playbackApi = {
  createSession: (channelId: string) =>
    request<{ data: PlaybackSession }>('POST', `/channels/${channelId}/playback-session`),
};

// ─── Favorites API ───────────────────────────────────────────────────────────

export const favoritesApi = {
  getFavorites: (cursor?: string, limit?: number) =>
    request<PaginatedResponse<FavoriteItem>>('GET', '/favorites', undefined, {
      params: { cursor, limit: limit?.toString() },
    }),

  addFavorite: (channelId: string) =>
    request<{ data: Favorite }>('PUT', `/favorites/${channelId}`),

  removeFavorite: (channelId: string) =>
    request<void>('DELETE', `/favorites/${channelId}`),
};

// ─── Scores API ──────────────────────────────────────────────────────────────

export const scoresApi = {
  getMatches: (query: MatchesQuery) =>
    request<PaginatedResponse<Match>>('GET', '/matches', undefined, {
      params: {
        sport: query.sport,
        state: query.state,
        date: query.date,
        cursor: query.cursor,
        limit: query.limit?.toString(),
      },
    }),

  getMatch: (matchId: string) =>
    request<{ data: Match }>('GET', `/matches/${matchId}`),
};

// ─── Admin API ───────────────────────────────────────────────────────────────

export const adminApi = {
  getChannels: (cursor?: string, limit?: number) =>
    request<PaginatedResponse<AdminChannel>>('GET', '/admin/channels', undefined, {
      params: { cursor, limit: limit?.toString() },
    }),

  patchChannel: (channelId: string, input: PatchChannelInput) =>
    request<{ data: AdminChannel }>('PATCH', `/admin/channels/${channelId}`, input),

  getSources: (cursor?: string, limit?: number) =>
    request<PaginatedResponse<AdminSource>>('GET', '/admin/sources', undefined, {
      params: { cursor, limit: limit?.toString() },
    }),

  patchSource: (sourceId: string, input: PatchSourceInput) =>
    request<{ data: AdminSource }>('PATCH', `/admin/sources/${sourceId}`, input),

  triggerSync: () =>
    request<{ data: SyncRun }>('POST', '/admin/sync-runs'),

  getSyncRun: (runId: string) =>
    request<{ data: SyncRun }>('GET', `/admin/sync-runs/${runId}`),

  getHealthChecks: (cursor?: string, limit?: number) =>
    request<PaginatedResponse<HealthCheckChannel>>('GET', '/admin/health-checks', undefined, {
      params: { cursor, limit: limit?.toString() },
    }),
};

export { ApiErrorError };
