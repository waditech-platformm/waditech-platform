-- =====================================================================
-- WadiTech Academy — 0001 Identity, roles, organizations, family links
-- =====================================================================
-- Conventions
--  * Every table has RLS enabled. Default = deny.
--  * Privileged logic lives in SECURITY DEFINER functions with a fixed search_path.
--  * is_test_data marks fictional seed rows so they are never mistaken for real records.

create type public.app_role as enum ('super_admin','admin','trainer','student','parent','school_coordinator');
create type public.account_status as enum ('active','suspended','deactivated');

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.is_service_role() returns boolean
language sql stable as $$
  -- service-role API key, OR a direct trusted DB session (migrations / seed) that carries no end-user JWT.
  -- NOTE: uses session_user (not current_user) so SECURITY DEFINER functions cannot spoof it.
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or (session_user in ('postgres','supabase_admin','supabase_auth_admin')
          and coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') = '');
$$;

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  preferred_locale text not null default 'en' check (preferred_locale in ('en','ar')),
  phone text check (phone is null or char_length(phone) <= 32),
  date_of_birth date,
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 1000),
  account_status public.account_status not null default 'active',
  -- short code a student shares with a parent to request a family link (not a secret credential)
  family_link_code text not null unique default upper(substr(replace(extensions.gen_random_uuid()::text,'-',''),1,8)),
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles(role);

-- Role helpers (SECURITY DEFINER so policies can call them without recursion)
create or replace function public.has_role(r public.app_role, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = r);
$$;

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = uid and role in ('admin','super_admin'))
     and exists (select 1 from public.profiles where id = uid and account_status = 'active');
$$;

create or replace function public.is_super_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = 'super_admin')
     and exists (select 1 from public.profiles where id = uid and account_status = 'active');
$$;

create or replace function public.is_active_user(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and account_status = 'active');
$$;

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata,'{}'::jsonb));
$$;
revoke execute on function public.write_audit(text,text,text,jsonb) from public, anon;

-- Generic row audit trigger
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id text;
begin
  v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id',
                   to_jsonb(new) ->> 'user_id', to_jsonb(old) ->> 'user_id');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id,
          case when tg_op = 'UPDATE' then jsonb_build_object('status_before', to_jsonb(old) ->> 'status', 'status_after', to_jsonb(new) ->> 'status')
               when tg_op = 'DELETE' then jsonb_build_object('deleted', true)
               else '{}'::jsonb end);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------
-- New auth user -> profile + SAFE default role
-- Only 'student' or 'parent' can ever be chosen at signup. Everything else is ignored.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_type text := coalesce(new.raw_user_meta_data ->> 'account_type', 'student');
  v_role public.app_role;
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
begin
  v_role := case when v_type = 'parent' then 'parent'::public.app_role else 'student'::public.app_role end;
  insert into public.profiles(id, full_name, preferred_locale)
  values (new.id,
          left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
          case when v_locale in ('en','ar') then v_locale else 'en' end);
  insert into public.user_roles(user_id, role) values (new.id, v_role);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Protect sensitive profile columns from self-modification
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then return new; end if;
  if new.account_status is distinct from old.account_status
     or new.family_link_code is distinct from old.family_link_code
     or new.is_test_data is distinct from old.is_test_data
     or new.id is distinct from old.id then
    raise exception 'not allowed to change protected profile fields' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

-- Role changes: only admins; only super admins may grant/revoke admin or super_admin
create or replace function public.guard_user_roles() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role public.app_role := coalesce(new.role, old.role);
begin
  if public.is_service_role() then return coalesce(new, old); end if;
  if not public.is_admin() then
    raise exception 'only administrators can change roles' using errcode = '42501';
  end if;
  if v_role in ('admin','super_admin') and not public.is_super_admin() then
    raise exception 'only super administrators can manage admin roles' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and old.user_id = auth.uid() and old.role in ('admin','super_admin') then
    raise exception 'you cannot remove your own administrator role' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then new.granted_by := auth.uid(); end if;
  return coalesce(new, old);
