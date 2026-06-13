# Project Memory

> Persistent context that AI agents carry across sessions.
> Update this file as the project evolves. Keep it under 200 lines.

## Architecture Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-30 | Express with Express-Router | Lightweight, modular routing for REST API. |
| 2026-05-30 | PostgreSQL for Storage | Relational database with strict validation and transaction support. |
| 2026-06-13 | iptv-org GitHub as sports M3U source | Free, publicly maintained, categorised by sport. Channels seeded as `quarantined` requiring admin review. |
| 2026-06-13 | HLS stream proxy via `/api/v1/proxy/stream` | Avoids CORS issues, hides raw URLs, rewrites M3U8 segment paths. |
| 2026-06-13 | PWA (not Android native) for mobile | Fastest path to mobile-installable app. Service Worker + manifest added. |
| 2026-06-13 | @tanstack/react-query moved to dependencies | Was in devDependencies causing missing module in production builds. |

## Key Patterns

- **RESTful Endpoints:** Standard verbs (GET, POST, PUT, DELETE) and JSON response payloads.
- **Middleware Gates:** Authenticate and validate payloads before invoking controller logic.
- **Stream Proxy:** `GET /api/v1/proxy/stream?url=<encoded>` proxies HLS manifests, rewrites segment URLs.
- **Rate Limiting:** Playback session endpoint limited to 10/min per user/IP (in-memory map).
- **Category Detection:** Sports channels auto-classified into cricket/football/tennis/motorsports/combat-sports from title.
- **PWA:** `public/sw.js` service worker + `public/manifest.json`. Registered via `PwaInit` component.

## Known Issues

- Database connection pool handles automatic reconnects but may time out under cold start.
- iptv-org channels require admin approval (`licenseStatus: authorized`) before becoming streamable.
- Picture-in-Picture API not supported on all mobile browsers (gracefully skipped).

## Environment Notes

- OS: Platform independent (Docker compatible)
- CI: GitHub Actions
- Hosting: Render.com (render.yaml — both backend + web services)
- DB: Neon PostgreSQL (pooler URL)

## Session Notes

### Session: Initial Scaffolding
**Date:** 2026-05-30
**Agent:** Antigravity
**Summary:** Initialized base directory layout and added core diagnostic files.
**Files changed:** AGENTS.md, MEMORY.md, TASKS.md

### Session: Production Sports IPTV
**Date:** 2026-06-13
**Agent:** Antigravity
**Summary:** Took project to production level. Added sports categories, iptv-org seed, stream proxy, PWA, mobile nav with Sports tab, HLS player PiP + orientation lock, /sports page, service worker, render.yaml complete.
**Files changed:** render.yaml, prisma/seed.ts, playback.router.ts, web/package.json, web/public/manifest.json, web/public/sw.js, web/src/app/layout.tsx, web/src/app/sports/page.tsx, web/src/components/layout/mobile-nav.tsx, web/src/components/layout/app-shell.tsx, web/src/components/player/hls-player.tsx, web/src/components/ui/pwa-init.tsx, web/src/app/globals.css, web/next.config.ts