-- ── PIPELINE / PROSPECCIÓN B2B ─────────────────────────────────────
create type public.prospecto_estado as enum (
  'nuevo',
  'contactado',
  'interesado',
  'propuesta_enviada',
  'ganado',
  'perdido'
);

create table public.pipeline_prospectos (
  id                    uuid primary key default gen_random_uuid(),
  empresa               text not null,
  contacto_nombre       text,
  contacto_telefono     text,
  contacto_email        text,
  zona                  text,
  canal_objetivo        text not null default 'b2b',
  estado                public.prospecto_estado not null default 'nuevo',
  valor_estimado        numeric(14,2),          -- venta mensual estimada
  preventista_id        uuid references public.profiles(id) on delete set null,
  fecha_proximo_contacto date,
  notas                 text,
  motivo_perdida        text,                   -- solo si estado = perdido
  convertido_cliente_id uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id),
  updated_at            timestamptz not null default now()
);

create index idx_pipeline_estado      on public.pipeline_prospectos(estado);
create index idx_pipeline_preventista on public.pipeline_prospectos(preventista_id);
create index idx_pipeline_zona        on public.pipeline_prospectos(zona);

create trigger set_updated_at_pipeline_prospectos
  before update on public.pipeline_prospectos
  for each row execute function public.set_updated_at();

alter table public.pipeline_prospectos enable row level security;

create policy "admin_pipeline_all"
  on public.pipeline_prospectos for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

create policy "vendedor_pipeline_read"
  on public.pipeline_prospectos for select
  using  ((auth.jwt() ->> 'role') = 'vendedor');

create policy "vendedor_pipeline_write"
  on public.pipeline_prospectos for insert
  with check ((auth.jwt() ->> 'role') = 'vendedor');

create policy "vendedor_pipeline_update"
  on public.pipeline_prospectos for update
  using  ((auth.jwt() ->> 'role') = 'vendedor');

grant all on public.pipeline_prospectos to service_role;
