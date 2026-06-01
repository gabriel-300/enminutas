-- ── 023: Dirección de entrega en perfil de clientes B2B ─────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS direccion_calle   text,
  ADD COLUMN IF NOT EXISTS direccion_numero  text,
  ADD COLUMN IF NOT EXISTS direccion_piso    text,
  ADD COLUMN IF NOT EXISTS direccion_ciudad  text;
