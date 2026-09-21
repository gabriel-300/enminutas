-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 006: Sistema de Roles de Staff
-- Correr en SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Actualizar custom_access_token_hook ────────────────────────────
-- Los roles de staff (admin, vendedor, produccion) están guardados en
-- auth.users.app_metadata. El hook ahora los preserva en lugar de
-- sobreescribirlos con el role de profiles.
-- ──────────────────────────────────────────────────────────────────────
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  claims          jsonb;
  profile_role    text;
  user_b2b_status text;
  existing_role   text;
  final_role      text;
begin
  -- Leer el profile del usuario
  select role::text, b2b_status
  into profile_role, user_b2b_status
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims        := event->'claims';
  existing_role := claims->'app_metadata'->>'role';

  -- Los roles de staff en app_metadata tienen prioridad
  -- Si ya tiene un rol de staff asignado, se preserva
  if existing_role in ('admin', 'vendedor', 'produccion') then
    final_role := existing_role;
  else
    final_role := coalesce(profile_role, 'customer_b2c');
  end if;

  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'role',       final_role,
      'b2b_status', user_b2b_status
    )
  );

  return jsonb_set(event, '{claims}', claims);
end; $$;

-- Permisos (idempotente)
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

-- ── 2. Verificación ───────────────────────────────────────────────────
-- Después de correr, verificar con un usuario admin:
-- select public.custom_access_token_hook(
--   jsonb_build_object(
--     'user_id', '<uuid-del-admin>',
--     'claims', jsonb_build_object('app_metadata', jsonb_build_object('role', 'admin'))
--   )
-- );
-- Debe devolver app_metadata con "role": "admin" (preservado)
