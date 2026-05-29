-- ── 018: Asignación de vendedor a clientes B2B ────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_vendedor ON profiles(vendedor_id);
