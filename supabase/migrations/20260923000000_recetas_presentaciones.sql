-- ── PRESENTACIONES QUE COMPARTEN RECETA ─────────────────────────────────────
-- Una receta pertenece a un producto "base" (recipes.product_id). Las otras presentaciones
-- del mismo producto apuntan a ese base con products.receta_producto_id y no tienen receta propia.
-- Equivalencia entre presentaciones: por peso (products.kg_caja).

-- 1. Vínculo presentación → producto base de la receta
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS receta_producto_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_receta_producto_no_self;
ALTER TABLE public.products
  ADD CONSTRAINT products_receta_producto_no_self
  CHECK (receta_producto_id IS NULL OR receta_producto_id <> id);

CREATE INDEX IF NOT EXISTS idx_products_receta_producto ON public.products(receta_producto_id)
  WHERE receta_producto_id IS NOT NULL;

-- 2. Lotes de receta producidos: el descuento de insumos depende de los lotes de la receta,
--    no de las cajas de la presentación producida (que pueden ser de otro tamaño que el base).
ALTER TABLE public.produccion
  ADD COLUMN IF NOT EXISTS cantidad_lotes numeric(10,3);

-- Backfill: hasta hoy la presentación producida era siempre la del producto de la receta
UPDATE public.produccion pr
SET cantidad_lotes = pr.cantidad_cajas / r.yield_cajas
FROM public.recipes r
WHERE r.id = pr.receta_id
  AND pr.cantidad_lotes IS NULL
  AND r.yield_cajas > 0;

-- 3. Trigger de insumos: usa cantidad_lotes cuando está (fallback al cálculo anterior)
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

  RETURN NEW;
END;
$$;

-- 4. Unificar las recetas duplicadas por presentación (500 g → 10 kg como base).
--    Solo se toca un par si los ingredientes de ambas recetas son idénticos; si no, se saltea.
DO $$
DECLARE
  par            record;
  v_pres_id      uuid;
  v_base_id      uuid;
  v_pres_recipe  uuid;
  v_base_recipe  uuid;
  v_iguales      boolean;
BEGIN
  FOR par IN
    SELECT * FROM (VALUES
      ('CHIPA-PREM-500', 'CHIPA-BOC-X10KG'),
      ('BOC-PACU-500',   'BOC-PACU-10KG'),
      ('BOC-POLLO-500',  'BOC-POLLO-10KG'),
      ('BAT-MOZZA-500',  'BAT-MOZZA-10KG')
    ) AS t(pres_sku, base_sku)
  LOOP
    SELECT id INTO v_pres_id FROM products WHERE sku = par.pres_sku;
    SELECT id INTO v_base_id FROM products WHERE sku = par.base_sku;
    IF v_pres_id IS NULL OR v_base_id IS NULL THEN
      RAISE NOTICE 'Par % → %: producto no encontrado, se saltea', par.pres_sku, par.base_sku;
      CONTINUE;
    END IF;

    SELECT id INTO v_pres_recipe FROM recipes WHERE product_id = v_pres_id;
    SELECT id INTO v_base_recipe FROM recipes WHERE product_id = v_base_id;
    IF v_base_recipe IS NULL THEN
      RAISE NOTICE 'Par % → %: el base no tiene receta, se saltea', par.pres_sku, par.base_sku;
      CONTINUE;
    END IF;

    IF v_pres_recipe IS NOT NULL THEN
      SELECT NOT EXISTS (
        (SELECT insumo_id, cantidad FROM recipe_ingredients WHERE recipe_id = v_pres_recipe
         EXCEPT
         SELECT insumo_id, cantidad FROM recipe_ingredients WHERE recipe_id = v_base_recipe)
        UNION ALL
        (SELECT insumo_id, cantidad FROM recipe_ingredients WHERE recipe_id = v_base_recipe
         EXCEPT
         SELECT insumo_id, cantidad FROM recipe_ingredients WHERE recipe_id = v_pres_recipe)
      ) INTO v_iguales;

      IF NOT v_iguales THEN
        RAISE NOTICE 'Par % → %: ingredientes distintos, se saltea (unificar a mano)', par.pres_sku, par.base_sku;
        CONTINUE;
      END IF;

      -- Los pasos reales de producción suelen estar en la receta de 500 g y el base solo tiene
      -- un paso de relleno (0-1 min): si la de 500 g tiene más minutos cargados, sus pasos pasan al base.
      IF (SELECT coalesce(sum(minutes), 0) FROM recipe_steps WHERE recipe_id = v_pres_recipe)
         > (SELECT coalesce(sum(minutes), 0) FROM recipe_steps WHERE recipe_id = v_base_recipe) THEN
        DELETE FROM recipe_steps WHERE recipe_id = v_base_recipe;
        INSERT INTO recipe_steps (recipe_id, step_order, description, minutes, notes)
          SELECT v_base_recipe, step_order, description, minutes, notes
          FROM recipe_steps WHERE recipe_id = v_pres_recipe;
      END IF;

      -- Las notas de la receta de 500 g no se pierden: se agregan a las del base
      UPDATE recipes
      SET notes = concat_ws(E'\n', notes, 'Receta 500 g: ' || (SELECT notes FROM recipes WHERE id = v_pres_recipe))
      WHERE id = v_base_recipe;

      -- La producción histórica pasa a la receta base (cantidad_lotes ya conserva el factor original)
      UPDATE produccion SET receta_id = v_base_recipe WHERE receta_id = v_pres_recipe;
      DELETE FROM recipes WHERE id = v_pres_recipe;  -- pasos e ingredientes caen en cascada
    END IF;

    UPDATE products SET receta_producto_id = v_base_id WHERE id = v_pres_id;
    RAISE NOTICE 'Par % → %: unificado', par.pres_sku, par.base_sku;
  END LOOP;
END;
$$;
