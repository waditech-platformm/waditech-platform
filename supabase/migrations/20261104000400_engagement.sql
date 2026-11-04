-- =====================================================================
-- WadiTech Academy — 0004 Certificates, projects, content, labs, notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- Certificates
-- ---------------------------------------------------------------------
create table public.certificates (
  id uuid primary key default extensions.gen_random_uuid(),
  certificate_number text not null unique,
  enrollment_id uuid not null unique references public.enrollments(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  student_name text not null,
  course_title_en text not null, course_title_ar text not null,
  hours_total int,
  completion_date date not null,
  signatory_name text not null default 'WadiTech Academy',
  signatory_title text not null default 'Academic Director',
  status text not null default 'valid' check (status in ('valid','revoked')),
  revoked_reason text,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  is_test_data boolean not null default false
);
create index certificates_student_idx on public.certificates(student_id);

create table public.certificate_verifications (
  id bigint generated always as identity primary key,
  certificate_id uuid references public.certificates(id) on delete cascade,
  queried_number text not null,
  found boolean not null,
  created_at timestamptz not null default now()
);

create or replace function public.generate_certificate_number() returns text
language plpgsql as $$
declare v text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    v := 'WT-' || to_char(now(),'YYYY') || '-';
    for i in 1..8 loop v := v || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1),0) % 32), 1); end loop;
    exit when not exists (select 1 from public.certificates where certificate_number = v);
  end loop;
  return v;
end $$;

-- Issuance: only course staff, only for an enrollment whose lessons are all completed (or marked completed)
create or replace function public.issue_certificate(p_enrollment uuid) returns public.certificates
language plpgsql security definer set search_path = public as $$
declare e public.enrollments; c public.courses; pr record; cert public.certificates; v_name text;
begin
  select * into e from public.enrollments where id = p_enrollment for update;
  if e.id is null then raise exception 'enrollment not found' using errcode='P0002'; end if;
  if not public.is_course_staff(e.course_id) then raise exception 'not allowed to issue certificates' using errcode='42501'; end if;
  select * into cert from public.certificates where enrollment_id = e.id;
  if cert.id is not null then return cert; end if;
  select * into pr from public.course_progress(e.course_id, e.student_id);
  if e.status <> 'completed' and (pr.total_lessons = 0 or pr.completed_lessons < pr.total_lessons) then
    raise exception 'student has not completed the course' using errcode='P0001'; end if;
  select * into c from public.courses where id = e.course_id;
  select nullif(trim(full_name),'') into v_name from public.profiles where id = e.student_id;
  if v_name is null then raise exception 'student profile has no name' using errcode='P0001'; end if;
  if e.status <> 'completed' then update public.enrollments set status = 'completed' where id = e.id; end if;
  insert into public.certificates(certificate_number, enrollment_id, student_id, course_id, student_name, course_title_en, course_title_ar,
    hours_total, completion_date, issued_by, is_test_data)
  values (public.generate_certificate_number(), e.id, e.student_id, e.course_id, v_name, c.title_en, c.title_ar,
    c.hours_total, current_date, auth.uid(), c.is_test_data)
  returning * into cert;
  perform public.write_audit('issue','certificates', cert.id::text, jsonb_build_object('number', cert.certificate_number));
  insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link)
  values (e.student_id, 'certificate_issued', 'Your certificate is ready', 'شهادتك جاهزة',
          'Congratulations on completing ' || c.title_en, 'مبارك إتمام ' || c.title_ar, '/dashboard/certificates');
  return cert;
end $$;

