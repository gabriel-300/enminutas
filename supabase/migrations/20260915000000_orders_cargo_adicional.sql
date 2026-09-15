-- Cargo adicional manual y opcional al crear un pedido B2B (flete, IIBB,
-- u otro concepto puntual que el admin/vendedor tipea a mano). Se suma al
-- total del pedido; queda separado de shipping_fee porque el concepto es
-- variable (no siempre es "Flete").
alter table public.orders
  add column if not exists cargo_adicional_concepto text,
  add column if not exists cargo_adicional_monto numeric(12,2) not null default 0;
