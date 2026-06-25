-- Firma digital en remito
alter table public.orders
  add column if not exists firma_data        text,           -- base64 PNG de la firma
  add column if not exists firma_fecha       timestamptz,
  add column if not exists firma_aclaracion  text;           -- nombre aclaratorio del firmante
