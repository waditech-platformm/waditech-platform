-- =====================================================================
-- WadiTech Academy — 0010 Trainer profiles, verified reviews, resource library, school grades
-- Public data is exposed only through narrow SECURITY DEFINER read functions; raw tables stay
-- private to their owners and admins. Nothing here is visible until an admin publishes/approves it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. School grades on courses (Grade 1–12, alongside ages)
-- ---------------------------------------------------------------------
alter table public.courses add column if not exists grade_min int check (grade_min between 1 and 12);
alter table public.courses add column if not exists grade_max int check (grade_max between 1 and 12);
alter table public.courses drop constraint if exists courses_grade_order;
alter table public.courses add constraint courses_grade_order check (grade_min is null or grade_max is null or grade_min <= grade_max);

-- ---------------------------------------------------------------------
-- 2. Trainer public profiles
-- Trainers edit their own profile; any change by a trainer sends it back to 'pending'.
-- Only admins can publish. Public pages read published profiles only.
-- ---------------------------------------------------------------------
create table if not exists public.trainer_profiles (
  trainer_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  display_name_en text not null check (char_length(display_name_en) between 2 and 120),
  display_name_ar text not null check (char_length(display_name_ar) between 2 and 120),
  headline_en text check (headline_en is null or char_length(headline_en) <= 160),
  headline_ar text check (headline_ar is null or char_length(headline_ar) <= 160),
  bio_en text check (bio_en is null or char_length(bio_en) <= 2000),
  bio_ar text check (bio_ar is null or char_length(bio_ar) <= 2000),
  specialties public.course_category[] not null default '{}',
  photo_url text check (photo_url is null or photo_url ~ '^(https://|/)'),
  years_experience int check (years_experience is null or years_experience between 0 and 60),
  status text not null default 'pending' check (status in ('draft','pending','published','hidden')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trainer_profiles_updated_at before update on public.trainer_profiles for each row execute function public.set_updated_at();
create trigger trainer_profiles_audit after insert or update or delete on public.trainer_profiles for each row execute function public.audit_row();

create or replace function public.trainer_profiles_guard() returns trigger
language plpgsql as $$
begin
  if public.is_service_role() or public.is_admin() then
    if new.status is distinct from coalesce(old.status, '') and new.status in ('published','hidden') then
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
    return new;
  end if;
  -- trainer editing own profile: may only save as draft or submit for review
  if new.trainer_id <> auth.uid() or not public.has_role('trainer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  new.status := case when new.status = 'draft' then 'draft' else 'pending' end;
  new.reviewed_by := null; new.reviewed_at := null; new.is_test_data := coalesce(old.is_test_data, false);
  return new;
end $$;
create trigger trainer_profiles_guard before insert or update on public.trainer_profiles for each row execute function public.trainer_profiles_guard();

alter table public.trainer_profiles enable row level security;
create policy trainer_profiles_own_read on public.trainer_profiles for select using (trainer_id = auth.uid() or public.is_admin());
create policy trainer_profiles_own_insert on public.trainer_profiles for insert with check ((trainer_id = auth.uid() and public.has_role('trainer')) or public.is_admin());
create policy trainer_profiles_own_update on public.trainer_profiles for update using (trainer_id = auth.uid() or public.is_admin()) with check (trainer_id = auth.uid() or public.is_admin());
create policy trainer_profiles_admin_delete on public.trainer_profiles for delete using (public.is_admin());

-- Published profiles with real teaching stats (published courses, distinct active/completed learners).
create or replace function public.public_trainers(p_slug text default null)
returns table (trainer_id uuid, slug text, display_name_en text, display_name_ar text, headline_en text, headline_ar text,
               bio_en text, bio_ar text, specialties text[], photo_url text, years_experience int,
               courses int, learners int, is_test_data boolean)
language sql stable security definer set search_path = public as $$
  select tp.trainer_id, tp.slug, tp.display_name_en, tp.display_name_ar, tp.headline_en, tp.headline_ar,
         tp.bio_en, tp.bio_ar, tp.specialties::text[], tp.photo_url, tp.years_experience,
         (select count(*)::int from public.course_instructors ci join public.courses c on c.id = ci.course_id and c.status = 'published'
           where ci.trainer_id = tp.trainer_id),
         (select count(distinct e.student_id)::int from public.course_instructors ci
           join public.courses c on c.id = ci.course_id and c.status = 'published'
           join public.enrollments e on e.course_id = ci.course_id and e.status in ('active','completed')
           where ci.trainer_id = tp.trainer_id),
         tp.is_test_data
  from public.trainer_profiles tp
  join public.user_roles r on r.user_id = tp.trainer_id and r.role = 'trainer'
  where tp.status = 'published' and (p_slug is null or tp.slug = p_slug)
  order by tp.display_name_en;
$$;
grant execute on function public.public_trainers(text) to anon, authenticated;

-- Published trainer profile links for a course page.
create or replace function public.course_trainer_profiles(p_course uuid)
returns table (trainer_id uuid, slug text, display_name_en text, display_name_ar text, headline_en text, headline_ar text, photo_url text, is_lead boolean)
language sql stable security definer set search_path = public as $$
  select tp.trainer_id, tp.slug, tp.display_name_en, tp.display_name_ar, tp.headline_en, tp.headline_ar, tp.photo_url, ci.is_lead
  from public.course_instructors ci
  join public.courses c on c.id = ci.course_id and c.status = 'published'
  join public.trainer_profiles tp on tp.trainer_id = ci.trainer_id and tp.status = 'published'
  where ci.course_id = p_course order by ci.is_lead desc, tp.display_name_en;
$$;
grant execute on function public.course_trainer_profiles(uuid) to anon, authenticated;

-- Published courses taught by a published trainer.
create or replace function public.trainer_courses(p_trainer uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select ci.course_id from public.course_instructors ci
  join public.courses c on c.id = ci.course_id and c.status = 'published'
  join public.trainer_profiles tp on tp.trainer_id = ci.trainer_id and tp.status = 'published'
  where ci.trainer_id = p_trainer;
$$;
grant execute on function public.trainer_courses(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Verified course reviews
-- Only a student who completed the course, or a verified parent of that student, may review.
-- Every review is moderated; only approved reviews are public (first name + role only).
-- ---------------------------------------------------------------------
create table if not exists public.course_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null check (author_role in ('student','parent')),
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 10 and 1000),
  locale text not null default 'en' check (locale in ('en','ar')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured boolean not null default false,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, author_id)
);
create index if not exists course_reviews_course_idx on public.course_reviews(course_id, status);
create trigger course_reviews_updated_at before update on public.course_reviews for each row execute function public.set_updated_at();
create trigger course_reviews_audit after insert or update or delete on public.course_reviews for each row execute function public.audit_row();

create or replace function public.can_review(p_course uuid, p_student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e where e.course_id = p_course and e.student_id = p_student and e.status = 'completed')
     and (p_student = uid or public.is_parent_of(p_student, uid));
$$;

create or replace function public.course_reviews_guard() returns trigger
language plpgsql as $$
begin
  if public.is_service_role() or public.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then new.moderated_by := auth.uid(); new.moderated_at := now(); end if;
    if new.status <> 'approved' then new.featured := false; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.course_id <> old.course_id or new.student_id <> old.student_id or new.author_id <> old.author_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new.author_id <> auth.uid() or not public.can_review(new.course_id, new.student_id) then
    raise exception 'only students who completed this course, or their verified parents, can review it' using errcode = '42501';
  end if;
  new.author_role := case when new.student_id = auth.uid() then 'student' else 'parent' end;
  new.status := 'pending'; new.featured := false; new.moderated_by := null; new.moderated_at := null;
  new.is_test_data := coalesce(old.is_test_data, false);
  return new;
end $$;
create trigger course_reviews_guard before insert or update on public.course_reviews for each row execute function public.course_reviews_guard();

alter table public.course_reviews enable row level security;
create policy course_reviews_own_read on public.course_reviews for select using (author_id = auth.uid() or public.is_admin());
create policy course_reviews_insert on public.course_reviews for insert with check (author_id = auth.uid());
create policy course_reviews_update on public.course_reviews for update using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy course_reviews_delete on public.course_reviews for delete using (author_id = auth.uid() or public.is_admin());

-- Approved reviews for one course, or featured approved reviews site-wide (p_course null).
create or replace function public.public_reviews(p_course uuid default null, p_limit int default 12)
returns table (id uuid, course_id uuid, course_title_en text, course_title_ar text, course_slug text, author_first_name text,
               author_role text, rating int, body text, locale text, created_at timestamptz, is_test_data boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.course_id, c.title_en, c.title_ar, c.slug,
         split_part(regexp_replace(coalesce(p.full_name,''), '^Demo (Student |Parent )?', ''), ' ', 1),
         r.author_role, r.rating, r.body, r.locale, r.created_at, r.is_test_data
  from public.course_reviews r
  join public.courses c on c.id = r.course_id and c.status = 'published'
  join public.profiles p on p.id = r.author_id
  where r.status = 'approved' and (case when p_course is null then r.featured else r.course_id = p_course end)
  order by r.created_at desc limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.public_reviews(uuid, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Per-course public stats for cards and pages: learners + approved rating
-- ---------------------------------------------------------------------
create or replace function public.public_course_stats()
returns table (course_id uuid, learners int, rating numeric, reviews int)
language sql stable security definer set search_path = public as $$
  select c.id,
         (select count(*)::int from public.enrollments e where e.course_id = c.id and e.status in ('active','completed')),
         (select round(avg(r.rating)::numeric, 1) from public.course_reviews r where r.course_id = c.id and r.status = 'approved'),
         (select count(*)::int from public.course_reviews r where r.course_id = c.id and r.status = 'approved')
  from public.courses c where c.status = 'published';
$$;
grant execute on function public.public_course_stats() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Resource library
-- access: public (anyone) · registered (signed in) · enrolled (enrolled in course_id)
-- Locked items are listed with their title but WITHOUT their URL.
-- ---------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default extensions.gen_random_uuid(),
  title_en text not null check (char_length(title_en) between 3 and 160),
  title_ar text not null check (char_length(title_ar) between 2 and 160),
  description_en text check (description_en is null or char_length(description_en) <= 600),
  description_ar text check (description_ar is null or char_length(description_ar) <= 600),
  kind text not null check (kind in ('pdf','video','worksheet','link','code')),
  url text not null check (url ~ '^(https://|/)'),
  category public.course_category,
  grade_min int check (grade_min between 1 and 12),
  grade_max int check (grade_max between 1 and 12),
  course_id uuid references public.courses(id) on delete set null,
  access text not null default 'public' check (access in ('public','registered','enrolled')),
  status public.publish_status not null default 'draft',
  position int not null default 0,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access <> 'enrolled' or course_id is not null),
  check (grade_min is null or grade_max is null or grade_min <= grade_max)
);
create index if not exists resources_status_idx on public.resources(status, category);
create trigger resources_updated_at before update on public.resources for each row execute function public.set_updated_at();
create trigger resources_audit after insert or update or delete on public.resources for each row execute function public.audit_row();

alter table public.resources enable row level security;
create policy resources_admin_all on public.resources for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.library_items(p_category text default null, p_grade int default null, p_kind text default null)
returns table (id uuid, title_en text, title_ar text, description_en text, description_ar text, kind text, url text,
               category text, grade_min int, grade_max int, course_id uuid, course_slug text, course_title_en text, course_title_ar text,
               access text, unlocked boolean, is_test_data boolean)
language sql stable security definer set search_path = public as $$
  with x as (
    select r.*, c.slug as c_slug, c.title_en as c_en, c.title_ar as c_ar,
           (r.access = 'public'
            or (r.access = 'registered' and auth.uid() is not null)
            or (r.access = 'enrolled' and (public.is_enrolled(r.course_id) or public.is_course_instructor(r.course_id) or public.is_admin()))) as ok
    from public.resources r left join public.courses c on c.id = r.course_id and c.status = 'published'
    where r.status = 'published'
      and (p_category is null or r.category::text = p_category)
      and (p_grade is null or ((r.grade_min is null or r.grade_min <= p_grade) and (r.grade_max is null or r.grade_max >= p_grade)))
      and (p_kind is null or r.kind = p_kind)
  )
  select id, title_en, title_ar, description_en, description_ar, kind, case when ok then url end,
         category::text, grade_min, grade_max, course_id, c_slug, c_en, c_ar, access, ok, is_test_data
  from x order by position, title_en;
$$;
grant execute on function public.library_items(text, int, text) to anon, authenticated;
