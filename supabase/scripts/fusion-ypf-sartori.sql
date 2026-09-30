-- Fusión de los 8 perfiles YPF (CUIT 30543294760) en un solo cliente "YPF Sartori",
-- con 8 puntos de entrega. Una sola transacción: si algo no coincide, aborta y no cambia nada.
-- Verificado antes de escribirlo: los 8 logins son @enminutas.temp y nunca iniciaron sesión;
-- no hay precios especiales, plantillas, cheques, devoluciones ni pagos de comisión en el grupo.

do $$
declare
  principal uuid := '8f86b6c4-a769-4277-9db4-0bac14a0abb5'; -- YPF Jauretche (más pedidos)
  ids uuid[];
  sec uuid[];
  n_ped_antes int; n_ped_desp int;
  cc_antes numeric; cc_desp numeric;
  pagos_antes int; pagos_desp int;
begin
  select array_agg(id) into ids from profiles
   where regexp_replace(coalesce(document_number,''),'\D','','g') = '30543294760'
     and b2b_status is not null;
  if array_length(ids,1) <> 8 or not (principal = any(ids)) then
    raise exception 'grupo inesperado: % perfiles', array_length(ids,1);
  end if;
  sec := array_remove(ids, principal);

  select count(*) into n_ped_antes from orders where customer_id = any(ids);
  select coalesce(sum(monto),0) into cc_antes from cc_movimientos where cliente_id = any(ids);
  select count(*) into pagos_antes from pagos where cliente_id = any(ids);

  -- alias de cada punto = nombre de la sucursal (perfil de origen)
  update direcciones_entrega d set alias = p.full_name
    from profiles p where d.profile_id = p.id and p.id = any(ids);

  -- cada pedido de un secundario queda apuntando a su punto de origen
  update orders o set direccion_entrega_id = d.id
    from direcciones_entrega d
   where o.customer_id = any(sec) and d.profile_id = o.customer_id and o.direccion_entrega_id is null;

  update orders           set customer_id = principal where customer_id = any(sec);
  update pagos            set cliente_id  = principal where cliente_id  = any(sec);
  update cc_movimientos   set cliente_id  = principal where cliente_id  = any(sec);
  update facturas         set cliente_id  = principal where cliente_id  = any(sec);
  update direcciones_entrega set profile_id = principal, es_principal = false where profile_id = any(sec);

  update profiles set full_name = 'YPF Sartori' where id = principal;
  update direcciones_entrega
     set es_principal = (alias = 'YPF Jauretche')
   where profile_id = principal;

  -- borrar los logins duplicados (el perfil se elimina en cascada)
  delete from auth.users where id = any(sec);

  select count(*) into n_ped_desp from orders where customer_id = principal;
  select coalesce(sum(monto),0) into cc_desp from cc_movimientos where cliente_id = principal;
  select count(*) into pagos_desp from pagos where cliente_id = principal;

  if n_ped_desp <> n_ped_antes or cc_desp <> cc_antes or pagos_desp <> pagos_antes then
    raise exception 'no coincide: pedidos % vs %, cc % vs %, pagos % vs %',
      n_ped_antes, n_ped_desp, cc_antes, cc_desp, pagos_antes, pagos_desp;
  end if;
  if exists (select 1 from orders where customer_id = principal and direccion_entrega_id is null) then
    raise exception 'quedaron pedidos sin punto de entrega';
  end if;
end $$;

-- Resultado esperado: 1 cliente, 45 pedidos, 8 puntos
select p.full_name,
       (select count(*) from orders where customer_id = p.id)             as pedidos,
       (select count(*) from direcciones_entrega where profile_id = p.id) as puntos,
       (select coalesce(sum(monto),0) from cc_movimientos where cliente_id = p.id) as saldo_cc
  from profiles p where p.id = '8f86b6c4-a769-4277-9db4-0bac14a0abb5';
