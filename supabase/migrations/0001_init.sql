-- ClientPilot AI — initial schema
-- Multi-tenant: every business-scoped table has business_id + RLS policy.

-- uuid-ossp ya viene instalado en Supabase; gen_random_uuid() es nativo PG 13+
-- Usamos gen_random_uuid() para evitar dependencias de extensión en el search_path.
create extension if not exists "pgcrypto";

-- vector extension para embeddings de IA (opcional; si no está disponible se omite)
do $$ begin
  create extension if not exists "vector";
exception when others then
  raise notice 'vector extension no disponible, embeddings desactivados';
end $$;

-- =====================================================================
-- businesses
-- =====================================================================
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  google_maps_url text,
  sector text check (sector in ('aesthetic_clinic','dental','other')) default 'aesthetic_clinic',
  plan text check (plan in ('starter','pro','clinic')) default 'starter',
  onboarding_complete boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  google_oauth_tokens_encrypted text,
  twilio_whatsapp_number text,
  ai_responses_this_month int not null default 0,
  ai_responses_month_resets_at timestamptz default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.businesses (owner_id);
create unique index on public.businesses (twilio_whatsapp_number) where twilio_whatsapp_number is not null;

-- =====================================================================
-- services
-- =====================================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  duration_minutes int not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.services (business_id);

-- =====================================================================
-- business_hours
-- =====================================================================
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  closed boolean not null default false,
  unique (business_id, day_of_week)
);
create index on public.business_hours (business_id);

-- =====================================================================
-- business_settings
-- =====================================================================
create table public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  ai_name text not null default 'Sofía',
  tone text check (tone in ('formal','friendly','premium')) not null default 'friendly',
  custom_instructions text,
  review_request_delay_hours int not null default 2,
  review_link_url text,
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- conversations
-- =====================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_phone text not null,
  customer_name text,
  status text check (status in ('active','lead','converted','closed','cold')) not null default 'active',
  last_message_at timestamptz not null default now(),
  follow_ups_sent int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, customer_phone)
);
create index on public.conversations (business_id, status);
create index on public.conversations (business_id, last_message_at desc);

-- =====================================================================
-- messages (embedding column se añade solo si vector está disponible)
-- =====================================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  direction text check (direction in ('inbound','outbound')) not null,
  content text not null,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index on public.messages (conversation_id, sent_at);
create index on public.messages (business_id, sent_at desc);

-- Añadir columna embedding y su índice si vector está disponible
do $$ begin
  alter table public.messages add column embedding vector(1536);
  create index on public.messages using ivfflat (embedding vector_cosine_ops) with (lists = 100);
exception when undefined_object then
  raise notice 'vector type no disponible, columna embedding omitida';
end $$;

-- =====================================================================
-- appointments
-- =====================================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  customer_phone text not null,
  customer_name text,
  service_id uuid references public.services(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes int not null,
  status text check (status in ('pending','confirmed','cancelled','no_show','completed')) not null default 'pending',
  google_event_id text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.appointments (business_id, scheduled_at);
create index on public.appointments (business_id, status);

-- =====================================================================
-- follow_up_queue
-- =====================================================================
create table public.follow_up_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text check (status in ('pending','sent','cancelled','failed')) not null default 'pending',
  template_type text check (template_type in ('follow_up_a','follow_up_b','follow_up_c','review_request','reminder_24h')) not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.follow_up_queue (status, scheduled_at);
create index on public.follow_up_queue (business_id);

-- =====================================================================
-- Helper: is_member_of_business
-- =====================================================================
create or replace function public.is_member_of_business(b_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.businesses
    where id = b_id and owner_id = auth.uid()
  );
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.follow_up_queue enable row level security;

-- businesses: owner only
create policy "businesses_owner_select" on public.businesses
  for select using (owner_id = auth.uid());
create policy "businesses_owner_insert" on public.businesses
  for insert with check (owner_id = auth.uid());
create policy "businesses_owner_update" on public.businesses
  for update using (owner_id = auth.uid());
create policy "businesses_owner_delete" on public.businesses
  for delete using (owner_id = auth.uid());

-- Child tables: scope via is_member_of_business
do $$
declare t text;
begin
  for t in select unnest(array[
    'services','business_hours','business_settings','conversations',
    'messages','appointments','follow_up_queue'
  ])
  loop
    execute format($f$
      create policy "%1$s_member_select" on public.%1$s
        for select using (public.is_member_of_business(business_id));
      create policy "%1$s_member_insert" on public.%1$s
        for insert with check (public.is_member_of_business(business_id));
      create policy "%1$s_member_update" on public.%1$s
        for update using (public.is_member_of_business(business_id));
      create policy "%1$s_member_delete" on public.%1$s
        for delete using (public.is_member_of_business(business_id));
    $f$, t);
  end loop;
end $$;

-- =====================================================================
-- updated_at trigger
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger trg_business_settings_updated before update on public.business_settings
  for each row execute function public.set_updated_at();
