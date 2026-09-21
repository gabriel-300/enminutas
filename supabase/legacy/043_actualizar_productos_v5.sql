-- Migración 043: Actualización masiva de datos de productos v5
-- Fuente: "lista de precio - actualizado.pdf" — Actualización 12/06/2026
-- Actualiza: u_bolsa, bolsas_caja, kg_caja, costo, pkg_unitario, pkg_bulto,
--            categoria, divisiones_display, linea_id, presentacion, unit_label
-- NO modifica: name, sku, is_active, stock, imágenes, descripción

-- ══════════════════════════════════════════════════════════════════════
--  BOCADITOS X500G
-- ══════════════════════════════════════════════════════════════════════

-- 3001 | Bocadito Mandioca y Pacú | 14u x 10 cajitas | $ 2.250 | Premium
UPDATE products SET
  u_bolsa = 14, bolsas_caja = 10, kg_caja = 5,
  costo = 2250, pkg_unitario = 750, pkg_bulto = 900,
  categoria = 'Premium', divisiones_display = NULL,
  presentacion = 'Caja 10 cajitas x 500g', unit_label = 'caja 10 cajitas x 500g',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%500g%' LIMIT 1)
WHERE codigo = 3001;

-- 3002 | Bocadito de Pollo | 16u x 10 cajitas | $ 1.780 | Estándar
UPDATE products SET
  u_bolsa = 16, bolsas_caja = 10, kg_caja = 5,
  costo = 1780, pkg_unitario = 750, pkg_bulto = 900,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 10 cajitas x 500g', unit_label = 'caja 10 cajitas x 500g',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%500g%' LIMIT 1)
WHERE codigo = 3002;

-- 3003 | Bastoncito de Mozzarella | 19u x 10 cajitas | $ 1.490 | Estándar
UPDATE products SET
  u_bolsa = 19, bolsas_caja = 10, kg_caja = 5,
  costo = 1490, pkg_unitario = 750, pkg_bulto = 900,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 10 cajitas x 500g', unit_label = 'caja 10 cajitas x 500g',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%500g%' LIMIT 1)
WHERE codigo = 3003;

-- ══════════════════════════════════════════════════════════════════════
--  BOCADITOS X2KG
-- ══════════════════════════════════════════════════════════════════════

-- 4001 | Bocadito Mandioca y Pacú x2kg | 56u x 5 bolsas | $ 9.400 | Estándar
UPDATE products SET
  u_bolsa = 56, bolsas_caja = 5, kg_caja = 10,
  costo = 9400, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%2kg%' LIMIT 1)
WHERE codigo = 4001;

-- 4002 | Bocadito de Pollo x2kg | 72u x 5 bolsas | $ 7.120 | Estándar
UPDATE products SET
  u_bolsa = 72, bolsas_caja = 5, kg_caja = 10,
  costo = 7120, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%2kg%' LIMIT 1)
WHERE codigo = 4002;

-- 4003 | Bastoncito de Mozzarella x2kg | 78u x 5 bolsas | $ 6.500 | Estándar
UPDATE products SET
  u_bolsa = 78, bolsas_caja = 5, kg_caja = 10,
  costo = 6500, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%2kg%' LIMIT 1)
WHERE codigo = 4003;

-- 4004 | Bastoncito de Mandioca | 80u x 5 bolsas | $ 3.000 | Premium
UPDATE products SET
  u_bolsa = 80, bolsas_caja = 5, kg_caja = 10,
  costo = 3000, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Premium', divisiones_display = NULL,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%2kg%' LIMIT 1)
WHERE codigo = 4004;

-- 4005 | Noisette de Mandioca | 200u x 5 bolsas | $ 3.000 | Premium
UPDATE products SET
  u_bolsa = 200, bolsas_caja = 5, kg_caja = 10,
  costo = 3000, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Premium', divisiones_display = NULL,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE '%2kg%' LIMIT 1)
WHERE codigo = 4005;

-- ══════════════════════════════════════════════════════════════════════
--  CHIPAS
-- ══════════════════════════════════════════════════════════════════════

-- 5001 | Chipa Long Gourmet x115g | 30u x 4 bolsas | $ 15.580 | Premium
UPDATE products SET
  u_bolsa = 30, bolsas_caja = 4, kg_caja = 14,
  costo = 15580, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Premium', divisiones_display = NULL,
  presentacion = 'Caja 4 bolsas x 30 u', unit_label = 'caja 4 bolsas x 30u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Chipa%' LIMIT 1)
WHERE codigo = 5001;

-- 5002 | Chipa Bocadito (granel) | 550u x 1 bolsa x 10kg | $ 41.271 | Estándar
UPDATE products SET
  u_bolsa = 550, bolsas_caja = 1, kg_caja = 10,
  costo = 41271, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 10 kg', unit_label = 'bolsa x 10kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Chipa%' LIMIT 1)
WHERE codigo = 5002;

