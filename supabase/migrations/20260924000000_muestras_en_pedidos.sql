-- ── MUESTRAS DENTRO DEL FLUJO DE PEDIDOS ────────────────────────────────────
-- La muestra pasa a ser un pedido más (canal 'muestra'): pendiente → aprobado → producción →
-- despacho (descuenta lotes) → distribución → entregado. Solo aditivo, todo nullable.

-- 1. El prospecto necesita dirección para poder enviarle la muestra
ALTER TABLE public.pipeline_prospectos
  ADD COLUMN IF NOT EXISTS direccion text;

-- 2. Datos del contacto en el pedido (foto al momento de pedir la muestra) + quién la solicitó
--    Ya existen: muestra_destinatario (empresa/nombre), guest_email, guest_phone, shipping_snapshot (dirección)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS muestra_contacto text,
  ADD COLUMN IF NOT EXISTS muestra_prospecto_id uuid REFERENCES public.pipeline_prospectos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS solicitado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_muestra_prospecto ON public.orders(muestra_prospecto_id)
  WHERE muestra_prospecto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_solicitado_por ON public.orders(solicitado_por)
  WHERE solicitado_por IS NOT NULL;

GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.pipeline_prospectos TO anon, authenticated, service_role;
