# Production Admin Panel Agent Specification

## Agent Mandate

Act as Principal Full-Stack Engineer and Security-Focused Product Designer. Build a
complete production-ready admin panel for controlling backend-managed behavior of web and
Android applications. Do not stop at mockups, scaffolding, or plans. Inspect existing
repositories first, preserve unrelated changes, implement with tests, and leave no
placeholders, fake production integrations, disabled tests, or unfinished TODOs.

Admin panel controls shared server data and approved runtime configuration. It must never
execute arbitrary code on clients, bypass app-store review, silently weaken security, or
directly modify mobile/web source files.

## Product Boundaries

- Manage only streams and feeds operator is authorized to distribute.
- Never bypass DRM, paywalls, signed URL restrictions, geo-blocking, origin controls, or
  provider terms.
- Never accept arbitrary proxy URLs from browser or expose provider secrets.
- Never permit raw HTML, JavaScript, SQL, shell commands, or executable remote config.
- Destructive actions require confirmation, authorization, audit log, and safe rollback.
- Secrets remain in secret manager/environment configuration, never admin forms or logs.
- Every channel and provider stores licensing, attribution, territory, and review data.

## Objective

Build secure web admin application backed by `/api/v1/admin`. Authorized staff can manage:

- Dashboard and operational health.
- Categories, channels, stream sources, logos, ordering, and visibility.
- Playlist/provider sync, validation, source health, and playback diagnostics.
- Football/cricket competitions, teams, matches, provider mappings, and stale data.
- Users, roles, sessions, bans, and account support.
- Web/mobile feature flags and safe remote configuration.
- Home sections, featured channels, score rails, announcements, and maintenance mode.
- Mobile minimum/recommended versions and forced-update messaging.
- Web release notices and cache refresh.
- Legal pages, support links, attribution, and takedown contacts.
- Audit logs, security events, metrics, alerts, and job history.

## Recommended Stack

- Current stable Next.js App Router with strict TypeScript.
- Tailwind CSS and accessible component primitives.
- TanStack Query, React Hook Form, Zod.
- Generated TypeScript client from backend OpenAPI.
- Secure server-side session integration with backend.
- Jest/React Testing Library and Playwright.
- Optional chart library loaded only for dashboard views.

Admin panel must remain a separate application or protected route group deployable
independently from public web client.

## Roles and Permissions

Implement least-privilege RBAC:

- `SUPER_ADMIN`: role assignment, security settings, destructive actions, all access.
- `ADMIN`: catalog, app configuration, users, operations; cannot grant `SUPER_ADMIN`.
- `CONTENT_MANAGER`: categories, channels, featured content, announcements, legal text.
- `STREAM_OPERATOR`: sources, health checks, sync runs, playback diagnostics.
- `SPORTS_EDITOR`: competitions, teams, matches, provider mappings, score corrections.
- `SUPPORT_AGENT`: read users, revoke sessions, disable accounts; cannot view secrets.
- `VIEWER`: read-only dashboards and records.

Backend enforces every permission. Hiding UI controls is not authorization. Sensitive
actions require recent re-authentication. Super-admin accounts require MFA.

## Authentication and Session Security

- No public registration.
- Invite administrators through expiring single-use invitation.
- Require strong password or approved identity provider.
- Require MFA for privileged roles.
- Use secure HTTP-only same-site cookies and CSRF protection.
- Short idle timeout and absolute session expiry.
- Show active admin sessions and allow revocation.
- Rate-limit login, MFA, invitations, exports, and sensitive mutations.
- Record successful/failed login, role change, MFA reset, and session revocation.

## Admin Routes and Screens

### `/admin/login`

- Email/password or approved SSO.
- MFA challenge.
- Generic authentication errors.
- Locked/expired invitation handling.

### `/admin`

- Active, degraded, and offline channel counts.
- Live/upcoming matches and stale-score count.
- API latency/error rate, active sockets, worker status, proxy bandwidth.
- Recent failed syncs, provider incidents, security alerts, and pending reviews.
- Quick actions based on permission.

### `/admin/catalog/categories`

- Create, edit, reorder, enable, and disable categories.
- Manage slug, display name, icon key, audience, and visibility.
- Prevent deleting categories still referenced by channels.

### `/admin/catalog/channels`

- Search/filter by category, country, language, status, provider, license state.
- Create/edit channel title, slug, logo, category, country, language, attribution.
- Enable, disable, feature, reorder, preview, and soft-delete.
- Bulk enable/disable/category change only with preview and confirmation.
- Show source count, playable status, last health check, and affected client surfaces.

### `/admin/catalog/channels/[channelId]`

- Channel metadata and change history.
- Ordered stream sources.
- Related channels and home placement.
- Playback diagnostic using server-created admin diagnostic session.
- Source health timeline and failure reasons.
- License/authorization evidence metadata.
- Preview web and mobile presentation using safe predefined components.

### `/admin/streams`

- Manage provider, external ID, source URL through protected backend workflow, quality,
  priority, territory, expiration, and approved headers.
- Source URL is masked after save.
- Validate URL and authorization before activation.
- Run bounded health check and inspect sanitized results.
- Reorder fallback priority.
- Never expose signed query strings or provider credentials to browser.

### `/admin/providers`

- Provider name, type, attribution, terms URL, allowed use, territory, contact, review date.
- Integration status and last successful fetch.
- Credentials referenced by secret identifier only.
- Pause provider without deleting imported records.

### `/admin/sync-runs`

- Start authorized catalog/score sync.
- Show queued, running, successful, partial, and failed states.
- Display sanitized counters, duration, errors, and changed records.
- Prevent concurrent duplicate jobs.
- Retry only failed safe operations.

### `/admin/sports`

- Competition, season, team, match, and provider mapping management.