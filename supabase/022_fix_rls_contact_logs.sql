-- ── 022: Fix RLS contact_logs — vendedor solo ve sus propios contactos ──────

DROP POLICY IF EXISTS "contact_logs_staff" ON contact_logs;

CREATE POLICY "contact_logs_admin" ON contact_logs
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "contact_logs_vendedor" ON contact_logs
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'vendedor'
    AND vendedor_id = auth.uid()
  );
