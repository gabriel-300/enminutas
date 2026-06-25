-- ── FACTURACIÓN ───────────────────────────────────────────────────
-- Módulo interno de facturación.
-- Preparado para integración AFIP/ARCA: campos CAE y numero_afip
-- quedan vacíos hasta activar el WebService de facturación electrónica.

-- ── FACTURAS ──────────────────────────────────────────────────────
create table public.facturas (
  id                  uuid primary key default gen_random_uuid(),

  -- Identificación del comprobante
  tipo                text not null default 'A'
                      check (tipo in ('A','B','C','NC')),
  punto_venta         integer not null default 1,
  numero              integer,         -- asignado al emitir (auto-inc por tipo+pv)

  -- Datos del receptor (snapshot al emitir, independiente de cambios futuros)
  cliente_id          uuid references public.profiles(id) on delete set null,
  razon_social        text not null,
  cuit                text not null,
  condicion_iva       text not null default 'responsable_inscripto'
                      check (condicion_iva in (
                        'responsable_inscripto','monotributista',
                        'consumidor_final','exento'
                      )),
  domicilio_fiscal    text,

  -- Fechas
  fecha_emision       date,
  fecha_vencimiento   date,

  -- Pedidos asociados (referencias internas, texto libre)
  pedido_refs         text[],

  -- Totales (calculados server-side y almacenados para inmutabilidad)
  neto_gravado_21     numeric(14,2) not null default 0,
  neto_gravado_105    numeric(14,2) not null default 0,
  neto_no_gravado     numeric(14,2) not null default 0,
  iva_21              numeric(14,2) not null default 0,
  iva_105             numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,

  -- Condiciones comerciales
  condicion_pago      text not null default 'contado'
                      check (condicion_pago in ('contado','30_dias','60_dias','90_dias','cheque')),
  observaciones       text,

  -- Estado del comprobante
  estado              text not null default 'borrador'
                      check (estado in ('borrador','emitida','cobrada','anulada')),

  -- AFIP / ARCA — vacío hasta integración con WebService
  numero_afip         integer,
  cae                 text,
  cae_vencimiento     date,

  -- Auditoría
  created_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_at          timestamptz not null default now()
);

-- ── ÍTEMS DE FACTURA ──────────────────────────────────────────────
create table public.factura_items (
  id              uuid primary key default gen_random_uuid(),
  factura_id      uuid not null references public.facturas(id) on delete cascade,
  orden           integer not null default 1,

  descripcion     text not null,
  cantidad        numeric(10,3) not null check (cantidad > 0),
  unidad          text not null default 'u',
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0), -- sin IVA
  alicuota_iva    numeric(5,2) not null default 21
                  check (alicuota_iva in (0, 10.5, 21)),

  -- Calculados y guardados para que la factura sea inmutable
  subtotal        numeric(14,2) not null,  -- cantidad × precio_unitario
  iva_monto       numeric(14,2) not null,  -- subtotal × (alicuota/100)
  total           numeric(14,2) not null   -- subtotal + iva_monto
);

-- ── ÍNDICES ───────────────────────────────────────────────────────
create index idx_facturas_estado       on public.facturas(estado);
create index idx_facturas_fecha        on public.facturas(fecha_emision desc nulls last);
create index idx_facturas_cliente      on public.facturas(cliente_id);
create index idx_factura_items_factura on public.factura_items(factura_id, orden);

-- Unicidad: un número por tipo + punto de venta
create unique index idx_facturas_numero_unico
  on public.facturas(tipo, punto_venta, numero)
  where numero is not null;

-- ── TRIGGER updated_at ────────────────────────────────────────────
create trigger set_updated_at_facturas
  before update on public.facturas
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
alter table public.facturas      enable row level security;
alter table public.factura_items enable row level security;

create policy "admin_facturas_all"
  on public.facturas for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

create policy "admin_factura_items_all"
  on public.factura_items for all
  using  ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- service_role bypasses RLS (usado por createAdminClient)
grant all on public.facturas      to service_role;
grant all on public.factura_items to service_role;
