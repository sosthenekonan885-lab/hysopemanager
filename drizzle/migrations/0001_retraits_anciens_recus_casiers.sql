alter table public.orders add column if not exists legacy boolean not null default false;
alter table public.order_items add column if not exists ready boolean not null default false;

alter table public.payments drop constraint if exists payments_context_check;
alter table public.payments add constraint payments_context_check check (context in ('depot','retrait','livraison','ancien'));

-- Numérotation : nouvelles commandes = séquence ; anciens reçus = numéro papier, la séquence saute au-delà
create or replace function public.guard_order() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    new.discount := 0; new.created_by := auth.uid();
    if new.legacy then
      if new.number is null or new.number <= 0 then raise exception 'Numéro du reçu papier requis'; end if;
      if exists(select 1 from public.orders where number=new.number) then raise exception 'Le reçu N°% existe déjà', lpad(new.number::text,6,'0'); end if;
      if new.status not in ('en_cours','pret','a_livrer','retire','livre') then new.status := 'en_cours'; end if;
      if new.number >= (select case when is_called then last_value else last_value-1 end from public.order_number_seq) then
        perform setval('public.order_number_seq', new.number, true);
      end if;
    else
      loop
        new.number := nextval('public.order_number_seq');
        exit when not exists(select 1 from public.orders where number=new.number);
      end loop;
      new.status := 'en_cours'; new.created_at := now();
    end if;
    return new;
  end if;
  new.number := old.number; new.legacy := old.legacy;
  if not public.is_admin() then
    if new.discount is distinct from old.discount then raise exception 'Réduction : validation administrateur requise'; end if;
    if new.status='annule' and old.status<>'annule' then raise exception 'Annulation : validation administrateur requise'; end if;
  end if;
  if old.status='annule' and new.status<>'annule' then raise exception 'Une commande annulée ne peut pas être réactivée'; end if;
  return new; end $$;

-- Casiers : 12 lots de 7 vêtements maximum (84 vêtements)
drop index if exists public.orders_locker_active;
create or replace function public.check_locker() returns trigger language plpgsql security definer set search_path=public as $$
declare lots int;
begin
  if new.locker_code is not null and new.status in ('pret','a_livrer')
     and (tg_op='INSERT' or new.locker_code is distinct from old.locker_code or new.status is distinct from old.status) then
    select coalesce(sum(ceil(coalesce((select sum(quantity) from public.order_items i where i.order_id=o.id),0)::numeric/7)),0) into lots
      from public.orders o where o.locker_code=new.locker_code and o.status in ('pret','a_livrer') and o.id<>new.id;
    lots := lots + greatest(ceil(coalesce((select sum(quantity) from public.order_items i where i.order_id=new.id),0)::numeric/7),1);
    if lots > 12 then raise exception 'Casier % plein : 12 lots de 7 vêtements maximum', new.locker_code; end if;
  end if;
  return new; end $$;
create trigger trg_check_locker before insert or update on public.orders for each row execute function public.check_locker();

-- Statut automatique selon l'état de chaque vêtement
create or replace function public.sync_ready() returns trigger language plpgsql security definer set search_path=public as $$
declare oid uuid := coalesce(new.order_id, old.order_id); o record; all_ready boolean;
begin
  select * into o from public.orders where id=oid;
  if o is null or o.status not in ('en_cours','pret','a_livrer') then return null; end if;
  select bool_and(ready) into all_ready from public.order_items where order_id=oid;
  if coalesce(all_ready,false) and o.status='en_cours' then
    update public.orders set status = case when delivery_mode='livraison' then 'a_livrer'::order_status else 'pret'::order_status end, ready_at=now() where id=oid;
  elsif not coalesce(all_ready,false) and o.status in ('pret','a_livrer') then
    update public.orders set status='en_cours', ready_at=null, locker_code=null where id=oid;
  end if;
  return null; end $$;
create trigger trg_sync_ready after insert or update of ready or delete on public.order_items for each row execute function public.sync_ready();

-- Journal des retraits
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  client_name text not null,
  receipt_no bigint not null,
  amount integer not null default 0 check (amount >= 0),
  order_id uuid references public.orders(id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz
);
create unique index withdrawals_receipt_unique on public.withdrawals(receipt_no);
grant select, insert, update on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "staff read wd" on public.withdrawals for select to authenticated using (public.is_staff());
create policy "staff ins wd" on public.withdrawals for insert to authenticated with check (public.is_staff());
create policy "staff upd wd" on public.withdrawals for update to authenticated using (public.is_staff()) with check (public.is_staff());
create or replace function public.touch_withdrawal() returns trigger language plpgsql security definer set search_path=public as $$
begin new.updated_by := auth.uid(); new.updated_at := now(); new.created_by := old.created_by; return new; end $$;
create trigger trg_touch_wd before update on public.withdrawals for each row execute function public.touch_withdrawal();
create trigger trg_audit_withdrawals after insert or update or delete on public.withdrawals for each row execute function public.audit();

create or replace function public.log_withdrawal() returns trigger language plpgsql security definer set search_path=public as $$
declare cname text; amt int;
begin
  if new.status in ('retire','livre') and old.status not in ('retire','livre') then
    select name into cname from public.clients where id=new.client_id;
    select coalesce(sum(amount),0) into amt from public.payments where order_id=new.id and context in ('retrait','livraison');
    insert into public.withdrawals(date, client_name, receipt_no, amount, order_id)
      values (current_date, cname, new.number, amt, new.id)
      on conflict (receipt_no) do nothing;
  end if;
  return null; end $$;
create trigger trg_log_withdrawal after update on public.orders for each row execute function public.log_withdrawal();