-- % de flete CIF (sobre lista s/IVA) que el precio del pedido lleva incluido, guardado al crearlo.
-- Sirve para que la comisión no se calcule sobre el flete: total = lista_siva × (1 + IVA + pool + flete × (1 + IVA)).
-- Default 0: los pedidos existentes se crearon sin flete incluido en el precio (verificado en
-- product_snapshot.precio: final_civa = lista_civa + comision), así que no necesitan backfill.
alter table public.orders
  add column if not exists flete_pct numeric(6,4) not null default 0
    check (flete_pct >= 0 and flete_pct < 1);
