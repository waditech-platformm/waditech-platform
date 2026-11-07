# Changelog

## 0.5.0-dev: Header mega-menus, public partner schools (2026-11-07)

- **Photo hero:**
  - Six lab photos chosen from the owner's 3 Nov WhatsApp exports (82 photos and 123 videos were reviewed) cross-fade behind the headline, each drifting slowly.
  - The photos show projects, hands and the lab, with no identifiable students.
  - The captions are also controls to jump to a photo, and there is a pause button (WCAG 2.2.2). The slideshow stops off-screen and in background tabs, and never auto-advances with reduced motion.
  - The hero is a `.dark-island`, so it stays dark in both themes using the dark palette.
  - Files: `public/media/hero/*.webp` (about 500 KB total; only the first loads up front).
- **Lab reel:**
  - Two rows of 6-second muted clips (`public/media/reel`, about 170 KB each) and photos glide in opposite directions below the tracks.
  - Videos load lazily and play only on screen. Hover or focus pauses the reel, and reduced motion shows a still, scrollable strip.
  - Two clips were rejected because they were third-party promo footage (a Bambu Lab ad, and a kit ad with a caption).
- **Circuit layer all the way down:** one fixed `CircuitField` sits behind every page. The homepage sections, page headers and footer are translucent so it shows through. It reacts to the pointer anywhere and pauses in background tabs.
- **Fixes:**
  - `.bg-neural` (footer map card) and lesson code blocks used `navy-900`, which turns light in dark mode. They now use `deep-900`.
  - The hero caption buttons are now named by their visible text (WCAG 2.5.3).
- Removed the unused `features/home/hero-slides.tsx`.
- **QA (production build):** 68/68 URLs pass; axe finds 0 serious issues across 50 runs in light and dark themes on desktop and mobile. Headless motion tests pass: the hero advances, pauses and jumps, honours reduced motion, all 18 reel videos play, the marquee moves and pauses on hover, and there is no overflow.

- **Theme-aware logo:** `logo-dark-{960,480}.png` is generated from `logo-original.png`. Only the navy tagline is recoloured light, and alpha is kept. `BrandLogo` shows one file per theme using CSS only. The original is unchanged (same hash).
- **Footer:**
  - "Visit the lab" shows the academy's Google Maps location. The map loads only after a click: no Google request or cookies until then. It has directions and "Open in Google Maps" links, and CSP `frame-src` now allows `https://www.google.com`.
  - "Send us a message" is a compact contact form on every page. Form ids are now prefixed, so two forms can share a page.
- **Motion everywhere:** listing and card grids on public pages and dashboards rise into view as they scroll (CSS scroll-driven, `wt-stagger`), with a hover lift for clickable cards. Reduced motion shows everything statically.
- **Copy:**
  - Removed every em dash from the UI, messages, staging content (course and program summaries, photo alt text) and seed files.
  - Rewrote generic headlines in EN and AR. For example, "Empowering the Next Generation of Innovators" is now "Kids in Amman build robots, code and AI here."
- **Launch notes:** `TODO(launch)` comments mark where email, payments and the "add your school" flow are finished. The full list is in `docs/LAUNCH_CHECKLIST.md`.
- **QA:** production build, a 68-URL crawl, and axe in light and dark themes on desktop and mobile all pass. See the checklist for details.

- **Light and dark themes:**
  - A sun/moon toggle in the header switches themes. The new theme grows out of the button as a circle (View Transitions), or cross-fades where that isn't supported.
  - The choice is saved in the `wt_theme` cookie, so the server renders the right theme with no flash. With no saved choice, the site follows the OS setting using CSS only, with no inline script, so it fits the strict CSP.
  - New theme tokens: `paper` (surfaces), `deep-*` (brand panels that stay dark), `action` (filled buttons with AA contrast in both themes) and `cyan-ink`. About 100 class usages were moved to these tokens. The printable certificate stays white.
- **Logo:** on dark surfaces the logo sits on a light plate, so its dark tagline stays legible; the image itself is unchanged. The About page had the logo on a black box, which hid the tagline. It now uses a light background, as the logo rule requires.
- **Background motion (`components/circuit-field.tsx`):**
  - Faint PCB-style circuit traces, taken from the logo's circuit lines, with cyan signals running along them. Moving the pointer fires signals on nearby traces.
  - It appears in the homepage hero, every inner-page header and the final call-to-action panel.
  - It's a single canvas with pixel density capped at 2. It pauses off-screen and in background tabs, shows a still frame for reduced motion, and is hidden from screen readers.
