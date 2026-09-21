-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración completa (pegar todo en SQL Editor de Supabase)
-- ══════════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";

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
  province    text not null,
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

-- ── DELIVERY_ZONES ────────────────────────────────────────────────────
create table public.delivery_zones (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  polygon             jsonb not null,
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
  mp_preference_id        text,
  mp_payment_id           text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_orders_customer     on public.orders(customer_id);
create index idx_orders_status       on public.orders(status);
create index idx_orders_channel_date on public.orders(channel, created_at desc);
create index idx_orders_driver       on public.orders(assigned_driver_id) where assigned_driver_id is not null;
create index idx_orders_number       on public.orders(order_number);

-- ── ORDER_LINES ───────────────────────────────────────────────────────
create table public.order_lines (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid not null references public.products(id),
  variant_id       uuid references public.product_variants(id),
  product_snapshot jsonb not null,
  quantity         integer not null check (quantity > 0),
  unit_price       numeric(12,2) not null,
  line_total       numeric(12,2) not null
);

create index idx_order_lines_order on public.order_lines(order_id);

-- ── ORDER_EVENTS ──────────────────────────────────────────────────────
create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  status     public.order_status not null,
  message    text,
  actor_id   uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_order_events_order on public.order_events(order_id);

-- ── DRIVER_LOCATIONS ─────────────────────────────────────────────────
create table public.driver_locations (
  driver_id  uuid primary key references public.profiles(id) on delete cascade,
  order_id   uuid references public.orders(id),
  lat        numeric(10,7) not null,
  lng        numeric(10,7) not null,
  heading    numeric(5,2),
  speed_kmh  numeric(5,2),
  updated_at timestamptz not null default now()
);

-- ── PLATFORM_SETTINGS ────────────────────────────────────────────────
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
  status           text not null default 'draft',
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── TRIGGERS ─────────────────────────────────────────────────────────

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

create or replace function public.notify_n8n()
returns trigger language plpgsql security definer as $$
declare
  payload    jsonb;
  webhook    text;
  secret     text;
  sig        text;
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
      'Content-Type',   'application/json',
      'x-em-signature', sig
    )
  );

  return new;
exception when others then
  return new;
end; $$;

create trigger trg_notify_n8n_created
  after insert on public.orders
  for each row execute function public.notify_n8n();

create trigger trg_notify_n8n_status
  after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.notify_n8n();

-- ── RLS ───────────────────────────────────────────────────────────────

create or replace function public.current_user_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'customer_b2c'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_user_role() in ('admin_enminutas', 'admin_ideaia');
$$;

create or replace function public.is_enminutas_admin()
returns boolean language sql stable as $$
  select public.current_user_role() = 'admin_enminutas';
$$;

alter table public.profiles enable row level security;
create policy "profiles_select_own"  on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_all"   on public.profiles for all    using (public.is_admin());

alter table public.categories enable row level security;
create policy "categories_public_read"  on public.categories for select using (is_active = true);
create policy "categories_admin_write"  on public.categories for all    using (public.is_enminutas_admin());

alter table public.products enable row level security;
create policy "products_public_read"  on public.products for select using (is_active = true);
create policy "products_admin_all"    on public.products for all    using (public.is_enminutas_admin());

alter table public.product_variants enable row level security;
create policy "variants_public_read"  on public.product_variants for select using (is_active = true);
create policy "variants_admin_all"    on public.product_variants for all    using (public.is_enminutas_admin());

alter table public.delivery_zones enable row level security;
create policy "zones_public_read"  on public.delivery_zones for select using (is_active = true);
create policy "zones_admin_all"    on public.delivery_zones for all    using (public.is_enminutas_admin());

alter table public.addresses enable row level security;
create policy "addresses_own"        on public.addresses for all    using (auth.uid() = profile_id);
create policy "addresses_admin_read" on public.addresses for select using (public.is_admin());

