-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Estado liquidado
-- Agrega 'liquidado' al enum order_status para cerrar el ciclo del pedido
-- ══════════════════════════════════════════════════════════════════════

ALTER TYPE public.order_status
  ADD VALUE IF NOT EXISTS 'liquidado' AFTER 'entrega_parcial';
