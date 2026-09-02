CREATE UNIQUE INDEX IF NOT EXISTS insumos_nombre_lower_unique ON insumos (LOWER(nombre));
