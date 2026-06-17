-- Migración 046: comisión asignada a preventistas
-- El % aquí es la porción de lista_siva que se le transfiere al preventista.
-- Ej: comision_preventista_pct = 0.05 significa que le damos 5% y Minutas retiene 10%
-- (asumiendo comision_pct global = 0.15).
-- Alex no ve este dato — es un reparto interno.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comision_preventista_pct numeric DEFAULT NULL;

-- Verificación
SELECT id, full_name, comision_preventista_pct
FROM public.profiles
WHERE comision_preventista_pct IS NOT NULL;
