# TempShield Workspace

## Overview

TempShield is a production-grade SaaS platform for disposable email detection. It provides a developer API to detect disposable/burner email domains, with a full dashboard, API key management, reputation scoring, webhooks, custom blocklists, bulk verification, and an admin panel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/tempshield) with Tailwind CSS, Framer Motion, Recharts
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Session-based (in-memory session store + HTTP-only cookies)
- **Build**: esbuild (for API server)

## Structure

```text
├── artifacts/
│   ├── api-server/        # Express API server (port 8080, served at /api)
│   └── tempshield/        # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/          # OpenAPI spec + Orval codegen config
│   ├── api-client-react/  # Generated + extended React Query hooks
│   ├── api-zod/           # Generated Zod schemas from OpenAPI
│   └── db/                # Drizzle ORM schema + DB connection
├── scripts/               # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** — id, name, email, password (hashed), apiKey, role (USER/ADMIN), plan (text), requestCount, requestLimit, createdAt
- **api_usage** — id, userId, endpoint, email (nullable), domain (nullable), isDisposable (nullable), reputationScore (nullable), timestamp
- **domains** — id, domain, source, createdAt (disposable email domains from GitHub)
- **upgrade_requests** — id, userId, planRequested, status (PENDING/APPROVED/REJECTED), note, createdAt
- **plan_configs** — id, plan (text), requestLimit, mxDetectLimit, inboxCheckLimit, websiteLimit, pageLimit, mxDetectionEnabled, inboxCheckEnabled
- **user_websites** — id, userId, domain, createdAt (unique: userId+domain)
- **user_pages** — id, userId, path, createdAt (unique: userId+path)
- **user_api_keys** — id, userId, name, key (unique), createdAt (named secondary API keys)
- **webhooks** — id, userId, url, secret (nullable), enabled, createdAt
- **custom_blocklist** — id, userId, domain, createdAt (unique: userId+domain)

## Rate Limits

- FREE: 10 requests (lifetime for dev, monthly in prod)
- BASIC: 1,000/month
- PRO: 10,000/month
- Custom plans configurable via admin panel

## Reputation Scoring

Each email check returns a `reputationScore` (0-100):
- Starts at 100
- -60 if disposable domain
- -20 if no MX records
- -15 if inbox unreachable
- -5 if free email provider (gmail, yahoo, etc.)
- Custom blocklist also forces disposable=true

## Key API Routes

**Auth:**
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — login
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — current user

**Email Detection:**
- `POST /api/check-email` — single email check (Bearer key or session)
- `POST /api/check-emails/bulk` — bulk check up to 100 emails at once

**User Dashboard:**
- `GET /api/user/dashboard` — full dashboard stats + counts
- `POST /api/user/api-key/regenerate` — regenerate primary API key
- `GET /api/user/api-keys` — list named API keys
- `POST /api/user/api-keys` — create named API key
- `DELETE /api/user/api-keys/:id` — delete named API key
- `GET /api/user/webhooks` — list webhooks
- `POST /api/user/webhooks` — create webhook
- `PATCH /api/user/webhooks/:id` — update webhook
- `DELETE /api/user/webhooks/:id` — delete webhook
- `GET /api/user/blocklist` — list custom blocked domains
- `POST /api/user/blocklist` — add domain to blocklist
- `DELETE /api/user/blocklist/:id` — remove domain from blocklist
- `GET /api/user/usage` — audit log (last 100 checks with email/domain/score)
- `POST /api/user/upgrade` — request plan upgrade

**Admin:**
- `GET /api/admin/users` — all users
- `PATCH /api/admin/users/:id/plan` — update user plan
- `DELETE /api/admin/users/:id` — delete user
- `POST /api/admin/users/:id/reset-usage` — reset usage counter
- `POST /api/admin/users/:id/revoke-key` — regenerate API key
- `GET /api/admin/upgrade-requests` — upgrade requests
- `PATCH /api/admin/upgrade-requests/:id` — approve/reject
- `POST /api/admin/domains/sync` — sync domains from GitHub
- `GET /api/admin/stats` — platform stats
- `GET /api/admin/plan-config` — all plan configs
- `POST /api/admin/plan-config` — create custom plan
- `PATCH /api/admin/plan-config/:plan` — update plan config
- `DELETE /api/admin/plan-config/:plan` — delete custom plan

## Webhooks

On every email check, enabled webhooks receive a POST:
```json
{
  "event": "email.detected",
  "email": "user@example.com",
  "domain": "example.com",
  "isDisposable": true,
  "reputationScore": 40,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```
Signed with HMAC-SHA256 in `X-TempShield-Signature: sha256=<hex>` header.

## Named API Keys (Multi-Key)

- FREE/BASIC: 1 named key max
- PRO+: 10 named keys max
- All named keys share the same account quota
- Returned as masked on list; full key only shown once on creation

## Domain Sync

Domains are fetched from: https://github.com/disposable-email-domains/disposable-email-domains
Loaded into memory cache on startup for fast detection. Admin "Sync Now" button updates the DB and refreshes cache.

## Admin Credentials (dev)

- Email: admin@tempshield.io
- Password: admin123

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json`. The `api-client-react` lib uses `composite: true` and must be built (`tsc --build` in lib/api-client-react) before TypeScript project references work. Run `pnpm run typecheck` from root for full check.