create or replace function public.revoke_certificate(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'only administrators can revoke certificates' using errcode='42501'; end if;
  update public.certificates set status = 'revoked', revoked_reason = left(p_reason, 500) where id = p_id;
  perform public.write_audit('revoke','certificates', p_id::text, jsonb_build_object('reason', p_reason));
end $$;

-- Public verification with minimal personal data
create or replace function public.verify_certificate(p_number text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.certificates; v_num text := upper(trim(coalesce(p_number,'')));
begin
  if v_num !~ '^WT-[0-9]{4}-[A-Z0-9]{8}$' then return jsonb_build_object('found', false); end if;
  select * into c from public.certificates where certificate_number = v_num;
  insert into public.certificate_verifications(certificate_id, queried_number, found) values (c.id, v_num, c.id is not null);
  if c.id is null then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'certificate_number', c.certificate_number, 'student_name', c.student_name,
    'course_title_en', c.course_title_en, 'course_title_ar', c.course_title_ar, 'completion_date', c.completion_date,
    'status', c.status, 'is_test_data', c.is_test_data);
end $$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Student projects / portfolio
-- ---------------------------------------------------------------------
create table public.student_projects (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text check (description is null or char_length(description) <= 5000),
  cover_url text,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  visibility text not null default 'private' check (visibility in ('private','academy','public')),
  approval_status text not null default 'not_requested' check (approval_status in ('not_requested','pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index projects_student_idx on public.student_projects(student_id);
create trigger projects_updated_at before update on public.student_projects for each row execute function public.set_updated_at();

create or replace function public.guard_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then
    if tg_op = 'UPDATE' and new.approval_status is distinct from old.approval_status then new.reviewed_by := auth.uid(); end if;
    return new;
  end if;
  if new.student_id <> auth.uid() then raise exception 'not allowed' using errcode='42501'; end if;
  -- students can request public showcase but never approve themselves
  if new.visibility = 'public' then
    if tg_op = 'INSERT' or old.approval_status <> 'approved' or new.title is distinct from old.title
       or new.description is distinct from old.description or new.cover_url is distinct from old.cover_url then
      new.approval_status := 'pending';
    end if;
  else
    new.approval_status := 'not_requested';
  end if;
  if tg_op = 'UPDATE' then new.reviewed_by := old.reviewed_by; new.is_test_data := old.is_test_data; else new.is_test_data := false; end if;
  return new;
end $$;
create trigger projects_guard before insert or update on public.student_projects for each row execute function public.guard_project();

-- ---------------------------------------------------------------------
-- News / Events / Competitions / Scholarships
-- ---------------------------------------------------------------------
create table public.news_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title_en text not null, title_ar text not null,
  excerpt_en text, excerpt_ar text,
  body_en text, body_ar text,
  cover_url text,
  category text not null default 'news' check (category in ('news','announcement','article','achievement')),
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  featured boolean not null default false,
  is_breaking boolean not null default false,
  seo_title text, seo_description text,
  author_id uuid references auth.users(id) on delete set null,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index news_public_idx on public.news_articles(status, published_at desc);
create trigger news_updated_at before update on public.news_articles for each row execute function public.set_updated_at();
create trigger news_audit after insert or update or delete on public.news_articles for each row execute function public.audit_row();

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title_en text not null, title_ar text not null,
  description_en text, description_ar text,
  starts_at timestamptz not null, ends_at timestamptz,
  location_en text, location_ar text,
  capacity int check (capacity is null or capacity > 0),
  registration_open boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed','archived')),
  cover_url text,
  course_id uuid references public.courses(id) on delete set null,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_public_idx on public.events(status, starts_at);
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger events_audit after insert or update or delete on public.events for each row execute function public.audit_row();

create table public.event_registrations (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attendee_name text not null,
  status text not null default 'registered' check (status in ('registered','waitlisted','cancelled','attended')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create or replace function public.register_for_event(p_event uuid, p_attendee_name text default null) returns public.event_registrations
language plpgsql security definer set search_path = public as $$
declare ev public.events; n int; r public.event_registrations; v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into ev from public.events where id = p_event for update;
  if ev.id is null or ev.status <> 'published' then raise exception 'event not available' using errcode='P0002'; end if;
  if not ev.registration_open or ev.starts_at < now() then raise exception 'registration is closed' using errcode='P0001'; end if;
  select * into r from public.event_registrations where event_id = ev.id and user_id = auth.uid();
  if r.id is not null and r.status <> 'cancelled' then return r; end if;
  select count(*) into n from public.event_registrations where event_id = ev.id and status = 'registered';
  v_name := coalesce(nullif(trim(p_attendee_name),''), (select full_name from public.profiles where id = auth.uid()), 'Attendee');
  insert into public.event_registrations(event_id, user_id, attendee_name, status)
  values (ev.id, auth.uid(), left(v_name,120), case when ev.capacity is not null and n >= ev.capacity then 'waitlisted' else 'registered' end)
  on conflict (event_id, user_id) do update set status = excluded.status, attendee_name = excluded.attendee_name
  returning * into r;
  insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link)
  values (auth.uid(), 'event_registration',
    case when r.status = 'registered' then 'Event registration confirmed' else 'You are on the waitlist' end,
    case when r.status = 'registered' then 'تم تأكيد تسجيلك في الفعالية' else 'أنت على قائمة الانتظار' end,
    ev.title_en, ev.title_ar, '/events/' || ev.slug);
  return r;
end $$;

create or replace function public.event_seats(p_event uuid) returns table (registered int, capacity int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from public.event_registrations where event_id = e.id and status = 'registered'), e.capacity
  from public.events e where e.id = p_event and e.status in ('published','completed');
$$;
grant execute on function public.event_seats(uuid) to anon, authenticated;

create table public.competitions (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title_en text not null, title_ar text not null,
  description_en text, description_ar text,
  category public.course_category,
  eligibility_en text, eligibility_ar text,
  team_min int not null default 1 check (team_min >= 1),
  team_max int not null default 4 check (team_max >= 1),
  age_min int, age_max int,
  registration_deadline timestamptz,
  event_date date,
  status text not null default 'draft' check (status in ('draft','open','closed','completed','archived')),
  cover_url text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (team_max >= team_min)
);
create trigger competitions_updated_at before update on public.competitions for each row execute function public.set_updated_at();

create table public.competition_teams (
  id uuid primary key default extensions.gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  captain_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  members jsonb not null default '[]'::jsonb, -- [{name, age}] minimal data
  project_summary text check (project_summary is null or char_length(project_summary) <= 3000),
  status text not null default 'submitted' check (status in ('submitted','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique (competition_id, name)
);

create or replace function public.guard_team() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.competitions; n int;
begin
  if public.is_service_role() or public.is_admin() then return new; end if;
  select * into c from public.competitions where id = new.competition_id;
  if new.captain_id <> auth.uid() then raise exception 'not allowed' using errcode='42501'; end if;
  if tg_op = 'INSERT' then
    if c.status <> 'open' or (c.registration_deadline is not null and c.registration_deadline < now()) then
      raise exception 'registration is closed' using errcode='P0001'; end if;
    new.status := 'submitted';
  else
    if new.status not in ('withdrawn', old.status) then raise exception 'status can only be changed by administrators' using errcode='42501'; end if;
  end if;
  n := jsonb_array_length(new.members);
  if n < c.team_min or n > c.team_max then raise exception 'team size must be between % and %', c.team_min, c.team_max using errcode='P0001'; end if;
  return new;
end $$;
create trigger teams_guard before insert or update on public.competition_teams for each row execute function public.guard_team();

create table public.scholarships (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,120}$'),
  title_en text not null, title_ar text not null,
  description_en text, description_ar text,
  criteria_en text, criteria_ar text,
  coverage_percent int check (coverage_percent between 1 and 100),
  course_id uuid references public.courses(id) on delete set null,
  deadline timestamptz,
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger scholarships_updated_at before update on public.scholarships for each row execute function public.set_updated_at();

create table public.scholarship_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  statement text not null check (char_length(statement) between 50 and 5000),
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','withdrawn')),
  decision_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (scholarship_id, applicant_id)
);

create or replace function public.guard_scholarship_app() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.scholarships;
begin
  if public.is_service_role() or public.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then new.reviewed_by := auth.uid(); new.reviewed_at := now(); end if;
    return new;
  end if;
  if new.applicant_id <> auth.uid() then raise exception 'not allowed' using errcode='42501'; end if;
  if tg_op = 'INSERT' then
    select * into s from public.scholarships where id = new.scholarship_id;
    if s.status <> 'open' or (s.deadline is not null and s.deadline < now()) then raise exception 'applications are closed' using errcode='P0001'; end if;
    new.status := 'submitted'; new.decision_note := null; new.reviewed_by := null; new.reviewed_at := null;
  else
    if new.status not in ('withdrawn', old.status) or new.decision_note is distinct from old.decision_note then
      raise exception 'only administrators can review applications' using errcode='42501'; end if;
  end if;
  return new;
end $$;
create trigger scholarship_app_guard before insert or update on public.scholarship_applications for each row execute function public.guard_scholarship_app();
create trigger scholarship_app_audit after update on public.scholarship_applications for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  kind text not null check (kind in ('image','video','document')),
  url text not null,
  poster_url text,
  title_en text, title_ar text,
  alt_en text, alt_ar text,
  category text not null default 'general' check (category in ('general','competition','classroom','projects','events','labs','brand')),
  width int, height int, bytes bigint,
  mime_type text,
  -- children's privacy: media showing students is public only after consent is recorded
  shows_students boolean not null default true,
  consent_status text not null default 'pending' check (consent_status in ('not_required','pending','granted','denied')),
  is_public boolean not null default false,
  featured boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index media_public_idx on public.media_assets(is_public, category, created_at desc);

-- ---------------------------------------------------------------------
-- Virtual labs
-- ---------------------------------------------------------------------
create table public.labs (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  category text not null check (category in ('robotics','electronics','programming','ai','cybersecurity','3d_design')),
  title_en text not null, title_ar text not null,
  summary_en text, summary_ar text,
  instructions_en text, instructions_ar text,
  provider text not null check (provider in ('wokwi','tinkercad','python_online','teachable_machine','internal','external_link')),
  launch_url text check (launch_url is null or launch_url ~* '^https://'),
  embed_allowed boolean not null default false,
  level public.course_level not null default 'beginner',
  status public.publish_status not null default 'draft',
  position int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger labs_updated_at before update on public.labs for each row execute function public.set_updated_at();

create table public.lab_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  project_url text not null check (project_url ~* '^https://'),
  notes text check (notes is null or char_length(notes) <= 3000),
  status text not null default 'submitted' check (status in ('submitted','reviewed')),
  feedback text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lab_submissions_student_idx on public.lab_submissions(student_id);

create or replace function public.guard_lab_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() or public.has_role('trainer') then
    if tg_op = 'UPDATE' then
      if public.has_role('trainer') and not public.is_admin() and not public.teaches_student(new.student_id) then
        raise exception 'not allowed' using errcode='42501'; end if;
      new.reviewed_by := auth.uid(); new.status := 'reviewed';
      new.project_url := old.project_url; new.notes := old.notes; new.student_id := old.student_id;
    end if;
    return new;
  end if;
  if new.student_id <> auth.uid() then raise exception 'not allowed' using errcode='42501'; end if;
  if tg_op = 'UPDATE' and new.feedback is distinct from old.feedback then raise exception 'not allowed' using errcode='42501'; end if;
  if tg_op = 'INSERT' then new.feedback := null; new.status := 'submitted'; new.reviewed_by := null; end if;
  return new;
end $$;
create trigger lab_submissions_guard before insert or update on public.lab_submissions for each row execute function public.guard_lab_submission();

-- ---------------------------------------------------------------------
-- Notifications (in-app now; email adapter later)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title_en text not null, title_ar text not null,
  body_en text, body_ar text,
  link text,
  read_at timestamptz,
  email_status text not null default 'not_requested' check (email_status in ('not_requested','queued','sent','failed')),
  email_attempts int not null default 0,
  email_last_error text,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.guard_notification_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then return new; end if;
  -- owners may only toggle read_at
  if (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'not allowed' using errcode='42501'; end if;
  return new;
end $$;
create trigger notifications_guard before update on public.notifications for each row execute function public.guard_notification_update();

-- Admin broadcast announcement to a role
create or replace function public.broadcast_announcement(p_role public.app_role, p_title_en text, p_title_ar text, p_body_en text, p_body_ar text, p_link text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode='42501'; end if;
  insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link)
  select r.user_id, 'announcement', p_title_en, p_title_ar, p_body_en, p_body_ar, p_link from public.user_roles r where r.role = p_role;
  get diagnostics n = row_count;
  perform public.write_audit('broadcast','notifications', p_role::text, jsonb_build_object('count', n));
  return n;
end $$;

-- enrollment state change -> notification
create or replace function public.notify_enrollment() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.courses;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select * into c from public.courses where id = new.course_id;
    insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link)
    values (new.student_id, 'enrollment_confirmed', 'Enrollment confirmed', 'تم تأكيد التسجيل',
            'You can now start ' || c.title_en, 'يمكنك الآن البدء في ' || c.title_ar, '/learn/' || c.slug);
  end if;
  return new;
end $$;
create trigger enrollments_notify after insert or update on public.enrollments for each row execute function public.notify_enrollment();

-- graded submission/attempt -> notification
create or replace function public.notify_grade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'graded' and old.status is distinct from 'graded' then
    insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link)
    values (new.student_id, 'assessment_result', 'New feedback available', 'تقييم جديد متاح',
            'Your work has been reviewed.', 'تمت مراجعة عملك.', '/dashboard');
  end if;
  return new;
end $$;
create trigger submissions_notify after update on public.submissions for each row execute function public.notify_grade();
create trigger attempts_notify after update on public.assessment_attempts for each row execute function public.notify_grade();

-- ---------------------------------------------------------------------
-- Contact inquiries & server-side rate limiting
-- ---------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 32),
  topic text not null default 'general' check (topic in ('general','enrollment','schools','partnership','media','support')),
  message text not null check (char_length(message) between 10 and 5000),
  locale text not null default 'en',
  status text not null default 'new' check (status in ('new','in_progress','closed')),
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);

-- returns true if allowed; service-role only (called from the server)
create or replace function public.rate_limit_hit(p_bucket text, p_limit int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); v_hits int;
begin
  insert into public.rate_limits(bucket, window_start, hits) values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_limit;
end $$;
revoke execute on function public.rate_limit_hit(text,int,int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text,int,int) to service_role;

-- AI usage (cost tracking + quotas)
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text,
  course_id uuid references public.courses(id) on delete set null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,5) not null default 0,
  blocked_reason text,
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.certificates enable row level security;
alter table public.certificate_verifications enable row level security;
alter table public.student_projects enable row level security;
alter table public.news_articles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_teams enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_applications enable row level security;
alter table public.media_assets enable row level security;
alter table public.labs enable row level security;
alter table public.lab_submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.rate_limits enable row level security;
alter table public.ai_usage enable row level security;

create policy certs_select on public.certificates for select to authenticated using (public.can_view_student(student_id) or public.is_course_staff(course_id));
create policy cert_verifications_admin on public.certificate_verifications for select to authenticated using (public.is_admin());

create policy projects_select on public.student_projects for select to anon, authenticated using (
  (visibility = 'public' and approval_status = 'approved')
  or (auth.uid() is not null and (public.can_view_student(student_id) or (visibility = 'academy' and public.is_active_user()))));
create policy projects_insert on public.student_projects for insert to authenticated with check (student_id = auth.uid() or public.is_admin());
create policy projects_update on public.student_projects for update to authenticated using (student_id = auth.uid() or public.is_admin()) with check (true);
create policy projects_delete on public.student_projects for delete to authenticated using (student_id = auth.uid() or public.is_admin());

create policy news_public on public.news_articles for select to anon, authenticated using ((status = 'published' and published_at <= now()) or public.is_admin());
create policy news_admin on public.news_articles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy events_public on public.events for select to anon, authenticated using (status in ('published','completed','cancelled') or public.is_admin());
create policy events_admin on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy event_regs_select on public.event_registrations for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy event_regs_cancel on public.event_registrations for update to authenticated using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and status = 'cancelled') or public.is_admin());

create policy competitions_public on public.competitions for select to anon, authenticated using (status <> 'draft' or public.is_admin());
create policy competitions_admin on public.competitions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teams_select on public.competition_teams for select to authenticated using (captain_id = auth.uid() or public.is_admin());
create policy teams_insert on public.competition_teams for insert to authenticated with check (captain_id = auth.uid());
create policy teams_update on public.competition_teams for update to authenticated using (captain_id = auth.uid() or public.is_admin()) with check (true);

create policy scholarships_public on public.scholarships for select to anon, authenticated using (status <> 'draft' or public.is_admin());
create policy scholarships_admin on public.scholarships for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sapps_select on public.scholarship_applications for select to authenticated using (applicant_id = auth.uid() or public.is_admin());
create policy sapps_insert on public.scholarship_applications for insert to authenticated with check (applicant_id = auth.uid());
create policy sapps_update on public.scholarship_applications for update to authenticated using (applicant_id = auth.uid() or public.is_admin()) with check (true);

create policy media_public on public.media_assets for select to anon, authenticated using (
  (is_public and (not shows_students or consent_status = 'granted')) or public.is_admin());
create policy media_admin on public.media_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy labs_public on public.labs for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy labs_admin on public.labs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lab_subs_select on public.lab_submissions for select to authenticated using (public.can_view_student(student_id));
create policy lab_subs_insert on public.lab_submissions for insert to authenticated with check (student_id = auth.uid());
create policy lab_subs_update on public.lab_submissions for update to authenticated using (public.can_view_student(student_id)) with check (true);

create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy contact_admin on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- inserts happen server-side (service role) after validation + rate limiting

create policy ai_usage_select on public.ai_usage for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- rate_limits: no policies (service role only)
