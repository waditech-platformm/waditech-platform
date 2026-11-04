-- =====================================================================
-- WadiTech Academy — 0002 Catalog & LMS core
-- programs (tracks) -> courses (enrollable offering) -> modules -> lessons
-- =====================================================================
create type public.publish_status as enum ('draft','published','archived');
create type public.course_level as enum ('beginner','intermediate','advanced');
create type public.delivery_mode as enum ('in_person','online','hybrid');
create type public.availability as enum ('open','waitlist','closed','coming_soon');
create type public.course_category as enum ('robotics','ai','programming','cybersecurity','electronics','embedded','iot','drones','3d_printing','stem');
create type public.currency_code as enum ('JOD','USD');

create table public.programs (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title_en text not null, title_ar text not null,
  summary_en text, summary_ar text,
  category public.course_category not null,
  cover_url text,
  position int not null default 0,
  status public.publish_status not null default 'draft',
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger programs_updated_at before update on public.programs for each row execute function public.set_updated_at();

create table public.courses (
  id uuid primary key default extensions.gen_random_uuid(),
  program_id uuid references public.programs(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title_en text not null check (char_length(title_en) between 3 and 160),
  title_ar text not null check (char_length(title_ar) between 2 and 160),
  summary_en text, summary_ar text,
  description_en text, description_ar text,
  category public.course_category not null,
  level public.course_level not null default 'beginner',
  delivery_mode public.delivery_mode not null default 'in_person',
  availability public.availability not null default 'open',
  age_min int check (age_min between 4 and 99),
  age_max int check (age_max between 4 and 99),
  duration_weeks int check (duration_weeks between 1 and 104),
  hours_total int check (hours_total between 1 and 2000),
  price_amount numeric(10,3) not null default 0 check (price_amount >= 0),
  currency public.currency_code not null default 'JOD',
  capacity int check (capacity is null or capacity > 0),
  requires_approval boolean not null default false,
  thumbnail_url text, cover_url text, preview_video_url text,
  outcomes_en text[] not null default '{}', outcomes_ar text[] not null default '{}',
  requirements_en text[] not null default '{}', requirements_ar text[] not null default '{}',
  faqs jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (age_max is null or age_min is null or age_max >= age_min)
);
create index courses_public_idx on public.courses(status, category, level);
create index courses_program_idx on public.courses(program_id);
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger courses_audit after insert or update or delete on public.courses for each row execute function public.audit_row();

create table public.course_instructors (
  course_id uuid not null references public.courses(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  is_lead boolean not null default false,
  primary key (course_id, trainer_id)
);
create index course_instructors_trainer_idx on public.course_instructors(trainer_id);

create table public.course_modules (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title_en text not null, title_ar text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules(course_id, position);

create type public.lesson_type as enum ('video','text','resource','quiz','assignment','lab');
create type public.completion_rule as enum ('view','video_90','quiz_pass','assignment_submitted','manual');

create table public.lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title_en text not null, title_ar text not null,
  type public.lesson_type not null default 'text',
  body_en text, body_ar text,
  video_url text,
  duration_minutes int check (duration_minutes is null or duration_minutes between 1 and 600),
  position int not null default 0,
  is_preview boolean not null default false,
  completion_rule public.completion_rule not null default 'view',
  assessment_id uuid,
  assignment_id uuid,
  lab_id uuid,
  status public.publish_status not null default 'published',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index lessons_module_idx on public.lessons(module_id, position);
create index lessons_course_idx on public.lessons(course_id);
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();

-- keep lessons.course_id consistent with its module
create or replace function public.lesson_sync_course() returns trigger language plpgsql as $$
begin
  select course_id into new.course_id from public.course_modules where id = new.module_id;
  return new;
end $$;
create trigger lessons_sync_course before insert or update of module_id on public.lessons for each row execute function public.lesson_sync_course();

create table public.lesson_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'file' check (kind in ('file','link','code')),
  position int not null default 0
);

-- ---------------------------------------------------------------------
-- Enrollments
-- ---------------------------------------------------------------------
create type public.enrollment_status as enum ('pending_payment','pending_approval','active','completed','cancelled','refunded');

create table public.enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete cascade,
  status public.enrollment_status not null,
  source text not null default 'self' check (source in ('self','admin','school','scholarship','parent')),
  organization_id uuid references public.organizations(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  activated_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);
create index enrollments_student_idx on public.enrollments(student_id);
create index enrollments_course_idx on public.enrollments(course_id, status);
create index enrollments_org_idx on public.enrollments(organization_id);
create trigger enrollments_updated_at before update on public.enrollments for each row execute function public.set_updated_at();
create trigger enrollments_audit after insert or update or delete on public.enrollments for each row execute function public.audit_row();

create or replace function public.is_enrolled(course uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where course_id = course and student_id = uid and status in ('active','completed'));
$$;

create or replace function public.is_course_instructor(course uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.course_instructors ci join public.user_roles r on r.user_id = ci.trainer_id and r.role = 'trainer'
                 where ci.course_id = course and ci.trainer_id = uid);
$$;

create or replace function public.is_course_staff(course uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin(uid) or public.is_course_instructor(course, uid);
$$;

-- trainer teaches a course the student is enrolled in
create or replace function public.teaches_student(student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e join public.course_instructors ci on ci.course_id = e.course_id
                 join public.user_roles r on r.user_id = ci.trainer_id and r.role = 'trainer'
                 where e.student_id = student and ci.trainer_id = uid);
$$;

-- Who may see a student's learning data
create or replace function public.can_view_student(student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select student = uid or public.is_admin(uid) or public.is_parent_of(student, uid)
      or public.teaches_student(student, uid) or public.coordinates_student(student, uid);
$$;

-- Trainers may see profile basics of students they teach
create policy profiles_select_trainer on public.profiles for select to authenticated using (public.teaches_student(id));

-- Enrollment is created ONLY through this function (no direct insert policy for students).
create or replace function public.enroll_in_course(p_course uuid, p_student uuid default null) returns public.enrollments
language plpgsql security definer set search_path = public as $$
declare
  c public.courses; v_student uuid := coalesce(p_student, auth.uid());
  v_count int; v_status public.enrollment_status; v_source text := 'self'; e public.enrollments;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not public.is_active_user() then raise exception 'account is not active' using errcode='42501'; end if;
  if v_student <> auth.uid() then
    if public.is_parent_of(v_student) then v_source := 'parent';
    elsif public.is_admin() then v_source := 'admin';
    else raise exception 'not allowed to enroll this student' using errcode='42501'; end if;
  end if;
  if not public.has_role('student', v_student) then raise exception 'only student accounts can be enrolled' using errcode='42501'; end if;

  select * into c from public.courses where id = p_course for update;
  if c.id is null or c.status <> 'published' then raise exception 'course not available' using errcode='P0002'; end if;
  if c.availability not in ('open') and v_source <> 'admin' then raise exception 'enrollment is not open for this course' using errcode='P0001'; end if;

  select * into e from public.enrollments where course_id = p_course and student_id = v_student;
  if e.id is not null and e.status not in ('cancelled','refunded') then return e; end if;

  if c.capacity is not null then
    select count(*) into v_count from public.enrollments where course_id = p_course and status in ('active','completed','pending_payment','pending_approval');
    if v_count >= c.capacity then raise exception 'course is full' using errcode='P0001'; end if;
  end if;

  v_status := case when v_source = 'admin' then 'active'
                   when c.price_amount > 0 then 'pending_payment'
                   when c.requires_approval then 'pending_approval'
                   else 'active' end;

  if e.id is not null then
    update public.enrollments set status = v_status, source = v_source, requested_by = auth.uid(),
      activated_at = case when v_status = 'active' then now() end, enrolled_at = now()
      where id = e.id returning * into e;
  else
    insert into public.enrollments(course_id, student_id, status, source, requested_by, activated_at)
    values (p_course, v_student, v_status, v_source, auth.uid(), case when v_status = 'active' then now() end)
    returning * into e;
  end if;
  return e;
end $$;
revoke execute on function public.enroll_in_course(uuid, uuid) from anon;

-- Only staff may change enrollment status directly (payments go through service role)
create or replace function public.guard_enrollment_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then
    if new.status = 'active' and old.status is distinct from 'active' then new.activated_at := coalesce(new.activated_at, now()); end if;
    if new.status = 'completed' and old.status is distinct from 'completed' then new.completed_at := coalesce(new.completed_at, now()); end if;
    return new;
  end if;
  -- trainers may mark completion of their course's enrollments
  if public.is_course_instructor(old.course_id) and new.status = 'completed' and old.status = 'active'
     and new.course_id = old.course_id and new.student_id = old.student_id then
    new.completed_at := now(); return new;
  end if;
  -- students may cancel their own unpaid request
  if old.student_id = auth.uid() and new.status = 'cancelled' and old.status in ('pending_payment','pending_approval')
     and new.course_id = old.course_id and new.student_id = old.student_id then
    return new;
  end if;
  raise exception 'not allowed to change this enrollment' using errcode='42501';
end $$;
create trigger enrollments_guard before update on public.enrollments for each row execute function public.guard_enrollment_update();

-- ---------------------------------------------------------------------
-- Progress & notes
-- ---------------------------------------------------------------------
create table public.lesson_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  video_percent int not null default 0 check (video_percent between 0 and 100),
  last_position_seconds int not null default 0 check (last_position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress(student_id, course_id);

create table public.lesson_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_notes_idx on public.lesson_notes(student_id, lesson_id);
create trigger lesson_notes_updated_at before update on public.lesson_notes for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.programs enable row level security;
alter table public.courses enable row level security;
alter table public.course_instructors enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes enable row level security;

create policy programs_public on public.programs for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy programs_admin on public.programs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy courses_public on public.courses for select to anon, authenticated
  using (status = 'published' or public.is_course_staff(id));
create policy courses_admin_insert on public.courses for insert to authenticated with check (public.is_admin());
create policy courses_staff_update on public.courses for update to authenticated using (public.is_course_staff(id)) with check (public.is_course_staff(id));
create policy courses_admin_delete on public.courses for delete to authenticated using (public.is_admin());

create policy ci_select on public.course_instructors for select to anon, authenticated using (true);
create policy ci_admin on public.course_instructors for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- curriculum outline (module titles) is public for published courses
create policy modules_select on public.course_modules for select to anon, authenticated using (
  exists (select 1 from public.courses c where c.id = course_id and c.status = 'published') or public.is_course_staff(course_id));
create policy modules_staff on public.course_modules for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));

-- lesson rows are visible as outline to everyone for published courses, but CONTENT is protected:
-- we expose content columns only via the course_lesson_content() function / enrolled policy.
create policy lessons_select on public.lessons for select to anon, authenticated using (
  public.is_course_staff(course_id)
  or (status = 'published' and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
      and (is_preview or public.is_enrolled(course_id))));
create policy lessons_staff on public.lessons for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));

-- public outline without protected content
create or replace function public.course_outline(p_course uuid)
returns table (lesson_id uuid, module_id uuid, title_en text, title_ar text, type public.lesson_type, duration_minutes int, lesson_position int, is_preview boolean)
language sql stable security definer set search_path = public as $$
  select l.id, l.module_id, l.title_en, l.title_ar, l.type, l.duration_minutes, l.position, l.is_preview
  from public.lessons l join public.courses c on c.id = l.course_id
  where l.course_id = p_course and l.status = 'published' and (c.status = 'published' or public.is_course_staff(c.id))
  order by l.position;
$$;

create policy resources_select on public.lesson_resources for select to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and (public.is_course_staff(l.course_id) or public.is_enrolled(l.course_id))));
create policy resources_staff on public.lesson_resources for all to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and public.is_course_staff(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and public.is_course_staff(l.course_id)));

create policy enrollments_select on public.enrollments for select to authenticated using (
  public.can_view_student(student_id) or public.is_course_staff(course_id)
  or (organization_id is not null and public.is_org_coordinator(organization_id)));
create policy enrollments_update on public.enrollments for update to authenticated using (
  student_id = auth.uid() or public.is_course_staff(course_id)) with check (true);
create policy enrollments_admin_insert on public.enrollments for insert to authenticated with check (public.is_admin());
create policy enrollments_admin_delete on public.enrollments for delete to authenticated using (public.is_admin());

create policy progress_select on public.lesson_progress for select to authenticated using (
  public.can_view_student(student_id) or public.is_course_staff(course_id));
-- writes go through track_lesson_progress() / complete_lesson()

create policy notes_own on public.lesson_notes for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid() and public.is_enrolled((select course_id from public.lessons where id = lesson_id)));
