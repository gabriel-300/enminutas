-- Módulo de pagos a proveedores (cuenta corriente de compras).
--   * proveedores: maestro (nombre, CUIT, condición de pago en días).
--   * recepciones: se vincula a un proveedor, tiene vencimiento de pago y un flag genera_deuda.
--     Facturas Y remitos generan deuda (hay proveedores que no facturan). Si un remito se factura
--     después y se cargan ambos, se destilda genera_deuda en uno para no duplicar.
--   * pagos_proveedores: un pago por recepción imputada (recepcion_id null = pago a cuenta);
--     un pago repartido entre varias facturas comparte grupo_id (misma idea que pagos.grupo_id).
--   * proveedores_saldos(): saldo/vencido por proveedor en una sola consulta.
--
-- Las recepciones EXISTENTES quedan con genera_deuda = false: son compras históricas que se
-- asumen pagadas. Las que sigan impagas se tildan a mano desde la ficha del proveedor.
--
-- Seguridad: RLS activada y SIN políticas; solo el servidor (service_role) accede.

-- ───────────────────────── Tablas ─────────────────────────
create table if not exists public.proveedores (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  cuit                 text,
  condicion_pago_dias  integer not null default 0 check (condicion_pago_dias >= 0),
  contacto             text,
  telefono             text,
  email                text,
  notas                text,
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);

create unique index if not exists proveedores_nombre_uq on public.proveedores (lower(nombre));
create unique index if not exists proveedores_cuit_uq   on public.proveedores (cuit) where cuit is not null;

alter table public.recepciones
  add column if not exists proveedor_id           uuid references public.proveedores(id) on delete set null,
  add column if not exists fecha_vencimiento_pago date,
  add column if not exists genera_deuda           boolean not null default true;

-- Histórico: no genera deuda (ver encabezado). Corre una sola vez, antes de que existan pagos.
update public.recepciones set genera_deuda = false;

create index if not exists idx_recepciones_proveedor on public.recepciones (proveedor_id);

