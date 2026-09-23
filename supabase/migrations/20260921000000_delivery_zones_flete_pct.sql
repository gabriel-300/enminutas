-- Flete CIF por zona: porcentaje de lista_siva incluido en el precio de la mercadería
-- (ej: 0.02 = 2%). Reemplaza el flete "aparte" por km × 2 × precio_km.
-- Default 0: ninguna zona cambia de precio hasta que se cargue el % desde /admin/zonas.
-- Los pedidos ya creados no cambian (guardan sus precios y su shipping_fee).
-- Las columnas km, precio_km y capacidad_kg quedan en la tabla sin uso en el flete.
alter table public.delivery_zones
  add column if not exists flete_pct numeric(6,4) not null default 0
    check (flete_pct >= 0 and flete_pct < 1);
