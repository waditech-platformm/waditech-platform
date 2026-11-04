# Product requirements — WadiTech Academy Platform

**Product:** WadiTech Academy for AI & Robotics · **Tagline:** LEARN · BUILD · INNOVATE · **Market:** Jordan first, then regional.
**Languages:** English (default), Arabic (full RTL). **Status legend:** see `IMPLEMENTATION_ROADMAP.md`.

## 1. Problem and goal
The academy runs hands-on robotics, AI and programming programs for students aged roughly 6–18, in person and with schools. Today the public site is marketing-only. The goal is one connected platform where families discover programs, enroll and pay, students learn and build projects, trainers teach and grade, parents follow progress, schools see their own cohorts, and staff manage everything — with children's data protected by design.

## 2. Users and roles
| Role | Who | Core needs |
|---|---|---|
| Visitor | Parents, students, schools browsing | Understand programs, prices, dates; contact; verify a certificate |
| Student | Enrolled learner (often a minor) | Courses, lessons, quizzes, assignments, labs, projects, certificates, AI help |
| Parent / guardian | Verified guardian of one or more students | See linked children only: enrollments, progress, attendance, certificates, payments |
| Trainer | Academy instructor | Assigned courses only: roster, attendance, grading, feedback, completion, certificates |
| School coordinator | Staff of a partner school | Own school's students and progress only; downloadable report |
| Admin | Academy staff | CMS (courses, news, events, competitions, scholarships, labs, media), enrollments, payments, users, audit |
| Super admin | Owner | Everything an admin can do + granting/revoking admin roles |

Self sign-up can only create **student** or **parent** accounts. All other roles are granted by staff (enforced in the database).

## 3. Key journeys and acceptance criteria
Each criterion below is covered by an automated test (see `TEST_PLAN.md`).

1. **Discover** — homepage shows the official logo and the two academy lab images in the hero; program catalog filters by category, age, level, delivery mode and availability; program pages show outcomes, curriculum outline, trainer, price, seats, FAQs.
2. **Register & verify** — a visitor registers as student or parent; cannot sign in until the email is confirmed; the confirmation link signs them in.
3. **Recover access** — password reset email → new password works; old one does not.
4. **Enroll (free)** — a student enrolls in a free course and lands in the course player.
5. **Enroll (paid)** — enrolling creates a pending order priced by the database; the enrollment becomes active only after the server verifies the payment result (sandbox now; HyperPay later).
6. **Learn** — lessons open only for enrolled students (or marked previews); completion follows explicit per-lesson rules (opened, ≥90 % of video watched, quiz passed, assignment submitted, or marked complete by the trainer).
7. **Assess** — quizzes are graded in the database; answer keys are never sent to the browser; attempts are limited; short answers go to trainer review.
8. **Submit & grade** — students submit assignments; trainers of that course grade within the allowed range; students are notified.
9. **Complete & certify** — when all lessons are complete (or a trainer marks completion) a trainer/admin issues a certificate with a unique number and QR; anyone can verify it publicly with minimal personal data.
10. **Family view** — a parent sees only children whose link is verified; an unlinked parent sees nothing.
11. **School view** — a coordinator sees only their own school.
12. **Manage content** — admins create, preview (draft), publish and archive courses, news and events; publish media only after parental consent is recorded.
13. **Language** — every page works in English and Arabic with correct direction; switching keeps the current page.
14. **Access control** — unauthenticated users are sent to sign in; users without the role are denied; database policies block cross-user and cross-school access even if the UI is bypassed.

## 4. Non-functional requirements
- Mobile-first; no horizontal scrolling at 360 px; tested widths 360/390/768/1024/1440.
- WCAG 2.1 AA: automated axe checks pass on key pages; manual review pending (see `TEST_PLAN.md`).
- Security: OWASP-aligned controls, server-side validation, rate limiting, audit log (see `SECURITY_MODEL.md`).
- Children's privacy: minimal data collection, no public student profiles, first-name-only showcase, media of students private until consent, image metadata (EXIF/GPS) stripped on upload.
- No fabricated content: all seeded people, prices, dates and articles are labelled **Demo data** and a site-wide development banner is shown outside production.

## 5. Out of scope for this release (planned)
Email delivery adapter (in-app notifications only), video transcoding/streaming service, live HyperPay billing, paid AI providers, native mobile apps, migration from the existing waditech.co Supabase project. Each requires approval — see `RELEASE_READINESS.md`.
