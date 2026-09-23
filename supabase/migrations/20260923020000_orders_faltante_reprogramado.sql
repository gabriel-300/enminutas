-- Faltante reprogramado: un pedido con entrega parcial puede generar UN pedido nuevo, enlazado, con lo que faltó.
--   origen_order_id  : pedido del que sale el faltante (null en los pedidos normales)
--   fecha_compromiso : fecha en que se comprometió entregar el faltante (alerta si vence sin despacharse)
-- El índice único parcial garantiza una sola reprogramación activa por pedido (evita duplicados por doble clic);
-- si la reprogramación se cancela, se puede crear otra.
-- No toca datos existentes.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origen_order_id  uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_compromiso date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_origen_activo
  ON public.orders (origen_order_id)
  WHERE origen_order_id IS NOT NULL AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_orders_fecha_compromiso
  ON public.orders (fecha_compromiso)
  WHERE fecha_compromiso IS NOT NULL;
