-- =====================================================================
-- WadiTech Academy — 0005 Orders & payments (SANDBOX FIRST)
-- Card data never touches this database. Client-side confirmation is never trusted:
-- only the server (service role) can mark an order paid, after verifying with the provider.
-- =====================================================================
create table public.discount_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{3,32}$'),
  percent_off int not null check (percent_off between 1 and 100),
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number text not null unique default ('ORD-' || upper(substr(replace(extensions.gen_random_uuid()::text,'-',''),1,10))),
  user_id uuid not null references auth.users(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  subtotal numeric(10,3) not null check (subtotal >= 0),
  discount_amount numeric(10,3) not null default 0 check (discount_amount >= 0),
  total numeric(10,3) not null check (total >= 0),
  currency public.currency_code not null,
  discount_code text references public.discount_codes(code),
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded','partially_refunded')),
  provider text not null default 'sandbox' check (provider in ('sandbox','hyperpay')),
  provider_checkout_id text,
  is_sandbox boolean not null default true,
  paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_checkout_idx on public.orders(provider_checkout_id);
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger orders_audit after insert or update on public.orders for each row execute function public.audit_row();

create table public.payment_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  type text not null check (type in ('payment','refund')),
  provider_reference text,
  amount numeric(10,3) not null,
  currency public.currency_code not null,
  status text not null check (status in ('succeeded','failed','pending')),
  result_code text,
  result_description text,
  is_sandbox boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference, type)
);
create index payment_tx_order_idx on public.payment_transactions(order_id);

-- Create (or reuse) the order for a pending_payment enrollment. Price is ALWAYS read from the course row.
create or replace function public.create_order_for_enrollment(p_enrollment uuid, p_discount_code text default null) returns public.orders
language plpgsql security definer set search_path = public as $$
declare e public.enrollments; c public.courses; d public.discount_codes; o public.orders; v_disc numeric := 0;
begin
  select * into e from public.enrollments where id = p_enrollment for update;
  if e.id is null then raise exception 'enrollment not found' using errcode='P0002'; end if;
  if not (e.student_id = auth.uid() or public.is_parent_of(e.student_id) or public.is_admin()) then
    raise exception 'not allowed' using errcode='42501'; end if;
  if e.status <> 'pending_payment' then raise exception 'enrollment does not require payment' using errcode='P0001'; end if;
  select * into o from public.orders where enrollment_id = e.id and status = 'pending' order by created_at desc limit 1;
  if o.id is not null and p_discount_code is null then return o; end if;
  select * into c from public.courses where id = e.course_id;
  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into d from public.discount_codes where code = upper(trim(p_discount_code)) and active
      and (valid_until is null or valid_until > now()) and (max_uses is null or used_count < max_uses);
    if d.code is null then raise exception 'invalid discount code' using errcode='P0001'; end if;
    v_disc := round(c.price_amount * d.percent_off / 100.0, 3);
  end if;
  if o.id is not null then update public.orders set status = 'cancelled' where id = o.id; end if;
  insert into public.orders(user_id, student_id, course_id, enrollment_id, subtotal, discount_amount, total, currency, discount_code)
  values (auth.uid(), e.student_id, c.id, e.id, c.price_amount, v_disc, greatest(c.price_amount - v_disc, 0), c.currency, d.code)
  returning * into o;
  return o;
end $$;

-- SERVER ONLY: record a verified provider result. Amount & currency must match the order exactly.
create or replace function public.record_payment_result(p_order uuid, p_provider text, p_reference text, p_amount numeric, p_currency public.currency_code,
  p_succeeded boolean, p_result_code text, p_result_description text, p_is_sandbox boolean) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_service_role() then raise exception 'server only' using errcode='42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'order not found' using errcode='P0002'; end if;
  insert into public.payment_transactions(order_id, provider, type, provider_reference, amount, currency, status, result_code, result_description, is_sandbox)
  values (o.id, p_provider, 'payment', p_reference, p_amount, p_currency, case when p_succeeded then 'succeeded' else 'failed' end,
          left(p_result_code,64), left(p_result_description,300), p_is_sandbox)
  on conflict (provider, provider_reference, type) do nothing;
  if o.status = 'paid' then return o; end if; -- idempotent
  if p_succeeded then
    if p_amount <> o.total or p_currency <> o.currency then
      update public.orders set status = 'failed' where id = o.id returning * into o;
      perform public.write_audit('amount_mismatch','orders', o.id::text, jsonb_build_object('expected', o.total, 'got', p_amount));
      return o;
    end if;
    update public.orders set status = 'paid', paid_at = now(), provider = p_provider, is_sandbox = p_is_sandbox where id = o.id returning * into o;
    update public.enrollments set status = case when (select requires_approval from public.courses where id = o.course_id) then 'pending_approval'::public.enrollment_status else 'active'::public.enrollment_status end
      where id = o.enrollment_id and status = 'pending_payment';
    if o.discount_code is not null then update public.discount_codes set used_count = used_count + 1 where code = o.discount_code; end if;
  else
    update public.orders set status = 'failed' where id = o.id and status = 'pending' returning * into o;
  end if;
  return o;
end $$;
revoke execute on function public.record_payment_result(uuid,text,text,numeric,public.currency_code,boolean,text,text,boolean) from public, anon, authenticated;
grant execute on function public.record_payment_result(uuid,text,text,numeric,public.currency_code,boolean,text,text,boolean) to service_role;

-- Admin refund status (provider refund call happens in the server adapter first)
create or replace function public.mark_order_refunded(p_order uuid, p_amount numeric, p_reference text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not (public.is_service_role() or public.is_admin()) then raise exception 'not allowed' using errcode='42501'; end if;
  select * into o from public.orders where id = p_order for update;
  if o.status not in ('paid','partially_refunded') then raise exception 'order is not paid' using errcode='P0001'; end if;
  if p_amount <= 0 or p_amount > o.total then raise exception 'invalid refund amount' using errcode='P0001'; end if;
  insert into public.payment_transactions(order_id, provider, type, provider_reference, amount, currency, status, is_sandbox)
  values (o.id, o.provider, 'refund', coalesce(p_reference, 'manual-' || extensions.gen_random_uuid()), p_amount, o.currency, 'succeeded', o.is_sandbox);
  update public.orders set status = case when p_amount = o.total then 'refunded' else 'partially_refunded' end where id = o.id returning * into o;
  if o.status = 'refunded' then update public.enrollments set status = 'refunded' where id = o.enrollment_id; end if;
  return o;
end $$;

alter table public.discount_codes enable row level security;
alter table public.orders enable row level security;
alter table public.payment_transactions enable row level security;

create policy discount_admin on public.discount_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orders_select on public.orders for select to authenticated using (user_id = auth.uid() or public.is_parent_of(student_id) or student_id = auth.uid() or public.is_admin());
create policy payment_tx_select on public.payment_transactions for select to authenticated using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.student_id = auth.uid())));
-- no insert/update policies: orders change only via the functions above
