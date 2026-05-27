-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 003: Trigger B2B + Hook con b2b_status
-- Correr en SQL Editor de Supabase DESPUÉS de 002_b2b_schema.sql
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Trigger: handle_new_user ───────────────────────────────────────
-- Ahora lee canal y zona_id del metadata, asigna role y b2b_status
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_canal    text;
  v_zona_id  uuid;
begin
  v_canal   := new.raw_user_meta_data->>'canal';
  v_zona_id := nullif(new.raw_user_meta_data->>'zona_id', '')::uuid;

  insert into public.profiles (id, full_name, phone, role, canal, zona_id, b2b_status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    case
      when v_canal is not null then 'customer_b2b'::public.user_role
      else 'customer_b2c'::public.user_role
    end,
    v_canal::public.client_canal,
    v_zona_id,
    case when v_canal is not null then 'pendiente' else null end
  );

  return new;
end; $$;

-- ── 2. Auth hook: agrega b2b_status al JWT ───────────────────────────
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  claims          jsonb;
  user_role       text;
  user_b2b_status text;
begin
  select role::text, b2b_status
  into user_role, user_b2b_status
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'role',       coalesce(user_role, 'customer_b2c'),
      'b2b_status', user_b2b_status
    )
  );

  return jsonb_set(event, '{claims}', claims);
end; $$;

-- Permisos (idempotente)
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

-- ── Verificación ──────────────────────────────────────────────────────
-- Después de correr, probar con un usuario existente:
-- select public.custom_access_token_hook(
--   jsonb_build_object('user_id', '<uuid-del-admin>', 'claims', '{}'::jsonb)
-- );
-- Debe devolver app_metadata con "role" y "b2b_status"
