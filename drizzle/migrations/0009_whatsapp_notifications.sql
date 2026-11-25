create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('pret','rappel_7j')),
  to_phone text not null,
  provider_id text unique,
  status text not null default 'accepted',
  error text,
  status_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index whatsapp_messages_once on public.whatsapp_messages(order_id, kind) where status <> 'failed';
grant select on public.whatsapp_messages to authenticated;
grant all on public.whatsapp_messages to service_role;
alter table public.whatsapp_messages enable row level security;
create policy "staff read whatsapp" on public.whatsapp_messages for select to authenticated using (public.is_staff());

create table public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null unique,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);
grant select on public.whatsapp_webhook_events to authenticated;
grant all on public.whatsapp_webhook_events to service_role;
alter table public.whatsapp_webhook_events enable row level security;
create policy "admin read whatsapp events" on public.whatsapp_webhook_events for select to authenticated using (public.is_admin());