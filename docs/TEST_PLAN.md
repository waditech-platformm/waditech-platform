# Test plan & results

## Strategy
| Layer | Tool | Location | What it proves |
|---|---|---|---|
| Unit | Vitest | `tests/unit` | Validation schemas (no privileged sign-up), AI input guard (injection, scope, PII redaction), sandbox payment signatures (tampered amount / forged signature rejected), Markdown XSS sanitising, EN/AR dictionary parity |
| Database authorization | Vitest + `pg` | `tests/db/rls.test.ts` | Runs SQL **as** anon / each demo user (same roles and JWT claims PostgREST uses) inside rolled-back transactions: cross-user, cross-family, cross-school isolation; role escalation; answer-key secrecy; certificate issuance; trainer scope |
| End-to-end | Playwright (Chromium) | `tests/e2e` | Real browser against the running app + local Supabase Auth/PostgREST/Postgres; asserts on screen **and** in the database |
| Accessibility | `@axe-core/playwright` | `tests/e2e/06-accessibility.spec.ts` | WCAG 2.1 A/AA rules, no serious/critical violations on 13 pages (EN + AR) |
| Responsive | Playwright | `01-public.spec.ts` + width sweep | No horizontal overflow at 360/390/768/1024/1440 |

Run order (CI does the same): `npm run stack:start` → `npm run db:reset` → `npx vitest run` → `npm run build` → `npx playwright test`.

## Critical journeys → tests
| # | Journey | Test |
|---|---|---|
| 1 | Visitor opens the homepage (official logo + lab images present) | `01-public` › homepage |
| 2 | Visitor browses and filters programs | `01-public` › browse and filter |
| 3–4 | Visitor registers; must verify email; link signs in | `02-auth` › registers, verifies email |
| 5 | Student logs in / logs out | `02-auth` › logout; all portal specs |
| 6 | Student enrolls in an available course | `03-learning` › free course; paid course |
| 7 | Student accesses lessons | `03-learning` › opens lessons |
| 8–9 | Student completes a quiz; progress updates | `03-learning` › quiz graded on the server |
| 10 | Trainer reviews a submission | `03-learning` › assignment graded |
| 11 | Parent views an authorized student only | `04-portals` › parent; `tests/db` parents |
| 12 | Administrator creates (and publishes) a course | `04-portals` › creates and publishes a course |
| 13 | Administrator publishes a news article | `04-portals` › publishes news (incl. script stripping) |
| 14 | Administrator creates an event; a user registers | `04-portals` › event |
| 15 | Student receives a certificate | `03-learning` › issues a certificate |
| 16 | Certificate verification works | `01-public` + `03-learning` |
| 17 | English/Arabic switching works | `01-public` › switching; admin sections in both languages |
| 18 | Unauthorized users are denied | `02-auth` › denied areas; `05-admin-cms` › non-admins |
| 19 | Database policies prevent cross-user exposure | `tests/db/rls.test.ts` (22 tests) |
| 20 | Payment sandbox workflow | `03-learning` › sandbox checkout activates only after verified payment |
| + | Password recovery, login rate limiting, contact → inbox, media upload + consent + magic-byte rejection, AI assistant guardrails and quota logging, school tenant isolation | `02-auth`, `05-admin-cms`, `04-portals` |

## Latest results (local, 2026-11-05, clean database reset before the run)
- Vitest: **59 / 59 passed** (34 unit, 25 database authorization incl. email queue + analytics permissions)
- Playwright: **43 / 43 passed** (adds CSP header/nonce + no-violation checks, cron-secret protection, end-to-end email delivery through the queue to the captured inbox, admin analytics in EN/AR and access denial)
- Lighthouse (local production build, mobile simulation; varies by about 10 points between runs on this machine): Accessibility 98-100, Best Practices 100, SEO 69 only because staging is intentionally noindex (the single failing audit is `is-crawlable`), Performance 75-99 (programs 99, news 95, home 85). Re-measure on Vercel's CDN.

## Previous results (2026-11-04)
- `tsc --noEmit`: **pass** · `eslint`: **0 errors** (4 unused-variable warnings) · `next build`: **pass** (66 pages + 8 route handlers)
- Vitest: **53 / 53 passed** (31 unit, 22 database authorization)
- Playwright: **38 / 38 passed** (public 5, auth 5, learning 5, portals 6, admin CMS 4, accessibility 13)
- Width sweep: no horizontal overflow on 10 pages at 390/768/1024/1440 (360 covered by the e2e test)

### Defects found by these tests and fixed
1. Trainers could read a student's records in courses they don't teach → migration `20261104000800_trainer_scope.sql`.
2. Background prefetch of the language-switcher link silently switched the visitor's language cookie → `proxy.ts` ignores prefetches; switcher `prefetch={false}`.
3. Paid enrollment didn't redirect to checkout (form unmounted by revalidation) → server-side `redirect()`.
4. Dashboard greeted users by their last name word → uses full name.
5. Colour-contrast failures on status badges and muted text; accessible-name mismatches on logo and language switcher → tokens darkened, labels fixed.
6. Nine admin menu entries pointed to missing pages → pages implemented.

## Not yet covered (manual or future automation)
- HyperPay test-mode transaction (needs merchant test credentials).
- Real email delivery through a production SMTP provider.
- Screen-reader walkthrough (NVDA/VoiceOver) and keyboard-only review of the course player and admin forms.
- Lighthouse / Core Web Vitals on staging; load testing.
- Safari / Firefox / real mobile devices (Playwright runs Chromium only).
- CI run on GitHub (workflow written, no remote repository yet).
