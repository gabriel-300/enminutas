-- Tarea 86 bitácora 25/11: de 123 compras, solo 1 tenía categoría de gasto (el único comprobante
-- tipo 'gasto'), porque facturas y remitos de materia prima nunca pedían categorizarse. Sin eso no
-- se puede separar materia prima / gastos de fábrica / estructura para Módulo 1 (costeo) y Módulo 6
-- (exportes al contador). categoria_gasto sigue existiendo para el detalle (luz, agua, alquiler...)
-- de los gastos; grupo_gasto es el agrupador de alto nivel, obligatorio para toda compra.
alter table public.recepciones
  add column if not exists grupo_gasto text;

-- Backfill: factura/remito son siempre compra de insumos (materia prima, por construcción de
-- registrarRecepcion). El único 'gasto' existente (categoria "otros") se backfillea a "estructura"
-- como default razonable; se puede recategorizar a mano si corresponde a fábrica.
update public.recepciones set grupo_gasto = 'materia_prima' where tipo in ('factura', 'remito') and grupo_gasto is null;
update public.recepciones set grupo_gasto = 'estructura'    where tipo = 'gasto'                 and grupo_gasto is null;

alter table public.recepciones
  add constraint recepciones_grupo_gasto_check
  check (grupo_gasto in ('materia_prima', 'gastos_fabrica', 'estructura'));

alter table public.recepciones
  alter column grupo_gasto set not null;
