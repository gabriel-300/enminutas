-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Estructura de precios dinámica por canal
-- Reemplaza precio_dist/gastro/min por precio_lista + descuento por canal
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabla de canales (configurable desde admin) ────────────────────
create table if not exists public.canales (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nombre       text not null,
  descuento_pct numeric(5,2) not null default 0
    check (descuento_pct >= 0 and descuento_pct < 100),
  activo       boolean not null default true,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- ── 2. Seed: canales existentes con sus descuentos aproximados ─────────
-- Descuentos calculados sobre precio_min (lista base = 0% descuento)
insert into public.canales (slug, nombre, descuento_pct, sort_order) values
  ('min',    'Minorista',    0.00, 1),
  ('gastro', 'Gastronomía',  8.00, 2),
  ('dist',   'Distribuidor', 15.00, 3)
on conflict (slug) do nothing;

-- ── 3. precio_lista en products ────────────────────────────────────────
-- Usar precio_min como punto de partida (= lista sin descuento)
-- NOTA: estos valores pueden incluir flete de Posadas. Ajustar manualmente
-- si se desea precio ex-fábrica puro.
alter table public.products
  add column if not exists precio_lista numeric;

update public.products
  set precio_lista = precio_min
  where precio_min is not null and precio_lista is null;

-- ── 4. Descuento extra por cliente ─────────────────────────────────────
alter table public.profiles
  add column if not exists descuento_extra_pct numeric(5,2) not null default 0
    check (descuento_extra_pct >= 0 and descuento_extra_pct < 100);

-- ── 5. canal_id FK en profiles ─────────────────────────────────────────
alter table public.profiles
  add column if not exists canal_id uuid references public.canales(id);

-- Migrar datos: canal enum → canal_id
update public.profiles p
  set canal_id = c.id
  from public.canales c
  where c.slug = p.canal::text
    and p.canal is not null
    and p.canal_id is null;

-- ── 6. Permisos ────────────────────────────────────────────────────────
grant all on public.canales to anon, authenticated, service_role;

-- ── 7. RLS: canales es de solo lectura para clientes, full para admin ──
alter table public.canales enable row level security;

create policy "canales: lectura pública" on public.canales
  for select using (true);

create policy "canales: solo service_role escribe" on public.canales
  for all using (auth.role() = 'service_role');

-- ── 8. Verificación ────────────────────────────────────────────────────
select slug, nombre, descuento_pct from public.canales order by sort_order;
select sku, name, precio_lista from public.products where precio_lista is not null order by name;
