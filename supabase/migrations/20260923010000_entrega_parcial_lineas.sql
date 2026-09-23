-- Entrega parcial: modelo único.
--   1. reintegrar_lote_stock: lo no entregado vuelve a los LOTES (antes solo sumaba a products.stock_cajas,
--      que es la columna legacy, y el stock real de lotes quedaba perdido).
--   2. order_lines_quantity_check pasa de "> 0" a ">= 0": una línea con 0 entregado queda en el pedido con
--      cantidad 0 (las pantallas la ocultan, el remito la lista como faltante). El código ya asumía esto
--      (ajuste al despachar, edición de cantidades) pero la restricción lo rechazaba.
--   3. Backfill: las líneas (order_lines) de los pedidos que ya tuvieron entrega parcial pasan a reflejar
--      lo entregado, igual que ahora hace confirmarEntregaParcial. Lo pedido queda en delivered_snapshot.
--
-- Correr ANTES de desplegar el código nuevo (el remito y las pantallas leen order_lines directamente).
-- No borra nada: solo actualiza cantidades/importes de líneas de pedidos con delivered_snapshot, a partir de
-- su propio snapshot. Es idempotente (volver a correrla no cambia nada).

-- ── 1. Reintegro a lotes ────────────────────────────────────────────────────
-- Espejo del FEFO de consume_lote_stock: se devuelve al lote no vencido que primero vence (es el que
-- se consumió primero). Si estaba agotado se reactiva. Sin lotes vigentes solo se sincroniza stock_cajas.
CREATE OR REPLACE FUNCTION reintegrar_lote_stock(p_product_id uuid, p_qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lote_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN;
  END IF;

  SELECT id INTO v_lote_id
  FROM lotes
  WHERE producto_id = p_product_id
    AND fecha_vencimiento >= CURRENT_DATE
  ORDER BY fecha_vencimiento ASC, created_at ASC
  LIMIT 1;

  IF v_lote_id IS NOT NULL THEN
    UPDATE lotes
    SET cantidad_actual  = cantidad_actual + p_qty,
        cantidad_inicial = GREATEST(cantidad_inicial, cantidad_actual + p_qty),
        activo           = true
    WHERE id = v_lote_id;
  END IF;

  -- Mantener products.stock_cajas sincronizado (columna legacy), igual que consume_lote_stock
  UPDATE products
  SET stock_cajas = COALESCE(stock_cajas, 0) + p_qty
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reintegrar_lote_stock(uuid, numeric) TO service_role;

-- ── 2. Permitir cantidad 0 en las líneas ─────────────────────────────────────
ALTER TABLE order_lines DROP CONSTRAINT IF EXISTS order_lines_quantity_check;
ALTER TABLE order_lines ADD CONSTRAINT order_lines_quantity_check CHECK (quantity >= 0);

-- ── 3. Backfill de líneas de pedidos con entrega parcial ────────────────────
UPDATE order_lines l
SET quantity   = (x->>'entregado')::numeric,
    line_total = round(l.unit_price * (x->>'entregado')::numeric, 2)
FROM orders o,
     jsonb_array_elements(o.delivered_snapshot->'lineas') x
WHERE o.id = l.order_id
  AND o.delivered_snapshot IS NOT NULL
  AND l.product_id = (x->>'productId')::uuid
  AND l.quantity IS DISTINCT FROM (x->>'entregado')::numeric;

-- El total de estos pedidos ya se había recalculado con lo entregado; solo se alinea el subtotal con las líneas.
UPDATE orders o
SET subtotal = s.suma
FROM (
  SELECT order_id, sum(line_total) AS suma
  FROM order_lines
  GROUP BY order_id
) s
WHERE s.order_id = o.id
  AND o.delivered_snapshot IS NOT NULL
  AND o.subtotal IS DISTINCT FROM s.suma;
