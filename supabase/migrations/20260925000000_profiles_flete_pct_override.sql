-- Flete CIF personalizado por cliente: pisa el % de la zona de entrega
-- (delivery_zones.flete_pct). Misma lógica que profiles.comision_pct_override:
--   null  = usa el % de la zona de la dirección
--   0     = este cliente no paga flete, aunque su zona tenga %
--   0.02  = 2% de lista_siva para este cliente en cualquier zona
-- Columna nullable sin default: ningún cliente ni precio existente cambia.
alter table public.profiles
  add column if not exists flete_pct_override numeric(6,4)
    check (flete_pct_override is null or (flete_pct_override >= 0 and flete_pct_override < 1));
