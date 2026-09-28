-- El formulario de productos permite elegir "Venta directa" como categoría de
-- precio (commit 0bc50aa) pero el constraint nunca se actualizó, causando que
-- el guardado falle con "violates check constraint products_categoria_check".
alter table products drop constraint products_categoria_check;
alter table products add constraint products_categoria_check
  check (categoria = any (array['Estándar', 'Premium', 'Venta directa']));
