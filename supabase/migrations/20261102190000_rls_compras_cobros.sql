-- Seguridad de las tablas de compras y cobros.
--
-- 1) recepciones, recepciones_items y pagos NO tenían RLS: con la clave anónima pública del sitio se
--    podían leer, modificar y borrar compras, gastos y cobros de clientes (el linter de Supabase lo
--    marca como ERROR). Se activa RLS SIN políticas: queda abierto solo para el servidor (service_role)
--    y para los roles de BI (javier_ro, oscar_ro, dschtainer_rw tienen BYPASSRLS).
--    Verificado en el código que todo acceso de la app a estas tablas usa el cliente admin
--    (service_role); el único uso con sesión de usuario (pedidos/actions.ts, lectura de pagos para un
--    mensaje del log) se cambió a cliente admin en el mismo commit. Aplicar DESPUÉS de desplegar.
--
-- 2) proveedores y pagos_proveedores: Supabase da por defecto TRUNCATE/REFERENCES/TRIGGER a anon y
--    authenticated; con RLS no se leen filas, pero se quitan igual (mínimo privilegio).
--
-- NO toca otras tablas sin RLS (produccion, depositos, categorias_insumos, insumos_movimientos,
-- contenido_web): contenido_web alimenta el sitio público y necesita lectura anónima.

alter table public.recepciones        enable row level security;
alter table public.recepciones_items  enable row level security;
alter table public.pagos              enable row level security;

revoke all on table public.recepciones, public.recepciones_items, public.pagos from anon, authenticated;
revoke all on table public.proveedores, public.pagos_proveedores from anon, authenticated;

grant all on table public.recepciones, public.recepciones_items, public.pagos to service_role;

-- Verificación posterior (anon no debe ver nada; la app debe seguir funcionando):
--   select relname, relrowsecurity from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relname in ('recepciones','recepciones_items','pagos','proveedores','pagos_proveedores');
--   -- todas true
--   set role anon; select count(*) from public.pagos;  -- debe dar error de permiso o 0
--   reset role;
-- Probar en pantalla: cargar una recepción, registrar un cobro en la ficha de un cliente, abrir un
-- recibo, ver Deuda clientes y Proveedores.
