-- ── CHEQUES DIFERIDOS ─────────────────────────────────────────────
-- Cartera de cheques recibidos de clientes B2B.
-- Flujo: en_cartera → depositado → acreditado (o rechazado)
-- Al acreditar se genera automáticamente un pago en cc_movimientos.

create table public.cheques (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.profiles(id),
  numero_cheque      text not null,
  banco              text not null,
  librador           text,                   -- firmante (puede diferir del cliente)
  monto              numeric(14,2) not null check (monto > 0),
  fecha_emision      date not null,
  fecha_acreditacion date not null,          -- fecha en que se puede cobrar
  estado             text not null default 'en_cartera'
                     check (estado in ('en_cartera','depositado','acreditado','rechazado')),
  observaciones      text,
  cc_movimiento_id   uuid references public.cc_movimientos(id) on delete set null,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id),
  updated_at         timestamptz not null default now()
);

create index idx_cheques_cliente        on public.cheques(cliente_id);
create index idx_cheques_estado         on public.cheques(estado);
create index idx_cheques_acreditacion   on public.cheques(fecha_acreditacion);

create trigger set_updated_at_cheques
  before update on public.cheques
  for each row execute function public.set_updated_at();

alter table public.cheques enable row level security;

create policy "admin_cheques_all"
  on public.cheques for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.cheques to service_role;
