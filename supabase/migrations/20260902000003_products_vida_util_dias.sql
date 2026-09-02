ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vida_util_dias integer NOT NULL DEFAULT 180;

COMMENT ON COLUMN products.vida_util_dias IS 'Días de vida útil desde la producción para calcular fecha de vencimiento del lote';
