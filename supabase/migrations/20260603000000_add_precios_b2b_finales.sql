-- Agrega columnas de precio final por canal al catálogo B2B
-- Reemplaza el cálculo dinámico (costo + margen) por precio final directo (TOTAL C/IVA por caja)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS precio_dist   numeric,
  ADD COLUMN IF NOT EXISTS precio_gastro numeric,
  ADD COLUMN IF NOT EXISTS precio_min    numeric;
