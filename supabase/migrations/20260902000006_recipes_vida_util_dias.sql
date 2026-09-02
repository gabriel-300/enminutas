ALTER TABLE recipes ADD COLUMN IF NOT EXISTS vida_util_dias integer NOT NULL DEFAULT 180;
GRANT ALL ON TABLE recipes TO anon, authenticated, service_role;
