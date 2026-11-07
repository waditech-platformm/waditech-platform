-- =====================================================================
-- WadiTech Academy — 0011 Opt-in public list of partner schools
--
-- Organizations stay private under RLS. A school appears on the public site
-- (header "Schools" menu, /schools page) only when an ADMIN sets
-- show_publicly = true, which should happen after the school agreed to be
-- listed. Only the name, city and type are exposed — never contacts or members.
-- =====================================================================

alter table public.organizations
  add column if not exists show_publicly boolean not null default false;

-- Coordinators may update their own organization (policy orgs_coordinator_update),
-- but listing a school publicly is an admin decision.
create or replace function public.guard_org_show_publicly() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.show_publicly is distinct from old.show_publicly and not public.is_admin() then
    raise exception 'only administrators can change public listing' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists organizations_guard_show_publicly on public.organizations;
create trigger organizations_guard_show_publicly
  before update of show_publicly on public.organizations
  for each row execute function public.guard_org_show_publicly();

create or replace function public.public_partner_schools()
returns table (id uuid, name text, name_ar text, slug text, type public.org_type, city text, is_test_data boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.name_ar, o.slug, o.type, o.city, o.is_test_data
  from public.organizations o
  where o.status = 'active' and o.show_publicly
  order by o.is_test_data, o.name
  limit 200;
$$;
revoke all on function public.public_partner_schools() from public;
grant execute on function public.public_partner_schools() to anon, authenticated;
