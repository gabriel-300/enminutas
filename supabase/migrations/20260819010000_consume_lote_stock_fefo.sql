-- Consume stock de lotes en orden FEFO (primero en vencer, primero en salir)
-- al despachar pedidos. Reemplaza decrement_stock que solo tocaba products.stock_cajas.

CREATE OR REPLACE FUNCTION consume_lote_stock(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_remaining numeric := p_qty;
  v_lote      record;
  v_consume   numeric;
BEGIN
  FOR v_lote IN
    SELECT id, cantidad_actual
    FROM lotes
    WHERE producto_id = p_product_id
      AND activo = true
      AND cantidad_actual > 0
      AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
    ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_consume := LEAST(v_lote.cantidad_actual, v_remaining);
    UPDATE lotes
    SET
      cantidad_actual = cantidad_actual - v_consume,
      activo = CASE WHEN (cantidad_actual - v_consume) <= 0 THEN false ELSE activo END
    WHERE id = v_lote.id;
    v_remaining := v_remaining - v_consume;
  END LOOP;

  -- Mantener products.stock_cajas sincronizado (columna legacy)
  UPDATE products
  SET stock_cajas = GREATEST(COALESCE(stock_cajas, 0) - p_qty, 0)
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION consume_lote_stock(uuid, numeric) TO service_role;
