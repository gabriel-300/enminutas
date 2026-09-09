-- Rediseño: el pago de comisión se registra por vendedor + cliente + mes
-- (no por vendedor + mes entero), para poder pagar cliente por cliente
-- según flujo de caja. La tabla estaba vacía (nada se había marcado
-- pagado todavía), así que se recrea limpia.
drop table if exists public.comisiones_pagos;

create table public.comisiones_pagos (
  id           uuid primary key default gen_random_uuid(),
  vendedor_id  uuid not null references public.profiles(id),
  cliente_id   uuid not null references public.profiles(id),
  mes          text not null, -- 'YYYY-MM'
  monto        numeric(14,2) not null,
  pct          numeric(6,4)  not null,
  ventas       numeric(14,2) not null,
  fecha_pago   date not null default current_date,
  notas        text,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  unique (vendedor_id, mes, cliente_id)
);

create index idx_comisiones_pagos_mes           on public.comisiones_pagos(mes);
create index idx_comisiones_pagos_vendedor_mes  on public.comisiones_pagos(vendedor_id, mes);

alter table public.comisiones_pagos enable row level security;

create policy "admin_comisiones_pagos_all"
  on public.comisiones_pagos for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.comisiones_pagos to service_role;
