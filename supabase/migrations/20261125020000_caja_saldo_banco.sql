-- Posición de caja (tarea 85 bitácora 25/11, Módulo 3): saldo Banco Macro + cobros confirmados
-- − deuda a proveedores − órdenes de pago pendientes. No hay API del banco todavía (etapa
-- "DESPUÉS" de la tarea 94): el saldo se carga a mano cada vez que alguien lo chequea en el
-- home banking. Guardamos cada carga (no se pisa) para poder contar los cobros posteriores a la
-- última carga sin duplicar lo que el saldo cargado ya refleja.
create table if not exists public.caja_saldo_banco (
  id         uuid primary key default gen_random_uuid(),
  saldo      numeric(14,2) not null,
  notas      text,
  creado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_caja_saldo_banco_created_at on public.caja_saldo_banco (created_at desc);

alter table public.caja_saldo_banco enable row level security;
grant all on table public.caja_saldo_banco to service_role;
