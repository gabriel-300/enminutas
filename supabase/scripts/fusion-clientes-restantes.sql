-- Fusión de los clientes duplicados restantes: Petri, Industria del Pollo, YPF Alonso,
-- Ju&Ma e Hijos y Angiru. (YPF Sartori ya se fusionó con fusion-ypf-sartori.sql.)
--
-- Un solo bloque = una sola transacción: si algo no coincide en CUALQUIER grupo, no cambia nada.
-- Por grupo: mueve pedidos, pagos, cuenta corriente y facturas al cliente principal, pasa las
-- sucursales a puntos de entrega (alias = nombre de la sucursal) y borra los logins duplicados.
-- Controles: mismo canal/vendedor/comisión/flete/descuento en todo el grupo; mismos totales de
-- pedidos, pagos y saldo antes y después; ningún pedido queda sin punto de entrega.

do $$
declare
  grupos jsonb := '[
    { "nombre": "Petri Panadería",
      "principal": "4a56a587-2e98-47bf-b009-7b3597e44bc4",
      "sucursales": [
        {"id": "4a56a587-2e98-47bf-b009-7b3597e44bc4", "alias": "Itaembé Guazú"},
        {"id": "fc158b95-8876-4cf1-9a52-06e3a1233114", "alias": "Suc. 213"},
        {"id": "20366bb8-be28-4cab-a954-ad218762221d", "alias": "Garupá"},
        {"id": "204ea363-5a9c-4eb7-b716-6d17c38128b2", "alias": "Fátima"},
        {"id": "7f66aec2-56f1-4d49-bb86-8448a2ffb6e6", "alias": "Chacabuco"} ] },
    { "nombre": "Industria del Pollo",
      "principal": "d76b78e2-0c04-4d0f-8edb-8eb046a5a399",
      "sucursales": [
        {"id": "d76b78e2-0c04-4d0f-8edb-8eb046a5a399", "alias": "Itaembé Guazú"},
        {"id": "0e90871b-c9b2-4728-86c2-d9c6542eb8ba", "alias": "Itaembé Mini"},
        {"id": "5e48b6a2-4a81-40d3-84ef-21c9f8aea091", "alias": "Lavalle"} ] },
    { "nombre": "YPF Alonso",
      "principal": "e1027a77-8b39-425a-8468-0f6d0d08db9c",
      "sucursales": [
        {"id": "e1027a77-8b39-425a-8468-0f6d0d08db9c", "alias": "LyP"},
        {"id": "aa253f49-32dc-402f-94fc-087ce46d2b92", "alias": "Cocomarola"} ] },
    { "nombre": "Ju&Ma e Hijos / Mundo Lácteo",
      "principal": "6c7e4290-b8f8-492a-8d4c-47b57cbd0271",
      "sucursales": [
        {"id": "6c7e4290-b8f8-492a-8d4c-47b57cbd0271", "alias": "Rotonda"},
        {"id": "dae3f448-227a-469e-93fb-86333aa68d12", "alias": "Itaembé Guazú"} ] },
    { "nombre": "Angiru",
      "principal": "060472d8-af81-4fb8-8c9f-07c41c691de6",
      "sucursales": [
        {"id": "060472d8-af81-4fb8-8c9f-07c41c691de6", "alias": "Parque"},
        {"id": "ad9443b8-cde7-4bb0-9b62-f0eef81b9989", "alias": "UNAM"} ] }
  ]'::jsonb;
  g jsonb;
  principal uuid;
  ids uuid[];
  sec uuid[];
  n_esperado int;
  n_ped_antes int; n_ped_desp int;
  cc_antes numeric; cc_desp numeric;
  pagos_antes int; pagos_desp int;
  condiciones int;
