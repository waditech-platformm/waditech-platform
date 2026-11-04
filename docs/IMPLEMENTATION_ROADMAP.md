# Implementation roadmap & status

Status values: **Not Started · In Progress · Implemented · Tested · Blocked · Pending Approval**.
"Tested" means an automated test exercises the feature end to end against the real local stack (see `TEST_PLAN.md`). "Implemented" means working code connected to the database, but without a dedicated automated test yet.

| Phase | Deliverable | Status | Evidence / notes |
|---|---|---|---|
| 1 Foundation | Repository, TypeScript strict, ESLint, Prettier, env validation | Tested | `npm run check`; `lib/env.ts` (unit-tested via payments test) |
| | Design tokens, fonts, base layout, header/footer with official logo | Tested | axe checks; homepage e2e asserts the three supplied images |
| | Docker-free local Supabase-compatible stack, versioned migrations, fictional seed | Tested | `scripts/local-stack`, `scripts/db/migrate.mjs`; full reset before every suite run |
| | English/Arabic framework, RTL | Tested | dictionary-parity unit test; e2e language switch; Arabic pages in a11y + overflow tests |
| | CI pipeline | Implemented | `.github/workflows/ci.yml` written; **not yet run on GitHub** (no remote repository yet) |
| 2 Authentication | Register (student/parent), email verification, login, logout, forgot/reset password | Tested | `02-auth.spec.ts` with real Supabase Auth + captured emails |
| | Roles, protected routes, privileged-role protection, rate limiting | Tested | `tests/db/rls.test.ts`, `02-auth.spec.ts` |
| | Profile settings | Implemented | `/dashboard/settings` |
| 3 Public website | Homepage (announcement bar, hero, programs, learning in action, why, labs, schools, competitions, scholarships, news, events, projects, gallery, partners/testimonials placeholders, contact) | Tested | `01-public.spec.ts`; testimonials/partners intentionally empty until verified ones are supplied |
| | Programs catalog + filters, program detail | Tested | |
| | News, events, labs, competitions, scholarships, gallery, projects, about, schools, contact, certificate verification | Tested | public pages load in both languages; contact → admin inbox; verify |
| | SEO: metadata, Open Graph, hreflang, sitemap, robots | Implemented | robots blocks all indexing outside production |
| 4 LMS core | Enrollment (free, approval, paid), course player, modules/lessons, video progress, notes, resources | Tested | `03-learning.spec.ts` |
| 5 Assessments | Quizzes (server grading, attempts, time limits, manual review), assignments, submissions, trainer grading | Tested | quiz + assignment journeys; answer-key secrecy in DB tests |
| 6 Admin CMS | Courses (+ modules, lessons, quizzes, assignments, trainers), news, events, users/roles, enrollments, certificates | Tested | `04-portals.spec.ts`, `05-admin-cms.spec.ts` |
| | Competitions, scholarships, labs, media library, payments, schools, inquiries, announcements, audit log | Tested (load + key flows) | every admin section loads in EN/AR; media upload + consent; contact inbox |
| 7 Multi-role portals | Trainer (courses, roster, attendance, submissions, labs feedback, completion, certificates) | Tested (grading, completion, certificates) | attendance & lab feedback: Implemented |
| | Parent (verified children, progress, payments) | Tested | |
| | School coordinator (own school, CSV report) | Tested (isolation) | CSV report: Implemented |
| 8 Advanced learning | Virtual labs catalog with external providers (Wokwi, Tinkercad, Python, Teachable Machine) + submissions | Implemented | Labs open the provider in a new tab — no claim of native simulation |
| | Student projects portfolio + staff-approved showcase | Implemented | |
| | Certificates (A4 landscape, QR, print/PDF via browser, public verification) | Tested | |
| | AI assistant (provider abstraction, local free provider, guardrails, quotas, cost log) | Tested | paid providers: **Pending Approval** |
| 9 Commerce & engagement | Orders, sandbox payments, discounts, receipts, refunds (record) | Tested (sandbox payment) | discounts/refunds: Implemented |
| | HyperPay adapter (test endpoint, webhook decryption) | Implemented | **Blocked** on merchant test credentials; live billing **Pending Approval** |
| | In-app notifications, announcements | Implemented | email delivery adapter: Not Started |
| | Competitions team registration, scholarship applications + review | Implemented | |
| 10 Hardening | Security review of RLS (found and fixed a trainer over-access issue) | Tested | migration `0008_trainer_scope` |
| | Accessibility (axe WCAG 2.1 AA on 13 key pages) | Tested | contrast + accessible-name fixes applied; manual screen-reader review: Not Started |
| | Responsive (360 px overflow checks) | Tested | full visual review at 768/1024 recommended |
| | Performance (Lighthouse/Core Web Vitals) | Not Started | images are pre-sized WebP with `next/image`; measure on staging |
| | Content-Security-Policy, MFA for staff, CAPTCHA | Not Started | see `SECURITY_MODEL.md` |
| | Video hosting/streaming service for lesson videos | Not Started | MP4 files today; choose Mux / Bunny / Cloudflare Stream |
| Release | Staging deployment on a new isolated Supabase project + Vercel | Pending Approval | `DEPLOYMENT.md` |
| | Migration from the existing waditech.co Supabase project | Pending Approval | plan in `DEPLOYMENT.md`; nothing has been migrated |
