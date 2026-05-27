-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Schema inicial
-- ══════════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";     -- webhooks salientes a n8n

-- ── ENUMs ────────────────────────────────────────────────────────────
create type public.user_role as enum (
  'customer_b2c',
  'customer_b2b',
  'repartidor',
  'admin_enminutas',
  'admin_ideaia'
);

create type public.order_status as enum (
  'pending_payment',
  'payment_review',
  'paid',
  'preparing',
  'ready',
  'in_delivery',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

create type public.order_channel as enum (
  'b2c_nacional',
  'b2b_mayorista',
  'pedido_ya_local'
);

create type public.b2b_status as enum (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

-- ── PROFILES ─────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            public.user_role not null default 'customer_b2c',
  full_name       text,
  phone           text,
  document_type   text,
  document_number text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- ── B2B_ACCOUNTS ─────────────────────────────────────────────────────
create table public.b2b_accounts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  business_name   text not null,
  cuit            text not null unique,
  iva_condition   text,
  status          public.b2b_status not null default 'pending',
  credit_limit    numeric(12,2) default 0,
  current_balance numeric(12,2) default 0,
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_b2b_accounts_profile on public.b2b_accounts(profile_id);
create index idx_b2b_accounts_status  on public.b2b_accounts(status);

-- ── ADDRESSES ────────────────────────────────────────────────────────
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  label       text,
  street      text not null,
  number      text not null,
  floor       text,
  apartment   text,
  city        text not null,
  province    text not null,  -- ISO-3166-2:AR (ej. AR-N para Misiones)
  postal_code text not null,
  reference   text,
  lat         numeric(10,7),
  lng         numeric(10,7),
  is_default  boolean default false,
  created_at  timestamptz not null default now()
);

create index idx_addresses_profile on public.addresses(profile_id);

-- ── CATEGORIES ───────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  image_url   text,
  sort_order  integer default 0,
  is_active   boolean default true,
  created_at  timestamptz not null default now()
);

-- ── PRODUCTS ─────────────────────────────────────────────────────────
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  sku                 text not null unique,
  slug                text not null unique,
  name                text not null,
  short_description   text,
  description         text,
  category_id         uuid references public.categories(id),
  price_b2c           numeric(12,2) not null,
  price_b2b           numeric(12,2) not null,
  min_quantity_b2b    integer default 1,
  unit_label          text default 'unidad',
  weight_grams        integer,
  freezer_required    boolean default true,
  is_active           boolean default true,
  cover_image_url     text,
  gallery_urls        jsonb default '[]'::jsonb,
  metadata            jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_products_category on public.products(category_id);
create index idx_products_active   on public.products(is_active);
create index idx_products_slug     on public.products(slug);

-- ── PRODUCT_VARIANTS ─────────────────────────────────────────────────
create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  sku              text not null unique,
  name             text not null,
  price_b2c_delta  numeric(12,2) default 0,
  price_b2b_delta  numeric(12,2) default 0,
  stock            integer not null default 0,
  is_active        boolean default true
);

create index idx_variants_product on public.product_variants(product_id);

-- ── DELIVERY_ZONES (Pedido Ya) ────────────────────────────────────────
create table public.delivery_zones (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  polygon             jsonb not null,  -- GeoJSON Polygon
  base_fee            numeric(12,2) not null,
  estimated_minutes   integer not null,
  is_active           boolean default true
);

-- ── ORDERS ───────────────────────────────────────────────────────────
create sequence public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text language sql as $$
  select 'EM-' || to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY')
         || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique default public.generate_order_number(),
  channel                 public.order_channel not null,
  customer_id             uuid references public.profiles(id),
  guest_email             text,
  guest_phone             text,
  status                  public.order_status not null default 'pending_payment',
  subtotal                numeric(12,2) not null,
  shipping_fee            numeric(12,2) not null default 0,
  discount                numeric(12,2) not null default 0,
  total                   numeric(12,2) not null,
  ideaia_commission_rate  numeric(5,2)  not null,
  ideaia_commission_amount numeric(12,2) not null,
  shipping_method         text not null,
  shipping_address_id     uuid references public.addresses(id),
  shipping_snapshot       jsonb,
  delivery_zone_id        uuid references public.delivery_zones(id),
  assigned_driver_id      uuid references public.profiles(id),
  tracking_number         text,
  payment_method          text not null default 'bank_transfer',
  payment_declared_at     timestamptz,
  payment_confirmed_at    timestamptz,
  payment_confirmed_by    uuid references public.profiles(id),
  payment_proof_url       text,
  mp_preference_id        text,   -- Mercado Pago preference id (B2C)
  mp_payment_id           text,   -- Mercado Pago payment id (confirmado)
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_orders_customer    on public.orders(customer_id);
create index idx_orders_status      on public.orders(status);
create index idx_orders_channel_date on public.orders(channel, created_at desc);
create index idx_orders_driver      on public.orders(assigned_driver_id) where assigned_driver_id is not null;
create index idx_orders_number      on public.orders(order_number);

