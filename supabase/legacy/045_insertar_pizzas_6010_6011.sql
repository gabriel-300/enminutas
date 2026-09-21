-- Migración 045: Insertar Pizza 6010 y 6011 (no existían en BD)
-- Datos del PDF "lista de precio - actualizado" — Pizzas

INSERT INTO products (
  sku, name, codigo, presentacion, unit_label,
  u_bolsa, bolsas_caja, kg_caja,
  costo, pkg_unitario, pkg_bulto,
  categoria, divisiones_display,
  is_active, price_b2b, price_b2c,
  linea_id
)
SELECT
  'PIZZA-MASA4P-10', 'Pizza Masamadre 4 porciones', 6010, 'Caja x 10 u', 'u',
  1, 10, 7,
  2445, 200, 1100,
  'Estándar', NULL,
  true, 0, 0,
  (SELECT id FROM lineas_producto WHERE nombre ILIKE '%pizza%' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE codigo = 6010);

INSERT INTO products (
  sku, name, codigo, presentacion, unit_label,
  u_bolsa, bolsas_caja, kg_caja,
  costo, pkg_unitario, pkg_bulto,
  categoria, divisiones_display,
  is_active, price_b2b, price_b2c,
  linea_id
)
SELECT
  'PIZZA-MAN4P-10', 'Pizza Mandioca 4 porciones', 6011, 'Caja x 10 u', 'u',
  1, 10, 7,
  2245, 200, 1100,
  'Premium', NULL,
  true, 0, 0,
  (SELECT id FROM lineas_producto WHERE nombre ILIKE '%pizza%' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE codigo = 6011);

-- Verificación
SELECT codigo, name, costo, categoria, is_active
FROM products
WHERE codigo IN (6001, 6010, 6011)
ORDER BY codigo;
