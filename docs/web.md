# Production Web Agent Specification

## Agent Mandate

Act as Senior Frontend Engineer and UI/UX Designer. Build complete production-ready web
client; do not stop at mockups, scaffolding, or plans. Inspect repository first, preserve
unrelated changes, implement with tests, and leave no placeholders or unfinished TODOs.

Product: authorized live sports/news TV, football/cricket scores, guest browsing,
authentication, favorites, and automatic stream fallback.

## Product and Security Boundaries

- Play only streams operator is authorized to distribute.
- Never bypass DRM, paywalls, geo-blocks, signed URLs, origin controls, or provider terms.
- Never parse remote M3U playlists in browser.
- Never send arbitrary URLs to backend.
- Never expose provider keys, private upstream URLs, refresh tokens, or secrets.
- Do not imitate protected YouTube branding or exact layout; use familiar media UX only.

## Objective

Build responsive Next.js client for channel discovery, authorized HLS playback, live
scores, authentication, and favorites.

## Binding Backend Contract

- Base URL: configured environment value plus `/api/v1`.
- JSON: `camelCase`; timestamps: UTC ISO 8601; IDs: opaque UUID.
- Every response includes `x-request-id`.
- Lists use cursor pagination with `data` and `page`.
- Error envelope: `{ "error": { "code", "message", "requestId", "details" } }`.
- Generate TypeScript models from backend OpenAPI.

Required endpoints:

- `GET /categories`
- `GET /channels?category=&query=&status=&cursor=&limit=`
- `GET /channels/{channelId}`
- `POST /channels/{channelId}/playback-session`
- `GET /matches?sport=&state=&date=&cursor=&limit=`
- `GET /matches/{matchId}`
- `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`
- `GET /me`, `DELETE /me`
- `GET /favorites`
- `PUT /favorites/{channelId}`
- `DELETE /favorites/{channelId}`

Playback session returns `sessionId`, `channelId`, `expiresAt`, and ordered `sources`
containing `sourceId`, `playbackUrl`, `quality`, and `priority`. It accepts no URL.

Socket.IO namespace `/scores`:

- Emit `match:subscribe` and `match:unsubscribe` with `matchId`.
- Handle `match:snapshot`, `match:update`, and `match:error`.
- De-duplicate by increasing `version`; re-fetch REST snapshot after reconnect/version gap.

Access tokens expire within 15 minutes. Web authentication uses secure HTTP-only,
same-site cookies; JavaScript never reads refresh token. Mutations use CSRF protection.

## Stack

- Current stable Next.js App Router and strict TypeScript.
- Tailwind CSS, TanStack Query, Zod, Lucide icons.
- `hls.js` where native HLS is unavailable.
- Socket.IO client.
- Jest/React Testing Library and Playwright.

## Routes

- `/`: home with live-score rail, category chips, search, and channel grid.
- `/watch/[channelId]`: player, source recovery, channel details, related channels.
- `/scores`: live/upcoming/recent football and cricket.
- `/scores/[matchId]`: match detail and real-time updates.
- `/favorites`: saved channels or guest sign-in prompt.
- `/auth/sign-in`, `/auth/register`, `/auth/callback`.
- `/settings`: account, sessions, privacy, logout, account deletion.
- `not-found`, route error, and global offline states.

## Layout

- Mobile-first responsive shell.
- Desktop: header plus collapsible sidebar.
- Mobile: header plus bottom navigation.
- Dark theme by default. Restrained glass effects; preserve contrast and performance.
- YouTube-like familiarity without copying protected branding or exact layouts.

## Core Components

- `AppShell`, `Header`, `Sidebar`, `MobileNav`.
- `ScoreRail`, `ScoreCard`, `MatchStatus`.
- `CategoryChips`, `ChannelGrid`, `ChannelCard`, `ChannelSkeleton`.
- `HlsPlayer`, `PlayerControls`, `PlaybackError`, `SourceSelector`.
- `FavoriteButton`, `SearchInput`, `EmptyState`, `ErrorState`, `OfflineBanner`.

## Data and Auth

- Generate API types from OpenAPI.
- Server-render public catalog where useful; hydrate TanStack Query safely.
- Never expose refresh token to JavaScript.
- Use backend cookie session flow and CSRF token for mutations.
- Guest browsing and playback require no login.
- Favorites and settings require authenticated user.
- Cache public lists briefly; invalidate favorites after idempotent writes.

## Player Behavior

- Request playback session by channel ID.
- Attempt sources in server-provided order.
- On fatal playback error, retry current source with bounded backoff, then switch once to
  next candidate.
- Show recovery status. Never create infinite retry loop.
- Preserve volume preference locally; default muted only when autoplay policy requires it.
- Support play/pause, mute, volume, fullscreen, quality when manifest exposes variants,
  and explicit source selector.
- Destroy HLS instance and listeners on route change/unmount.
- Do not send arbitrary URLs to backend.

## Real-Time Scores

- Fetch REST snapshot first.
- Subscribe only on visible match detail or live cards.
- On reconnect/version gap, re-fetch snapshot.
- Display `isStale` state and last update time.
- Keep score failure independent from video playback.

## UX States

Every data surface handles:

- Loading skeleton.
- Empty result.
- Recoverable error with retry.
- Offline state.
- Stale cached data.
- Unauthorized session expiry.
- Channel offline/no playable source.

## Accessibility and Performance

- WCAG 2.2 AA target.
- Full keyboard operation, visible focus, labels, semantic landmarks, and reduced motion.
- Captions exposed when provider supplies legal caption tracks.
- Responsive images and stable aspect ratios.
- Lazy-load below-fold cards.
- Avoid client-only rendering for entire app.
- Set measurable budgets: good Core Web Vitals on representative mobile hardware and no
  major layout shifts.

## Security

- No provider keys or upstream private URLs in client bundle.
- Render text safely; no untrusted HTML.
- Configure CSP compatible with authorized media origins.
- Use secure cookies and CSRF flow.
- Do not add CORS bypass extensions or browser workarounds.

## Tests

- Unit/component: filters, favorite state, source failover, stale score, auth guards.
- Integration: API error mapping and socket reconnect.
- E2E: guest browse/watch, login, favorite persistence, source failure recovery, logout.
- Accessibility scan for key routes.

## Acceptance Criteria

- All routes and states implemented; no empty placeholders.
- Guest reaches playable authorized channel in three interactions or fewer.
- Search/category filters update URL and survive refresh.
- Fatal source error moves to next candidate without page reload.
- Favorites synchronize after login.
- Socket reconnect produces current score without duplicates.
- Responsive layouts work at 360 px through desktop widths.
- Test, lint, type-check, and production build pass.

## Delivery Order

1. Next.js foundation, theme, API client, generated models, tests, CI.
2. App shell, responsive navigation, shared states.
3. Home catalog, search, category filtering, pagination.
4. HLS player, playback session, bounded retry and source fallback.
5. Auth, session expiry, favorites, settings, account deletion.
6. Score list/detail and Socket.IO reconnect.
7. Accessibility, performance, browser matrix, production hardening.

## Definition of Done

All routes and states work with real backend contract; unit, integration, E2E,
accessibility, lint, type-check, and production build pass; no secrets ship to browser;
failure/offline/stale states are usable.
