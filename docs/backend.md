# Production Backend Agent Specification

## Agent Mandate

Act as Principal Backend Engineer. Build complete production-ready backend; do not stop
at scaffolding or plans. Inspect existing repository first, preserve unrelated changes,
then implement phase-by-phase using tests. No placeholders, fake production integrations,
disabled tests, or unfinished TODOs.

Product: authorized live sports/news TV, football/cricket scores, guest browsing,
authentication, favorites, stream fallback, and admin operations.

## Product and Legal Boundaries

- Use only streams and feeds operator is authorized to redistribute.
- Never bypass DRM, paywalls, signed URL restrictions, geo-blocks, origin controls, or
  provider terms.
- Never accept arbitrary proxy URLs from clients.
- Proxy only configured authorized hosts using strict SSRF protection.
- Do not scrape providers unless terms and robots policy permit it.
- Store attribution, license status, territory, and review metadata per source.
- Never commit credentials, provider keys, private URLs, or production secrets.

## Objective

Build API and worker as single source of truth for Next.js web and native Android clients.
Backend owns auth, catalog, playback resolution, favorites, score normalization, health,
provider integrations, and admin operations. Clients never parse remote playlists or
hold provider secrets.

## Binding API Contract

- Base path: `/api/v1`.
- JSON: `camelCase`; timestamps: UTC ISO 8601; IDs: opaque UUID.
- Auth: `Authorization: Bearer <accessToken>`.
- Every response includes `x-request-id`.
- Lists use cursor pagination: `limit` default 24, max 100, optional `cursor`.
- Standard error:

```json
{
  "error": {
    "code": "CHANNEL_NOT_FOUND",
    "message": "Channel was not found.",
    "requestId": "uuid",
    "details": {}
  }
}
```

Public:

- `GET /health/live`
- `GET /health/ready`
- `GET /categories`
- `GET /channels?category=&query=&status=&cursor=&limit=`
- `GET /channels/{channelId}`
- `POST /channels/{channelId}/playback-session`
- `GET /matches?sport=&state=&date=&cursor=&limit=`
- `GET /matches/{matchId}`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`
- `DELETE /me`

Authenticated:

- `GET /favorites?cursor=&limit=`
- `PUT /favorites/{channelId}`
- `DELETE /favorites/{channelId}`

Admin:

- `GET /admin/channels`
- `PATCH /admin/channels/{channelId}`
- `GET /admin/sources`
- `PATCH /admin/sources/{sourceId}`
- `POST /admin/sync-runs`
- `GET /admin/sync-runs/{runId}`
- `GET /admin/health-checks`

`playback-session` accepts channel ID, never URL. Return short-lived ordered candidates:

```json
{
  "data": {
    "sessionId": "uuid",
    "channelId": "uuid",
    "expiresAt": "2026-06-12T12:10:00Z",
    "sources": [
      {
        "sourceId": "uuid",
        "playbackUrl": "https://api.example.com/api/v1/playback/uuid/master.m3u8",
        "quality": "auto",
        "priority": 1
      }
    ]
  }
}
```

Socket.IO namespace `/scores`:

- Client: `match:subscribe`, `match:unsubscribe` with `{ "matchId": "uuid" }`.
- Server: `match:snapshot`, `match:update`, `match:error`.
- Updates contain monotonically increasing `version`; clients re-fetch after reconnect or
  version gap.

## Stack

- Current supported Node.js LTS and strict TypeScript.
- Express, Prisma, PostgreSQL.
- Zod for configuration and request validation.
- Jest and Supertest.
- Socket.IO for score updates.
- Pino structured logging.
- OpenAPI 3.1.
- Docker for local and production images.

Use exact dependency versions through package manager lockfile. Do not manually edit
lockfile.

## Required Structure

```text
backend/
  src/
    app/
    config/
    modules/auth/
    modules/catalog/
    modules/favorites/
    modules/playback/
    modules/scores/
    modules/admin/
    integrations/catalog/
    integrations/scores/
    jobs/
    security/
    observability/
  prisma/
  openapi/
  tests/unit/
  tests/integration/
