-- Marca al preventista "comercializadora": cobra el % global de comisión
-- (parametros_globales.comision_pct) sobre TODOS los clientes del sistema,
-- salvo la parte que se le haya cedido al preventista directamente asignado
-- a cada cliente (comisiones.page.tsx resta lo que cobra ese preventista
-- del total y le da el resto a la comercializadora).
alter table public.profiles
  add column if not exists es_comercializadora boolean not null default false;

update public.profiles set es_comercializadora = true
where id = 'de7b6b96-8b23-40f9-9a37-837b5c20ed9a'; -- Javier Acuña