end $$;
create trigger user_roles_guard before insert or update or delete on public.user_roles
for each row execute function public.guard_user_roles();
create trigger user_roles_audit after insert or update or delete on public.user_roles
for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Organizations (schools / institutions) — tenant boundary
-- ---------------------------------------------------------------------
create type public.org_type as enum ('school','university','company','community','other');
create type public.org_member_role as enum ('coordinator','trainer','student');

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  name_ar text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  type public.org_type not null default 'school',
  city text,
  contact_email text,
  contact_phone text,
  status text not null default 'active' check (status in ('active','inactive')),
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role public.org_member_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, member_role)
);
create index org_members_user_idx on public.organization_members(user_id);

create or replace function public.is_org_coordinator(org uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
                 join public.user_roles r on r.user_id = m.user_id and r.role = 'school_coordinator'
                 where m.organization_id = org and m.user_id = uid and m.member_role = 'coordinator');
$$;

create or replace function public.is_org_member(org uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = org and user_id = uid);
$$;

-- coordinator of ANY org that the student belongs to
create or replace function public.coordinates_student(student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members s
    join public.organization_members c on c.organization_id = s.organization_id
    join public.user_roles r on r.user_id = c.user_id and r.role = 'school_coordinator'
    where s.user_id = student and s.member_role = 'student'
      and c.user_id = uid and c.member_role = 'coordinator');
$$;

-- ---------------------------------------------------------------------
-- Parent <-> student links (must be VERIFIED before a parent sees anything)
-- ---------------------------------------------------------------------
create table public.parent_student_links (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null default 'parent' check (relationship in ('parent','guardian')),
  status text not null default 'pending' check (status in ('pending','verified','rejected','revoked')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id),
  check (parent_id <> student_id)
);
create index psl_student_idx on public.parent_student_links(student_id);

create or replace function public.is_parent_of(student uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parent_student_links
                 where parent_id = uid and student_id = student and status = 'verified')
     and public.has_role('parent', uid);
$$;

-- Parent requests a link with the student's family code. Admin verifies.
create or replace function public.request_parent_link(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_id uuid;
begin
  if not public.has_role('parent') then raise exception 'only parent accounts can request links' using errcode='42501'; end if;
  select p.id into v_student from public.profiles p
    join public.user_roles r on r.user_id = p.id and r.role = 'student'
    where p.family_link_code = upper(trim(p_code));
  if v_student is null then raise exception 'invalid code' using errcode='P0002'; end if;
  insert into public.parent_student_links(parent_id, student_id) values (auth.uid(), v_student)
  on conflict (parent_id, student_id) do update set status = case when parent_student_links.status in ('rejected','revoked') then 'pending' else parent_student_links.status end
  returning id into v_id;
  perform public.write_audit('request','parent_student_links', v_id::text);
  return v_id;
end $$;

create or replace function public.guard_parent_links() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then
    if new.status = 'verified' and old.status is distinct from 'verified' then
      new.verified_by := auth.uid(); new.verified_at := now();
    end if;
    return new;
  end if;
  raise exception 'only administrators can change family links' using errcode='42501';
end $$;
create trigger psl_guard before update on public.parent_student_links for each row execute function public.guard_parent_links();
create trigger psl_audit after insert or update or delete on public.parent_student_links for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.parent_student_links enable row level security;

-- profiles: self, admins, verified parents, coordinators of the student's org.
-- (trainer visibility added in the LMS migration once enrollments exist)
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin() or public.is_parent_of(id) or public.coordinates_student(id)
);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy user_roles_select on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_insert on public.user_roles for insert to authenticated with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles for delete to authenticated using (public.is_admin());

create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());
-- no insert/update/delete policies: writes only through SECURITY DEFINER functions/triggers

create policy orgs_select on public.organizations for select to authenticated using (public.is_admin() or public.is_org_member(id));
create policy orgs_admin_all on public.organizations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orgs_coordinator_update on public.organizations for update to authenticated using (public.is_org_coordinator(id)) with check (public.is_org_coordinator(id));

create policy org_members_select on public.organization_members for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or public.is_org_coordinator(organization_id));
create policy org_members_admin_all on public.organization_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy psl_select on public.parent_student_links for select to authenticated using (
  parent_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy psl_admin_update on public.parent_student_links for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy psl_admin_delete on public.parent_student_links for delete to authenticated using (public.is_admin());
