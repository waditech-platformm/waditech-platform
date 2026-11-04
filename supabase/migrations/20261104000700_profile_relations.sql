-- =====================================================================
-- WadiTech Academy — 0007 Profile relations for API embedding
-- profiles.id = auth.users.id, so these FKs are always satisfiable. They let the API join
-- e.g. enrollments -> profiles(full_name) — still filtered by the profiles RLS policies.
-- =====================================================================
alter table public.enrollments add constraint enrollments_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.submissions add constraint submissions_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.assessment_attempts add constraint attempts_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.lab_submissions add constraint lab_submissions_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.attendance add constraint attendance_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.certificates add constraint certificates_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete restrict;
alter table public.organization_members add constraint org_members_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.parent_student_links add constraint psl_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.parent_student_links add constraint psl_parent_profile_fkey foreign key (parent_id) references public.profiles(id) on delete cascade;
alter table public.student_projects add constraint projects_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete cascade;
alter table public.scholarship_applications add constraint sapps_applicant_profile_fkey foreign key (applicant_id) references public.profiles(id) on delete cascade;
alter table public.competition_teams add constraint teams_captain_profile_fkey foreign key (captain_id) references public.profiles(id) on delete cascade;
alter table public.course_instructors add constraint ci_trainer_profile_fkey foreign key (trainer_id) references public.profiles(id) on delete cascade;
alter table public.event_registrations add constraint event_regs_user_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.orders add constraint orders_student_profile_fkey foreign key (student_id) references public.profiles(id) on delete restrict;

-- parents must be able to read the profile basics of the parent account that requested them (for the student) — already covered;
-- admins see all. Course staff may see the trainer list profiles of their own course (names only via course_trainers()).
