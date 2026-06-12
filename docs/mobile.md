# Production Android Agent Specification

## Agent Mandate

Act as Lead Android Engineer. Build complete production-ready native Android client; do
not stop at scaffolding or plans. Inspect repository first, preserve unrelated changes,
implement with tests, and leave no placeholders or unfinished TODOs.

Product: authorized live sports/news TV, football/cricket scores, guest browsing,
authentication, favorites, offline-aware catalog, and stream fallback.

## Product and Security Boundaries

- Play only streams operator is authorized to distribute.
- Never bypass DRM, paywalls, geo-blocks, signed URLs, origin controls, or provider terms.
- Never parse remote M3U playlists in app.
- Never send arbitrary URLs to backend.
- Do not spoof headers to defeat provider controls.
- Never log/store provider secrets or unencrypted refresh credentials.

## Objective

Build native Android client matching shared API behavior with robust Media3 playback,
Compose UI, offline-aware state, live scores, and favorites.

## Binding Backend Contract

- Base URL: build configuration plus `/api/v1`.
- JSON: `camelCase`; timestamps: UTC ISO 8601; IDs: opaque UUID.
- Auth header uses bearer access token.
- Lists use cursor pagination with `data` and `page`.
- Error envelope: `{ "error": { "code", "message", "requestId", "details" } }`.
- Generate Kotlin DTOs from backend OpenAPI or validate hand-written DTOs with fixtures.

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

Use Google Authorization Code + PKCE. Access tokens are short-lived. Store rotating
refresh credential only in Android encrypted storage.

## Stack

- Kotlin, Jetpack Compose, Material 3.
- Clean feature-oriented architecture with ViewModel and unidirectional state flow.
- Coroutines and Flow.
- Retrofit/OkHttp, Kotlin serialization.
- Media3 ExoPlayer.
- Socket.IO client behind repository interface.
- Hilt, Room only for bounded local cache, Coil.
- JUnit, Turbine, MockWebServer, Compose UI tests.

## Screens

- Auth: sign in, register, Google sign-in, continue as guest.
- Home: score rail, category chips, search, channel list/grid.
- Player: video, channel details, source selector, related channels, recovery state.
- Scores: live/upcoming/recent tabs with sport filter.
- Match detail: score snapshot, status, available statistics, stale indicator.
- Favorites: saved channels or guest prompt.
- Settings: account, sessions, privacy, logout, account deletion.
- Offline and no-playable-source screens.

Phone navigation uses bottom bar. Large screens use adaptive navigation rail and
two-pane player where space permits.

## Architecture

```text
mobile/app/src/main/java/.../
  core/network/
  core/database/
  core/model/
  core/player/
  core/auth/
  feature/auth/
  feature/home/
  feature/player/
  feature/scores/
  feature/favorites/
  feature/settings/
```

Generate DTOs from OpenAPI or verify hand-written DTOs through contract fixtures.
Map transport DTOs into domain models before UI.

## Authentication

- Use Google Authorization Code + PKCE flow.
- Store refresh credential only in encrypted storage.
- Keep access token in memory where practical.
- OkHttp authenticator performs one synchronized refresh; prevent refresh storms.
- On refresh failure, clear session and preserve guest access.
- Never log tokens or full authenticated requests.

## Player

- Build Media3 player controller isolated from Compose rendering.
- Request playback session by channel ID.
- Try ordered candidates with bounded retry and failover.
- Release player on final disposal. Pause/background behavior follows user setting and
  Android lifecycle.
- Support Picture-in-Picture only during active playback and on supported devices.
- Handle audio focus, noisy intent, network loss, rotation, process recreation, and
  foreground/background transitions.
- Landscape immersive mode uses standard controls; brightness/volume gestures are optional
  post-MVP, not required.
- Do not spoof headers to bypass provider controls. Apply provider-approved headers only
  from secure backend-mediated configuration.

## Data and Offline Behavior

- Cache categories, channel summaries, favorites, and recent match snapshots with bounded
  retention.
- Cached playback URLs must not outlive server expiry.
- Show cached catalog offline but disable playback when no valid source can be resolved.
- Queue no favorite mutations offline for MVP; show retry state to avoid conflicts.
- Expose loading, content, empty, stale, offline, and error states explicitly.

## Scores

- REST snapshot before socket subscription.
- Subscribe only while relevant screen is active.
- Convert callbacks to cold/managed Flow with proper cancellation.
- De-duplicate by match version.
- Re-fetch after reconnect or version gap.

## UI and Accessibility

- Dark Material 3 theme with restrained translucent surfaces.
- Minimum 48 dp touch targets, content descriptions, scalable text, high contrast, and
  TalkBack order.
- Phone, tablet, portrait, and landscape layouts.
- Avoid autoplay with sound.

## Security and Platform

- Network Security Config blocks cleartext outside debug-only local development.
- Certificate pinning only if operational key rotation is designed; otherwise rely on
  platform TLS.
- Release builds disable verbose logging and are minified with tested rules.
- Secrets and OAuth client settings use Gradle configuration, never committed values.
- Add privacy manifest/data-safety documentation matching actual collection.

## Tests

- Unit: reducers/ViewModels, failover policy, token refresh synchronization, DTO mapping.
- Network: MockWebServer auth, pagination, errors, and refresh.
- Player: candidate ordering, lifecycle release, expired session recovery.
- Socket: reconnect, cancellation, duplicate version suppression.
- Compose: navigation, guest/auth states, filters, favorites, accessibility semantics.
- Instrumentation smoke test on supported API levels.

## Acceptance Criteria

- Guest can browse and play authorized channel.
- Login persists securely across process restart.
- Offline catalog displays clear stale state.
- Source failure advances once through candidates without loop.
- Player releases resources and does not leak activity/context.
- PiP enters/exits without duplicate audio.
- Score reconnect returns one current state.
- Phone/tablet and rotation tests pass.
- Unit, UI, lint, and release build pass.

## Delivery Order

1. Android foundation, DI, API models, networking, theme, tests, CI.
2. Adaptive navigation and shared UI states.
3. Catalog cache, home, search, categories, pagination.
4. Media3 playback, lifecycle, session expiry, retry/fallback, PiP.
5. Auth, encrypted session, favorites, settings, account deletion.
6. Score list/detail and lifecycle-aware Socket.IO flow.
7. Accessibility, device/API matrix, release security and production hardening.

## Definition of Done

All screens and states work with real backend contract; unit, network, player, socket,
Compose UI, accessibility, lint, and release build pass; lifecycle tests show no leaked
player/activity; release contains no secrets or verbose authenticated logs.
