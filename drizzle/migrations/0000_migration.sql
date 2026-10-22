
create type public.app_role as enum ('admin','gerante');
create type public.order_status as enum ('en_cours','pret','retire','a_livrer','livre','annule');
create type public.pay_method as enum ('especes','wave','orange_money');
create type public.request_status as enum ('en_attente','approuvee','refusee');

create table public.agencies (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
insert into public.agencies(name) values ('Yopougon Ananeraie');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  active boolean not null default true,
  locked boolean not null default false,
  failed_attempts int not null default 0,
  agency_id uuid references public.agencies(id),
  created_at timestamptz default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select on public.profiles to authenticated; grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
grant select on public.agencies to authenticated; grant all on public.agencies to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.agencies enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active and not locked) $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_staff() and public.has_role(auth.uid(),'admin') $$;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff() or id=auth.uid());
create policy "read roles" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "staff read agencies" on public.agencies for select to authenticated using (public.is_staff());

-- settings
create table public.settings (key text primary key, value jsonb not null);
insert into public.settings values ('fonds_semaine','10000'),('fonds_weekend','15000'),('livreur_defaut','"Fils du propriétaire"');
grant select, insert, update on public.settings to authenticated; grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "staff read settings" on public.settings for select to authenticated using (public.is_staff());
create policy "admin write settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text, whatsapp text, address text, quartier text, notes text,
  delivery_eligible boolean not null default false,
  agency_id uuid references public.agencies(id),
  created_by uuid, created_at timestamptz default now()
);
grant select, insert, update on public.clients to authenticated; grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "staff clients" on public.clients for all to authenticated using (public.is_staff()) with check (public.is_staff());
create or replace function public.guard_client() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then
    if tg_op='INSERT' then new.delivery_eligible := false;
    elsif new.delivery_eligible is distinct from old.delivery_eligible then raise exception 'Seul un administrateur peut définir l''éligibilité à la livraison'; end if;
  end if;
  return new; end $$;
create trigger trg_guard_client before insert or update on public.clients for each row execute function public.guard_client();

-- tarifs
create table public.price_categories (id uuid primary key default gen_random_uuid(), name text not null, sort int not null default 0, active boolean not null default true);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.price_categories(id),
  name text not null, price int, price_max int, variable boolean not null default false,
  active boolean not null default true, sort int not null default 0
);
create table public.price_history (id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id), old_price int, new_price int, changed_by uuid, changed_at timestamptz default now());
grant select, insert, update on public.price_categories, public.services to authenticated;
grant select on public.price_history to authenticated;
grant all on public.price_categories, public.services, public.price_history to service_role;
alter table public.price_categories enable row level security;
alter table public.services enable row level security;
alter table public.price_history enable row level security;
create policy "staff read cat" on public.price_categories for select to authenticated using (public.is_staff());
create policy "admin write cat" on public.price_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read svc" on public.services for select to authenticated using (public.is_staff());
create policy "admin write svc" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read ph" on public.price_history for select to authenticated using (public.is_staff());
create or replace function public.log_price() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.price is distinct from old.price or new.price_max is distinct from old.price_max then
    insert into public.price_history(service_id, old_price, new_price, changed_by) values (new.id, old.price, new.price, auth.uid());
  end if; return new; end $$;
create trigger trg_log_price after update on public.services for each row execute function public.log_price();

