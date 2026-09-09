-- Registro de pagos de comisión a preventistas, por vendedor y mes.
-- Al marcar un mes como pagado se "congela" el monto/porcentaje/base
-- usados en ese momento, para que cambios posteriores en pedidos no
-- alteren un pago ya hecho. Sin fila = pendiente (se calcula en vivo).
create table public.comisiones_pagos (
  id           uuid primary key default gen_random_uuid(),
  vendedor_id  uuid not null references public.profiles(id),
  mes          text not null, -- 'YYYY-MM'
  monto        numeric(14,2) not null,
  pct          numeric(6,4)  not null,
  ventas_base  numeric(14,2) not null,
  fecha_pago   date not null default current_date,
  notas        text,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  unique (vendedor_id, mes)
);

create index idx_comisiones_pagos_mes on public.comisiones_pagos(mes);

alter table public.comisiones_pagos enable row level security;

create policy "admin_comisiones_pagos_all"
  on public.comisiones_pagos for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

grant all on public.comisiones_pagos to service_role;