alter table public.orders enable row level security;
create policy "orders_select_own"        on public.orders for select using (customer_id = auth.uid());
create policy "orders_driver_select"     on public.orders for select using (public.current_user_role() = 'repartidor' and assigned_driver_id = auth.uid());
create policy "orders_driver_update"     on public.orders for update using (public.current_user_role() = 'repartidor' and assigned_driver_id = auth.uid());
create policy "orders_enminutas_all"     on public.orders for all    using (public.is_enminutas_admin());
create policy "orders_ideaia_read"       on public.orders for select using (public.current_user_role() = 'admin_ideaia');
create policy "orders_create_anyone"     on public.orders for insert with check (true);

alter table public.order_lines enable row level security;
create policy "order_lines_select"       on public.order_lines for select using (exists (select 1 from public.orders o where o.id = order_lines.order_id and (o.customer_id = auth.uid() or public.is_admin() or (public.current_user_role() = 'repartidor' and o.assigned_driver_id = auth.uid()))));
create policy "order_lines_admin_write"  on public.order_lines for all    using (public.is_enminutas_admin());
create policy "order_lines_insert_open"  on public.order_lines for insert with check (true);

alter table public.order_events enable row level security;
create policy "order_events_select"        on public.order_events for select using (exists (select 1 from public.orders o where o.id = order_events.order_id and (o.customer_id = auth.uid() or public.is_admin() or (public.current_user_role() = 'repartidor' and o.assigned_driver_id = auth.uid()))));
create policy "order_events_insert_system" on public.order_events for insert with check (true);

alter table public.driver_locations enable row level security;
create policy "driver_location_own_write"  on public.driver_locations for all    using (driver_id = auth.uid());
create policy "driver_location_admin_read" on public.driver_locations for select using (public.is_admin());

alter table public.platform_settings enable row level security;
create policy "settings_public_read"  on public.platform_settings for select using (true);
create policy "settings_admin_write"  on public.platform_settings for all    using (public.is_admin());

alter table public.b2b_accounts enable row level security;
create policy "b2b_own_read"   on public.b2b_accounts for select using (profile_id = auth.uid());
create policy "b2b_own_insert" on public.b2b_accounts for insert with check (profile_id = auth.uid());
create policy "b2b_admin_all"  on public.b2b_accounts for all    using (public.is_admin());

alter table public.ideaia_liquidations enable row level security;
create policy "liquidations_admin_all" on public.ideaia_liquidations for all using (public.is_admin());

-- ── AUTH HOOK ─────────────────────────────────────────────────────────

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  claims    jsonb;
  user_role text;
begin
  select role::text
  into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb) ||
    jsonb_build_object('role', coalesce(user_role, 'customer_b2c'))
  );

  return jsonb_set(event, '{claims}', claims);
end; $$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

-- ── SEED ─────────────────────────────────────────────────────────────

insert into public.categories (slug, name, description, sort_order) values
  ('chipas',    'Chipas',                 'Chipas premium elaboradas con almidón de mandioca y tres quesos.', 1),
  ('empanadas', 'Empanadas',              '11 variedades de empanadas ultracongeladas cocidas en horno Rational.', 2),
  ('pizzas',    'Pizzas',                 'Pizza masa madre y pizza de mandioca, únicas en la región.', 3),
  ('bocaditos', 'Bocaditos & Finger Food', 'Bocaditos y batoncitos de pacu, mozzarella y pollo.', 4)
on conflict (slug) do nothing;

insert into public.delivery_zones (name, polygon, base_fee, estimated_minutes)
values (
  'Costanera y Centro — Posadas',
  '{"type":"Polygon","coordinates":[[[-55.913,-27.359],[-55.870,-27.359],[-55.870,-27.385],[-55.913,-27.385],[-55.913,-27.359]]]}'::jsonb,
  1500, 40
) on conflict do nothing;

