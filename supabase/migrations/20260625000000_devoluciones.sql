-- ── DEVOLUCIONES ──────────────────────────────────────────────────
-- Flujo: solicitada → aprobada → cerrada (o rechazada)
-- Al aprobar se genera automáticamente un movimiento en cc_movimientos.

create table public.devoluciones (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid references public.orders(id) on delete set null,
  cliente_id       uuid not null references public.profiles(id),
  fecha            date not null default current_date,
  motivo           text not null,
  estado           text not null default 'solicitada'
                   check (estado in ('solicitada','aprobada','rechazada','cerrada')),
  monto_total      numeric(14,2) not null default 0,
  observaciones    text,
  cc_movimiento_id uuid references public.cc_movimientos(id) on delete set null,
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles(id),
  updated_at       timestamptz not null default now()
);

create table public.devolucion_items (
  id              uuid primary key default gen_random_uuid(),
  devolucion_id   uuid not null references public.devoluciones(id) on delete cascade,
  descripcion     text not null,
  cantidad        numeric(10,3) not null check (cantidad > 0),
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0),
  subtotal        numeric(14,2) not null
);

create index idx_devoluciones_cliente on public.devoluciones(cliente_id);
create index idx_devoluciones_estado  on public.devoluciones(estado);
create index idx_devoluciones_fecha   on public.devoluciones(fecha desc);
create index idx_devolucion_items_dev on public.devolucion_items(devolucion_id);

create trigger set_updated_at_devoluciones
  before update on public.devoluciones
  for each row execute function public.set_updated_at();

alter table public.devoluciones      enable row level security;
alter table public.devolucion_items  enable row level security;

create policy "admin_devoluciones_all"
  on public.devoluciones for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

create policy "admin_devolucion_items_all"
  on public.devolucion_items for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.devoluciones     to service_role;
grant all on public.devolucion_items to service_role;