begin
  for g in select * from jsonb_array_elements(grupos) loop
    principal := (g->>'principal')::uuid;
    select array_agg((s->>'id')::uuid), count(*) into ids, n_esperado
      from jsonb_array_elements(g->'sucursales') s;
    sec := array_remove(ids, principal);

    if not (principal = any(ids)) then
      raise exception '[%] el principal no está en la lista', g->>'nombre';
    end if;
    if (select count(*) from profiles where id = any(ids) and b2b_status is not null) <> n_esperado then
      raise exception '[%] algún perfil no existe o ya no es cliente B2B', g->>'nombre';
    end if;

    -- mismas condiciones comerciales en todo el grupo
    select count(*) into condiciones from (
      select distinct canal_id, vendedor_id, comision_pct_override, flete_pct_override,
                      descuento_extra_pct, es_comercializadora
        from profiles where id = any(ids)) t;
    if condiciones <> 1 then
      raise exception '[%] los perfiles tienen condiciones comerciales distintas (%)', g->>'nombre', condiciones;
    end if;

    select count(*) into n_ped_antes from orders where customer_id = any(ids);
    select coalesce(sum(monto),0) into cc_antes from cc_movimientos where cliente_id = any(ids);
    select count(*) into pagos_antes from pagos where cliente_id = any(ids);

    -- alias de cada punto = nombre de la sucursal
    update direcciones_entrega d set alias = s->>'alias'
      from jsonb_array_elements(g->'sucursales') s
     where d.profile_id = (s->>'id')::uuid;

    -- cada pedido de un secundario queda apuntando a su punto de origen
    update orders o set direccion_entrega_id = d.id
      from direcciones_entrega d
     where o.customer_id = any(sec) and d.profile_id = o.customer_id and o.direccion_entrega_id is null;

    update orders           set customer_id = principal where customer_id = any(sec);
    update pagos            set cliente_id  = principal where cliente_id  = any(sec);
    update cc_movimientos   set cliente_id  = principal where cliente_id  = any(sec);
    update facturas         set cliente_id  = principal where cliente_id  = any(sec);
    update direcciones_entrega set profile_id = principal, es_principal = false where profile_id = any(sec);

    -- el principal queda con el nombre de la razón social y su propia sucursal como principal
    update profiles set full_name = g->>'nombre' where id = principal;
    update direcciones_entrega
       set es_principal = (id = (select d2.id from direcciones_entrega d2
                                  where d2.profile_id = principal
                                    and d2.alias = (select s->>'alias' from jsonb_array_elements(g->'sucursales') s
                                                     where (s->>'id')::uuid = principal)
                                  limit 1))
     where profile_id = principal;

    -- borrar los logins duplicados (el perfil se elimina en cascada)
    delete from auth.users where id = any(sec);

    select count(*) into n_ped_desp from orders where customer_id = principal;
    select coalesce(sum(monto),0) into cc_desp from cc_movimientos where cliente_id = principal;
    select count(*) into pagos_desp from pagos where cliente_id = principal;

    if n_ped_desp <> n_ped_antes or cc_desp <> cc_antes or pagos_desp <> pagos_antes then
      raise exception '[%] no coincide: pedidos % vs %, cc % vs %, pagos % vs %',
        g->>'nombre', n_ped_antes, n_ped_desp, cc_antes, cc_desp, pagos_antes, pagos_desp;
    end if;
    if exists (select 1 from orders where customer_id = principal and direccion_entrega_id is null) then
      raise exception '[%] quedaron pedidos sin punto de entrega', g->>'nombre';
    end if;
  end loop;
end $$;

-- Resultado esperado (pedidos / puntos):
--   Petri Panadería 26 / 5 · Industria del Pollo 3 / 3 · YPF Alonso 19 / 2
--   Ju&Ma e Hijos / Mundo Lácteo 7 / 2 · Angiru 67 / 2
select p.full_name,
       (select count(*) from orders where customer_id = p.id)             as pedidos,
       (select count(*) from direcciones_entrega where profile_id = p.id) as puntos,
       (select coalesce(sum(monto),0) from cc_movimientos where cliente_id = p.id) as saldo_cc
  from profiles p
 where p.id in ('4a56a587-2e98-47bf-b009-7b3597e44bc4','d76b78e2-0c04-4d0f-8edb-8eb046a5a399',
                'e1027a77-8b39-425a-8468-0f6d0d08db9c','6c7e4290-b8f8-492a-8d4c-47b57cbd0271',
                '060472d8-af81-4fb8-8c9f-07c41c691de6')
 order by p.full_name;
