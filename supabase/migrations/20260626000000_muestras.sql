-- ── Pedidos de muestra ───────────────────────────────────────────────────────

-- 1. Nuevo valor en enum order_channel
ALTER TYPE public.order_channel ADD VALUE IF NOT EXISTS 'muestra';

-- 2. Flag en productos: marca el producto como disponible para muestras
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS es_muestra boolean NOT NULL DEFAULT false;

-- 3. Nombre del destinatario de la muestra (puede ser cualquier contacto, no necesariamente un cliente)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS muestra_destinatario text;

-- Índice para listar muestras ordenadas
CREATE INDEX IF NOT EXISTS idx_orders_muestra ON public.orders(channel, created_at DESC)
  WHERE channel = 'muestra';

-- GRANT para que las políticas RLS funcionen
GRANT ALL ON public.orders  TO anon, authenticated, service_role;
GRANT ALL ON public.products TO anon, authenticated, service_role;
