# Agent & skill execution log

Factual record for the frontend redesign. No agent is listed as used unless it was actually invoked.

## Stage 1 — audit & directions (2026-11-05)
- **Available subagent types:** general-purpose, Explore, Plan, claude, claude-code-guide, statusline-setup. **Invoked:** none — Stage 1 needed one coherent visual voice and single-owner files; work was done sequentially in the main session.
- **Skills used:** `frontend-design` (direction planning and self-critique). Earlier in the project: `dataviz` (admin analytics charts).
- **Tools used:** repository inspection (git, grep), Next.js production build, Playwright (screenshots at 1440 and 390 px, EN/AR, overflow and console-error checks), Lighthouse 12 (local production build), local Supabase-compatible stack (PostgreSQL 16 + GoTrue + PostgREST).
- **Integrations:** GitHub (push to `waditech-platformm/waditech-platform`), Vercel (staging project `waditech-platform-jrrq`), Supabase (staging project `waditech-staging`).
- **Limitations:** Lighthouse cannot reach the Vercel URL from the build environment (network allowlist), so scores are from a local production build; no screen-reader or real-device testing available here.
- **Files added:** `app/[locale]/design-preview/[direction]/page.tsx`, `features/design-preview/{copy,data}.ts`, `docs/FRONTEND_REDESIGN_AUDIT.md`, `docs/DESIGN_DIRECTIONS.md`, this log. **Backend files modified:** none.
- **Tests:** baseline 59/59 Vitest, 43/43 Playwright (before changes); previews checked for overflow and console errors at desktop/mobile in both languages.

## Stage 2–3 — merged homepage ("professional and comfortable")

- **Direction approved by the owner:** merge of C (program finder in the hero), A (large calm typography, annotated lab image) and B (video filmstrip + photo bento), with generous spacing on a light base.
- **Implemented:** `app/[locale]/page.tsx` rewritten; `features/home/program-finder.tsx` (client, progressive enhancement via `?age=&track=` links), `features/home/lab-figure.tsx` (callouts + "Design visualization of the lab space" caption), `components/layout/more-menu.tsx` (aria-expanded disclosure, Escape/outside-click), `components/layout/announcement-bar.tsx` (dismissible, remembered per article in this browser), localized `aria-label` on the main nav, one CSS-only hero entrance (`.wt-rise`, disabled under reduced motion). The empty partners/testimonials block was removed. No backend, schema, RLS, auth or payment code changed.
- **Content rules kept:** only published courses, published competitions, and media that RLS exposes publicly (students shown only when `consent_status = 'granted'`); no invented stats, partners or testimonials.
- **Verification (run, local production build):** typecheck and lint clean (pre-existing warnings only); unit 59/59; DB/RLS 25/25; Playwright 46/46 including new `08-homepage.spec.ts` (finder with and without JavaScript, More menu keyboard, announcement dismissal); axe: no serious/critical violations on `/en` and `/ar`; no horizontal overflow at 390 and 1440 px in EN/AR. Lighthouse mobile home EN: performance 78/86/97 over three runs (median 86, baseline 85), accessibility 100, best practices 100, SEO 69 (only `is-crawlable`, intentional on staging); desktop 99–100.
- **Test change:** `02-auth` logout test now waits for the sign-out redirect before re-visiting the dashboard (it raced the server action); assertion unchanged.

## Stage 4 — remaining public pages, owner confirmations, merge

- **Owner confirmations (5 Nov 2026):** parental consent exists for the student photos and videos used on the site; the two lab images are real photographs. The "Design visualization of the lab space" caption was removed accordingly.
- **Applied the homepage language to every public page** through shared components: `PageHeader` is now light with large type and the same entrance motion; `SectionHeading` uses the larger calm scale; card radius is 24px site-wide; program and event detail heroes moved from dark to light. Pages covered: programs (+detail), labs, competitions, events (+detail), news, about, scholarships, schools, projects, gallery, verify, contact; auth pages inherit the card tokens.
- **Removed** the temporary `/design-preview/{a,b,c}` routes and their copy/data now that the direction is implemented.
- **Verification (run):** typecheck clean; lint 0 errors; unit 59/59; DB/RLS 25/25; Playwright 46/46; every public page returns 200 with no horizontal overflow at 1440 px (EN) and 390 px (AR spot-checks).
- **Merged `redesign` into `main`** at the owner's request for a working link. This updates the Vercel staging deployment only (APP_ENV=staging); the official domain, DNS and database schema are untouched.

