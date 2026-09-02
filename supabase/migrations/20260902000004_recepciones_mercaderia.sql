-- Cabecera de recepción (factura o remito)
CREATE TABLE IF NOT EXISTS recepciones (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo        text NOT NULL CHECK (tipo IN ('factura', 'remito')),
  numero      text NOT NULL,
  proveedor   text NOT NULL,
  fecha       date NOT NULL DEFAULT current_date,
  notas       text,
  total       numeric(14,2),
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ítems de la recepción
CREATE TABLE IF NOT EXISTS recepciones_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recepcion_id     uuid NOT NULL REFERENCES recepciones(id) ON DELETE CASCADE,
  insumo_id        uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad         numeric(14,3) NOT NULL CHECK (cantidad > 0),
  unidad           text NOT NULL,
  precio_unitario  numeric(14,4) NOT NULL DEFAULT 0,
  subtotal         numeric(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE INDEX IF NOT EXISTS idx_recepciones_fecha      ON recepciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_recepciones_items_rec  ON recepciones_items(recepcion_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_items_ins  ON recepciones_items(insumo_id);

GRANT ALL ON TABLE recepciones       TO anon, authenticated, service_role;
GRANT ALL ON TABLE recepciones_items TO anon, authenticated, service_role;
