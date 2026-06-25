-- Umbral de alerta de stock mínimo por producto
alter table public.products
  add column if not exists stock_minimo numeric(10,3) default null;
