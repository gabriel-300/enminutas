-- ── 013: Stock de producto terminado ─────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_cajas  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty         integer     NOT NULL,  -- positivo = entrada, negativo = salida
  type        text        NOT NULL CHECK (type IN ('produccion', 'despacho', 'ajuste')),
  order_id    uuid        REFERENCES orders(id) ON DELETE SET NULL,
  notes       text,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_mv_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_mv_created ON stock_movements(created_at DESC);

-- Función para decrementar stock sin ir a negativo
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE products
  SET stock_cajas = GREATEST(stock_cajas - p_qty, 0)
  WHERE id = p_product_id;
$$;

-- Función para incrementar stock (registro de lote producido)
CREATE OR REPLACE FUNCTION increment_stock(p_product_id uuid, p_qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE products
  SET stock_cajas = stock_cajas + p_qty
  WHERE id = p_product_id;
$$;

-- RLS: solo staff puede ver y escribir movimientos
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_staff_all" ON stock_movements
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor', 'produccion', 'distribucion')
  );
