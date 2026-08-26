-- Tabla de pagos de clientes B2B (cuenta corriente)
CREATE TABLE IF NOT EXISTS pagos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monto       numeric(14,2) NOT NULL CHECK (monto > 0),
  fecha       date NOT NULL DEFAULT current_date,
  metodo      text NOT NULL DEFAULT 'transferencia',
  referencia  text,
  notas       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha   ON pagos(fecha DESC);

GRANT ALL ON TABLE pagos TO anon, authenticated, service_role;
