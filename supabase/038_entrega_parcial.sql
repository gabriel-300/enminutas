-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Entrega parcial
-- Agrega status 'entrega_parcial' y columna delivered_snapshot
-- ══════════════════════════════════════════════════════════════════════

-- Columna para guardar qué se entregó realmente vs lo pedido
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_snapshot jsonb;

-- Extender constraint de status (drop y re-add)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_payment', 'aprobado', 'enviado_prod', 'despachado',
    'en_distribucion', 'delivered', 'cancelled', 'entrega_parcial'
  ));

GRANT ALL ON public.orders TO anon, authenticated, service_role;
