# WadiTech Academy Platform — Handoff for a new chat

_Last updated: 7 Nov 2026 · main at commit `ce4898c` · version 0.4 (staging)_

Paste this file into a new chat to continue the work. The owner writes in Arabic, so reply in Arabic unless asked otherwise. Code, commits and docs stay in English.

---

## 1. What this is

**WadiTech Academy** (أكاديمية وادي تك للذكاء الاصطناعي والروبوتات) is an Amman-based academy teaching AI, robotics and programming to ages 6–18. It runs the **real platform**, built from scratch:
- a public bilingual site (EN/AR with full RTL)
- an LMS: programs, lessons, quizzes, certificates with QR verification
- portals for students, parents, trainers, school coordinators and admins
- virtual labs, competitions, events, scholarships, payments (sandbox) and email notifications

| | |
|---|---|
| **Staging link (use this)** | **https://app.waditech.co** (`/ar`, `/en`) |
| Old link | https://waditech-platform-jrrq.vercel.app. It works abroad but is **blocked by some Jordanian ISPs** (Umniah blocks `*.vercel.app` via DNS). |
| Code | GitHub `waditech-platformm/waditech-platform` (private), branch `main`. Vercel auto-deploys every push. |
| Hosting | Vercel project `waditech-platform-jrrq` (id `prj_PNifWOBgxWtieu4cCnmdljrC69ht`, team `team_U856kCJZONohnnpUi2L4bNBp`) |
| Database / auth / storage | Supabase project **`waditech-staging`**, ref `rxykymexjpooiolhfpqw` (Frankfurt). This is separate from the existing waditech.co Supabase, which must **never** be touched. |
| Domain | `app.waditech.co` is a single CNAME (`app` → `cname.vercel-dns.com`), added by the owner in Namecheap cPanel Zone Editor on 6 Nov. No other DNS record was touched. |
| Status | Staging only: fictional demo data, a dev banner, and search engines blocked (`APP_ENV=staging`). |

### Demo accounts (fictional, staging only)
The password for all accounts was given to the owner in chat and is in the owner's copy of this file. It is left out here because project docs are shared. Login: https://app.waditech.co/ar/login

| Role | Email |
|---|---|
| super admin | `superadmin@demo.waditech.local` |
| admin | `admin@demo.waditech.local` |
| trainer (Lina) | `trainer@demo.waditech.local` |
| trainer (Kareem) | `trainer2@demo.waditech.local` |
| student (Omar) | `student@demo.waditech.local` |
| student (Sara) | `student2@demo.waditech.local` |
| student (Yazan, has a completed course + certificate) | `student3@demo.waditech.local` |
| parent (linked to Omar) | `parent@demo.waditech.local` |
| parent (no child) | `parent2@demo.waditech.local` |
| school coordinator | `coordinator@demo.waditech.local` |

The local stack uses a different password: `Demo-Pass-2026!` (set in the seed). Replace all demo accounts with real ones before launch.

---

## 2. Stack and architecture
- **Framework:** Next.js **16.2** App Router.
  - Uses `proxy.ts` instead of middleware, `PageProps<"/route">`, and `next typegen`.
  - Read `node_modules/next/dist/docs/` before using unfamiliar APIs; this Next version differs from older training data.
- **UI:** React 19, TypeScript strict, Tailwind 4 (`@theme` tokens in `app/globals.css`), Fontsource Inter/Cairo, lucide icons.
- **Backend:** Supabase (GoTrue, PostgREST).
  - RLS on every table; SECURITY DEFINER RPCs for public reads.
  - pg_cron + pg_net run the email worker every 5 minutes.
- **Structure:** modular monolith. `app/[locale]/…` pages, `features/<domain>/` (queries, actions, components), `components/ui`, `lib/`, `server/`.
- **Security:**
  - Nonce-based CSP with `strict-dynamic` in `proxy.ts`: no inline scripts and no new third-party origins without approval.
  - Rate limits, audit log triggers, HMAC sandbox payments.
