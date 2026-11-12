-- Aclara qué campo vale en las compras: percepciones es el dato; otros_impuestos es una copia
-- (registrarRecepcion guarda el mismo importe en ambos). Sumarlos cuenta el impuesto dos veces.
comment on column public.recepciones.percepciones is
  'Percepciones del comprobante. Es el campo que vale: neto + iva + percepciones = total.';
comment on column public.recepciones.otros_impuestos is
  'COPIA de percepciones (mismo importe). No sumar con percepciones: se contaría dos veces.';
