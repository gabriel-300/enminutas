-- Un solo costo por producto: el packaging (Pkg U / Pkg B) pasa a formar parte de products.costo.
-- Antes: lista_siva = costo*bolsas/(1-margen) + pkg_unitario*bolsas + pkg_bulto   (el packaging no llevaba margen)
-- Ahora: lista_siva = costo*bolsas/(1-margen)                                    (todo lleva margen)
--
-- costo (por bolsa) nuevo = costo + pkg_unitario + pkg_bulto / bolsas_caja
-- Los pkg quedan en 0, así el precio es el mismo con el código viejo o con el nuevo (orden de despliegue indistinto).
-- Idempotente: solo toca productos con pkg > 0.
--
-- OJO: el precio de venta sube un poco porque el packaging ahora también lleva margen (≈1% en empanadas).
-- Para mantenerlo, bajar el margen del canal.
--
-- Las columnas products.pkg_unitario / pkg_bulto e insumos.packaging_uso quedan sin uso; se pueden borrar más adelante.
UPDATE public.products
   SET costo        = costo + COALESCE(pkg_unitario, 0) + COALESCE(pkg_bulto, 0) / GREATEST(COALESCE(bolsas_caja, 1), 1),
       pkg_unitario = 0,
       pkg_bulto    = 0
 WHERE COALESCE(pkg_unitario, 0) > 0 OR COALESCE(pkg_bulto, 0) > 0;
