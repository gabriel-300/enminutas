-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 039: Sistema de precios dinámico v5
-- Basado en EnMinutas_EspecTecnica_ListaPrecios_v5.pdf
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. lineas_producto ────────────────────────────────────────────────
create table if not exists public.lineas_producto (
  id     integer primary key,
  nombre text    not null,
  orden  integer not null
);

grant all on public.lineas_producto to anon, authenticated, service_role;

alter table public.lineas_producto enable row level security;

create policy "lineas_producto: lectura publica" on public.lineas_producto
  for select using (true);
create policy "lineas_producto: solo service_role escribe" on public.lineas_producto
  for all using (auth.role() = 'service_role');

insert into public.lineas_producto (id, nombre, orden) values
  (1, 'Bocaditos x500g', 1),
  (2, 'Bocaditos x2kg',  2),
  (3, 'Chipas',          3),
  (4, 'Empanadas',       4),
  (5, 'Pizzas',          5)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden;

-- ── 2. disponibilidad_lineas ──────────────────────────────────────────
create table if not exists public.disponibilidad_lineas (
  id         uuid        primary key default gen_random_uuid(),
  linea_id   integer     not null references public.lineas_producto(id),
  disponible boolean     not null default true,
  desde      date        not null default current_date,
  hasta      date,
  nota       varchar(200),
  created_at timestamptz not null default now()
);

grant all on public.disponibilidad_lineas to anon, authenticated, service_role;

alter table public.disponibilidad_lineas enable row level security;

create policy "disponibilidad_lineas: lectura publica" on public.disponibilidad_lineas
  for select using (true);
create policy "disponibilidad_lineas: solo service_role escribe" on public.disponibilidad_lineas
  for all using (auth.role() = 'service_role');

-- Seed: todas las líneas disponibles al arranque
insert into public.disponibilidad_lineas (linea_id, disponible, desde)
select id, true, current_date from public.lineas_producto
on conflict do nothing;

-- ── 3. canales: agregar margen_std, margen_premium, markup_pvp ────────
alter table public.canales
  add column if not exists margen_std     numeric(5,4),
  add column if not exists margen_premium numeric(5,4),
  add column if not exists markup_pvp     numeric(5,4) default 0.80;

update public.canales set margen_std = 0.40, margen_premium = 0.45, markup_pvp = 0.80 where slug = 'dist';
update public.canales set margen_std = 0.45, margen_premium = 0.50, markup_pvp = 0.80 where slug = 'gastro';
update public.canales set margen_std = 0.55, margen_premium = 0.60, markup_pvp = 0.80 where slug = 'min';

-- Canal Eventos / Catering (pausado)
insert into public.canales (slug, nombre, descuento_pct, margen_std, margen_premium, markup_pvp, activo, sort_order)
values ('eve', 'Eventos / Catering', 0, 0.45, 0.50, 0.80, false, 4)
on conflict (slug) do update set
  margen_std     = excluded.margen_std,
  margen_premium = excluded.margen_premium,
  markup_pvp     = excluded.markup_pvp;

-- ── 4. delivery_zones: agregar km, precio_km, capacidad_kg ────────────
alter table public.delivery_zones
  add column if not exists km           integer      default 0,
  add column if not exists precio_km    numeric(10,2) default 0,
  add column if not exists capacidad_kg integer      default 1500;

-- Flete ahora es por viaje (km × 2 × precio_km), no por kg → todo flete_kg = 0
update public.delivery_zones set flete_kg = 0 where flete_kg is not null;

-- Actualizar zonas existentes con km y precio_km
update public.delivery_zones set km = 0,    precio_km = 0,   capacidad_kg = 1500
  where name ilike '%posadas%' or name ilike '%nea%';
update public.delivery_zones set km = 800,  precio_km = 800, capacidad_kg = 1500
  where name ilike '%rosario%';