create table if not exists public.pagos_proveedores (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references public.proveedores(id) on delete restrict,
  recepcion_id  uuid references public.recepciones(id) on delete set null,
  monto         numeric(14,2) not null check (monto > 0),
  fecha         date not null default current_date,
  metodo        text not null default 'transferencia',
  referencia    text,
  notas         text,
  grupo_id      uuid,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_pagos_prov_proveedor on public.pagos_proveedores (proveedor_id, fecha desc);
create index if not exists idx_pagos_prov_recepcion on public.pagos_proveedores (recepcion_id);
create index if not exists idx_pagos_prov_grupo     on public.pagos_proveedores (grupo_id);

alter table public.proveedores        enable row level security;
alter table public.pagos_proveedores  enable row level security;

grant all on table public.proveedores       to service_role;
grant all on table public.pagos_proveedores to service_role;

-- ───────────────────── Unificación de proveedores existentes ─────────────────────
-- (Todo en un bloque DO: el SQL Editor de Supabase no conserva tablas temporales entre sentencias.)
-- Clave de comparación: minúsculas, sin acentos, sin signos ni espacios y sin sufijo societario
-- (srl/sas/sa). Si el nombre tiene CUIT, todos los nombres con ese mismo CUIT son un proveedor.
do $mig$
begin
create temp table _prov_src on commit drop as
select
  r.id                                                            as recepcion_id,
  trim(r.proveedor)                                               as nombre,
  nullif(regexp_replace(coalesce(r.proveedor_cuit, ''), '\D', '', 'g'), '') as cuit_dig,
  -- alias de typos que la regla no alcanza
  case regexp_replace(
         regexp_replace(translate(lower(r.proveedor), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'),
         '(srl|sas|sa)$', '')
    when 'hielobajocer0' then 'hielobajocero'
    when 'frutasexpres'  then 'frutaexpres'
    when 'frutaexpress'  then 'frutaexpres'
    else regexp_replace(
           regexp_replace(translate(lower(r.proveedor), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'),
           '(srl|sas|sa)$', '')
  end                                                             as norm
from public.recepciones r
where r.proveedor is not null and trim(r.proveedor) <> '';

-- norm → clave de grupo (por CUIT si algún registro de ese nombre lo tiene; si no, por nombre)
create temp table _prov_key on commit drop as
select norm,
       coalesce('c:' || min(cuit_dig), 'n:' || norm) as grupo
from _prov_src
group by norm;

-- grupo → nombre a mostrar (el más frecuente; empate: el más largo) y CUIT
create temp table _prov_final on commit drop as
select distinct on (k.grupo)
       k.grupo,
       s.nombre,
       (select min(s2.cuit_dig) from _prov_src s2 join _prov_key k2 on k2.norm = s2.norm where k2.grupo = k.grupo) as cuit_dig,
       gen_random_uuid() as id
from _prov_src s
join _prov_key k on k.norm = s.norm
group by k.grupo, s.nombre
order by k.grupo, count(*) desc, length(s.nombre) desc;

insert into public.proveedores (id, nombre, cuit)
select id,
       nombre,
       case when length(cuit_dig) = 11
            then substr(cuit_dig,1,2) || '-' || substr(cuit_dig,3,8) || '-' || substr(cuit_dig,11,1)
            else cuit_dig end
from _prov_final;

update public.recepciones r
set proveedor_id = f.id,
    proveedor    = f.nombre
from _prov_src s
join _prov_key k   on k.norm = s.norm
join _prov_final f on f.grupo = k.grupo
where r.id = s.recepcion_id;

-- Texto de proveedor en insumos y lotes: se pasa al nombre canónico cuando coincide con uno
-- (no se crean proveedores nuevos desde acá: hay valores genéricos como "Mayorista" o "Minutas").
update public.insumos i
set proveedor = p.nombre
from public.proveedores p
where i.proveedor is not null
  and regexp_replace(regexp_replace(translate(lower(i.proveedor), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'), '(srl|sas|sa)$', '')
    = regexp_replace(regexp_replace(translate(lower(p.nombre),    'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'), '(srl|sas|sa)$', '')
  and i.proveedor <> p.nombre;

update public.lotes l
set proveedor = p.nombre
from public.proveedores p
where l.proveedor is not null
  and regexp_replace(regexp_replace(translate(lower(l.proveedor), 'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'), '(srl|sas|sa)$', '')
    = regexp_replace(regexp_replace(translate(lower(p.nombre),    'áéíóúñü', 'aeiounu'), '[^a-z0-9]', '', 'g'), '(srl|sas|sa)$', '')
  and l.proveedor <> p.nombre;

end;
$mig$;

-- ───────────────────────── Saldos ─────────────────────────
create or replace function public.proveedores_saldos()
returns table (
  proveedor_id         uuid,
  nombre               text,
  cuit                 text,
  condicion_pago_dias  integer,
  comprado             numeric,
  pagado               numeric,
  saldo                numeric,
  vencido              numeric,
  proximo_vencimiento  date,
  ultimo_pago          date
)
language sql
stable
set search_path = public
as $$
  with hoy as (
    select (now() at time zone 'America/Argentina/Buenos_Aires')::date as d
  ),
  rec as (
    select r.proveedor_id,
           coalesce(r.total, 0) as total,
           coalesce(r.fecha_vencimiento_pago, r.fecha) as venc,
           greatest(coalesce(r.total, 0) - coalesce(
             (select sum(pp.monto) from public.pagos_proveedores pp where pp.recepcion_id = r.id), 0), 0) as pendiente
    from public.recepciones r
    where r.genera_deuda and r.proveedor_id is not null
  ),
  comp as (
    select proveedor_id,
           sum(total) as comprado,
           sum(pendiente) filter (where venc < (select d from hoy)) as pend_vencido,
           min(venc) filter (where pendiente > 0.01 and venc >= (select d from hoy)) as proximo
    from rec group by proveedor_id
  ),
  pag as (
    select proveedor_id, sum(monto) as pagado, max(fecha) as ult
    from public.pagos_proveedores group by proveedor_id
  )
  select p.id,
         p.nombre::text,
         p.cuit::text,
         p.condicion_pago_dias,
         coalesce(comp.comprado, 0),
         coalesce(pag.pagado, 0),
         coalesce(comp.comprado, 0) - coalesce(pag.pagado, 0),
         least(greatest(coalesce(comp.comprado, 0) - coalesce(pag.pagado, 0), 0), coalesce(comp.pend_vencido, 0)),
         comp.proximo,
         pag.ult
  from public.proveedores p
  left join comp on comp.proveedor_id = p.id
  left join pag  on pag.proveedor_id  = p.id
  where p.activo
  order by 7 desc, 2;
$$;

revoke all on function public.proveedores_saldos() from public, anon, authenticated;
grant execute on function public.proveedores_saldos() to service_role;

-- Verificación posterior:
--   select count(*) from public.proveedores;                                  -- sin duplicados evidentes
--   select count(*) from public.recepciones where proveedor_id is null;       -- esperado 0
--   select sum(saldo) from public.proveedores_saldos();                       -- esperado 0 (histórico sin deuda)
