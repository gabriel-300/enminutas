-- ── 020: Descuentos por volumen de cajas ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS volume_discounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  min_cajas     integer     NOT NULL,
  descuento_pct numeric(5,2) NOT NULL,
  label         text        NOT NULL,
  activo        boolean     NOT NULL DEFAULT true,
  UNIQUE (min_cajas)
);

GRANT ALL ON TABLE volume_discounts TO anon, authenticated, service_role;

ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'volume_discounts' AND policyname = 'volume_discounts_staff'
  ) THEN
    CREATE POLICY "volume_discounts_staff" ON volume_discounts
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor', 'produccion')
      );
  END IF;
END $$;

-- Tiers de ejemplo — el admin puede modificarlos desde el panel
INSERT INTO volume_discounts (min_cajas, descuento_pct, label) VALUES
  (10, 3,  '3% por 10 o más cajas'),
  (20, 7,  '7% por 20 o más cajas'),
  (50, 12, '12% por 50 o más cajas')
ON CONFLICT (min_cajas) DO NOTHING;
