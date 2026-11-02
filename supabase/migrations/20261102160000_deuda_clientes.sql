-- Deuda de clientes por pedido (reemplaza el saldo de cuenta corriente basado en cc_movimientos,
-- que solo tenía cargos de una parte de los pedidos y restaba todos los pagos).
--
-- Criterio (igual al de la ficha del cliente):
--   * Pedidos del canal b2b_mayorista en estado delivered / despachado / entrega_parcial
--     (liquidado y cancelled no deben nada; aprobado todavía no se entregó).
--   * Pendiente por pedido = total − pagos imputados al pedido. Si el pedido se cobró "sin factura"
--     (neto s/IVA) vale lo cobrado: la diferencia del IVA se perdona, no queda como deuda.
--   * Saldo del cliente = Σ pendientes − pagos a cuenta (sin pedido). Negativo = saldo a favor.
--   * Vence = fecha de entrega (o de creación si no hay) + plazo de pago del cliente (30 días por defecto).
--
-- Solo lectura. Solo service_role la llama.

alter table public.profiles
  add column if not exists plazo_pago_dias integer;

alter table public.profiles drop constraint if exists profiles_plazo_pago_dias_check;
alter table public.profiles
  add constraint profiles_plazo_pago_dias_check check (plazo_pago_dias is null or plazo_pago_dias >= 0);

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
           greatest(
             case when coalesce(pp.neto_sf, 0) > 0 then pp.neto_sf else o.total end
             - coalesce(pp.pagado, 0), 0) as pendiente,
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
           count(*) filter (where pendiente > 0.5)::int                              as pedidos,
           sum(pendiente)                                                            as pendiente,
           sum(pendiente) filter (where venc < (select d from hoy))                  as pend_vencido,
           min(venc) filter (where pendiente > 0.5 and venc >= (select d from hoy))  as proximo
    from ped
    group by cliente_id
  ),
  cuenta as (
    select p.cliente_id, sum(p.monto) as a_cuenta
    from public.pagos p
    where p.order_id is null
    group by p.cliente_id
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
  )
  select ids.cliente_id,
         coalesce(b.business_name, pr.full_name)::text,
         coalesce(b.cuit, pr.document_number)::text,
         coalesce(pr.plazo_pago_dias, 30),
         coalesce(deuda.pedidos, 0),
         coalesce(deuda.pendiente, 0) - coalesce(cuenta.a_cuenta, 0),
         least(
           greatest(coalesce(deuda.pendiente, 0) - coalesce(cuenta.a_cuenta, 0), 0),
           coalesce(deuda.pend_vencido, 0)),
         deuda.proximo,
         ult.ult
  from ids
  left join deuda  on deuda.cliente_id  = ids.cliente_id
  left join cuenta on cuenta.cliente_id = ids.cliente_id
  left join ult    on ult.cliente_id    = ids.cliente_id
  left join public.profiles pr     on pr.id = ids.cliente_id
  left join public.b2b_accounts b  on b.profile_id = ids.cliente_id
  order by 6 desc, 2;
$$;

revoke all on function public.deuda_clientes() from public, anon, authenticated;
grant execute on function public.deuda_clientes() to service_role;

-- Verificación posterior (esperado al 2/11/2026 con plazo 30: saldo ≈ 57,1 M, vencido ≈ 16,5 M):
--   select count(*), round(sum(saldo)), round(sum(vencido)) from public.deuda_clientes();
