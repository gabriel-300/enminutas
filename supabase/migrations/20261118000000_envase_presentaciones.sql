-- Envase por presentación: separa los insumos de embalaje (bolsa, caja, etiqueta) de la
-- receta compartida. Antes una presentación que necesitaba un envase distinto (ej. bolsa de
-- 2kg vs bolsa de 500g) tenía que tener receta propia completa, aunque la producción (pasta,
-- horneado, etc.) fuera idéntica a la del producto base — eso impedía vincularla.
-- Ahora el envase se carga por producto y se descuenta por caja producida, no por lote de
-- receta, así varias presentaciones pueden compartir receta y tener cada una su propio envase.
CREATE TABLE IF NOT EXISTS public.product_packaging (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  insumo_id         uuid NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  cantidad_por_caja numeric(10,4) NOT NULL CHECK (cantidad_por_caja > 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_product_packaging_product ON public.product_packaging(product_id);

GRANT ALL ON TABLE public.product_packaging TO anon, authenticated, service_role;

-- El trigger de producción ahora descuenta también el envase propio de la presentación
-- producida (por caja), además de los ingredientes de la receta (por lote, como antes).
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

  v_factor := COALESCE(NEW.cantidad_lotes, NEW.cantidad_cajas / v_yield_cajas);

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

  -- Envase propio de la presentación producida: por caja, no por lote de receta
  FOR v_ing IN
    SELECT pp.insumo_id, pp.cantidad_por_caja AS cantidad
    FROM product_packaging pp
    WHERE pp.product_id = NEW.producto_id
  LOOP
    v_delta := v_ing.cantidad * NEW.cantidad_cajas;

    UPDATE insumos
    SET stock_actual = stock_actual - v_delta
    WHERE id = v_ing.insumo_id;

    INSERT INTO insumos_movimientos
      (insumo_id, tipo, cantidad, motivo, referencia_id, notas, created_by)
    VALUES
      (v_ing.insumo_id, 'egreso', v_delta, 'produccion', NEW.id,
       'Envase: ' || NEW.cantidad_cajas || ' cajas', NEW.created_by);
  END LOOP;

  RETURN NEW;
END;
$$;
