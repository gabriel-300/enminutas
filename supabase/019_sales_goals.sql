-- ── 019: Metas de venta por vendedor ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_goals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes         text        NOT NULL,  -- YYYY-MM
  objetivo    numeric(12,2) NOT NULL DEFAULT 0,
  UNIQUE (vendedor_id, mes)
);

GRANT ALL ON TABLE sales_goals TO anon, authenticated, service_role;

ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_goals' AND policyname = 'sales_goals_staff_all'
  ) THEN
    CREATE POLICY "sales_goals_staff_all" ON sales_goals
      FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'vendedor')
      );
  END IF;
END $$;
