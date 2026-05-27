-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Row Level Security
-- ══════════════════════════════════════════════════════════════════════

-- ── Helpers de rol (leen del JWT, sin JOIN a profiles) ────────────────
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

-- ── PROFILES ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin());

-- ── CATEGORIES (lectura pública) ──────────────────────────────────────
alter table public.categories enable row level security;

create policy "categories_public_read"
  on public.categories for select
  using (is_active = true);

create policy "categories_admin_write"
  on public.categories for all
  using (public.is_enminutas_admin());

-- ── PRODUCTS (lectura pública) ────────────────────────────────────────
alter table public.products enable row level security;

create policy "products_public_read"
  on public.products for select
  using (is_active = true);

create policy "products_admin_all"
  on public.products for all
  using (public.is_enminutas_admin());

-- ── PRODUCT_VARIANTS ─────────────────────────────────────────────────
alter table public.product_variants enable row level security;

create policy "variants_public_read"
  on public.product_variants for select
  using (is_active = true);

create policy "variants_admin_all"
  on public.product_variants for all
  using (public.is_enminutas_admin());

-- ── DELIVERY_ZONES (lectura pública) ─────────────────────────────────
alter table public.delivery_zones enable row level security;

create policy "zones_public_read"
  on public.delivery_zones for select
  using (is_active = true);

create policy "zones_admin_all"
  on public.delivery_zones for all
  using (public.is_enminutas_admin());

-- ── ADDRESSES ────────────────────────────────────────────────────────
alter table public.addresses enable row level security;

create policy "addresses_own"
  on public.addresses for all
  using (auth.uid() = profile_id);

create policy "addresses_admin_read"
  on public.addresses for select
  using (public.is_admin());

-- ── ORDERS ───────────────────────────────────────────────────────────
alter table public.orders enable row level security;

-- Clientes ven sus pedidos
create policy "orders_select_own"
  on public.orders for select
  using (customer_id = auth.uid());

-- Repartidor ve los pedidos asignados
create policy "orders_driver_select"
  on public.orders for select
  using (
    public.current_user_role() = 'repartidor'
    and assigned_driver_id = auth.uid()
  );

create policy "orders_driver_update_status"
  on public.orders for update
  using (
    public.current_user_role() = 'repartidor'
    and assigned_driver_id = auth.uid()
  );

-- Admin En Minutas — control total
create policy "orders_enminutas_all"
  on public.orders for all
  using (public.is_enminutas_admin());

-- IDEAIA — solo lectura
create policy "orders_ideaia_read"
  on public.orders for select
  using (public.current_user_role() = 'admin_ideaia');

-- Cualquiera puede crear (invitados y logueados)
create policy "orders_create_anyone"
  on public.orders for insert
  with check (true);

-- ── ORDER_LINES ───────────────────────────────────────────────────────
alter table public.order_lines enable row level security;

create policy "order_lines_select"
  on public.order_lines for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_lines.order_id
        and (
          o.customer_id = auth.uid()
          or public.is_admin()
          or (public.current_user_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  );

create policy "order_lines_admin_write"
  on public.order_lines for all
  using (public.is_enminutas_admin());

create policy "order_lines_insert_open"
  on public.order_lines for insert
  with check (true);

-- ── ORDER_EVENTS ──────────────────────────────────────────────────────
alter table public.order_events enable row level security;

create policy "order_events_select"
  on public.order_events for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (
          o.customer_id = auth.uid()
          or public.is_admin()
          or (public.current_user_role() = 'repartidor' and o.assigned_driver_id = auth.uid())
        )
    )
  );

create policy "order_events_insert_system"
  on public.order_events for insert
  with check (true);

-- ── DRIVER_LOCATIONS ──────────────────────────────────────────────────
alter table public.driver_locations enable row level security;

create policy "driver_location_own_write"
  on public.driver_locations for all
  using (driver_id = auth.uid());

create policy "driver_location_admin_read"
  on public.driver_locations for select
  using (public.is_admin());

-- ── PLATFORM_SETTINGS ────────────────────────────────────────────────
alter table public.platform_settings enable row level security;

create policy "settings_public_read"
  on public.platform_settings for select
  using (true);  -- CBU/alias son públicos

create policy "settings_admin_write"
  on public.platform_settings for all
  using (public.is_admin());

-- ── B2B_ACCOUNTS ─────────────────────────────────────────────────────
alter table public.b2b_accounts enable row level security;

create policy "b2b_own_read"
  on public.b2b_accounts for select
  using (profile_id = auth.uid());

create policy "b2b_own_insert"
  on public.b2b_accounts for insert
  with check (profile_id = auth.uid());

create policy "b2b_admin_all"
  on public.b2b_accounts for all
  using (public.is_admin());

-- ── IDEAIA_LIQUIDATIONS ───────────────────────────────────────────────
alter table public.ideaia_liquidations enable row level security;

create policy "liquidations_admin_all"
  on public.ideaia_liquidations for all
  using (public.is_admin());
