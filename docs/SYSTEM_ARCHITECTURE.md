# System architecture

## Overview
A **modular monolith** on Next.js 16 with Supabase as the system of record.

```
Browser ──► Next.js (proxy.ts: locale + session refresh + coarse route gate)
              ├─ Server Components (read via Supabase client AS THE USER → RLS applies)
              ├─ Server Actions (writes; Zod validation; same user-scoped client)
              ├─ Route Handlers  /api/* (payments, AI, school report), /auth/confirm, /uploads (dev)
              └─ server/* services (payments, ai, storage, rate-limit)  ── server-only
                         │
                         ▼
            Supabase: Auth (GoTrue) · PostgREST · PostgreSQL 16 (RLS, triggers, SECURITY DEFINER RPCs) · Storage
```

**Principle: the database is the final authority.** Pages and actions check roles for good UX, but every read and write goes through the signed-in user's Supabase client, so Row-Level Security policies and guard triggers decide. The service-role key is server-only and limited to: payment flows (`/api/payments/*` and `server/payments` — storing the provider checkout id and recording a *verified* result), rate-limit counters, AI usage logging, the contact-inbox insert (after validation + rate limit), and uploads to Supabase Storage. Each of these first authenticates the user (or verifies the provider signature) and checks ownership in code.

## Repository layout
| Path | Responsibility |
|---|---|
| `app/[locale]/…` | Routes for `en` and `ar` (66 pages). Public site, auth, `dashboard`, `learn`, `trainer`, `parent`, `school`, `admin`, `checkout`, `certificates`, `verify` |
| `app/api/…` | Route handlers: `ai/assistant`, `payments/checkout`, `payments/sandbox/complete`, `payments/hyperpay/{return,webhook}`, `school/report` |
| `features/<module>/` | Feature modules: `identity`, `catalog`, `enrollments`, `learning`, `trainer`, `parent`, `payments`, `portfolio`, `engagement`, `content`, `notifications`, `admin` — each with `actions.ts` (server actions), `queries.ts`, `ui/` |
| `server/` | Server-only services with provider adapters: `payments/{sandbox,hyperpay}`, `ai/{local,remote,guard}`, `storage` (local/Supabase), `rate-limit`, `http/guards` |
| `lib/` | Supabase clients (`server`, `admin`), auth/session helpers, env validation, i18n, markdown sanitiser |
| `components/` | Layout (header, footer, portal shell, language switcher) and UI primitives |
| `messages/` | `en.ts`, `ar.ts` dictionaries (parity enforced by a unit test) |
| `supabase/` | `migrations/` (versioned SQL), `seed.sql` + `seed-media.sql` (fictional), email templates |
| `scripts/` | Docker-free local stack, migration runner, schema-doc generator |
| `tests/` | `unit/`, `db/` (RLS), `e2e/` (Playwright) |

Module rules: UI imports feature modules; feature modules import `lib/` and `server/`; `server/` never imports UI. Provider SDK calls live only in `server/*` adapters so a provider (or a future separate backend) can be swapped without touching features.

## Key flows
- **Auth:** Supabase Auth with email + password. Confirmation and recovery use the `token_hash` flow (`/auth/confirm`) so links work across devices. Sessions are HTTP-only cookies refreshed in `proxy.ts`.
- **Enrollment & payment:** `enroll_in_course()` (DB) → free: active (or pending approval); paid: `pending_payment` + `create_order_for_enrollment()` prices the order from the course row. `/api/payments/checkout` creates a provider checkout. The provider result is verified server-side (sandbox: HMAC-signed token; HyperPay: server-to-server status query / encrypted webhook) before `recordVerifiedPayment` (service role) marks the order paid and activates the enrollment. Client-side "success" is never trusted.
- **Learning progress:** `track_lesson_progress()` / `complete_lesson()` enforce completion rules; course completion and certificate issuance happen in SQL functions.
- **AI assistant:** `/api/ai/assistant` checks enrollment/staff role, daily quota, input screening (injection, out-of-scope, PII redaction), builds context from the lesson the user can read, calls the configured provider and logs usage/cost. It has no write access to grades, payments or certificates.
- **Media:** uploads validated by magic bytes and size, images re-encoded to WebP (metadata stripped), stored privately; public only when `is_public` and (no students shown, or consent granted) — enforced by RLS.
- **Notifications:** in-app rows created by DB triggers/functions; `email_status` columns prepared for a future email adapter with retries.

## Environments
`local` (this repo's stack, fictional seed) → `staging` (new isolated Supabase project, approved) → `production` (approval required). See `DEPLOYMENT.md`.

## Extensibility
- New payment provider: implement `PaymentProvider` in `server/payments/` and register it in `server/payments/index.ts`.
- New AI provider: implement `AIProvider` in `server/ai/`.
- Service extraction: feature modules already call the database through RPCs with explicit contracts (`API_CONTRACTS.md`), so a separate backend could expose the same RPCs/HTTP endpoints.
