-- Fix CHECK constraint en stock_movements para incluir 'muestra'
ALTER TABLE public.stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_type_check;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_type_check
  CHECK (type IN ('produccion', 'despacho', 'ajuste', 'muestra'));

-- Agregar columna muestra_observacion a orders (faltaba en migración 20260626)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS muestra_observacion text;

GRANT ALL ON public.stock_movements TO anon, authenticated, service_role;
