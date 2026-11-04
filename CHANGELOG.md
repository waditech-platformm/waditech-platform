# Changelog

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