-- commandes
create sequence public.order_number_seq start 1;
create sequence public.bag_number_seq start 1;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  client_id uuid not null references public.clients(id),
  status order_status not null default 'en_cours',
  delivery_mode text not null default 'retrait' check (delivery_mode in ('retrait','livraison')),
  pickup_date date,
  total int not null default 0,
  discount int not null default 0,
  locker_code text, bag_code text,
  deliverer text,
  receipt_presented boolean,
  ready_at timestamptz, withdrawn_at timestamptz, withdrawn_by uuid, delivered_at timestamptz,
  cancel_reason text,
  agency_id uuid references public.agencies(id),
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create unique index orders_locker_active on public.orders(locker_code) where locker_code is not null and status in ('pret','a_livrer');
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id),
  designation text not null, quantity int not null default 1 check (quantity>0),
  unit_price int not null check (unit_price>=0),
  colors text[] not null default '{}', observation text
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  amount int not null check (amount>0),
  method pay_method not null,
  context text not null default 'depot' check (context in ('depot','retrait','livraison')),
  deliverer text,
  cash_confirmed_by uuid, cash_confirmed_at timestamptz,
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
grant select, insert, update on public.orders, public.payments to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant usage on sequence public.order_number_seq, public.bag_number_seq to authenticated;
grant all on public.orders, public.order_items, public.payments to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
create policy "staff orders" on public.orders for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff items" on public.order_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff payments" on public.payments for select to authenticated using (public.is_staff());
create policy "staff ins payments" on public.payments for insert to authenticated with check (public.is_staff());
create policy "staff upd payments" on public.payments for update to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace function public.next_bag_code() returns text language sql security definer set search_path=public as $$
  select 'S-' || lpad(nextval('public.bag_number_seq')::text, 3, '0') $$;
grant execute on function public.next_bag_code() to authenticated;

create or replace function public.guard_order() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    new.number := nextval('public.order_number_seq');
    new.discount := 0; new.status := 'en_cours'; new.created_by := auth.uid();
    return new;
  end if;
  new.number := old.number;
  if not public.is_admin() then
    if new.discount is distinct from old.discount then raise exception 'Réduction : validation administrateur requise'; end if;
    if new.status='annule' and old.status<>'annule' then raise exception 'Annulation : validation administrateur requise'; end if;
  end if;
  if old.status='annule' and new.status<>'annule' then raise exception 'Une commande annulée ne peut pas être réactivée'; end if;
  return new; end $$;
create trigger trg_guard_order before insert or update on public.orders for each row execute function public.guard_order();

create or replace function public.guard_item() returns trigger language plpgsql security definer set search_path=public as $$
declare s record;
begin
  if not public.is_admin() and new.service_id is not null then
    select * into s from public.services where id=new.service_id;
    if not s.variable and new.unit_price <> s.price then raise exception 'Le prix officiel ne peut pas être modifié'; end if;
  end if;
  return new; end $$;
create trigger trg_guard_item before insert or update on public.order_items for each row execute function public.guard_item();

create or replace function public.recalc_total() returns trigger language plpgsql security definer set search_path=public as $$
declare oid uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders set total = coalesce((select sum(quantity*unit_price) from public.order_items where order_id=oid),0) where id=oid;
  return null; end $$;
create trigger trg_recalc after insert or update or delete on public.order_items for each row execute function public.recalc_total();

create view public.order_summary with (security_invoker=true) as
  select o.*, c.name as client_name, c.phone as client_phone, c.address as client_address, c.quartier as client_quartier,
    (o.total - o.discount) as final_total,
    coalesce((select sum(amount) from public.payments p where p.order_id=o.id),0)::int as paid,
    greatest((o.total - o.discount) - coalesce((select sum(amount) from public.payments p where p.order_id=o.id),0),0)::int as balance
  from public.orders o join public.clients c on c.id=o.client_id;
grant select on public.order_summary to authenticated;

-- demandes (réduction / annulation)
create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  kind text not null check (kind in ('reduction','annulation')),
  amount int, percent numeric, reason text,
  initial_total int, final_total int,
  status request_status not null default 'en_attente',
  requested_by uuid default auth.uid(), requested_at timestamptz not null default now(),
  decided_by uuid, decided_at timestamptz
);
grant select, insert, update on public.order_requests to authenticated; grant all on public.order_requests to service_role;
alter table public.order_requests enable row level security;
create policy "staff read req" on public.order_requests for select to authenticated using (public.is_staff());
create policy "staff ins req" on public.order_requests for insert to authenticated with check (public.is_staff() and status='en_attente');
create policy "admin upd req" on public.order_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- réclamations
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  item text, type text not null, description text,
  status text not null default 'en_cours' check (status in ('en_cours','resolue','refusee')),
  solution text, final_comment text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
