-- Marca explícita para pagos "sin factura" (cliente cobrado neto s/IVA, sin
-- emitir factura). Se usa para excluir el descuento de IVA de la base de
-- cálculo de la comisión del preventista.
alter table public.pagos
  add column if not exists sin_factura boolean not null default false;
