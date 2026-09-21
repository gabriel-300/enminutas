-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Fix Auth Hook: preservar roles de staff en app_metadata
-- El hook anterior sobreescribía app_metadata.role con profiles.role
-- para TODOS los usuarios, haciendo que los roles de staff (admin,
-- vendedor, produccion, distribucion) aparezcan como customer_b2c en el JWT.
-- Esta versión preserva el rol existente si ya es un rol de staff válido.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims         jsonb;
  user_role      text;
  existing_role  text;
begin
  -- Si el usuario ya tiene un rol de staff en app_metadata, preservarlo
  existing_role := event->'claims'->'app_metadata'->>'role';
  if existing_role in ('admin', 'vendedor', 'produccion', 'distribucion', 'repartidor') then
    return event;
  end if;

  -- Para clientes B2C/B2B: leer el rol desde profiles
  select role::text
  into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(
    claims,
    '{app_metadata, role}',
    to_jsonb(coalesce(user_role, 'customer_b2c'))
  );

  return jsonb_set(event, '{claims}', claims);
end; $$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
