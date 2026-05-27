-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Auth Hook: Custom Access Token
-- Inyecta el rol en app_metadata del JWT para usarlo en RLS sin JOIN.
-- Activar en: Dashboard → Authentication → Hooks → Custom Access Token
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims    jsonb;
  user_role text;
begin
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

-- Permisos para que Supabase Auth pueda ejecutar el hook
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
