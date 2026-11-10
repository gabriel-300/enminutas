-- Packaging en recetas: un insumo puede marcarse como packaging "por bolsa" o "por caja".
-- Al sincronizar el costo de una receta, esos insumos NO suman a products.costo (que lleva margen):
-- van a products.pkg_unitario (por bolsa) y products.pkg_bulto (por caja), que se suman sin margen.
-- NULL = insumo normal (materia prima), se comporta como siempre.
ALTER TABLE public.insumos
  ADD COLUMN IF NOT EXISTS packaging_uso text
  CHECK (packaging_uso IN ('bolsa', 'caja'));

-- Valores iniciales para la categoría papelera. Bandejas y el resto quedan en NULL (como hoy).
UPDATE public.insumos SET packaging_uso = 'bolsa'
 WHERE categoria = 'papelera' AND packaging_uso IS NULL AND nombre ILIKE 'Bolsa%';
UPDATE public.insumos SET packaging_uso = 'caja'
 WHERE categoria = 'papelera' AND packaging_uso IS NULL
   AND (nombre ILIKE 'Caja%' OR nombre ILIKE 'Cinta%' OR nombre ILIKE 'Etiqueta%');