grant select, insert, update on public.complaints to authenticated; grant all on public.complaints to service_role;
alter table public.complaints enable row level security;
create policy "staff complaints" on public.complaints for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- caisse
create table public.expense_categories (id uuid primary key default gen_random_uuid(), name text not null unique);
insert into public.expense_categories(name) values ('Produits de lavage'),('Transport'),('Électricité'),('Entretien'),('Fournitures'),('Salaires'),('Autres');
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date, category_id uuid references public.expense_categories(id),
  amount int not null check (amount>0), description text, method pay_method not null default 'especes',
  created_by uuid default auth.uid(), created_at timestamptz default now()
);
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  kind text not null check (kind in ('coopec','credit_access','entree','sortie')),
  amount int not null check (amount>0), description text,
  created_by uuid default auth.uid(), created_at timestamptz default now()
);
create table public.cash_closings (
  id uuid primary key default gen_random_uuid(),
  date date not null unique, opening int not null, theoretical int not null, counted int not null,
  gap int not null, reason text, closed_by uuid default auth.uid(), closed_at timestamptz default now()
);
grant select, insert, update, delete on public.expense_categories, public.expenses, public.cash_movements, public.cash_closings to authenticated;
grant all on public.expense_categories, public.expenses, public.cash_movements, public.cash_closings to service_role;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_closings enable row level security;
create policy "staff read ec" on public.expense_categories for select to authenticated using (public.is_staff());
create policy "admin ec" on public.expense_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin expenses" on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read mv" on public.cash_movements for select to authenticated using (public.is_staff());
create policy "staff ins mv" on public.cash_movements for insert to authenticated with check (public.is_staff());
create policy "admin mv" on public.cash_movements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin del mv" on public.cash_movements for delete to authenticated using (public.is_admin());
create policy "admin closings" on public.cash_closings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.check_closing() returns trigger language plpgsql as $$
begin
  new.gap := new.counted - new.theoretical;
  if new.gap <> 0 and coalesce(trim(new.reason),'')='' then raise exception 'Motif obligatoire en cas d''écart'; end if;
  return new; end $$;
create trigger trg_check_closing before insert or update on public.cash_closings for each row execute function public.check_closing();
create or replace function public.guard_closed_day() returns trigger language plpgsql security definer set search_path=public as $$
declare d date := coalesce(new.date, old.date);
begin
  if exists(select 1 from public.cash_closings where date=d) and not public.is_admin() then raise exception 'Journée clôturée'; end if;
  return coalesce(new, old); end $$;
create trigger trg_closed_mv before insert or update or delete on public.cash_movements for each row execute function public.guard_closed_day();

-- notifications & audit
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, title text not null, body text, order_id uuid,
  read boolean not null default false, treated boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigserial primary key, table_name text not null, record_id text, action text not null,
  old_data jsonb, new_data jsonb, user_id uuid, at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated; grant select, insert on public.audit_log to authenticated;
grant all on public.notifications, public.audit_log to service_role;
grant usage on sequence public.audit_log_id_seq to authenticated;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
create policy "admin notif" on public.notifications for select to authenticated using (public.is_admin());
create policy "admin notif upd" on public.notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin audit" on public.audit_log for select to authenticated using (public.is_admin());
create policy "staff audit ins" on public.audit_log for insert to authenticated with check (public.is_staff() and user_id=auth.uid());

create or replace function public.audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(table_name, record_id, action, old_data, new_data, user_id)
  values (tg_table_name, coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id')), tg_op,
    case when tg_op<>'INSERT' then to_jsonb(old) end, case when tg_op<>'DELETE' then to_jsonb(new) end, auth.uid());
  return null; end $$;
do $$ declare t text; begin
  foreach t in array array['clients','services','price_categories','orders','order_items','payments','order_requests','complaints','expenses','cash_movements','cash_closings','settings','profiles','user_roles'] loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit()', t);
  end loop; end $$;

