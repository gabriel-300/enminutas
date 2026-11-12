-- Vincular un remito con la factura que lo incluye.
-- Un remito que genera deuda y después se factura contaba dos veces. Al vincularlo, la deuda pasa a la factura
-- y el remito deja de generarla (genera_deuda = false). Una factura puede incluir varios remitos.
alter table public.recepciones
  add column if not exists factura_id uuid references public.recepciones(id) on delete set null;

create index if not exists idx_recepciones_factura on public.recepciones(factura_id) where factura_id is not null;

comment on column public.recepciones.factura_id is
  'Solo en remitos: factura que lo incluye. Un remito vinculado no genera deuda (la deuda es la de la factura).';