```

Keep controllers thin. Domain services cannot import Express. Provider adapters cannot
leak provider response shapes outside integration modules.

## Data Model

Implement:

- `User`, `AuthIdentity`, `RefreshSession`.
- `Category`, `Channel`, `Provider`, `StreamSource`, `StreamHealthCheck`.
- `Favorite`.
- `Competition`, `Team`, `Match`, `MatchSnapshot`.
- `SyncRun`, `AuditLog`.

Key constraints:

- Unique normalized email.
- Unique favorite `(userId, channelId)`.
- Unique provider external ID per entity type.
- Index channel status/category/title and match sport/state/start time.
- Store provider secrets outside database when possible.
- Store source license status, attribution, authorization notes, and review timestamp.
- Soft-disable channels and sources; do not silently delete operator records.

## Catalog Sync

- Run in separate worker, never inside API startup.
- Fetch configured authorized playlists/providers using timeouts, size limits, retries,
  exponential backoff, and conditional requests.
- Parse M3U with maintained parser, not regular expressions.
- Normalize names, URLs, categories, language, and country codes.
- Upsert by stable provider identity.
- Quarantine new sources until authorization metadata and validation pass.
- Use advisory lock so only one sync runs at a time.
- Persist run counters, failures, duration, and provider response metadata.

## Stream Health

- Limit concurrency per provider and globally.
- Validate manifests with bounded GET; HEAD alone is insufficient.
- Do not download media segments during routine checks.
- Follow limited redirects and revalidate every target.
- Track latency, HTTP result, content type, failure reason, and checked time.
- Derive `ACTIVE`, `DEGRADED`, or `OFFLINE` from recent health window.
- Use circuit breaker for repeatedly failing upstreams.

## Playback

- Client requests playback by channel ID.
- Resolve enabled, authorized, recently healthy sources by priority.
- Return short-lived session URLs.
- Prefer direct authorized CDN URLs when CORS/client support permits.
- Proxy only configured sources. Validate protocol, DNS result, redirects, port, response
  size, and content type. Block private/reserved networks and strip hop-by-hop headers.
- Rewrite HLS manifest URLs only within same authorized provider boundary.
- Apply per-user/IP concurrency, bandwidth, and rate limits.
- Never log signed query strings or authorization headers.

## Authentication

- Passwords: Argon2id with tuned parameters.
- Normalize email and use generic login errors.
- Rate-limit registration, login, refresh, and OAuth endpoints.
- Verify Google issuer, audience, signature, expiry, and nonce.
- Prevent unsafe automatic account linking.
- Rotate refresh tokens; detect reuse and revoke token family.
- Enforce RBAC on admin routes.
- Support account deletion and session revocation.

## Scores

- Define `ScoreProvider` interface and one real authorized adapter.
- Poll live matches at provider-safe intervals; slow polling for scheduled/finished games.
- Normalize football and cricket into contract models.
- Cache current state in memory for one API instance; database remains durable fallback.
- Publish updates only when normalized state changes.
- Include version and stale timestamp.
- Socket subscriptions use match-scoped rooms and bounded counts.

## Security

- Helmet with explicit policy, strict CORS allowlist, body-size limits, request timeout,
  validation, parameterized database access, and centralized error mapping.
- Trust proxy only when deployment topology is configured.
- CSRF protection for cookie-authenticated web mutations.
- Secrets loaded from environment/secret manager and validated on startup.
- Audit admin mutations without logging sensitive values.

## Operations

- Separate `api` and `worker` entrypoints.
- Graceful shutdown for HTTP, sockets, jobs, and database.
- Liveness checks process only; readiness checks required dependencies.
- Metrics: request duration/error rate, active sockets, provider failures, sync duration,
  playable channels, stale matches, proxy bandwidth.
- Database migrations run as release job, not on every replica startup.
- Include backup/restore and incident runbooks.

## Tests

- Unit: normalization, ordering, auth token rotation, health derivation, URL validation.
- Integration: every API route, database constraints, RBAC, CSRF, rate limits.
- Security: SSRF variants, redirect-to-private-IP, malformed manifests, token reuse.
- Contract: validate responses against OpenAPI.
- Worker: sync idempotency, lock behavior, partial provider outage.

## Acceptance Criteria

- All endpoints in contract implemented and documented.
- Guest and authenticated behavior differ only where specified.
- Retried favorite writes remain correct.
- One failed source automatically falls through to next source.
- Arbitrary URLs and private IP targets cannot reach proxy.
- Duplicate worker execution cannot corrupt catalog.
- API remains usable with score provider unavailable and marks data stale.
- Test, lint, type-check, migration validation, and production build pass.

## Delivery Order

1. Compliance/config gate and provider registry.
2. Project foundation, CI, OpenAPI, database, observability.
3. Catalog sync, health checks, public catalog, admin API.
4. Playback resolution and hardened optional proxy.
5. Authentication and idempotent favorites.
6. Authorized score provider, polling, REST, Socket.IO.
7. Load/security tests, backup restore, rollback, alerts, runbooks.

## Definition of Done

All acceptance criteria pass; unit, integration, contract, security, lint, type-check,
migration, and build commands pass; failure states work; OpenAPI and runbooks are current;
no critical/high dependency vulnerability lacks documented resolution.