- **Scroll motion:** section headings drift into place as they scroll into view, using CSS scroll-driven animation with no JavaScript. Where that isn't supported, or with reduced motion, they simply show.

- **Header menus:**
  - Hovering **Programs** opens a panel of published programs grouped by track, with a link to all programs.
  - Hovering **Schools** opens a panel with the names and cities of the partner schools, a search box once the list is long, and a call to action for schools.
  - Hover-intent delays stop panels flashing as the cursor passes. The chevron button opens them by keyboard or touch (`aria-expanded`), and Escape or an outside click closes them. RTL works.
- **/schools:** new "Partner schools" section that lists the same schools, with search. It shows an honest empty state when none are listed.
- **Admin:** `/admin/schools` has a "List on public site" toggle. The confirmation reminds the admin to list a school only after it agrees.
- **Database:** migration `20261107001100_public_schools.sql` adds `organizations.show_publicly` (default false), a trigger that stops a non-admin from changing it, and the `public_partner_schools()` read function, which returns name, city and type only. The seed lists the two demo schools. **Applied to staging on 2026-11-07 with owner approval.** It was verified there: the anonymous read function returns an empty list, and a coordinator who tries to change the listing is refused. With owner approval, the two fictional demo schools are now listed on staging. The seed sets the demo admin's identity before it lists them, because the guard refuses changes that don't come from an admin.
- **Tests:** two new DB/RLS tests, and one more coordinator test. They have not been run, because the local stack is Linux-only.

## 0.4.0. Trainers, reviews, library, grades (2026-11-06, branch feature/steam-parity)

- **Trainer profiles:** public `/trainers` and `/trainers/[slug]` pages with real program and learner counts. Trainers edit their profile in the portal; every edit goes back to review, and only admins publish (`/admin/trainers`). Program pages link to published profiles.
- **Verified reviews:**
  - Only a student who completed the course, or that student's verified parent, can review. This is enforced in the database.
  - Every review is moderated (`/admin/reviews`). Public reviews show first name and role only.
  - Ratings and real learner counts appear on cards and program pages. Homepage testimonials appear only when an admin features an approved review.
- **Resource library:** `/library`, filterable by track, grade and type. Each item is public, for signed-in users, or for enrolled students; locked items show no link. Admins manage it in `/admin/library`.
- **School grades:** `grade_min`/`grade_max` on courses; grade filter on Programs; shown on cards and program pages.
- **Database:** migration `20261106001000_community.sql` (3 tables, RLS, 7 read functions). **Not applied to staging yet: awaiting owner approval.**
- **Tests:** DB 35 (10 new); Playwright 57 (6 new, plus axe on trainers and library pages).

## 0.3.0. Frontend redesign (2026-11-05)

- New homepage: light hero with program finder (age band + track, works without JavaScript), annotated lab photo, competitions strip, learning journey, video filmstrip and photo bento, parents and schools panels, final call to action.
- All public pages share the new look: light page headers, larger section headings, 24px cards, light program/event detail heroes.
- Accessible "More" menu (aria-expanded, Escape, outside click) and localized main-nav label; dismissible announcement bar.
- Removed the empty partners/testimonials block and the temporary design-preview routes.
- Tests: new homepage spec (finder with/without JS, More menu keyboard, announcement dismissal); logout test waits for the sign-out redirect.

## 0.2.0. 2026-11-05 (staging)
### Added
- Email delivery for every in-app notification: provider adapter (`none` / `smtp` / `resend`), bilingual templates (preferred language first, links restricted to the platform), worker `/api/cron/notifications` protected by `CRON_SECRET`, retries with exponential backoff up to 5 attempts (migration `0009`).
- Admin → Analytics: weekly enrollments and sign-ups, monthly paid orders, course completion and certificates, quiz pass rate, email delivery status. Server-rendered accessible SVG charts with a screen-reader table.
- Nonce-based Content-Security-Policy on every page (fresh nonce per request; scripts only from this origin; Supabase and HyperPay explicitly allowed).
### Changed
- Video posters converted to WebP (about 45% smaller); descriptive link text on the homepage; blank environment variables are treated as unset.
### Deployed
- Staging on Vercel (`waditech-platform-jrrq.vercel.app`) with a new isolated Supabase project (`waditech-staging`).

## 0.1.0. 2026-11-04 (development build, not released)
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
