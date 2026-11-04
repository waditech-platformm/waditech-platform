# WadiTech Academy Platform

**WadiTech Academy for AI & Robotics** — LEARN · BUILD · INNOVATE

A new, separate, full-stack EdTech platform: public academy website, LMS, student / trainer / parent / school / admin portals, virtual labs, AI learning assistant, certificates with public verification, and a sandbox payment flow. English (default) and Arabic with full RTL.

> **Isolation.** This repository is independent of the existing waditech.co website and its Supabase project. Nothing here connects to production DNS, hosting, the production database or existing user accounts. See `docs/RELEASE_READINESS.md` for what requires approval before any launch.

## Stack

| Layer | Choice |
|---|---|
| Web app | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript strict |
| UI | Tailwind CSS 4, Lucide icons, Inter + Cairo (self-hosted via Fontsource) |
| Data & auth | Supabase: PostgreSQL 16, Supabase Auth, Row-Level Security on every table, versioned SQL migrations |
| Validation | Zod on every form, route handler and environment variable |
| Payments | Provider adapter: `sandbox` (default) and HyperPay (test endpoint; live disabled) |
| AI | Provider adapter: `local` (free, no LLM) by default; Anthropic / OpenAI only when `AI_PAID_ENABLED=true` |
| Tests | Vitest (unit + database permissions), Playwright (end-to-end) |

Architecture: a **modular monolith**. UI in `app/` and `components/`, feature modules in `features/<module>/` (actions, queries, UI), server-only services in `server/` (payments, AI, storage, rate limiting), and the database as the final authority for permissions.

## Run it locally

Requirements: Node 22, PostgreSQL 16 binaries (`/usr/lib/postgresql/16/bin`), `curl`. No Docker needed.

```bash
npm install
npm run stack:setup      # downloads Supabase Auth (GoTrue) + PostgREST, creates a local Postgres cluster
npm run stack:start      # Postgres :54322, gateway :54321 (/auth/v1, /rest/v1, /__mail)
npm run env:local        # writes .env.local with LOCAL-only keys
npm run db:reset         # applies supabase/migrations/* and the fictional seed
npm run dev              # http://localhost:3000
```

If you have Docker you can instead run the official Supabase CLI (`supabase start`) and `supabase db push`; the migrations are plain SQL compatible with both.

**Demo accounts** (fictional, local only), password `Demo-Pass-2026!`:
`superadmin@`, `admin@`, `trainer@`, `trainer2@`, `student@` (Omar), `student2@` (Sara), `student3@` (Yazan), `parent@` (linked to Omar), `parent2@` (unlinked), `coordinator@` — all `…@demo.waditech.local`.

Emails sent by Supabase Auth in development (verification, password reset) are captured at `http://127.0.0.1:54321/__mail`.

## Tests

```bash
npm test                 # unit + database-permission tests (needs the local stack for tests/db)
npm run test:e2e         # Playwright end-to-end journeys (starts `npm run start` if no server is running)
npm run check            # typecheck + lint + tests
```

See `docs/TEST_PLAN.md` for what each suite covers and the latest verified results.

## Documentation

| Doc | Contents |
|---|---|
| `docs/PRODUCT_REQUIREMENTS.md` | Users, journeys, scope, acceptance criteria |
| `docs/SYSTEM_ARCHITECTURE.md` | Modules, data flow, boundaries, extension points |
| `docs/DATABASE_SCHEMA.md` | Generated from the live schema (tables, policies, functions) |
| `docs/DESIGN_SYSTEM.md` | Tokens, typography, components, RTL rules, imagery |
| `docs/API_CONTRACTS.md` | Route handlers, server actions, database RPCs |
| `docs/SECURITY_MODEL.md` | Threat model, authorization matrix, controls |
| `docs/IMPLEMENTATION_ROADMAP.md` | Phase status using Not Started / In Progress / Implemented / Tested / Blocked / Pending Approval |
| `docs/TEST_PLAN.md` | Test strategy and results |
| `docs/DEPLOYMENT.md` | How a future, approved staging/production release would work |
| `docs/RELEASE_READINESS.md` | Honest readiness report and approvals needed |
| `CHANGELOG.md` | Change history |
