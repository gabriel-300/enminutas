-- ── LOTES DE PRODUCTOS ────────────────────────────────────────────
-- Trazabilidad de lotes con fecha de vencimiento.
-- FEFO: primero en vencer, primero en salir.

create table public.lotes (
  id                uuid primary key default gen_random_uuid(),
  producto_id       uuid not null references public.products(id) on delete restrict,
  numero_lote       text not null,
  fecha_ingreso     date not null default current_date,
  fecha_vencimiento date not null,
  cantidad_inicial  numeric(10,3) not null check (cantidad_inicial > 0),
  cantidad_actual   numeric(10,3) not null check (cantidad_actual >= 0),
  unidad            text not null default 'kg',
  proveedor         text,
  costo_unitario    numeric(14,2),
  observaciones     text,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id)
);

-- Índices para queries frecuentes
create index idx_lotes_producto    on public.lotes(producto_id);
create index idx_lotes_vencimiento on public.lotes(fecha_vencimiento);
create index idx_lotes_activo      on public.lotes(activo) where activo = true;

-- Un número de lote es único por producto
create unique index idx_lotes_numero_unico
  on public.lotes(producto_id, numero_lote);

-- RLS: solo admin
alter table public.lotes enable row level security;

create policy "admin_lotes_all"
  on public.lotes for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.lotes to service_role;