with cat as (select id, slug from public.categories)
insert into public.products (sku, slug, name, short_description, category_id, price_b2c, price_b2b, min_quantity_b2b, unit_label, weight_grams)
values
  ('BOC-PACU-500',   'bocaditos-pacu-500g',         'Bocaditos de Mandioca y Pacu',       'Pacu de Rosamonte en cobertura de mandioca. Freír o airfryer.',         (select id from cat where slug='bocaditos'), 4800,  3600,  6, 'bolsa 500g', 500),
  ('BAT-MOZZA-500',  'batoncitos-mozzarella-500g',   'Batoncitos de Mozzarella',           'Mozzarella cubierta de masa dorada. Ideales como entrada.',             (select id from cat where slug='bocaditos'), 4500,  3375,  6, 'bolsa 500g', 500),
  ('BOC-POLLO-500',  'bocaditos-pollo-500g',         'Bocaditos de Pollo',                 'Bocaditos de pollo tiernos, cocidos en horno Rational.',               (select id from cat where slug='bocaditos'), 4200,  3150,  6, 'bolsa 500g', 500),
  ('CHIPA-PREM-500', 'chipa-premium-500g',           'Chipa Premium — Bocadito',           'Tres quesos: sardo, tybo y provolone. Receta exclusiva.',              (select id from cat where slug='chipas'),    3800,  2850, 12, 'bolsa 500g', 360),
  ('CHIPA-LONG-30',  'chipa-long-gourmet-x30',       'Chipa Long Gourmet x30',             '115g por unidad. Formato cafetería y estación de servicio.',           (select id from cat where slug='chipas'),    9500,  7125,  2, 'caja x30 u', 3450),
  ('PIZ-MAND-4P',    'pizza-mandioca-4p',            'Pizza de Mandioca — 4 porciones',    'Masa de mandioca, única en el mercado regional. Con mozzarella.',      (select id from cat where slug='pizzas'),    6800,  5100,  4, 'pizza 4p', 580),
  ('PIZ-MM-4P',      'pizza-masa-madre-4p',          'Pizza Masa Madre — 4 porciones',     'Masa madre fermentada 48 hs, mozzarella artesanal.',                   (select id from cat where slug='pizzas'),    7200,  5400,  4, 'pizza 4p', 620),
  ('PIZ-MM-8P',      'pizza-masa-madre-8p',          'Pizza Masa Madre — 8 porciones',     'Formato familiar. Misma receta, mayor rendimiento.',                   (select id from cat where slug='pizzas'),   13500, 10125,  2, 'pizza 8p', 1200),
  ('EMP-PACU-36',    'empanadas-pacu-x36',           'Empanadas de Pacu — x36',            'Pacu de criadero certificado Rosamonte, con cebolla y morrón.',        (select id from cat where slug='empanadas'), 28000, 21000, 1, 'bolsa x36 u', 1440),
  ('EMP-CARNE-36',   'empanadas-carne-x36',          'Empanadas de Carne — x36',           'Carne vacuna con aceitunas, huevo duro y especias.',                   (select id from cat where slug='empanadas'), 26000, 19500, 1, 'bolsa x36 u', 1440),
  ('EMP-POLLO-36',   'empanadas-pollo-x36',          'Empanadas de Pollo — x36',           'Pollo desmenuzado con verduras, cocido en Rational.',                  (select id from cat where slug='empanadas'), 24000, 18000, 1, 'bolsa x36 u', 1440),
  ('EMP-HUMITA-36',  'empanadas-humita-x36',         'Empanadas de Humita — x36',          'Humita cremosa con choclo y albahaca.',                               (select id from cat where slug='empanadas'), 22000, 16500, 1, 'bolsa x36 u', 1440),
  ('EMP-CAPRESE-36', 'empanadas-caprese-x36',        'Empanadas Caprese — x36',            'Tomate, mozzarella y albahaca. Sin carne.',                            (select id from cat where slug='empanadas'), 22000, 16500, 1, 'bolsa x36 u', 1440),
  ('EMP-BURG-36',    'empanadas-cheeseburger-x36',   'Empanadas Cheeseburger — x36',       'Carne, queso cheddar, pepino y mostaza. La más pedida.',               (select id from cat where slug='empanadas'), 26000, 19500, 1, 'bolsa x36 u', 1440)
on conflict (sku) do nothing;
