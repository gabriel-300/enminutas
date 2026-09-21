-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Limpieza total de pedidos
-- Borra todos los pedidos y reinicia el numerador desde 00001
-- order_lines y order_events se borran por CASCADE automáticamente
-- ══════════════════════════════════════════════════════════════════════

-- 1. Limpiar FK en driver_locations (no tiene CASCADE)
UPDATE public.driver_locations SET order_id = NULL WHERE order_id IS NOT NULL;

-- 2. Borrar todos los pedidos (borra order_lines y order_events en cascada)
DELETE FROM public.orders;

-- 3. Resetear secuencia de numeración → próximo pedido será -00001
ALTER SEQUENCE public.order_number_seq RESTART WITH 1;
