ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'otros';

COMMENT ON COLUMN insumos.categoria IS 'Categoría del insumo: verduras, frutas, carnes, lacteos, panificados, condimentos, aceites_grasas, bebidas, otros';
