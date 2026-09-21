-- ── 016: Ingredientes por receta ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid        NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  cantidad    numeric(10,3) NOT NULL DEFAULT 0,
  unidad      text        NOT NULL DEFAULT 'u',  -- gr, kg, ml, l, u, cc, taza, cdita, cda
  UNIQUE (recipe_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- Permisos
GRANT ALL ON TABLE recipe_ingredients TO anon, authenticated, service_role;

-- RLS
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recipe_ingredients' AND policyname = 'recipe_ingredients_staff_all'
  ) THEN
    CREATE POLICY "recipe_ingredients_staff_all" ON recipe_ingredients
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor', 'produccion')
      );
  END IF;
END $$;