-- 5003 | Chipa Bocadito Premium x500g | 20u x 10 cajitas | $ 2.064 | Estándar
UPDATE products SET
  u_bolsa = 20, bolsas_caja = 10, kg_caja = 5,
  costo = 2064, pkg_unitario = 750, pkg_bulto = 900,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja 10 cajitas x 500g', unit_label = 'caja 10 cajitas x 500g',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Chipa%' LIMIT 1)
WHERE codigo = 5003;

-- 5004 | Chipa Panecillo x2kg | 40u x 1 bolsa | $ 41.271 | Premium | divis=5
-- divisiones_display=5: la caja (1 bolsa) se exhibe dividida en 5 porciones de 8u
UPDATE products SET
  u_bolsa = 40, bolsas_caja = 1, kg_caja = 10,
  costo = 41271, pkg_unitario = 300, pkg_bulto = 1300,
  categoria = 'Premium', divisiones_display = 5,
  presentacion = 'Caja 5 bolsas x 2kg', unit_label = 'caja 5 bolsas x 2kg',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Chipa%' LIMIT 1)
WHERE codigo = 5004;

-- ══════════════════════════════════════════════════════════════════════
--  EMPANADAS
-- ══════════════════════════════════════════════════════════════════════

-- Todos los sabores: 36u x 1 bolsa x 5kg | pkg $200 + $1.100 | Estándar

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 23580, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1001;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 23580, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1002;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 19620, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1003;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 19620, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1004;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 21960, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1005;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 27720, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1006;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 25200, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1007;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 28440, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1008;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 37260, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1009;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 36000, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1010;

UPDATE products SET
  u_bolsa = 36, bolsas_caja = 1, kg_caja = 5,
  costo = 33120, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Bolsa x 36 u', unit_label = 'bolsa x36 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Empanada%' LIMIT 1)
WHERE codigo = 1011;

-- ══════════════════════════════════════════════════════════════════════
--  PIZZAS
-- ══════════════════════════════════════════════════════════════════════

-- 6001 | Pizza Masamadre Mozzarella | 1u x 10 x 7kg | $ 4.820 | Estándar
-- Si no existe, insertar (puede no estar en el sistema aún)
INSERT INTO products (
  sku, name, codigo, presentacion, unit_label,
  u_bolsa, bolsas_caja, kg_caja,
  costo, pkg_unitario, pkg_bulto,
  categoria, divisiones_display, is_active, price_b2b, price_b2c,
  linea_id
)
SELECT
  'PIZ-MASA-MOZ', 'Pizza Masamadre Mozzarella', 6001,
  'Caja x 10 u', 'caja x10 u',
  1, 10, 7,
  4820, 200, 1100,
  'Estándar', NULL, true, 0, 0,
  (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Pizza%' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE codigo = 6001);

-- Si ya existe, actualizar
UPDATE products SET
  u_bolsa = 1, bolsas_caja = 10, kg_caja = 7,
  costo = 4820, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja x 10 u', unit_label = 'caja x10 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Pizza%' LIMIT 1)
WHERE codigo = 6001;

-- 6010 | Pizza Masamadre 4 porciones | 1u x 10 x 7kg | $ 2.445 | Estándar
UPDATE products SET
  u_bolsa = 1, bolsas_caja = 10, kg_caja = 7,
  costo = 2445, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Estándar', divisiones_display = NULL,
  presentacion = 'Caja x 10 u', unit_label = 'caja x10 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Pizza%' LIMIT 1)
WHERE codigo = 6010;

-- 6011 | Pizza Mandioca 4 porciones | 1u x 10 x 7kg | $ 2.245 | Premium
UPDATE products SET
  u_bolsa = 1, bolsas_caja = 10, kg_caja = 7,
  costo = 2245, pkg_unitario = 200, pkg_bulto = 1100,
  categoria = 'Premium', divisiones_display = NULL,
  presentacion = 'Caja x 10 u', unit_label = 'caja x10 u',
  linea_id = (SELECT id FROM lineas_producto WHERE nombre ILIKE 'Pizza%' LIMIT 1)
WHERE codigo = 6011;

-- ══════════════════════════════════════════════════════════════════════
--  DISPONIBILIDAD DE LÍNEAS — todas activas según PDF
-- ══════════════════════════════════════════════════════════════════════

UPDATE disponibilidad_lineas SET disponible = true
WHERE linea_id IN (SELECT id FROM lineas_producto);

-- ══════════════════════════════════════════════════════════════════════
--  VERIFICACIÓN — productos actualizados con sus campos v5
-- ══════════════════════════════════════════════════════════════════════

SELECT
  p.codigo, p.name,
  l.nombre AS linea,
  p.u_bolsa, p.bolsas_caja, p.kg_caja,
  p.costo, p.pkg_unitario, p.pkg_bulto,
  p.categoria, p.divisiones_display
FROM products p
LEFT JOIN lineas_producto l ON l.id = p.linea_id
WHERE p.codigo IN (
  3001,3002,3003,
  4001,4002,4003,4004,4005,
  5001,5002,5003,5004,
  1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,
  6001,6010,6011
)
ORDER BY p.codigo;
