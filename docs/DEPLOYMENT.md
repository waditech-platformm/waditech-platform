# Deployment guide (for a future, approved release)

> Nothing in this repository has been deployed. The existing waditech.co website, its DNS, hosting and its Supabase project are untouched. Every step marked 🔒 needs explicit written approval from the academy.

## Target topology
- **Web:** Vercel (or any Node 22 host running `next start`), one project per environment.
- **Data:** a **new** Supabase project per environment (`waditech-staging`, later `waditech-prod`) in the EU (Frankfurt) region, closest to Jordan.
- **Email:** a transactional provider (Resend, Amazon SES, Postmark…) configured as custom SMTP in Supabase Auth — the built-in Supabase mailer is for testing only.
- **Media:** Supabase Storage bucket `media` (public read for approved assets only, uploads via server). Video streaming service to be selected.

## 1. Staging (🔒 approval to create accounts/projects)
1. Create the Supabase project `waditech-staging`. Never reuse the existing production project.
2. Apply migrations: `supabase link --project-ref <ref> && supabase db push` (or `DATABASE_URL=… I_HAVE_APPROVAL=yes node scripts/db/migrate.mjs`). **Do not run the seed** unless staging is explicitly a demo environment — `seed.sql` is fictional data.
3. Auth settings: Site URL = staging URL; redirect allow-list = `https://<staging>/**`; disable sign-ups for privileged roles is already enforced in SQL; set password minimum 8; enable leaked-password protection; configure custom SMTP.
4. Email templates (Dashboard → Auth → Templates): use `supabase/templates/confirmation.html` and `recovery.html` (they link to `/auth/confirm?token_hash=…`).
5. Storage: create bucket `media` (public); set `STORAGE_DRIVER=supabase`.
6. Create the first super admin: sign up normally, then in the SQL editor `insert into public.user_roles(user_id, role) values ('<uuid>', 'super_admin');` (audited).
7. Vercel environment variables (see `.env.example`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `APP_ENV=staging`, `PAYMENTS_PROVIDER=sandbox` or `hyperpay` with **test** credentials, `HYPERPAY_LIVE_ENABLED=false`, `AI_PROVIDER=local`, `STORAGE_DRIVER=supabase`.
8. Run the Playwright suite against staging with a dedicated test inbox (`E2E_BASE_URL`), or the manual checklist in `TEST_PLAN.md`.

## 2. Production (🔒 approval for each item)
- 🔒 Create `waditech-prod`; apply the same migrations; **no seed**.
- 🔒 HyperPay live: merchant entity IDs + access token, `HYPERPAY_BASE_URL=https://eu-prod.oppwa.com`, `HYPERPAY_LIVE_ENABLED=true`, webhook URL `https://<domain>/api/payments/hyperpay/webhook` + key. Run a live 1-JOD test and refund.
- 🔒 Paid AI provider: `AI_PROVIDER=anthropic|openai`, `AI_API_KEY`, `AI_PAID_ENABLED=true`, set `AI_DAILY_LIMIT` and a monthly budget alert.
- 🔒 DNS: point a subdomain first (e.g. `app.waditech.co`), keep the current site live; move the apex only after sign-off.
- Before go-live: penetration test, legal review of privacy policy/terms and parental consent wording, backups (Supabase PITR add-on), monitoring (Sentry or equivalent), uptime checks, CSP header.

## 3. Migration from the existing Supabase project (🔒 plan only — not executed)
1. **Inventory** the current project read-only: tables, row counts, storage objects, auth users, which records are real.
2. **Map** old tables → new schema (`DATABASE_SCHEMA.md`); list fields that are dropped for data minimisation.
3. **Users:** export `auth.users` (password hashes are bcrypt and portable) into the new project's `auth.users` within a maintenance window, or invite users to reset passwords. Roles are re-granted explicitly — never copied blindly.
4. **Consent:** student photos/videos are imported with `consent_status='pending'` unless written consent exists.
5. **Dry run** on staging with a copy; reconcile counts; run the RLS test suite against it.
6. **Cut-over** plan with freeze window, rollback (keep old project read-only for 30 days), and communication to families.

## Rollback
Each release is an immutable Vercel deployment (instant rollback). Database migrations are forward-only; write a compensating migration for any schema rollback and take a backup before applying.
