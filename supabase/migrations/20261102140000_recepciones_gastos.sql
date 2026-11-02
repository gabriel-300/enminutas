-- Gastos sin mercadería (luz, agua, alquiler, etc.) como un tercer tipo de comprobante.
-- Usan la misma tabla que facturas y remitos: generan deuda con el proveedor y se pagan igual,
-- pero no tienen ítems ni mueven stock. La categoría permite agruparlos después.

alter table public.recepciones drop constraint if exists recepciones_tipo_check;
alter table public.recepciones
  add constraint recepciones_tipo_check check (tipo in ('factura', 'remito', 'gasto'));

alter table public.recepciones
  add column if not exists categoria_gasto text;

alter table public.recepciones drop constraint if exists recepciones_categoria_gasto_check;
alter table public.recepciones
  add constraint recepciones_categoria_gasto_check
  check (categoria_gasto is null or categoria_gasto in
    ('luz', 'agua', 'gas', 'internet_telefono', 'alquiler', 'impuestos', 'servicios', 'otros'));

-- Verificación posterior:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.recepciones'::regclass and contype = 'c';
