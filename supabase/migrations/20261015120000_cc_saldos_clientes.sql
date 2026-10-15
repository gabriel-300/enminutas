-- Saldo de cuenta corriente por cliente, en una sola consulta.
--   saldo = Σ cc_movimientos.monto − Σ pagos.monto
-- (en cc_movimientos los pagos/notas de crédito ya van con monto negativo; la tabla `pagos`
-- es el circuito de cobros de clientes-b2b y no se refleja en cc_movimientos).
-- Solo lectura. El límite viene de b2b_accounts si existe; si no, NULL.
-- Lista a todo cliente con al menos un movimiento o un pago.

create or replace function public.cc_saldos_clientes()
returns table (
  cliente_id        uuid,
  nombre            text,
  cuit              text,
  saldo             numeric,
  credit_limit      numeric,
  ultimo_movimiento date
)
language sql
stable
set search_path = public
as $$
  with mov as (
    select m.cliente_id, sum(m.monto) as total, max(m.fecha) as ult
    from public.cc_movimientos m
    group by m.cliente_id
  ),
  pag as (
    select p.cliente_id, sum(p.monto) as total, max(p.fecha) as ult
    from public.pagos p
    group by p.cliente_id
  ),
  ids as (
    select mov.cliente_id from mov
    union
    select pag.cliente_id from pag
  )
  select
    ids.cliente_id,
    coalesce(b.business_name, pr.full_name)::text            as nombre,
    coalesce(b.cuit, pr.document_number)::text               as cuit,
    coalesce(mov.total, 0) - coalesce(pag.total, 0)          as saldo,
    b.credit_limit::numeric                                  as credit_limit,
    greatest(mov.ult, pag.ult)                               as ultimo_movimiento
  from ids
  left join mov on mov.cliente_id = ids.cliente_id
  left join pag on pag.cliente_id = ids.cliente_id
  left join public.profiles pr on pr.id = ids.cliente_id
  left join public.b2b_accounts b on b.profile_id = ids.cliente_id
  order by 4 desc, 2;
$$;

-- Solo el servidor (service_role) la llama; no exponer saldos a anon/authenticated.
revoke all on function public.cc_saldos_clientes() from public, anon, authenticated;
grant execute on function public.cc_saldos_clientes() to service_role;

-- Verificación (esperado al 15/10/2026: total 34.186.481,35):
--   select sum(saldo) from public.cc_saldos_clientes();
