-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — decrement_stock atómico con SELECT FOR UPDATE
-- Previene sobreventa por condición de carrera en despachos concurrentes
-- ══════════════════════════════════════════════════════════════════════

-- Reemplaza la versión SQL sin locking por una PL/pgSQL con FOR UPDATE.
-- Retorna TRUE si había stock suficiente, FALSE si se clampó a 0.
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_stock integer;
BEGIN
  -- Bloquea la fila hasta el fin de la transacción
  SELECT stock_cajas INTO current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  UPDATE products
  SET stock_cajas = GREATEST(stock_cajas - p_qty, 0)
  WHERE id = p_product_id;

  RETURN current_stock >= p_qty;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO service_role;
