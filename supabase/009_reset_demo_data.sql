-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Limpiar datos demo de lytwyn.gabriel@gmail.com
-- Correr en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  v_client_id uuid;
begin
  select id into v_client_id
  from auth.users
  where email = 'lytwyn.gabriel@gmail.com';

  if v_client_id is null then
    raise notice 'Usuario no encontrado — nada que borrar';
    return;
  end if;

  -- Borrar líneas de pedido del cliente
  delete from public.order_lines
  where order_id in (
    select id from public.orders where customer_id = v_client_id
  );

  -- Borrar pedidos del cliente
  delete from public.orders where customer_id = v_client_id;

  -- Borrar perfil (si existe)
  delete from public.profiles where id = v_client_id;

  raise notice 'OK — datos demo eliminados para %', v_client_id;
end; $$;
