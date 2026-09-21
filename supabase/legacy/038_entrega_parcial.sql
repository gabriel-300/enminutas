-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Entrega parcial
-- Agrega status 'entrega_parcial' y columna delivered_snapshot
-- ══════════════════════════════════════════════════════════════════════

-- Columna para guardar qué se entregó realmente vs lo pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_snapshot jsonb;

-- Agregar el status al enum (igual que en_distribucion)
ALTER TYPE public.order_status
  ADD VALUE IF NOT EXISTS 'entrega_parcial' AFTER 'en_distribucion';

GRANT ALL ON public.orders TO anon, authenticated, service_role;