- **i18n:** `messages/en.ts` and `messages/ar.ts` must have identical keys (a parity test enforces it).
- **Migrations** (`supabase/migrations/`, 10 total; all applied to staging): 0001 identity · 0002 LMS · 0003 assessments · 0004 engagement · 0005 payments · 0006 public helpers · 0007 profile relations · 0008 trainer scope · 0009 email + analytics · **0010 community** (trainer profiles, course reviews, resources, course grades).

### Docs in the repo (`docs/`)
PRODUCT_REQUIREMENTS, SYSTEM_ARCHITECTURE, DATABASE_SCHEMA (generated), DESIGN_SYSTEM, API_CONTRACTS, SECURITY_MODEL, IMPLEMENTATION_ROADMAP, TEST_PLAN, DEPLOYMENT, RELEASE_READINESS, FRONTEND_REDESIGN_AUDIT, DESIGN_DIRECTIONS, AGENT_SKILL_EXECUTION_LOG (a running log of every stage; append to it). Also `CHANGELOG.md`.

---

## 3. What exists now (v0.4)
- **Public site:**
  - Calm homepage modelled on the owner's own design (waditech.ashraf123458.chatgpt.site), with Microsoft 365's site as the quality bar. Sections:
    1. Hero: official logo, real facts, accessible photo slideshow.
    2. Track cards with real program counts.
    3. For schools.
    4. Six-step learning journey.
    5. Labs.
    6. Competitions.
    7. Credentials.
    8. Testimonials (only when an admin features an approved review).
    9. Gallery.
    10. Final call to action.
  - Other public pages: programs (+ filters by track, age, **grade**, level, mode), program detail (outline, trainers, reviews), labs, competitions, events, news, about, schools, scholarships, projects, gallery, verify, contact, **trainers**, **library**.
  - Header and footer: white translucent header; light footer.
- **Portals:** student dashboard / learn player / certificates; parent; trainer (now including **"My public profile"**); school coordinator; admin, including analytics plus `/admin/trainers`, `/admin/reviews` and `/admin/library`.
- **v0.4 features** (inspired by steamcenter.co):
  - **Trainer profiles:** trainers write their own profile; every edit returns to review; only an admin can publish.
  - **Verified reviews:** only from a student who completed the course, or that student's verified parent. This is enforced by a database trigger. Reviews are moderated, and the public sees first name and role only.
  - **Resource library:** each item is public, for signed-in users, or for students enrolled in a course. Locked URLs are never sent to the browser.
  - **School grades (1–12):** set on courses, with a grade filter.
  - **Real learner counts and ratings** on cards.
- **Brand:**
  - **Official logo:** `public/media/brand/logo-original.png`, the owner's 1536×1024 transparent PNG supplied on 6 Nov, kept byte-for-byte.
  - Only resized copies are used (`logo-original-960/480.png`, plus `logo-icon-192/512.png` favicons padded with transparency). **No frame, shadow, rounding, crop or recolour; the owner explicitly wants it "as it is".** Logo placements use light backgrounds so its dark tagline stays visible.
  - **Colours from the logo:**
    - cyan `#00C6E0`
    - azure `#0089EB`
    - navy `#041228` / `#0A1A36`
    - AA-safe text and buttons: `#006BBD`, `#005A9E`, `#00869A`
- **Last verified test results:** unit 69 · DB/RLS 35 · Playwright e2e 57 (including axe). All passing.

---

## 4. Hard rules from the owner (must keep)
1. **Never touch** the existing production site, its DNS, its hosting, or the existing waditech.co Supabase database and its user accounts.
2. **Ask for explicit approval before:**
   - a DNS change
   - a database migration on staging
   - a production deploy or the official-domain launch
   - live payments or paid AI
   - any change to real user accounts

   Develop on a branch and the local stack, then ask, then apply the migration and merge.
3. **Content:**
   - No invented statistics, testimonials, partners, awards, trainers or student counts. Show real data or an honest empty state.
   - Demo rows carry `is_test_data` and a "[Demo]" or "(demo)" label.
