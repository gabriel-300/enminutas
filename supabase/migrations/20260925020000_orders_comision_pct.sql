-- % de comisión (pool) que el precio del pedido lleva incluido, guardado al crearlo. Así cambiar después el
-- comision_pct_override de un cliente o el % global no recalcula la comisión de pedidos ya vendidos.
-- NULL = pedido anterior a esta columna: la comisión usa el % vigente del cliente (comportamiento previo).
alter table public.orders
  add column if not exists comision_pct numeric(6,4)
    check (comision_pct is null or (comision_pct >= 0 and comision_pct < 1));