create or replace function public.notify_events() returns trigger language plpgsql security definer set search_path=public as $$
declare n bigint;
begin
  if tg_table_name='order_requests' and tg_op='INSERT' then
    select number into n from public.orders where id=new.order_id;
    insert into public.notifications(type,title,body,order_id) values (new.kind,
      case when new.kind='reduction' then 'Demande de réduction' else 'Demande d''annulation' end,
      'Commande N°' || lpad(n::text,6,'0') || coalesce(' — ' || new.reason,''), new.order_id);
  elsif tg_table_name='complaints' and tg_op='INSERT' then
    select number into n from public.orders where id=new.order_id;
    insert into public.notifications(type,title,body,order_id) values ('reclamation','Nouvelle réclamation','Commande N°' || lpad(n::text,6,'0') || ' — ' || new.type, new.order_id);
  elsif tg_table_name='cash_closings' and new.gap<>0 then
    insert into public.notifications(type,title,body) values ('ecart','Écart de caisse', to_char(new.date,'DD/MM/YYYY') || ' : ' || new.gap || ' F — ' || coalesce(new.reason,''));
  end if;
  return null; end $$;
create trigger trg_notif_req after insert on public.order_requests for each row execute function public.notify_events();
create trigger trg_notif_comp after insert on public.complaints for each row execute function public.notify_events();
create trigger trg_notif_close after insert or update on public.cash_closings for each row execute function public.notify_events();

-- seed tarifs
do $$
declare c uuid; i int;
  cats jsonb := '[
 ["LINGE DE LIT",[["Taie d''oreiller",500],["Drap plat",1000],["Oreiller",1000],["Drap housse",1500],["Drap + 2 taies",1500],["Petite couette",2000],["2 draps + 2 taies",2500],["Couette normale",3000],["Grande couette",4000]]],
 ["LINGE DE TABLE",[["Serviette de table",500],["Torchon",500],["Grande serviette de table",1000],["Tablier",1000],["Petite nappe",1000],["Grande nappe",1500]]],
 ["LINGE DE BAIN",[["Petite serviette",500],["Serviette moyenne",1000],["Grande serviette de bain",1500],["Tapis de bain",1500],["Peignoir",1500],["Large serviette",2000]]],
 ["HAUT",[["T-shirt",500],["Polo",500],["Chemise",500],["Gilet",500],["Sweat (pull over)",500],["Maillot",500],["Démembré",500],["Débardeur",500],["Haut dame",500],["Chemise + taches",1000],["Chemise + amidon",1000],["T-shirt + taches",1000],["Polo + taches",1000],["Sweat + taches",1000],["Veston",1000],["Veste",1000],["Blazer",1000]]],
 ["BAS",[["Culotte",500],["Legging",500],["Jeans",500],["Pantalon dockers",500],["Pantalon tissu",500],["Petite jupe",500],["Jeans + taches",250],["Pantalon gros bas",750],["Longue jupe",1000]]],
 ["ACCESSOIRES",[["Cravate",300],["Chapeau",500],["Foulard",500],["Chaussures",1000],["Sac",null],["Nounours",null]]],
 ["ENSEMBLE",[["Robe moyenne",700],["Longue robe",1000],["Ensemble homme",1000],["Pyjama",1000],["Costume 2 pièces",1500],["Complet tunique",1500],["Longue robe + foulard",1500],["Costume 3 pièces",2000],["Robe de cérémonie",[2000,5000]],["Robe de mariage",[10000,15000]]]],
 ["ENFANTS",[["Bavoir",300],["Haut",300],["Bas",300],["Maillot de corps",300],["Chemise",300],["Jupe",300],["Jupe + taches",500],["Robe",500],["Chemise + taches",500],["Couverture",1000],["Grande couette",2000]]],
 ["AMEUBLEMENT",[["Housse de canapé",null],["Rideaux",null]]]
 ]';
  cat jsonb; it jsonb; p jsonb; ci int := 0;
begin
  for cat in select * from jsonb_array_elements(cats) loop
    ci := ci+1;
    insert into public.price_categories(name, sort) values (cat->>0, ci) returning id into c;
    i := 0;
    for it in select * from jsonb_array_elements(cat->1) loop
      i := i+1; p := it->1;
      if jsonb_typeof(p)='number' then
        insert into public.services(category_id,name,price,sort) values (c, it->>0, (p)::text::int, i);
      elsif jsonb_typeof(p)='array' then
        insert into public.services(category_id,name,price,price_max,variable,sort) values (c, it->>0, (p->>0)::int, (p->>1)::int, true, i);
      else
        insert into public.services(category_id,name,variable,sort) values (c, it->>0, true, i);
      end if;
    end loop;
  end loop;
end $$;
