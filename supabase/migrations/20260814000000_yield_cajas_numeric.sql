-- Permite registrar rendimientos decimales de lote (ej: 10.5 cajas)
ALTER TABLE public.recipes
  ALTER COLUMN yield_cajas TYPE numeric(6,2) USING yield_cajas::numeric(6,2);