-- ── ORDER_LINES ───────────────────────────────────────────────────────
create table public.order_lines (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid not null references public.products(id),
  variant_id       uuid references public.product_variants(id),
  product_snapshot jsonb not null,   -- foto del producto al momento del pedido
  quantity         integer not null check (quantity > 0),
  unit_price       numeric(12,2) not null,
  line_total       numeric(12,2) not null
);

create index idx_order_lines_order on public.order_lines(order_id);

-- ── ORDER_EVENTS (auditoría) ──────────────────────────────────────────
create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  status     public.order_status not null,
  message    text,
  actor_id   uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_order_events_order on public.order_events(order_id);

-- ── DRIVER_LOCATIONS (última posición persistida) ─────────────────────
create table public.driver_locations (
  driver_id  uuid primary key references public.profiles(id) on delete cascade,
  order_id   uuid references public.orders(id),
  lat        numeric(10,7) not null,
  lng        numeric(10,7) not null,
  heading    numeric(5,2),
  speed_kmh  numeric(5,2),
  updated_at timestamptz not null default now()
);

-- ── PLATFORM_SETTINGS (singleton row id=1) ────────────────────────────
create table public.platform_settings (
  id                       integer primary key default 1 check (id = 1),
  ideaia_commission_rate   numeric(5,2) not null default 8.00,
  bank_cbu                 text not null default '',
  bank_alias               text not null default '',
  bank_holder              text not null default '',
  cuit_emisor              text not null default '',
  whatsapp_phone_display   text,
  updated_at               timestamptz not null default now()
);

insert into public.platform_settings (id) values (1) on conflict do nothing;

-- ── IDEAIA_LIQUIDATIONS ───────────────────────────────────────────────
create table public.ideaia_liquidations (
  id               uuid primary key default gen_random_uuid(),
  period_start     date not null,
  period_end       date not null,
  total_gmv        numeric(12,2) not null,
  total_commission numeric(12,2) not null,
  orders_count     integer not null,
  status           text not null default 'draft',  -- draft | issued | paid
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── TRIGGERS AUTOMÁTICOS ─────────────────────────────────────────────

-- 1. Auto-crear profile al signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_products
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute function public.set_updated_at();

-- 3. Log de eventos de orden
create or replace function public.log_order_event()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.order_events (order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end; $$;

create trigger trg_log_order_event
  after insert or update of status on public.orders
  for each row execute function public.log_order_event();

-- 4. Notificación a n8n via pg_net
create or replace function public.notify_n8n()
returns trigger language plpgsql security definer as $$
declare
  payload  jsonb;
  webhook  text;
  secret   text;
  sig      text;
  event_type text;
begin
  webhook := current_setting('app.n8n_webhook_url', true);
  secret  := current_setting('app.n8n_secret', true);

  if webhook is null or webhook = '' then
    return new;
  end if;

  event_type := case
    when tg_op = 'INSERT' then 'order_created'
    else 'order_status_changed'
  end;

  payload := jsonb_build_object(
    'event',        event_type,
    'order_id',     new.id,
    'order_number', new.order_number,
    'status',       new.status,
    'channel',      new.channel,
    'total',        new.total,
    'customer_phone', coalesce(
      (select phone from public.profiles where id = new.customer_id),
      new.guest_phone
    ),
    'ts', extract(epoch from now())
  );

  if secret is not null and secret != '' then
    sig := encode(hmac(payload::text, secret, 'sha256'), 'hex');
  else
    sig := '';
  end if;

  perform net.http_post(
    url     := webhook,
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-em-signature',  sig
    )
  );

  return new;
exception when others then
  -- No bloquear la transacción si el webhook falla
  return new;
end; $$;

create trigger trg_notify_n8n_created
  after insert on public.orders
  for each row execute function public.notify_n8n();

create trigger trg_notify_n8n_status
  after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_n8n();
