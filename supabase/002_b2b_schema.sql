-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 002: Schema B2B
-- Correr en SQL Editor de Supabase sobre una base ya inicializada con 001
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Nuevo ENUM para canal de cliente ──────────────────────────────
do $$ begin
  create type public.client_canal as enum ('dist', 'gastro', 'min');
exception when duplicate_object then null;
end $$;

-- ── 2. Campos B2B en profiles ─────────────────────────────────────────
alter table public.profiles
  add column if not exists canal       public.client_canal,
  add column if not exists zona_id     uuid references public.delivery_zones(id),
  add column if not exists b2b_status  text default 'activo'
    check (b2b_status in ('pendiente', 'activo', 'inactivo'));

-- ── 3. Flete por kg en delivery_zones ────────────────────────────────
alter table public.delivery_zones
  add column if not exists flete_kg numeric(10,2);

-- Zonas B2B nacionales
insert into public.delivery_zones (name, polygon, base_fee, estimated_minutes, flete_kg)
values
  ('Posadas / NEA',  '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 450),
  ('Rosario',        '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 1335),
  ('Buenos Aires',   '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 1450),
  ('Córdoba',        '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 1280)
on conflict do nothing;

-- Actualizar la zona local si ya existía
update public.delivery_zones
set flete_kg = 450
where name ilike '%costanera%' or name ilike '%posadas%';

-- ── 4. Campos de costo y márgenes en products ─────────────────────────
alter table public.products
  add column if not exists costo        numeric(12,2),
  add column if not exists kg_caja      numeric(8,3),
  add column if not exists bolsas_caja  integer,
  add column if not exists pkg_unitario numeric(12,2) default 0,
  add column if not exists pkg_bulto    numeric(12,2) default 0,
  add column if not exists margen_dist  numeric(5,4)  default 0.35,
  add column if not exists margen_gastro numeric(5,4) default 0.40,
  add column if not exists margen_min   numeric(5,4)  default 0.45,
  add column if not exists mult_bolsas  boolean       default true;

-- ── 5. Nuevos estados en order_status ────────────────────────────────
alter type public.order_status add value if not exists 'aprobado';
alter type public.order_status add value if not exists 'enviado_prod';
alter type public.order_status add value if not exists 'despachado';

-- ── 6. Campos de aprobación en orders ────────────────────────────────
alter table public.orders
  add column if not exists aprobado_por  uuid references public.profiles(id),
  add column if not exists aprobado_at   timestamptz,
  add column if not exists despachado_at timestamptz;

-- ── 7. Función de cálculo de precio B2B ──────────────────────────────
-- precio_b2b_calc(product_id, canal, zona_id) → total c/IVA
create or replace function public.calc_precio_b2b(
  p_costo        numeric,
  p_kg_caja      numeric,
  p_bolsas_caja  integer,
  p_pkg_unitario numeric,
  p_pkg_bulto    numeric,
  p_mult_bolsas  boolean,
  p_margen       numeric,   -- ej: 0.40
  p_flete_kg     numeric,   -- $/kg de la zona
  p_comision     numeric    -- ej: 0.15
)
returns jsonb language plpgsql immutable as $$
declare
  lista_siva   numeric;
  comision     numeric;
  flete        numeric;
  total_siva   numeric;
  total_civa   numeric;
begin
  -- Lista s/IVA
  if p_mult_bolsas then
    lista_siva := (p_costo * p_bolsas_caja) / (1 - p_margen)
                  + (p_pkg_unitario * p_bolsas_caja)
                  + p_pkg_bulto;
  else
    lista_siva := p_costo / (1 - p_margen)
                  + p_pkg_unitario
                  + p_pkg_bulto;
  end if;

  comision   := lista_siva * p_comision;
  flete      := p_kg_caja  * p_flete_kg;
  total_siva := lista_siva + comision + flete;
  total_civa := total_siva * 1.21;

  return jsonb_build_object(
    'lista_siva',  round(lista_siva, 2),
    'comision',    round(comision,   2),
    'flete',       round(flete,      2),
    'total_siva',  round(total_siva, 2),
    'total_civa',  round(total_civa, 2)
  );
end; $$;

-- ── 8. Permisos ───────────────────────────────────────────────────────
grant execute on function public.calc_precio_b2b to authenticated, anon;

-- ── 9. Vista de verificación ──────────────────────────────────────────
-- Después de correr, ejecutar esto para confirmar:
-- select column_name from information_schema.columns
-- where table_name = 'products' and column_name in ('costo','margen_dist','kg_caja');
