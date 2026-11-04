# API contracts

Three kinds of interfaces. All inputs are validated with Zod on the server; all data access runs as the signed-in user so RLS applies unless noted.

## 1. HTTP route handlers

| Method & path | Auth | Request | Responses | Notes |
|---|---|---|---|---|
| `POST /api/ai/assistant` | Signed in; enrolled in the course or course staff | `{ courseId: uuid, lessonId?: uuid, locale: "en"\|"ar", messages: [{ role: "user"\|"assistant", content ≤4000 }] (1–8) }` | `200 { answer, provider }` · `400 invalid` · `401` · `403` not enrolled · `429` daily limit (`AI_DAILY_LIMIT`) · `502` provider error | Same-origin check; input screening; usage + estimated cost logged to `ai_usage` |
| `POST /api/payments/checkout` | Signed in; owner of a `pending` order | `{ orderId: uuid }` | `200 { provider, sandbox, checkoutId, widgetScriptUrl?, returnUrl }` · `400` · `401` · `409 not_payable` · `429` · `502 provider_unavailable` | Same-origin check; 20 per 10 min per user |
| `POST /api/payments/sandbox/complete` | Signed in; owner of the order | `{ checkoutId, outcome: "success"\|"failure" }` | `200 { status }` · `400 invalid / verification_failed` · `401` · `404` · `409 checkout_mismatch` | Disabled when `APP_ENV=production`; verifies the HMAC-signed checkout before recording |
| `GET /api/payments/hyperpay/return?id=…` | Browser redirect from HyperPay | `id` = checkout id | 302 to `/{locale}/checkout/{orderId}` | Server queries HyperPay for the authoritative status before recording |
| `POST /api/payments/hyperpay/webhook` | HyperPay (encrypted) | Hex body + `X-Initialization-Vector` + `X-Authentication-Tag` | `200 { ok }` · `401 unauthenticated` | AES-256-GCM decrypt with `HYPERPAY_WEBHOOK_KEY`; then re-verifies with HyperPay; idempotent |
| `GET /api/school/report?org=uuid` | School coordinator of that org (or admin) | `org` | `200 text/csv` · `400` · `403` | Uses `school_overview()` RPC |
| `GET /auth/confirm?token_hash&type&next` | Email link | Supabase `token_hash` flow | 302 to dashboard / reset page / login with error | Works cross-device (no PKCE verifier needed) |
| `GET /uploads/[...path]` | Development only | — | file or 404 | Serves local-driver uploads; 404 in production |
| `GET /sitemap.xml`, `GET /robots.txt` | Public | — | XML / text | Sitemap lists published content only (anon key); robots disallows everything outside production |

## 2. Server Actions (form posts from the UI)
Each returns `ActionResult = { ok, message?, error?, fieldErrors?, data? }` and never trusts client-supplied prices, roles or owners.

| Module | Server actions |
|---|---|
| admin | `saveCourseAction`, `setCourseStatusAction`, `assignTrainerAction`, `removeTrainerAction`, `saveModuleAction`, `deleteModuleAction`, `saveLessonAction`, `deleteLessonAction`, `saveAssessmentAction`, `saveQuestionAction`, `deleteQuestionAction`, `saveAssignmentAction`, `saveArticleAction`, `deleteArticleAction`, `saveEventAction`, `saveCompetitionAction`, `setTeamStatusAction`, `saveScholarshipAction`, `reviewScholarshipAppAction`, `saveLabAction`, `grantRoleAction`, `revokeRoleAction`, `setAccountStatusAction`, `setEnrollmentStatusAction`, `adminEnrollAction`, `revokeCertificateAction`, `setLinkStatusAction`, `setProjectApprovalAction`, `uploadMediaAction`, `updateMediaAction`, `deleteMediaAction`, `refundOrderAction`, `setMessageStatusAction`, `saveOrganizationAction`, `addOrgMemberAction`, `removeOrgMemberAction`, `broadcastAction` |
| engagement | `registerEventAction`, `cancelEventRegistrationAction`, `registerTeamAction`, `withdrawTeamAction`, `applyScholarshipAction`, `contactAction` |
| enrollments | `enrollAction`, `cancelEnrollmentAction` |
| identity | `registerAction`, `loginAction`, `signOutAction`, `forgotPasswordAction`, `resetPasswordAction`, `updateProfileAction` |
| learning | `trackVideoAction`, `completeLessonAction`, `saveNoteAction`, `deleteNoteAction`, `startAttemptAction`, `submitAttemptAction`, `submitAssignmentAction`, `submitLabAction`, `revalidateLearn` |
| notifications | `markAllReadAction`, `markReadAction` |
| parent | `requestLinkAction` |
| payments | `applyDiscountAction` |
| portfolio | `saveProjectAction`, `deleteProjectAction` |
| trainer | `gradeSubmissionAction`, `reviewAttemptAction`, `createSessionAction`, `markAttendanceAction`, `completeEnrollmentAction`, `issueCertificateAction`, `staffCompleteLessonAction`, `labFeedbackAction` |

## 3. Database RPCs (PostgreSQL functions exposed through PostgREST)
SECURITY DEFINER functions re-check the caller inside. Full list with signatures: `DATABASE_SCHEMA.md` → Functions.

| Function | Caller | Contract |
|---|---|---|
| `enroll_in_course(p_course, p_student?)` | Student (self), parent (verified child), admin | Returns the enrollment; free → `active`/`pending_approval`, paid → `pending_payment`; enforces published status and capacity |
| `create_order_for_enrollment(p_enrollment, p_discount_code?)` | Enrollment owner/guardian | Prices the order from `courses.price_amount` (+ discount code rules); never from the client |
| `track_lesson_progress(p_lesson, p_video_percent?, p_position?)` / `complete_lesson(p_lesson)` | Enrolled student | Applies completion rules (`view`, `video_90`, `quiz_pass`, `assignment_submitted`, `manual` = trainer marks it); updates course completion |
| `start_attempt(p_assessment)` / `submit_attempt(p_attempt, p_answers)` | Enrolled student | Enforces attempt limits/time; grades against `question_keys` server-side; short answers → `needs_review` |
| `review_attempt(p_attempt, p_points, p_feedback?)` | Course staff | Manual scoring of short answers |
| `issue_certificate(p_enrollment)` / `revoke_certificate(p_id, p_reason)` | Course staff / admin | Requires completed enrollment; unique number; audit logged |
| `verify_certificate(p_number)` | Anyone | Returns number, student name, course title, completion date, status — nothing else |
| `register_for_event(p_event, p_attendee_name?)` | Signed-in user | Capacity → `registered` or `waitlisted` |
| `request_parent_link(p_code)` | Parent | Links to a student by the student's family code; creates a pending→verified link |
| `school_overview(p_org)` | Coordinator of org / admin | Aggregated school progress |
| `admin_overview()`, `admin_list_users(…)`, `admin_find_user_by_email(…)`, `admin_set_account_status(…)`, `broadcast_announcement(…)` | Admin | Dashboard metrics and user management |
| `rate_limit_hit(p_bucket, p_limit, p_window_seconds)` | Service role only | Fixed-window counter used by `server/rate-limit.ts` |
| `mark_order_refunded(p_order, p_amount, p_reference)` | Admin | Records a refund (provider refund must succeed first for live payments) |
