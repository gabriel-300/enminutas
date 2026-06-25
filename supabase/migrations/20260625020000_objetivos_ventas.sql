-- ── OBJETIVOS DE VENTAS ───────────────────────────────────────────
-- Meta mensual por canal. Permite comparar real vs proyectado.
-- canal: 'b2b_mayorista' | 'b2c_nacional' | 'pedido_ya_local' | 'global'

create table public.objetivos_ventas (
  id          uuid primary key default gen_random_uuid(),
  anio        integer not null check (anio >= 2024),
  mes         integer not null check (mes between 1 and 12),
  canal       text not null,
  monto_meta  numeric(14,2) not null check (monto_meta >= 0),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now(),
  unique (anio, mes, canal)
);

create trigger set_updated_at_objetivos
  before update on public.objetivos_ventas
  for each row execute function public.set_updated_at();

alter table public.objetivos_ventas enable row level security;

create policy "admin_objetivos_all"
  on public.objetivos_ventas for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.objetivos_ventas to service_role;
