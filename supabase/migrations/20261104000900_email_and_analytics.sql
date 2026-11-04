-- =====================================================================
-- WadiTech Academy — 0009 Email delivery queue + admin analytics
-- Every in-app notification is also queued for email. A server worker (/api/cron/notifications)
-- claims due rows with the service role, sends them through the configured provider and reports
-- the result. Failures retry with exponential backoff (1, 2, 4, 8 min…) up to 5 attempts.
-- =====================================================================

alter table public.notifications add column if not exists email_next_attempt_at timestamptz;
create index if not exists notifications_email_queue_idx on public.notifications (email_next_attempt_at) where email_status = 'queued';

create or replace function public.queue_notification_email() returns trigger
language plpgsql as $$
begin
  if new.email_status = 'not_requested' then
    new.email_status := 'queued';
    new.email_next_attempt_at := now();
  end if;
  return new;
end $$;
drop trigger if exists notifications_queue_email on public.notifications;
create trigger notifications_queue_email before insert on public.notifications for each row execute function public.queue_notification_email();

-- Claim up to p_limit due emails. Claimed rows are pushed 10 minutes into the future so a crashed
-- worker cannot cause a double send before the lease expires.
create or replace function public.claim_notification_emails(p_limit int default 25)
returns table (id uuid, email text, full_name text, locale text, kind text, title_en text, title_ar text,
               body_en text, body_ar text, link text, attempts int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  with due as (
    select n.id from public.notifications n
    where n.email_status = 'queued' and coalesce(n.email_next_attempt_at, now()) <= now()
    order by n.created_at
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  ), leased as (
    update public.notifications n set email_attempts = n.email_attempts + 1, email_next_attempt_at = now() + interval '10 minutes'
    from due where n.id = due.id
    returning n.*
  )
  select l.id, u.email::text, p.full_name, p.preferred_locale, l.kind, l.title_en, l.title_ar, l.body_en, l.body_ar, l.link, l.email_attempts
  from leased l join auth.users u on u.id = l.user_id left join public.profiles p on p.id = l.user_id;
end $$;

create or replace function public.report_notification_email(p_id uuid, p_ok boolean, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.notifications set
    email_status = case when p_ok then 'sent' when email_attempts >= 5 then 'failed' else 'queued' end,
    email_last_error = case when p_ok then null else left(p_error, 500) end,
    email_next_attempt_at = case when p_ok or email_attempts >= 5 then null
                                 else now() + make_interval(mins => power(2, greatest(email_attempts - 1, 0))::int) end
  where id = p_id;
end $$;

revoke execute on function public.claim_notification_emails(int) from public, anon, authenticated;
revoke execute on function public.report_notification_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notification_emails(int) to service_role;
grant execute on function public.report_notification_email(uuid, boolean, text) to service_role;

-- ---------------------------------------------------------------------
-- Admin analytics (aggregates only; no personal data leaves the database)
-- ---------------------------------------------------------------------
create or replace function public.admin_analytics() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'enrollments_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'n', coalesce(x.n, 0)) order by w.week), '[]'::jsonb)
      from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as w(week)
      left join (select date_trunc('week', e.enrolled_at) wk, count(*) n from public.enrollments e group by 1) x on x.wk = w.week),
    'signups_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'n', coalesce(x.n, 0)) order by w.week), '[]'::jsonb)
      from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as w(week)
      left join (select date_trunc('week', p.created_at) wk, count(*) n from public.profiles p group by 1) x on x.wk = w.week),
    'revenue_by_month', (select coalesce(jsonb_agg(jsonb_build_object('month', m.month, 'jod', coalesce(x.jod, 0), 'usd', coalesce(x.usd, 0)) order by m.month), '[]'::jsonb)
      from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') as m(month)
      left join (select date_trunc('month', o.paid_at) mo,
                        sum(o.total) filter (where o.currency = 'JOD') jod, sum(o.total) filter (where o.currency = 'USD') usd
                 from public.orders o where o.status = 'paid' group by 1) x on x.mo = m.month),
    'courses', (select coalesce(jsonb_agg(c order by c.enrolled desc, c.title_en), '[]'::jsonb) from (
      select co.id, co.title_en, co.title_ar, co.category,
        count(e.id) filter (where e.status in ('active', 'completed')) enrolled,
        count(e.id) filter (where e.status = 'completed') completed,
        (select count(*) from public.certificates ce where ce.course_id = co.id and ce.status = 'valid') certificates
      from public.courses co left join public.enrollments e on e.course_id = co.id
      where co.status = 'published' group by co.id) c),
    'quiz', (select jsonb_build_object('attempts', count(*), 'passed', count(*) filter (where t.passed),
                                       'avg_score', round(avg(t.score_percent)))
             from public.assessment_attempts t where t.status = 'graded'),
    'roles', (select coalesce(jsonb_object_agg(role, n), '{}'::jsonb) from (select role::text, count(*) n from public.user_roles group by 1) r),
    'email', (select jsonb_build_object('queued', count(*) filter (where email_status = 'queued'),
                                        'sent', count(*) filter (where email_status = 'sent'),
                                        'failed', count(*) filter (where email_status = 'failed'))
              from public.notifications where created_at > now() - interval '30 days')
  );
end $$;
