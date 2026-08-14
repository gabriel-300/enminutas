-- Stock y movimientos pasan a numeric para soportar fracciones de caja
ALTER TABLE public.products
  ALTER COLUMN stock_cajas TYPE numeric(8,2) USING stock_cajas::numeric(8,2);

ALTER TABLE public.stock_movements
  ALTER COLUMN qty TYPE numeric(8,2) USING qty::numeric(8,2);

-- Recrear increment_stock con parámetro numeric
CREATE OR REPLACE FUNCTION increment_stock(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE products
  SET stock_cajas = stock_cajas + p_qty
  WHERE id = p_product_id;
$$;

-- Recrear decrement_stock con parámetro numeric
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE products
  SET stock_cajas = GREATEST(stock_cajas - p_qty, 0)
  WHERE id = p_product_id;
$$;
