-- ── PRECIOS POR CLIENTE ───────────────────────────────────────────
-- Override de precio negociado individualmente por cliente B2B.
-- tipo 'precio_fijo'   → precio final con IVA acordado
-- tipo 'descuento_pct' → % de descuento sobre el precio de canal

create table public.precios_cliente (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.profiles(id) on delete cascade,
  producto_id     uuid not null references public.products(id) on delete cascade,
  tipo            text not null default 'precio_fijo'
                  check (tipo in ('precio_fijo', 'descuento_pct')),
  precio_fijo     numeric(14,2),                   -- precio final c/IVA  (si tipo=precio_fijo)
  descuento_pct   numeric(5,2),                    -- 0-100               (si tipo=descuento_pct)
  vigente_desde   date not null default current_date,
  vigente_hasta   date,                            -- null = indefinido
  notas           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_at      timestamptz not null default now(),
  unique (cliente_id, producto_id)                 -- un override activo por par
);

create index idx_precios_cliente_cliente  on public.precios_cliente(cliente_id);
create index idx_precios_cliente_producto on public.precios_cliente(producto_id);

create trigger set_updated_at_precios_cliente
  before update on public.precios_cliente
  for each row execute function public.set_updated_at();

alter table public.precios_cliente enable row level security;

create policy "admin_precios_cliente_all"
  on public.precios_cliente for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.precios_cliente to service_role;
