-- CUIT del proveedor, capturado desde la lectura por foto (IA) igual que
-- proveedor/número/fecha, o cargado a mano.
alter table public.recepciones add column if not exists proveedor_cuit text;
