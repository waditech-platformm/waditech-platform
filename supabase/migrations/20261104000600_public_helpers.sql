-- =====================================================================
-- WadiTech Academy — 0006 Narrow, privacy-preserving read helpers
-- Profiles are NEVER public. These functions expose only the minimum fields a page needs.
-- =====================================================================

create or replace function public.course_seats(p_course uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.enrollments
  where course_id = p_course and status in ('active','completed','pending_payment','pending_approval')
    and exists (select 1 from public.courses c where c.id = p_course and c.status = 'published');
$$;
grant execute on function public.course_seats(uuid) to anon, authenticated;

-- trainer display names for a published course (staff names are public-facing)
create or replace function public.course_trainers(p_course uuid) returns table (trainer_id uuid, full_name text, is_lead boolean)
language sql stable security definer set search_path = public as $$
  select ci.trainer_id, p.full_name, ci.is_lead from public.course_instructors ci
  join public.profiles p on p.id = ci.trainer_id
  join public.courses c on c.id = ci.course_id and c.status = 'published'
  where ci.course_id = p_course order by ci.is_lead desc, p.full_name;
$$;
grant execute on function public.course_trainers(uuid) to anon, authenticated;

-- approved public projects with FIRST NAME ONLY of the student
create or replace function public.public_projects(p_limit int default 24) returns table (
  id uuid, title text, description text, cover_url text, link_url text, student_first_name text, course_title_en text, course_title_ar text, is_test_data boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select sp.id, sp.title, sp.description, sp.cover_url, sp.link_url,
         split_part(regexp_replace(coalesce(p.full_name,''), '^Demo (Student )?', ''), ' ', 1),
         c.title_en, c.title_ar, sp.is_test_data, sp.created_at
  from public.student_projects sp
  join public.profiles p on p.id = sp.student_id
  left join public.courses c on c.id = sp.course_id
  where sp.visibility = 'public' and sp.approval_status = 'approved'
  order by sp.created_at desc limit least(greatest(p_limit,1),100);
$$;
grant execute on function public.public_projects(int) to anon, authenticated;

-- ADMIN: list users with email + roles
create or replace function public.admin_list_users(p_search text default null, p_role public.app_role default null, p_limit int default 50, p_offset int default 0)
returns table (id uuid, email text, full_name text, account_status public.account_status, roles public.app_role[], created_at timestamptz, last_sign_in_at timestamptz, email_confirmed boolean, is_test_data boolean, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode='42501'; end if;
  return query
  with base as (
    select u.id, u.email::text, p.full_name, p.account_status,
           coalesce(array_agg(r.role order by r.role) filter (where r.role is not null), '{}') as roles,
           u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null as email_confirmed, p.is_test_data
    from auth.users u join public.profiles p on p.id = u.id
    left join public.user_roles r on r.user_id = u.id
    where (p_search is null or u.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%')
    group by u.id, p.id
  )
  select b.*, count(*) over () from base b
  where p_role is null or p_role = any(b.roles)
  order by b.created_at desc limit least(p_limit, 200) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_find_user_by_email(p_email text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode='42501'; end if;
  select id into v from auth.users where lower(email) = lower(trim(p_email));
  return v;
end $$;

create or replace function public.admin_set_account_status(p_user uuid, p_status public.account_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode='42501'; end if;
  if p_user = auth.uid() then raise exception 'you cannot remove your own administrator role' using errcode='42501'; end if;
  if public.is_super_admin(p_user) and not public.is_super_admin() then
    raise exception 'only super administrators can manage admin roles' using errcode='42501'; end if;
  update public.profiles set account_status = p_status where id = p_user;
  perform public.write_audit('set_status','profiles', p_user::text, jsonb_build_object('status', p_status));
end $$;

-- Admin dashboard KPIs in one round trip
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode='42501'; end if;
  return jsonb_build_object(
    'students', (select count(*) from public.user_roles where role = 'student'),
    'active_enrollments', (select count(*) from public.enrollments where status = 'active'),
    'published_courses', (select count(*) from public.courses where status = 'published'),
    'pending_enrollments', (select count(*) from public.enrollments where status in ('pending_approval')),
    'pending_links', (select count(*) from public.parent_student_links where status = 'pending'),
    'pending_projects', (select count(*) from public.student_projects where approval_status = 'pending'),
    'new_messages', (select count(*) from public.contact_messages where status = 'new'),
    'pending_scholarships', (select count(*) from public.scholarship_applications where status in ('submitted','under_review')),
    'paid_orders', (select count(*) from public.orders where status = 'paid'),
    'paid_total_jod', (select coalesce(sum(total),0) from public.orders where status = 'paid' and currency = 'JOD'),
    'paid_total_usd', (select coalesce(sum(total),0) from public.orders where status = 'paid' and currency = 'USD'),
    'enrollments_by_category', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select c.category, count(*) n from public.enrollments e join public.courses c on c.id = e.course_id
        where e.status in ('active','completed') group by c.category order by n desc) x)
  );
end $$;

-- School coordinator dashboard (tenant-scoped)
create or replace function public.school_overview(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_org_coordinator(p_org) or public.is_admin()) then raise exception 'not allowed' using errcode='42501'; end if;
  return jsonb_build_object(
    'students', (select coalesce(jsonb_agg(s order by s.full_name), '[]'::jsonb) from (
        select p.id, p.full_name,
          (select count(*) from public.enrollments e where e.student_id = p.id and e.status in ('active','completed')) as enrollments,
          (select round(avg(cp.percent)) from public.enrollments e cross join lateral public.course_progress(e.course_id, p.id) cp
             where e.student_id = p.id and e.status in ('active','completed')) as avg_progress,
          (select round(100.0 * count(*) filter (where a.status in ('present','late')) / nullif(count(*),0)) from public.attendance a where a.student_id = p.id) as attendance_rate,
          (select count(*) from public.certificates c where c.student_id = p.id and c.status = 'valid') as certificates
        from public.organization_members m join public.profiles p on p.id = m.user_id
        where m.organization_id = p_org and m.member_role = 'student') s),
    'trainers', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'full_name', p.full_name)), '[]'::jsonb)
        from public.organization_members m join public.profiles p on p.id = m.user_id where m.organization_id = p_org and m.member_role = 'trainer'),
    'enrollments', (select coalesce(jsonb_agg(jsonb_build_object('course_title_en', c.title_en, 'course_title_ar', c.title_ar, 'n', x.n)), '[]'::jsonb)
        from (select e.course_id, count(*) n from public.enrollments e join public.organization_members m on m.user_id = e.student_id
              and m.organization_id = p_org and m.member_role = 'student' where e.status in ('active','completed') group by e.course_id) x
        join public.courses c on c.id = x.course_id)
  );
end $$;
