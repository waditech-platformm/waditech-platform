# Release readiness report — 2026-11-04

**Verdict: ready for an approved staging deployment; not ready for production.** The platform is a working, tested full-stack application on a local Supabase-compatible stack. It has not been deployed anywhere and has not been connected to any WadiTech production system.

## What is verified
- Full-stack vertical slices (UI → server → database → RLS → tests) for every critical journey in the brief: discovery, registration with email verification, password recovery, free and paid (sandbox) enrollment, lessons, server-graded quizzes, assignment grading, course completion, certificate issuance and public verification, parent and school views, admin content publishing, language switching, access denial.
- 91 automated tests pass from a clean database: 31 unit, 22 database-authorization, 38 browser (incl. 13 axe accessibility checks). See `TEST_PLAN.md`.
- All 45 tables have Row-Level Security; privileged roles cannot be obtained through sign-up; answer keys, payments and certificates cannot be manipulated from the client.
- No horizontal overflow from 360 px to 1440 px on key pages in both languages.

## What must happen before production (each needs approval or input from WadiTech)
| Item | Owner | Status |
|---|---|---|
| New isolated Supabase project(s) + Vercel account | WadiTech | Pending Approval |
| Custom SMTP provider for verification/reset emails | WadiTech | Pending Approval |
| HyperPay merchant **test** credentials to validate the adapter; later live credentials | WadiTech | Blocked (no credentials) |
| Decision on paid AI provider and monthly budget | WadiTech | Pending Approval |
| Real program catalogue, prices, schedules, trainers (replace demo seed via Admin) | WadiTech | Not Started |
| Written parental consent records for every photo/video showing students | WadiTech | Not Started — media of students stays private until recorded |
| Confirm whether the two lab images are photographs or concept renders, and label accordingly | WadiTech | Not Started |
| Verified partner logos and testimonials (sections intentionally empty) | WadiTech | Not Started |
| Privacy policy, terms, consent wording — legal review under Jordan's data-protection law | WadiTech + counsel | Not Started |
| Penetration test; CSP header; staff MFA; CAPTCHA on public forms | Engineering + security | Not Started |
| Video streaming service for lesson videos | Engineering | Not Started |
| Lighthouse/Core Web Vitals and load test on staging | Engineering | Not Started |
| GitHub repository + first CI run | WadiTech / Engineering | Not Started (workflow written) |
| DNS (subdomain first), production deployment, data migration from the existing Supabase project | WadiTech | Pending Approval — plan in `DEPLOYMENT.md` |

## Known limitations
- Email delivery, beyond Supabase Auth's own emails, is in-app only (adapter fields prepared).
- Virtual labs open external providers (Wokwi, Tinkercad, online Python, Teachable Machine) in a new tab; nothing is falsely presented as a native simulator.
- The local AI provider is retrieval-based (no LLM); it demonstrates the full pipeline at zero cost.
- Uploads use local disk in development; production must use `STORAGE_DRIVER=supabase`.
- Browser tests run in Chromium only.

## Data honesty
Every seeded person, price, date, article, event and certificate is fictional, flagged `is_test_data`, shown with a **Demo data** badge, and the whole site shows a development banner outside production. No statistics or achievements were invented for the public pages.
