-- ── 014: Recetas y pasos de producción ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  yield_cajas integer     NOT NULL DEFAULT 1,  -- cajas que produce el lote estándar
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_order  integer     NOT NULL,
  description text        NOT NULL,
  minutes     numeric(6,2) NOT NULL DEFAULT 0,  -- minutos para producir yield_cajas
  notes       text,
  UNIQUE (recipe_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id, step_order);

-- Trigger updated_at en recipes
CREATE OR REPLACE FUNCTION set_updated_at_recipes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS set_updated_at_recipes ON recipes;
CREATE TRIGGER set_updated_at_recipes
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_recipes();

-- Permisos de tabla (necesario para service_role, anon y authenticated)
GRANT ALL ON TABLE recipes      TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipe_steps TO anon, authenticated, service_role;

-- RLS: staff puede leer y escribir
ALTER TABLE recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_staff_all') THEN
    CREATE POLICY "recipes_staff_all" ON recipes
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor', 'produccion')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipe_steps' AND policyname = 'recipe_steps_staff_all') THEN
    CREATE POLICY "recipe_steps_staff_all" ON recipe_steps
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor', 'produccion')
      );
  END IF;
END $$;

-- Función: tiempo total estimado para producir N cajas de un producto
-- Devuelve minutos (null si no hay receta)
CREATE OR REPLACE FUNCTION minutos_para_producir(p_product_id uuid, p_cajas integer)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT
    CASE WHEN r.yield_cajas = 0 THEN NULL
    ELSE ROUND(
      (SELECT COALESCE(SUM(s.minutes), 0) FROM recipe_steps s WHERE s.recipe_id = r.id)
      * p_cajas::numeric / r.yield_cajas, 1
    )
    END
  FROM recipes r
  WHERE r.product_id = p_product_id;
$$;
