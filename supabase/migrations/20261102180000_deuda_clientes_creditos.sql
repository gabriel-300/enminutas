-- deuda_clientes(): un pedido cobrado de más ya no pierde el exceso.
-- Antes: pendiente = greatest(total − cobrado, 0) por pedido, así que lo cobrado de más en un pedido
-- (por ejemplo, un pago anticipado y después una entrega parcial por menos) desaparecía y la deuda de
-- los demás pedidos del cliente quedaba inflada. La ficha del cliente sí lo compensa (facturado − pagado).
-- Ahora el saldo suma el neto de cada pedido con signo: el exceso de un pedido compensa la deuda de otro.
-- Vencido y cantidad de pedidos siguen contando solo lo que realmente falta cobrar.
--
-- Hoy no hay pedidos cobrados de más, así que los números no cambian; es una corrección preventiva.

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
         coalesce(deuda.neto, 0) - coalesce(cuenta.a_cuenta, 0),
         least(
           greatest(coalesce(deuda.neto, 0) - coalesce(cuenta.a_cuenta, 0), 0),
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

-- Verificación (debe dar lo mismo que antes mientras no haya pedidos cobrados de más):
--   select count(*), round(sum(saldo)), round(sum(vencido)) from public.deuda_clientes();
--   -- esperado al 2/11/2026: 23 filas, saldo ≈ 57.102.059, vencido ≈ 16.210.169
