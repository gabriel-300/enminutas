ALTER TABLE canales
  ADD COLUMN IF NOT EXISTS margen_venta_directa numeric(5,4) NOT NULL DEFAULT 0;

GRANT ALL ON canales TO anon, authenticated, service_role;
