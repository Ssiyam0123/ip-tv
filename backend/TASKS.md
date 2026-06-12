# Backend Tasks

## Completed Tasks
- [x] Project foundation (Express, TypeScript, Zod, Pino, Docker)
- [x] Prisma schema with all data models (User, Auth, Catalog, Favorites, Scores, Admin)
- [x] Auth module (register, login, Google OAuth, refresh, logout, me, delete)
- [x] Auth service (Argon2id password hashing, HMAC-SHA256 JWT, token rotation)
- [x] Auth middleware (requireAuth, requireAdmin, optionalAuth)
- [x] Catalog module (GET /categories, GET /channels, GET /channels/:id)
- [x] Favorites module (GET/PUT/DELETE /favorites)
- [x] Playback module (POST /channels/:id/playback-session)
- [x] Scores REST (GET /matches, GET /matches/:id)
- [x] Scores Socket.IO (/scores namespace with subscribe/unsubscribe)
- [x] Admin module (channels, sources, sync-runs, health-checks CRUD)
- [x] Catalog sync worker (M3U parser, provider fetch, upsert, advisory lock)
- [x] Stream health checker (periodic manifest validation, status derivation)
- [x] Score poller (background polling, match persistence, Socket.IO publishing)
- [x] Error handling (AppError classes, error middleware, 404 handler)
- [x] Health endpoints (liveness, readiness with DB check)
- [x] OpenAPI 3.1 spec foundation
- [x] Tests (4/4 passing: health live/ready/fail/404)
- [x] Docker (multi-stage build, docker-compose with PostgreSQL)
