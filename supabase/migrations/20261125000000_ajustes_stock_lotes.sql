-- Ajustes de cantidad en lotes (tarea 93 bitácora 25/11): hoy ajustarCantidad() sobreescribe
-- cantidad_actual sin dejar rastro de quién lo hizo ni por qué (35 ajustes en noviembre, 12 el
-- 16/11, sin ningún registro). A partir de ahora cada ajuste queda logueado con motivo
-- obligatorio y quién lo hizo, mismo criterio que ajustes_internos (DRI/CRI).
create table if not exists public.ajustes_stock_lotes (
  id                 uuid primary key default gen_random_uuid(),
  lote_id            uuid not null references public.lotes(id) on delete cascade,
  producto_id        uuid not null references public.products(id),
  cantidad_anterior  numeric(10,3) not null,
  cantidad_nueva     numeric(10,3) not null,
  motivo             text not null check (length(trim(motivo)) > 0),
  creado_por         uuid not null references auth.users(id),
  created_at         timestamptz not null default now()
);

create index if not exists idx_ajustes_stock_lotes_lote    on public.ajustes_stock_lotes (lote_id);
create index if not exists idx_ajustes_stock_lotes_producto on public.ajustes_stock_lotes (producto_id);

-- Mismo criterio de seguridad que ajustes_internos: RLS activa, sin políticas, solo el
-- cliente admin del servidor accede.
alter table public.ajustes_stock_lotes enable row level security;
grant all on table public.ajustes_stock_lotes to service_role;