## Stage 4b — official logo and logo colours (owner request, 5 Nov 2026)

- The owner re-supplied the official logo; it is pixel-identical to `logo-original.png`.
- Found and removed two derived files that misrepresented it: `logo-square.png` (zoomed crop that cut the wordmark) and `logo-mark*.png` (background removal had turned the robot face white). Added `logo-official.png` (+512/192), a pure crop of the dark margin with the mark untouched. It is now used in the header (with no re-typeset "WADITECH ACADEMY" text), the footer, certificates and the favicon. The header is taller (72/80 px) so the logo reads.
- Colour tokens now come from the logo: cyan `#00C6E0`, azure `#0089EB`, navy `#041228`/`#0A1A36`. AA-safe darker steps of the same hues are used for text and buttons (`#006BBD`, `#005A9E`, `#00869A`). The announcement bar moved to `royal-700` after axe flagged its badge.
- Verified (run): build OK; unit 59/59; DB 25/25; Playwright 46/46 including axe on 10 pages in EN/AR.

## Stage 5 — calmer homepage modelled on the owner's own design (6 Nov 2026)

- **Brief:** the owner found the homepage too busy and pointed to their own page (waditech.ashraf123458.chatgpt.site) as the model, with Microsoft 365's marketing site as the quality bar (Microsoft's page could not be fetched by the tools, so its well-known patterns were used: white translucent header, one idea per section, alternating text/image rows, generous whitespace).
- **Homepage, 9 sections:**
  1. Hero: real facts computed from the database (tracks, age range, labs) and an accessible slideshow of real photos with pause/play and numbered buttons; no autoplay under reduced motion.
  2. "Find your direction": one card per track that has published programs, with real program counts, linked to `/programs?category=`.
  3. For schools: 3 cards.
  4. Learning journey: 6 steps.
  5. Interactive labs: dark cards from the CMS.
  6. Competitions: split row.
  7. Credentials: split row; certificate number and QR verification are real features.
  8. Gallery.
  9. Final call to action.
- **Removed:** the program finder, annotated lab figure, trust strip, filmstrip/bento, parents panel and news/events.
- **Header and footer:** white header; primary nav cut to Programs, Schools, Labs, Competitions, About + More. Footer reorganised; no links to pages that don't exist (privacy/terms pages are still missing).
- **Content rule:** the "Future Makers" pathway and its figures from the owner's page were **not** added, because no such program exists in the database yet. Add it as a real program first.
- **Verified (run):** build OK; lint 0 errors; unit 59/59; DB 25/25; Playwright 47/47 (new tests: track cards → filtered programs with matching counts; slideshow pause and number navigation); axe clean on 10 pages; no overflow at 360/390/1440 in EN/AR. The local DB was reset before the run because repeated runs had filled a test course to capacity.

## Stage 6 — parity with steamcenter.co where it adds value (6 Nov 2026)

- **Analysis:** STEAM Center is mainly an online course storefront. Its features missing from WadiTech were public instructor profiles, a resource library, student/parent reviews, grade-based browsing, and visible enrollment counts. Everything else it offers, WadiTech already has.
- **Built on branch `feature/steam-parity`:** see CHANGELOG 0.4.0.
- **Content rules:** no invented trainers, reviews or resources. Seed rows are flagged `is_test_data` and marked "[Demo]". Testimonials render only from approved, featured, verified reviews.
- **Verified (run, local):** build OK; lint 0 errors; unit 69/69 (run with `npm test`); DB 35/35; Playwright 57/57. No overflow at 390 and 1440 px.
- **Pending:** owner approval to apply the migration to the staging database, then merge to `main`.
