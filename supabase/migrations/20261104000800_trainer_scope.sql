-- =====================================================================
-- WadiTech Academy — 0008 Tighten trainer visibility (found by tests/db/rls.test.ts)
-- Before: a trainer who taught a student in ONE course could read that student's enrollments,
-- progress, attempts and certificates in EVERY course. Course-scoped tables already grant access
-- through is_course_staff(course_id), so the generic helper no longer includes trainers.
-- Trainers keep access to lab submissions and portfolio projects of students they teach (explicit below).
-- =====================================================================
create or replace function public.can_view_student(student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select student = uid or public.is_admin(uid) or public.is_parent_of(student, uid) or public.coordinates_student(student, uid);
$$;

drop policy if exists lab_subs_select on public.lab_submissions;
drop policy if exists lab_subs_update on public.lab_submissions;
create policy lab_subs_select on public.lab_submissions for select to authenticated
  using (public.can_view_student(student_id) or public.teaches_student(student_id));
-- writes: the student (own row) or a trainer who teaches the student; guard_lab_submission restricts columns
create policy lab_subs_update on public.lab_submissions for update to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.teaches_student(student_id))
  with check (student_id = auth.uid() or public.is_admin() or public.teaches_student(student_id));

drop policy if exists projects_select on public.student_projects;
create policy projects_select on public.student_projects for select to anon, authenticated using (
  (visibility = 'public' and approval_status = 'approved')
  or (auth.uid() is not null and (public.can_view_student(student_id) or public.teaches_student(student_id)
      or (visibility = 'academy' and public.is_active_user()))));
drop policy if exists projects_update on public.student_projects;
create policy projects_update on public.student_projects for update to authenticated
  using (student_id = auth.uid() or public.is_admin()) with check (student_id = auth.uid() or public.is_admin());
