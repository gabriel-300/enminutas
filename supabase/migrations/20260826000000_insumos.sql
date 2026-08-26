-- Catálogo de insumos (materia prima)
CREATE TABLE IF NOT EXISTS insumos (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          text NOT NULL,
  unidad          text NOT NULL DEFAULT 'gr',
  precio_unitario numeric(14,4) NOT NULL DEFAULT 0,
  proveedor       text,
  notas           text,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- Match por nombre case-insensitive para el importador CSV
CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_nombre ON insumos (lower(trim(nombre)));

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION set_insumos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION set_insumos_updated_at();

-- Agregar insumo_id a recipe_ingredients (nullable para no romper datos existentes)
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS insumo_id uuid REFERENCES insumos(id) ON DELETE RESTRICT;

GRANT ALL ON TABLE insumos TO anon, authenticated, service_role;
