# Frontend redesign audit — Stage 1 (2026-11-05)

Scope: the public presentation layer of the existing platform (`waditech-platformm/waditech-platform`, branch `redesign`). Backend, database, RLS, auth and payments are out of scope and unchanged.

## Verified stack (from the repository)
Next.js 16.2 (App Router, `proxy.ts`), React 19, TypeScript strict, Tailwind CSS 4 via `@tailwindcss/turbopack` with tokens in `app/globals.css` `@theme`, Inter Variable + Cairo Variable self-hosted (Fontsource), Supabase (Auth, PostgREST, Storage), Zod, Lucide icons. No animation library is installed. Dictionaries: `messages/en.ts`, `messages/ar.ts` (parity unit-tested). CSP: nonce-based, set in `proxy.ts`.

## Baseline (before any redesign change)
| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| ESLint | 0 errors, 4 warnings (unused variables) |
| Vitest (unit + DB authorization) | 59 / 59 |
| Playwright (incl. 13 axe pages, CSP, email, analytics) | 43 / 43 |
| Production build | pass |
| Lighthouse mobile, local production build (median of 3–4 runs) | Home EN 85, AR 75–91 (variable), Programs 99, News 95; Accessibility 98–100; Best Practices 100; SEO 69 (only `is-crawlable`, intentional on staging) |
| Horizontal overflow (10 pages × 360/390/768/1024/1440) | none |

## Findings
### Visual
- The homepage relies on one repeated pattern — identical rounded cards with the same shadow — for programs, news, events and labs, so sections lack hierarchy and the page reads as a template.
- Hero composition (image + floating logo tile) is competent but generic; the strongest asset — real competition and classroom footage — sits far down the page.
- The official logo file has a dark grey vignette background. It cannot be altered, so it must always be presented as a framed tile (or on navy), never placed directly on white.
- On mobile three stacked bars (development banner, announcement, header) consume ~130 px before content.
### Navigation & accessibility
- "More ▾" dropdown in `components/layout/site-header.tsx` opens only via CSS hover / `focus-within`: no `aria-expanded` state, no Escape to close, and Schools, Scholarships, Gallery, Projects and Contact are hidden inside it.
- The main `<nav>` is labelled "Main" in English on Arabic pages.
- Automated axe checks pass on 13 pages; a manual keyboard / screen-reader review has not been done yet.
### Components
- `components/cards.tsx` holds four card types with duplicated structure; `components/ui/primitives.tsx` covers Card, Badge, Alert, Table, Stat, EmptyState. Missing for the redesign: Section/Heading primitives, Tabs, media tile, accessible disclosure/menu.
### Performance
- Home LCP 3.6–4.6 s (simulated mobile) on the hero image; 63 % of it is render delay under simulated CPU throttling. Measure on Vercel before optimising further.
### Media
- 30 public images and 8 public videos (classroom, competition, projects, labs). Public visibility is enforced by RLS (`is_public` and (`shows_students` = false or `consent_status = 'granted'`)).
- The current consent flags come from the development seed, not from signed consent forms. **WadiTech must confirm real parental consent** before these photos appear on a public production site.
- The two lab images appear to be architectural concept renders; label them as such (or replace with photographs) before production.
### Backend boundaries (do not change in this scope)
Routes under `app/[locale]`, server actions in `features/*/actions.ts`, queries in `features/*/queries.ts`, RPCs and RLS in `supabase/migrations`, auth in `proxy.ts` + `/auth/confirm`, payments in `server/payments` and `/api/payments/*`.

## Safe improvement opportunities
1. New homepage composition and section primitives (presentation only, reading existing queries).
2. Accessible header with a proper disclosure menu, localized labels and a slimmer mobile stack.
3. Shared card/media components replacing duplication in `components/cards.tsx`.
4. CSS-only motion (no new dependency), respecting `prefers-reduced-motion`.