4. **Student photos:** only with consent (`media_assets.consent_status = 'granted'`). The owner confirmed that parental consent exists and that the lab images are real photos.
5. **Logo:** use it exactly as supplied (see §3).
6. **Payments:** never store card data; never trust client-side payment confirmation.
7. **Secrets:** the `service_role` key lives only in Vercel env vars and is never pasted into chat.
8. **Honesty:** don't claim tests passed without running them.

---

## 5. How to work (environment quirks)
- **Repo:** in the previous chat it lived at `/home/claude/waditech-platform`. In a new chat, re-attach and clone it with the add_repo tool (`waditech-platformm/waditech-platform`), then run `npm ci`.
- **Local stack (Docker-free):** Postgres on :54322 (db `waditech`), a gateway on :54321 (`/auth/v1`, `/rest/v1`, `/__mail`), and an SMTP catcher on :54325.
  - First time: `npm run stack:setup`, then `npm run env:local`.
  - Start it with no pipe, using `(setsid bash scripts/local-stack/stack.sh start > log 2>&1 < /dev/null &)`, then poll `curl localhost:54321/rest/v1/`.
  - Background processes die between turns, so re-start the stack whenever `curl` returns `000`.
  - `npm run db:reset` re-applies all migrations and the seed. Run it before the full e2e suite, because repeated runs fill test courses.
- **Commands:**
  - `npm run build` / `npm start` (port 3000)
  - `npm run lint`, `npm run typecheck`
  - `npm test` (unit), `npm run test:db` (RLS), `npm run test:e2e` (Playwright; needs a fresh build)
  - Stop the server with `pkill -f "^next-server"`. **Never** run `pkill -f "next start"`; it kills the shell.
- **Network:** the shell's outbound access is blocked except GitHub and npm.
  - To check the live site, use Supabase `execute_sql` with `net.http_get('https://app.waditech.co/...')` and then read `net._http_response`.
  - Vercel's `web_fetch_vercel_url` and `get_runtime_errors` return 403 for this project.
- **Vercel connector:**
  - Works for `get_deployment`, `list_deployments`, `get_project`, env vars, domain config and `create_deployment` (redeploy).
  - `NEXT_PUBLIC_*` changes need a redeploy.
- **Screenshots:** use Playwright (pre-installed); check 390 and 1440 px in EN and AR, and check for horizontal overflow.
- **Git:** commit with the attribution trailer. Merge to `main` only after tests pass and the owner has approved any migration.

---

## 6. Waiting on the owner
- [ ] **Supabase → Authentication → URL Configuration:** set Site URL to `https://app.waditech.co` and add the redirect `https://app.waditech.co/**`. Sign-up and reset emails need this.
- [ ] **Real content:**
  - trainers write their profiles in the trainer portal, then an admin publishes them
  - library resources (admin adds them in `/admin/library`)
  - the real programs list
- [ ] **"Future Makers" pathway** (120 h, ages 10–17, shown on the owner's page): it needs real program details before it can be added.
- [ ] **Email provider** (Resend or SMTP) — currently `EMAIL_PROVIDER=none`.
- [ ] **HyperPay test credentials**, for sandbox first, then live with approval.
- [ ] **Decide:** build Privacy, Terms and FAQ pages? (They don't exist yet, so they aren't linked.)
- [ ] **Before launch:** replace the demo accounts with real admin accounts.

## 7. Suggested next steps (in order)
1. Olympiad / competition-prep course type that links to competition team registration.
2. Restyle the dashboards (student, parent, trainer, school, admin) to match the new public design.
3. Privacy, Terms and FAQ pages (bilingual).
4. Email provider + HyperPay sandbox once credentials arrive.
5. Video hosting decision for lessons; staff MFA.
6. Work through `docs/RELEASE_READINESS.md`: legal review, pen test, performance (Lighthouse mobile ≥ 90), real content, then launch on the official domain **with approval**.
