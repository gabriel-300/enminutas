-- Agrupa varios pagos (uno por pedido) generados en una misma tanda al
-- imputar un pago a varios pedidos a la vez, para poder emitir un único
-- recibo combinado en vez de uno por pedido.
alter table public.pagos
  add column if not exists grupo_id uuid;

create index if not exists idx_pagos_grupo on public.pagos(grupo_id)
  where grupo_id is not null;
