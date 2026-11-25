-- Tarea 83 bitácora 25/11: hoy el precio de un insumo se pisa sin dejar rastro (el 23 y 24/11
-- se cambiaron 6: leche, ajo, limón, nuez moscada, queso criollo y mozzarella, sin que quedara
-- registro de cuál era el anterior, quién lo cambió ni cuándo). A partir de ahora cada cambio de
-- precio_unitario queda logueado, sea manual, por CSV o porque entró una compra con precio distinto.
create table if not exists public.insumos_precio_historial (
  id               uuid primary key default gen_random_uuid(),
  insumo_id        uuid not null references public.insumos(id) on delete cascade,
  precio_anterior  numeric(14,4) not null,
  precio_nuevo     numeric(14,4) not null,
  origen           text not null check (origen in ('manual', 'csv', 'recepcion')),
  referencia_id    uuid,
  creado_por       uuid not null references auth.users(id),
  created_at       timestamptz not null default now()
);

create index if not exists idx_insumos_precio_historial_insumo on public.insumos_precio_historial (insumo_id, created_at desc);

alter table public.insumos_precio_historial enable row level security;
grant all on table public.insumos_precio_historial to service_role;
