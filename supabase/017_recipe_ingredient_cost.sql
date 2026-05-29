-- ── 017: Costo por ingrediente en receta ──────────────────────────────────────
-- costo = precio total del ingrediente tal como figura en la receta
-- (no precio unitario — el usuario ingresa cuánto cuesta la cantidad usada)

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS costo numeric(10,2) NOT NULL DEFAULT 0;
