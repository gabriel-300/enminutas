-- ── PLANTILLAS DE PEDIDO B2B ──────────────────────────────────────
create table public.plantillas_pedido (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.profiles(id) on delete cascade,
  nombre      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.plantilla_items (
  id            uuid primary key default gen_random_uuid(),
  plantilla_id  uuid not null references public.plantillas_pedido(id) on delete cascade,
  producto_id   uuid not null references public.products(id) on delete cascade,
  cantidad      int not null check (cantidad > 0),
  created_at    timestamptz not null default now()
);

create index idx_plantillas_cliente   on public.plantillas_pedido(cliente_id);
create index idx_plantilla_items_pla  on public.plantilla_items(plantilla_id);

create trigger set_updated_at_plantillas
  before update on public.plantillas_pedido
  for each row execute function public.set_updated_at();

-- RLS: cada cliente solo ve sus propias plantillas
alter table public.plantillas_pedido enable row level security;
alter table public.plantilla_items    enable row level security;

create policy "cliente_plantillas_own"
  on public.plantillas_pedido for all
  using  (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

create policy "admin_plantillas_all"
  on public.plantillas_pedido for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

create policy "cliente_plantilla_items_own"
  on public.plantilla_items for all
  using  (
    plantilla_id in (
      select id from public.plantillas_pedido where cliente_id = auth.uid()
    )
  )
  with check (
    plantilla_id in (
      select id from public.plantillas_pedido where cliente_id = auth.uid()
    )
  );

create policy "admin_plantilla_items_all"
  on public.plantilla_items for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.plantillas_pedido to service_role;
grant all on public.plantilla_items    to service_role;
