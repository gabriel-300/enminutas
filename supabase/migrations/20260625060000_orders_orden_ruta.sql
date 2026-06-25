-- Orden de parada en la ruta de distribución (null = sin ordenar)
alter table public.orders
  add column if not exists orden_ruta int;

create index if not exists idx_orders_orden_ruta on public.orders(orden_ruta)
  where orden_ruta is not null;
