-- Ajustes internos (DRI = débito interno, CRI = crédito interno): corrigen errores de carga en
-- cobros de clientes o pagos a proveedores sin borrar nada y sin tocar facturación ni libro de IVA.
-- Hoy un cobro mal cargado se borra y se recarga; un pago a cuenta borrado no deja ningún rastro
-- (caso Petri $6,0 M). A partir de ahora el registro con error queda intacto y un DRI/CRI lo
-- compensa, con motivo obligatorio y una aprobación separada de quien lo carga.
--
-- No reemplaza todavía el borrado de cobros/pagos (tarea pendiente aparte); solo agrega la
-- herramienta para no tener que volver a borrar algo para corregirlo.
create table if not exists public.ajustes_internos (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('debito', 'credito')),
  cliente_id   uuid references public.profiles(id) on delete restrict,
  proveedor_id uuid references public.proveedores(id) on delete restrict,
  referencia   text,
  monto        numeric(14,2) not null check (monto > 0),
  motivo       text not null check (length(trim(motivo)) > 0),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  creado_por   uuid not null references auth.users(id),
  aprobado_por uuid references auth.users(id),
  aprobado_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint ajustes_internos_destino_unico check ((cliente_id is not null) <> (proveedor_id is not null))
);

create index if not exists idx_ajustes_internos_cliente   on public.ajustes_internos (cliente_id)   where cliente_id is not null;
create index if not exists idx_ajustes_internos_proveedor on public.ajustes_internos (proveedor_id) where proveedor_id is not null;
create index if not exists idx_ajustes_internos_estado    on public.ajustes_internos (estado);

-- Mismo criterio de seguridad que recepciones/pagos/pagos_proveedores/ordenes_pago: RLS activa,
-- sin políticas, solo el cliente admin del servidor accede.
alter table public.ajustes_internos enable row level security;
grant all on table public.ajustes_internos to service_role;

-- deuda_clientes(): suma los ajustes internos aprobados de cada cliente (débito aumenta la deuda,
-- crédito la reduce). No afecta "vencido": un ajuste no tiene fecha de vencimiento propia.
create or replace function public.deuda_clientes()
returns table (
  cliente_id           uuid,
  nombre               text,
  cuit                 text,
  plazo_dias           integer,
  pedidos              integer,
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
  pp as (
    select p.order_id,
           sum(p.monto) as pagado,
           sum(p.monto) filter (where p.sin_factura) as neto_sf
    from public.pagos p
    where p.order_id is not null
    group by p.order_id
  ),
  ped as (
    select o.customer_id as cliente_id,
           (case when coalesce(pp.neto_sf, 0) > 0 then pp.neto_sf else o.total end)
             - coalesce(pp.pagado, 0) as neto,
           (coalesce(o.entregado_at, o.created_at) at time zone 'America/Argentina/Buenos_Aires')::date
             + coalesce(pr.plazo_pago_dias, 30) as venc
    from public.orders o
    join public.profiles pr on pr.id = o.customer_id
    left join pp on pp.order_id = o.id
    where o.channel = 'b2b_mayorista'
      and o.customer_id is not null
      and o.status in ('delivered', 'despachado', 'entrega_parcial')
  ),
  deuda as (
    select cliente_id,
           count(*) filter (where neto > 0.5)::int                                          as pedidos,
           sum(neto)                                                                        as neto,
           sum(neto) filter (where neto > 0 and venc < (select d from hoy))                 as pend_vencido,
           min(venc) filter (where neto > 0.5 and venc >= (select d from hoy))              as proximo
    from ped
    group by cliente_id
  ),
  cuenta as (
    select p.cliente_id, sum(p.monto) as a_cuenta
    from public.pagos p
    where p.order_id is null
    group by p.cliente_id
  ),
  ajustes as (
    select a.cliente_id,
           sum(case when a.tipo = 'debito' then a.monto else -a.monto end) as neto
    from public.ajustes_internos a
    where a.estado = 'aprobado' and a.cliente_id is not null
    group by a.cliente_id
  ),
  ult as (
    select p.cliente_id, max(p.fecha) as ult
    from public.pagos p
    group by p.cliente_id
  ),
  ids as (
    select d.cliente_id from deuda d
    union
    select c.cliente_id from cuenta c
    union
    select a.cliente_id from ajustes a
  )
  select ids.cliente_id,
         coalesce(b.business_name, pr.full_name)::text,
         coalesce(b.cuit, pr.document_number)::text,
         coalesce(pr.plazo_pago_dias, 30),
         coalesce(deuda.pedidos, 0),
         coalesce(deuda.neto, 0) - coalesce(cuenta.a_cuenta, 0) + coalesce(ajustes.neto, 0),
         least(
           greatest(coalesce(deuda.neto, 0) - coalesce(cuenta.a_cuenta, 0) + coalesce(ajustes.neto, 0), 0),
           coalesce(deuda.pend_vencido, 0)),
         deuda.proximo,
         ult.ult
  from ids
  left join deuda   on deuda.cliente_id   = ids.cliente_id
  left join cuenta  on cuenta.cliente_id  = ids.cliente_id
  left join ajustes on ajustes.cliente_id = ids.cliente_id
  left join ult     on ult.cliente_id     = ids.cliente_id
  left join public.profiles pr     on pr.id = ids.cliente_id
  left join public.b2b_accounts b  on b.profile_id = ids.cliente_id
  order by 6 desc, 2;
$$;

revoke all on function public.deuda_clientes() from public, anon, authenticated;
grant execute on function public.deuda_clientes() to service_role;

-- proveedores_saldos(): mismo criterio, del lado de proveedores (débito aumenta lo que les debemos).
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
  ),
  ajustes as (
    select a.proveedor_id,
           sum(case when a.tipo = 'debito' then a.monto else -a.monto end) as neto
    from public.ajustes_internos a
    where a.estado = 'aprobado' and a.proveedor_id is not null
    group by a.proveedor_id
  )
  select p.id,
         p.nombre::text,
         p.cuit::text,
         p.condicion_pago_dias,
         coalesce(comp.comprado, 0),
         coalesce(pag.pagado, 0),
         coalesce(comp.comprado, 0) - coalesce(pag.pagado, 0) + coalesce(ajustes.neto, 0),
         least(greatest(coalesce(comp.comprado, 0) - coalesce(pag.pagado, 0) + coalesce(ajustes.neto, 0), 0), coalesce(comp.pend_vencido, 0)),
         comp.proximo,
         pag.ult
  from public.proveedores p
  left join comp    on comp.proveedor_id    = p.id
  left join pag     on pag.proveedor_id     = p.id
  left join ajustes on ajustes.proveedor_id = p.id
  where p.activo
  order by 7 desc, 2;
$$;

revoke all on function public.proveedores_saldos() from public, anon, authenticated;
grant execute on function public.proveedores_saldos() to service_role;
