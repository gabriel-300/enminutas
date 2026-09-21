-- ── 021: Log de contactos del preventista + notas internas por cliente ─────────

-- Log de contactos (llamadas, visitas, WhatsApp, etc.)
CREATE TABLE IF NOT EXISTS contact_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo        text        NOT NULL DEFAULT 'contacto',  -- llamada, visita, whatsapp, email, otro
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_logs_cliente   ON contact_logs(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_logs_vendedor  ON contact_logs(vendedor_id, created_at DESC);

GRANT ALL ON TABLE contact_logs TO anon, authenticated, service_role;

ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_logs' AND policyname = 'contact_logs_staff'
  ) THEN
    CREATE POLICY "contact_logs_staff" ON contact_logs
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor')
      );
  END IF;
END $$;

-- Notas internas por cliente (visible solo al equipo, no al cliente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notas_internas text;
