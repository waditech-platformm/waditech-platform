# Changelog

## 0.4.0 — Trainers, reviews, library, grades (2026-11-06, branch feature/steam-parity)

- **Trainer profiles:** public `/trainers` and `/trainers/[slug]` pages with real program and learner counts. Trainers edit their profile in the portal; every edit goes back to review, and only admins publish (`/admin/trainers`). Program pages link to published profiles.
- **Verified reviews:**
  - Only a student who completed the course, or that student's verified parent, can review. This is enforced in the database.
  - Every review is moderated (`/admin/reviews`). Public reviews show first name and role only.
  - Ratings and real learner counts appear on cards and program pages. Homepage testimonials appear only when an admin features an approved review.
- **Resource library:** `/library`, filterable by track, grade and type. Each item is public, for signed-in users, or for enrolled students; locked items show no link. Admins manage it in `/admin/library`.
- **School grades:** `grade_min`/`grade_max` on courses; grade filter on Programs; shown on cards and program pages.
- **Database:** migration `20261106001000_community.sql` (3 tables, RLS, 7 read functions). **Not applied to staging yet — awaiting owner approval.**
- **Tests:** DB 35 (10 new); Playwright 57 (6 new, plus axe on trainers and library pages).

## 0.3.0 — Frontend redesign (2026-11-05)

- New homepage: light hero with program finder (age band + track, works without JavaScript), annotated lab photo, competitions strip, learning journey, video filmstrip and photo bento, parents and schools panels, final call to action.
- All public pages share the new look: light page headers, larger section headings, 24px cards, light program/event detail heroes.
- Accessible "More" menu (aria-expanded, Escape, outside click) and localized main-nav label; dismissible announcement bar.
- Removed the empty partners/testimonials block and the temporary design-preview routes.
- Tests: new homepage spec (finder with/without JS, More menu keyboard, announcement dismissal); logout test waits for the sign-out redirect.

## 0.2.0 — 2026-11-05 (staging)
### Added
- Email delivery for every in-app notification: provider adapter (`none` / `smtp` / `resend`), bilingual templates (preferred language first, links restricted to the platform), worker `/api/cron/notifications` protected by `CRON_SECRET`, retries with exponential backoff up to 5 attempts (migration `0009`).
- Admin → Analytics: weekly enrollments and sign-ups, monthly paid orders, course completion and certificates, quiz pass rate, email delivery status. Server-rendered accessible SVG charts with a screen-reader table.
- Nonce-based Content-Security-Policy on every page (fresh nonce per request; scripts only from this origin; Supabase and HyperPay explicitly allowed).
### Changed
- Video posters converted to WebP (about 45% smaller); descriptive link text on the homepage; blank environment variables are treated as unset.
### Deployed
- Staging on Vercel (`waditech-platform-jrrq.vercel.app`) with a new isolated Supabase project (`waditech-staging`).

## 0.1.0 — 2026-11-04 (development build, not released)
### Added
- New, isolated Next.js 16 + Supabase repository for WadiTech Academy, English/Arabic with full RTL.
- Public website with the official logo and the academy's supplied lab images on the homepage; academy photos and video clips from the supplied archives in Learning in Action, Gallery, programs and competitions.
- Authentication (register as student/parent, email verification, login, logout, password reset), role-based portals for student, parent, trainer, school coordinator, admin and super admin.
- LMS: courses, modules, lessons (text, video, quiz, assignment, lab), completion rules, notes, quizzes graded in the database, assignments with trainer grading, attendance sessions.
- Certificates with unique numbers, QR, printable A4 layout and public verification.
- Admin CMS: courses, news, events, competitions, scholarships, labs, media library (consent-aware), enrollments, payments, schools, inquiries, announcements, users/roles, family links, project approvals, audit log.
- Payments architecture: orders priced in the database, sandbox provider, HyperPay adapter (test endpoint; live disabled), discounts, refunds record.
- AI learning assistant with a free local provider, guardrails, quotas and cost logging.
- Docker-free local stack (PostgreSQL 16 + Supabase Auth + PostgREST + mail catcher), 8 versioned migrations, fictional seed.
- Tests: 31 unit, 22 database-authorization, 38 Playwright end-to-end/accessibility. CI workflow.
- Documentation set in `docs/`.

### Security
- Restricted trainer visibility to the courses they teach (`0008_trainer_scope`).
