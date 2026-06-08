-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Constraint UNIQUE en order_number
-- Previene duplicados por condición de carrera en generación de número
-- ══════════════════════════════════════════════════════════════════════

-- Verificar si hay duplicados antes de aplicar (solo informativo)
-- SELECT order_number, COUNT(*) FROM public.orders GROUP BY order_number HAVING COUNT(*) > 1;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

GRANT ALL ON public.orders TO anon, authenticated, service_role;
