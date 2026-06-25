-- ── CUENTAS CORRIENTES ────────────────────────────────────────────
-- Libro de movimientos por cliente B2B.
-- monto > 0 = cargo (el cliente nos debe)
-- monto < 0 = pago o crédito (el cliente pagó / se le acredita)

create table public.cc_movimientos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.profiles(id) on delete cascade,
  fecha       date not null default current_date,
  tipo        text not null
              check (tipo in ('cargo','pago','ajuste','nota_credito')),
  descripcion text not null,
  monto       numeric(14,2) not null,
  referencia  text,                          -- nro cheque, transferencia, etc.
  factura_id  uuid references public.facturas(id) on delete set null,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id)
);

create index idx_cc_cliente  on public.cc_movimientos(cliente_id, fecha desc);
create index idx_cc_tipo     on public.cc_movimientos(tipo);
create index idx_cc_factura  on public.cc_movimientos(factura_id)
  where factura_id is not null;

-- límite de crédito ya existe en b2b_accounts (credit_limit).
-- Agregamos domicilio_fiscal si aún no existe (puede haberse agregado antes).
alter table public.b2b_accounts
  add column if not exists domicilio_fiscal text;

-- RLS
alter table public.cc_movimientos enable row level security;

create policy "admin_cc_all"
  on public.cc_movimientos for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.cc_movimientos to service_role;