update public.delivery_zones set km = 1055, precio_km = 800, capacidad_kg = 1500
  where name ilike '%buenos aires%' or name ilike '%bsas%';
update public.delivery_zones set km = 1213, precio_km = 800, capacidad_kg = 1500
  where name ilike '%c%rdoba%';

-- Agregar zonas faltantes
insert into public.delivery_zones (name, polygon, base_fee, estimated_minutes, flete_kg, km, precio_km, capacidad_kg)
values
  ('Oberá',         '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 0,  90,  800, 1500),
  ('Puerto Iguazú', '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 0, 300, 800, 1500)
on conflict do nothing;

-- ── 5. products: agregar columnas del modelo v5 ───────────────────────
alter table public.products
  add column if not exists codigo             integer,
  add column if not exists presentacion       text,
  add column if not exists u_bolsa            integer,
  add column if not exists linea_id           integer references public.lineas_producto(id),
  add column if not exists categoria          text check (categoria in ('Estándar', 'Premium')),
  add column if not exists divisiones_display integer;

-- ── 6. Seed de productos (datos del PDF v5) ───────────────────────────

-- BOCADITOS x500g (linea_id=1) ─────────────────────────────────────────
update public.products set
  codigo=3001, linea_id=1, presentacion='10 cajitas x 500g',
  u_bolsa=14, bolsas_caja=10, kg_caja=5,
  costo=2250, pkg_unitario=750, pkg_bulto=900,
  categoria='Premium', divisiones_display=null
where name ilike '%mandioca%' and (name ilike '%pac%' or name ilike '%pacu%')
  and not name ilike '%2kg%' and not name ilike '%empanada%';

update public.products set
  codigo=3002, linea_id=1, presentacion='10 cajitas x 500g',
  u_bolsa=16, bolsas_caja=10, kg_caja=5,
  costo=1780, pkg_unitario=750, pkg_bulto=900,
  categoria='Estándar', divisiones_display=null
where name ilike '%bocadito%' and name ilike '%pollo%' and name ilike '%500%';

update public.products set
  codigo=3003, linea_id=1, presentacion='10 cajitas x 500g',
  u_bolsa=19, bolsas_caja=10, kg_caja=5,
  costo=1490, pkg_unitario=750, pkg_bulto=900,
  categoria='Estándar', divisiones_display=null
where (name ilike '%bastoncito%' or name ilike '%mozzarella%') and name ilike '%500%'
  and not name ilike '%chipa%' and not name ilike '%pizza%';

-- BOCADITOS x2kg (linea_id=2) ──────────────────────────────────────────
update public.products set
  codigo=4001, linea_id=2, presentacion='5 bolsas x 2kg',
  u_bolsa=56, bolsas_caja=5, kg_caja=10,
  costo=9400, pkg_unitario=300, pkg_bulto=1300,
  categoria='Estándar', divisiones_display=null
where (name ilike '%mandioca%' and (name ilike '%pac%' or name ilike '%pacu%')) and name ilike '%2kg%';

update public.products set
  codigo=4002, linea_id=2, presentacion='5 bolsas x 2kg',
  u_bolsa=72, bolsas_caja=5, kg_caja=10,
  costo=7120, pkg_unitario=300, pkg_bulto=1300,
  categoria='Estándar', divisiones_display=null
where name ilike '%pollo%' and name ilike '%2kg%'
  and not name ilike '%chipa%' and not name ilike '%empanada%';

update public.products set
  codigo=4003, linea_id=2, presentacion='5 bolsas x 2kg',
  u_bolsa=78, bolsas_caja=5, kg_caja=10,
  costo=6500, pkg_unitario=300, pkg_bulto=1300,
  categoria='Estándar', divisiones_display=null
where (name ilike '%mozzarella%' or name ilike '%bastoncito%') and name ilike '%2kg%'
  and not name ilike '%chipa%' and not name ilike '%mandioca%';

update public.products set
  codigo=4004, linea_id=2, presentacion='5 bolsas x 2kg',
  u_bolsa=80, bolsas_caja=5, kg_caja=10,
  costo=3000, pkg_unitario=300, pkg_bulto=1300,
  categoria='Premium', divisiones_display=null
where name ilike '%bastoncito%' and name ilike '%mandioca%' and name ilike '%2kg%'
  and not name ilike '%noisette%' and not name ilike '%pac%';

update public.products set
  codigo=4005, linea_id=2, presentacion='5 bolsas x 2kg',
  u_bolsa=200, bolsas_caja=5, kg_caja=10,
  costo=3000, pkg_unitario=300, pkg_bulto=1300,
  categoria='Premium', divisiones_display=null
where name ilike '%noisette%';

-- CHIPAS (linea_id=3) ──────────────────────────────────────────────────
update public.products set
  codigo=5001, linea_id=3, presentacion='4 bolsas x 30u',
  u_bolsa=30, bolsas_caja=4, kg_caja=14,
  costo=14500, pkg_unitario=300, pkg_bulto=1300,
  categoria='Premium', divisiones_display=null
where (name ilike '%chipa%' or name ilike '%chip%') and (name ilike '%long%' or name ilike '%gourmet%');

-- 5002: bolsas_caja=1 para que fórmula dé precio de la bolsa completa
update public.products set
  codigo=5002, linea_id=3, presentacion='Bolsa x 10kg',
  u_bolsa=550, bolsas_caja=1, kg_caja=10,
  costo=38100, pkg_unitario=300, pkg_bulto=1300,
  categoria='Estándar', divisiones_display=null
where (name ilike '%chipa%' or name ilike '%chip%') and name ilike '%10kg%';

update public.products set
  codigo=5003, linea_id=3, presentacion='10 cajitas x 500g',
  u_bolsa=20, bolsas_caja=10, kg_caja=5,
  costo=1910, pkg_unitario=750, pkg_bulto=900,
  categoria='Estándar', divisiones_display=null
where (name ilike '%chipa%' or name ilike '%chip%') and name ilike '%500%'
  and not name ilike '%long%' and not name ilike '%panecillo%';

-- 5004: bolsas_caja=1, divisiones_display=5 (caso especial — ver spec)
update public.products set
  codigo=5004, linea_id=3, presentacion='5 bolsas x 2kg',
  u_bolsa=40, bolsas_caja=1, kg_caja=10,
  costo=38100, pkg_unitario=300, pkg_bulto=1300,
  categoria='Premium', divisiones_display=5
where (name ilike '%chipa%' or name ilike '%chip%') and name ilike '%panecillo%';

-- EMPANADAS (linea_id=4) ───────────────────────────────────────────────
update public.products set
  codigo=1001, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=23580, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%carne%'
  and not name ilike '%cuchillo%' and not name ilike '%cort%' and not name ilike '%cuchi%'
  and not name ilike '%pac%' and not name ilike '%cheese%';

update public.products set
  codigo=1002, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=23580, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%pollo%';

update public.products set
  codigo=1003, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=19620, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%verdura%';

update public.products set
  codigo=1004, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=19620, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%acelga%';

update public.products set
  codigo=1005, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=21960, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%humita%';

update public.products set
  codigo=1006, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=27720, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and (name ilike '%jam%n%' or name ilike '%jamon%');

update public.products set
  codigo=1007, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=25200, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%cebolla%';

update public.products set
  codigo=1008, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=28440, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and name ilike '%caprese%';

update public.products set
  codigo=1009, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=37260, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and (name ilike '%pac%' or name ilike '%pacu%');

update public.products set
  codigo=1010, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=36000, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and (name ilike '%cuchillo%' or name ilike '%cuchi%' or name ilike '%cort%');

update public.products set
  codigo=1011, linea_id=4, presentacion='Bolsa x 36u',
  u_bolsa=36, bolsas_caja=1, kg_caja=5,
  costo=33120, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%empanada%' and (name ilike '%cheese%' or name ilike '%burger%');

-- PIZZAS (linea_id=5) ──────────────────────────────────────────────────
update public.products set
  codigo=6001, linea_id=5, presentacion='Caja x 10u',
  u_bolsa=1, bolsas_caja=10, kg_caja=7,
  costo=4820, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%pizza%' and (name ilike '%mozz%' or name ilike '%mozzarella%')
  and not name ilike '%4p%' and not name ilike '%porci%' and not name ilike '%mandioca%';

update public.products set
  codigo=6010, linea_id=5, presentacion='Caja x 10u',
  u_bolsa=1, bolsas_caja=10, kg_caja=7,
  costo=2445, pkg_unitario=200, pkg_bulto=1100,
  categoria='Estándar', divisiones_display=null
where name ilike '%pizza%' and (name ilike '%4p%' or name ilike '%4 p%')
  and not name ilike '%mandioca%';

update public.products set
  codigo=6011, linea_id=5, presentacion='Caja x 10u',
  u_bolsa=1, bolsas_caja=10, kg_caja=7,
  costo=2245, pkg_unitario=200, pkg_bulto=1100,
  categoria='Premium', divisiones_display=null
where name ilike '%pizza%' and name ilike '%mandioca%';

-- ── 7. Actualizar función calc_precio_b2b (corregir IVA) ─────────────
-- IVA se aplica solo sobre lista_siva, NO sobre (lista + comision)
create or replace function public.calc_precio_b2b(
  p_costo        numeric,
  p_kg_caja      numeric,
  p_bolsas_caja  integer,
  p_pkg_unitario numeric,
  p_pkg_bulto    numeric,
  p_mult_bolsas  boolean,   -- mantenido por compatibilidad; usar bolsas_caja=1 en su lugar
  p_margen       numeric,
  p_flete_kg     numeric,
  p_comision     numeric default 0.15
)
returns jsonb language plpgsql immutable as $$
declare
  lista_siva numeric;
  lista_civa numeric;
  comision   numeric;
  flete      numeric;
  final_civa numeric;
begin
  lista_siva := round(
    case when p_mult_bolsas then
      (p_costo * p_bolsas_caja) / (1 - p_margen)
        + (p_pkg_unitario * p_bolsas_caja) + p_pkg_bulto
    else
      p_costo / (1 - p_margen) + p_pkg_unitario + p_pkg_bulto
    end, 2);

  lista_civa := round(lista_siva * 1.21, 2);
  comision   := round(lista_siva * p_comision, 2);
  flete      := round(p_kg_caja * p_flete_kg, 2);

  -- IVA solo sobre lista_siva; comision y flete sin IVA adicional
  final_civa := round(lista_civa + comision + flete, 0);

  return jsonb_build_object(
    'lista_siva', lista_siva,
    'lista_civa', lista_civa,
    'comision',   comision,
    'flete',      flete,
    'final_civa', final_civa
  );
end; $$;

-- ── 8. Verificación ───────────────────────────────────────────────────
-- Canales con márgenes
select slug, nombre, margen_std, margen_premium, markup_pvp from public.canales order by sort_order;

-- Zonas con km/precio_km
select name, flete_kg, km, precio_km from public.delivery_zones order by name;

-- Productos con datos v5 (Canal DIST, sin flete)
-- FINAL_CIVA esperado para 3002 Bocadito Pollo = 51.771
select
  codigo, name, categoria, u_bolsa, bolsas_caja, costo,
  (select final_civa::numeric from
    jsonb_to_record(public.calc_precio_b2b(
      costo, kg_caja, bolsas_caja, pkg_unitario, pkg_bulto, true,
      case when categoria = 'Premium' then 0.45 else 0.40 end,
      0
    )) as t(final_civa numeric)
  ) as final_civa_dist
from public.products
where codigo is not null
order by codigo;
