-- Funciones SECURITY DEFINER que cualquiera podía ejecutar por la API pública (/rest/v1/rpc/...).
--
-- Hasta ahora anon y authenticated (y todo PUBLIC) podían llamar, sin pasar por la app, a funciones
-- que modifican el stock (consume/reintegrar/increment/decrement), a la que descuenta insumos de
-- producción, a la de notificaciones (n8n) y a las de importación de saldos de cuenta corriente.
--
-- Verificado: la app las llama solo con el cliente admin (service_role): pedidos/actions.ts
-- (consume_lote_stock, reintegrar_lote_stock) y cocina/actions.ts (increment_stock). Las funciones de
-- trigger (log_order_event, notify_n8n, deducir_insumos_produccion, handle_new_user) no necesitan
-- permiso de ejecución para dispararse: PostgreSQL solo lo exige al crear el trigger.
--
-- Efecto lateral buscado: los roles de BI (javier_ro, oscar_ro, dschtainer_rw) dejan de poder
-- ejecutarlas (lo recibían por PUBLIC). Siguen pudiendo leer y escribir tablas como antes.
-- Si algún flujo externo (n8n, scripts) llamaba a estas funciones con la clave anónima, dejará de
-- funcionar: debe usar la clave de servicio.

revoke execute on function public.consume_lote_stock(uuid, numeric)            from public, anon, authenticated;
revoke execute on function public.reintegrar_lote_stock(uuid, numeric)         from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid, integer)               from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid, numeric)               from public, anon, authenticated;
revoke execute on function public.increment_stock(uuid, integer)               from public, anon, authenticated;
revoke execute on function public.increment_stock(uuid, numeric)               from public, anon, authenticated;
revoke execute on function public.deducir_insumos_produccion()                 from public, anon, authenticated;
revoke execute on function public.notify_n8n()                                 from public, anon, authenticated;
revoke execute on function public.log_order_event()                            from public, anon, authenticated;
revoke execute on function public.handle_new_user()                            from public, anon, authenticated;
revoke execute on function public.cc_importar_saldos(date, jsonb, text, boolean) from public, anon, authenticated;
revoke execute on function public.cc_revertir_lote(uuid)                       from public, anon, authenticated;

grant execute on function public.consume_lote_stock(uuid, numeric)            to service_role;
grant execute on function public.reintegrar_lote_stock(uuid, numeric)         to service_role;
grant execute on function public.decrement_stock(uuid, integer)               to service_role;
grant execute on function public.decrement_stock(uuid, numeric)               to service_role;
grant execute on function public.increment_stock(uuid, integer)               to service_role;
grant execute on function public.increment_stock(uuid, numeric)               to service_role;
grant execute on function public.cc_importar_saldos(date, jsonb, text, boolean) to service_role;
grant execute on function public.cc_revertir_lote(uuid)                       to service_role;

-- Verificación posterior (todo false para anon y authenticated, true para service_role en las que se llaman):
--   select p.oid::regprocedure, has_function_privilege('anon', p.oid, 'execute') anon,
--          has_function_privilege('authenticated', p.oid, 'execute') auth,
--          has_function_privilege('service_role', p.oid, 'execute') svc
--   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef order by 1;
-- Probar en pantalla: despachar un pedido, confirmar una entrega parcial y cargar una producción.
