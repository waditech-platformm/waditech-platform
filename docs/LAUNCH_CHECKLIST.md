# Launch checklist (gaps found in the 7 Nov 2026 review)

Search the code for `TODO(launch)` to find where each technical item is wired in.

## Blockers: do before the public launch

| # | Item | Why | Where |
|---|---|---|---|
| 1 | **Get the code into the real GitHub repo** | This copy came from a zip with no git history. Commit it on a branch of `waditech-platformm/waditech-platform`, open a PR, and let CI run. Do not force-push over `main`. | GitHub |
| 2 | **Email provider** (Resend or SMTP, with verified SPF, DKIM and DMARC) | The contact form saves messages, but nobody is notified. Sign-up and password-reset emails use Supabase's rate-limited default sender. | `server/email/index.ts`, `features/engagement/actions.ts` |
| 3 | **Supabase Auth URLs** (Site URL plus redirects for `app.waditech.co`) | Without them, confirmation and reset links break. | Supabase dashboard |
| 4 | **Privacy policy, terms and cookie notice** (EN and AR) | The site collects children's data and parents' contact details. Jordan's Personal Data Protection Law (No. 24 of 2023) applies. The Google Maps embed and any analytics need disclosure. | new pages + footer links |
| 5 | **Replace the demo accounts and turn on MFA for staff** | The demo passwords are in the handoff file. | Supabase Auth |
| 6 | **Run the full test suites on Linux or CI** | The DB/RLS and Playwright e2e suites need the local stack, which is Linux-only. They have not been run since these changes. | `npm run test:db`, `npm run test:e2e` |
| 7 | **Owner sign-off on the dark-mode logo** | `logo-dark-*.png` recolours only the tagline, so it stays readable on dark backgrounds. The original is unchanged, but the rule says the logo is used "as it is". | `public/media/brand/` |
| 8 | **Native review of the new Arabic copy** | The rewritten headlines and footer lines were not written by a native speaker. | `messages/ar.ts` |

## Strongly recommended

- **Contact details in the footer:** phone, WhatsApp (click-to-chat is what families in Jordan expect), email, street address and opening hours. The map link has no street address, so none was invented.
- **Structured data:** `EducationalOrganization` / `LocalBusiness` JSON-LD with the address and coordinates (31.98934, 35.87318), so Google can show the academy card.
- **Spam protection:** if the public forms get spam, add Cloudflare Turnstile to contact, register and scholarship forms. A honeypot and rate limits are already in place.
- **Error monitoring and uptime:** for example Sentry and an uptime check. Right now, production errors are only visible in Vercel logs.
- **Production Supabase project:** separate from staging, with point-in-time recovery or daily backups, and a tested restore.
- **Payments:** HyperPay test credentials, then a full purchase and refund test. Add refund and cancellation policy pages before taking live payments.
- **Performance:** Lighthouse mobile score of at least 90 on the homepage and programs pages, on the production domain.
- **Manual accessibility pass:** keyboard-only and screen reader (NVDA, VoiceOver) in both languages. Automated axe checks pass in light and dark, but they catch only about a third of issues.
- **"Add your school" self-serve form:** see the note in `app/[locale]/schools/page.tsx`.

## Verified in this pass (production build, local)

- Typecheck, ESLint (0 errors) and 34 unit tests pass. The production build succeeds.
- 68 URLs crawled (all public pages in EN and AR, plus every program, news, event, trainer and competition page in the sitemap): all return 200, portals redirect to login, and the 404 page works. CSP nonce and the Maps frame-src are present on every page, with no em dashes in rendered text.
- axe WCAG 2.1 AA: 0 serious or critical issues across 50 runs, in light and dark themes, on desktop and mobile, with no console errors and no horizontal overflow.
