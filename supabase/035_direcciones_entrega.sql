-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Múltiples direcciones de entrega por cliente B2B
-- Reemplaza los campos direccion_* y zona_id en profiles
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabla direcciones_entrega ──────────────────────────────────────
create table if not exists public.direcciones_entrega (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  alias       text not null default 'Principal',
  calle       text,
  numero      text,
  piso        text,
  ciudad      text,
  zona_id     uuid references public.delivery_zones(id),
  es_principal boolean not null default false,
  activo      boolean not null default true,
  created_at  timestamptz default now()
);

-- ── 2. Migrar direcciones existentes de profiles ──────────────────────
insert into public.direcciones_entrega
  (profile_id, alias, calle, numero, piso, ciudad, zona_id, es_principal)
select
  p.id,
  'Principal',
  p.direccion_calle,
  p.direccion_numero,
  p.direccion_piso,
  p.direccion_ciudad,
  p.zona_id,
  true
from public.profiles p
where p.role = 'customer_b2b'
  and (
    p.direccion_calle is not null
    or p.zona_id      is not null
  );

-- ── 3. Permisos ────────────────────────────────────────────────────────
grant all on public.direcciones_entrega to anon, authenticated, service_role;

-- ── 4. RLS ─────────────────────────────────────────────────────────────
alter table public.direcciones_entrega enable row level security;

-- El cliente ve sus propias direcciones
create policy "direcciones: cliente ve las suyas" on public.direcciones_entrega
  for select using (profile_id = auth.uid());

-- Service role accede a todo (admin/vendedor usan service role client)
create policy "direcciones: service_role full" on public.direcciones_entrega
  for all using (auth.role() = 'service_role');

-- ── 5. Verificación ────────────────────────────────────────────────────
select p.full_name, d.alias, d.ciudad, dz.name as zona
from public.direcciones_entrega d
join public.profiles p on p.id = d.profile_id
left join public.delivery_zones dz on dz.id = d.zona_id
order by p.full_name, d.es_principal desc;
