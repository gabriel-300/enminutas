-- IVA por ítem y fecha de vencimiento en recepciones
ALTER TABLE recepciones_items
  ADD COLUMN IF NOT EXISTS iva_pct       numeric(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date;

-- Otros impuestos al final de la factura
ALTER TABLE recepciones
  ADD COLUMN IF NOT EXISTS otros_impuestos numeric(14,2) NOT NULL DEFAULT 0;

GRANT ALL ON TABLE recepciones       TO anon, authenticated, service_role;
GRANT ALL ON TABLE recepciones_items TO anon, authenticated, service_role;
