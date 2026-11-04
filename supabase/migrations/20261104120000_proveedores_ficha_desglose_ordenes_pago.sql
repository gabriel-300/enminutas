-- Pedido de Javier (2026-11-04), bloque Proveedores:
--  1) Ficha del proveedor: condición de IVA, CBU y alias (para el pago masivo por Macro).
--  2) Comprobantes de compra: neto, IVA y percepciones por separado.
--  3) Orden de pago con aprobación previa: borrador → aprobada → pagada.
--
-- Solo agrega columnas y una tabla nueva. No borra ni pisa datos existentes.
-- Aplicar ANTES de desplegar el código que las usa.

-- 1) Ficha del proveedor ---------------------------------------------------------------------------
alter table public.proveedores
  add column if not exists condicion_iva text,
  add column if not exists cbu           text,
  add column if not exists alias_bancario text;

alter table public.proveedores drop constraint if exists proveedores_condicion_iva_check;
alter table public.proveedores
  add constraint proveedores_condicion_iva_check
  check (condicion_iva is null or condicion_iva in
    ('responsable_inscripto', 'monotributo', 'exento', 'consumidor_final', 'no_responsable'));

alter table public.proveedores drop constraint if exists proveedores_cbu_check;
alter table public.proveedores
  add constraint proveedores_cbu_check check (cbu is null or cbu ~ '^[0-9]{22}$');

-- 2) Desglose del comprobante ----------------------------------------------------------------------
-- null = no se conoce el desglose (gastos y comprobantes viejos sin ítems).
alter table public.recepciones
  add column if not exists neto         numeric(14,2),
  add column if not exists iva          numeric(14,2),
  add column if not exists percepciones numeric(14,2);

-- Facturas y remitos con ítems: neto e IVA salen de los ítems; las percepciones son lo que
-- hasta ahora se guardaba en otros_impuestos.
update public.recepciones r
set neto         = s.neto,
    iva          = s.iva,
    percepciones = coalesce(r.otros_impuestos, 0)
from (
  select recepcion_id,
         round(sum(cantidad * precio_unitario)::numeric, 2)                          as neto,
         round(sum(cantidad * precio_unitario * coalesce(iva_pct, 0) / 100)::numeric, 2) as iva
  from public.recepciones_items
  group by recepcion_id
) s
where s.recepcion_id = r.id
  and r.tipo in ('factura', 'remito')
  and r.neto is null;

-- 3) Órdenes de pago -------------------------------------------------------------------------------
-- Una orden es un pago a un proveedor que todavía no se hizo. Recién al pasar a "pagada" se insertan
-- las filas en pagos_proveedores (con grupo_id = id de la orden), que son las que bajan la deuda.
create table if not exists public.ordenes_pago (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references public.proveedores(id),
  monto         numeric(14,2) not null check (monto > 0),
  fecha         date not null,
  metodo        text not null default 'transferencia',
  referencia    text,
  notas         text,
  recepcion_ids jsonb not null default '[]'::jsonb,
  estado        text not null default 'borrador' check (estado in ('borrador', 'aprobada', 'pagada')),
  creado_por    uuid,
  creado_at     timestamptz not null default now(),
  aprobado_por  uuid,
  aprobado_at   timestamptz,
  pagado_por    uuid,
  pagado_at     timestamptz
);

create index if not exists ordenes_pago_proveedor_idx on public.ordenes_pago (proveedor_id, estado);

alter table public.ordenes_pago enable row level security;   -- sin políticas: solo service_role y roles BI
revoke all on table public.ordenes_pago from anon, authenticated;
grant all on table public.ordenes_pago to service_role;

-- Verificación posterior:
--   select column_name from information_schema.columns
--   where table_name = 'proveedores' and column_name in ('condicion_iva','cbu','alias_bancario');   -- 3 filas
--   select count(*) filter (where neto is not null) con_desglose, count(*) from recepciones;
--   select relname, relrowsecurity from pg_class where relname = 'ordenes_pago';                    -- true
