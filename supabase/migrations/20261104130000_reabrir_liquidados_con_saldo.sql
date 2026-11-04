-- Pedido de Javier (2026-11-04), Cobranzas: pedidos "liquidados" sin el cobro completo cargado.
-- Su deuda no aparece en ninguna pantalla. Este script los devuelve a "entregado" (o "entrega parcial"
-- si tuvieron faltante) para que la deuda reaparezca en Deuda clientes. NO borra cobros ni pedidos.
--
-- ⚠ DECISIÓN DE NEGOCIO ANTES DE CORRER: algunos de estos pedidos pueden ser deuda ya perdonada o
--   cobrada por fuera. Revisar la lista del paso 1 con Javier/Alex y excluir los que correspondan
--   (agregando "and o.id not in (...)" en el paso 2).
--
-- El criterio es el mismo que el código (src/lib/cobranza.ts): un cobro marcado "sin factura" se
-- compara contra total / 1.21; el resto contra el total. Tolerancia: $1.

-- PASO 1 — Ver qué se reabriría (solo lectura) -----------------------------------------------------
with cobros as (
  select order_id, sum(monto) as cobrado, bool_or(sin_factura) as sf
  from public.pagos where order_id is not null group by order_id
)
select o.order_number, o.status, o.total,
       coalesce(c.cobrado, 0) as cobrado,
       round(case when c.sf then o.total / 1.21 else o.total end - coalesce(c.cobrado, 0), 2) as saldo
from public.orders o
left join cobros c on c.order_id = o.id
where o.status = 'liquidado'
  and (case when c.sf then o.total / 1.21 else o.total end) - coalesce(c.cobrado, 0) > 1
order by o.order_number;

-- PASO 2 — Reabrir (correr recién después de revisar el paso 1) ------------------------------------
-- begin;
-- with cobros as (
--   select order_id, sum(monto) as cobrado, bool_or(sin_factura) as sf
--   from public.pagos where order_id is not null group by order_id
-- ), a_reabrir as (
--   select o.id,
--          case when o.delivered_snapshot is not null then 'entrega_parcial' else 'delivered' end as nuevo
--   from public.orders o
--   left join cobros c on c.order_id = o.id
--   where o.status = 'liquidado'
--     and (case when c.sf then o.total / 1.21 else o.total end) - coalesce(c.cobrado, 0) > 1
-- ), ev as (
--   insert into public.order_events (order_id, status, message)
--   select id, nuevo::text, 'Reabierto por cobranza: estaba liquidado con saldo sin cobrar (2026-11-04)' from a_reabrir
--   returning order_id
-- )
-- update public.orders o
-- set status = a.nuevo::public.order_status, payment_confirmed_at = null
-- from a_reabrir a where a.id = o.id;
-- commit;
