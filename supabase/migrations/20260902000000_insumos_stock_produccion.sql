-- ── STOCK DE INSUMOS + PRODUCCIÓN DE LOTES ────────────────────────────────────

-- 1. Columnas de control de stock en insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS stock_actual  numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo  numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS punto_pedido  numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_maximo  numeric(14,3) NOT NULL DEFAULT 0;

-- 2. Movimientos de stock de insumos (trazabilidad / kardex)
CREATE TABLE IF NOT EXISTS insumos_movimientos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id     uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  tipo          text NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ajuste')),
  cantidad      numeric(14,3) NOT NULL,  -- ingreso/egreso: positivo; ajuste: delta (puede ser negativo)
  motivo        text NOT NULL DEFAULT 'manual',
  referencia_id uuid,
  notas         text,
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumos_mov_insumo  ON insumos_movimientos(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_mov_created ON insumos_movimientos(created_at DESC);

GRANT ALL ON TABLE insumos_movimientos TO anon, authenticated, service_role;

-- 3. Tabla de producción de lotes
CREATE TABLE IF NOT EXISTS produccion (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id    uuid NOT NULL REFERENCES products(id)  ON DELETE RESTRICT,
  receta_id      uuid NOT NULL REFERENCES recipes(id)   ON DELETE RESTRICT,
  cantidad_cajas numeric(10,3) NOT NULL CHECK (cantidad_cajas > 0),
  fecha          date NOT NULL DEFAULT current_date,
  notas          text,
  created_by     uuid REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produccion_producto ON produccion(producto_id);
CREATE INDEX IF NOT EXISTS idx_produccion_fecha    ON produccion(fecha DESC);

GRANT ALL ON TABLE produccion TO anon, authenticated, service_role;

-- 4. Trigger: al insertar producción, descontar insumos automáticamente
CREATE OR REPLACE FUNCTION deducir_insumos_produccion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_yield_cajas numeric;
  v_factor      numeric;
  v_ing         RECORD;
  v_delta       numeric;
BEGIN
  SELECT yield_cajas INTO v_yield_cajas FROM recipes WHERE id = NEW.receta_id;

  IF v_yield_cajas IS NULL OR v_yield_cajas <= 0 THEN
    RAISE EXCEPTION 'La receta no tiene yield_cajas configurado';
  END IF;

  v_factor := NEW.cantidad_cajas / v_yield_cajas;

  FOR v_ing IN
    SELECT ri.insumo_id, ri.cantidad
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = NEW.receta_id
      AND ri.insumo_id IS NOT NULL
      AND ri.cantidad > 0
  LOOP
    v_delta := v_ing.cantidad * v_factor;

    UPDATE insumos
    SET stock_actual = stock_actual - v_delta
    WHERE id = v_ing.insumo_id;

    INSERT INTO insumos_movimientos
      (insumo_id, tipo, cantidad, motivo, referencia_id, notas, created_by)
    VALUES
      (v_ing.insumo_id, 'egreso', v_delta, 'produccion', NEW.id,
       'Producción: ' || NEW.cantidad_cajas || ' cajas', NEW.created_by);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deducir_insumos_produccion ON produccion;
CREATE TRIGGER trg_deducir_insumos_produccion
  AFTER INSERT ON produccion
  FOR EACH ROW EXECUTE FUNCTION deducir_insumos_produccion();

GRANT EXECUTE ON FUNCTION deducir_insumos_produccion() TO service_role;
