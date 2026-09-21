-- Migración 044: Actualizar nombres de productos según PDF "lista de precio - actualizado"
-- Solo se modifican los nombres (columna name), sin tocar otros campos.

-- BOCADITOS X500G
UPDATE products SET name = 'Bocadito Mandioca y Pacú'       WHERE codigo = 3001;
UPDATE products SET name = 'Bocadito de Pollo'               WHERE codigo = 3002;
UPDATE products SET name = 'Bastoncito de Mozzarella'        WHERE codigo = 3003;

-- BOCADITOS X2KG
UPDATE products SET name = 'Bocadito Mandioca y Pacú x2kg'  WHERE codigo = 4001;
UPDATE products SET name = 'Bocadito de Pollo x2kg'          WHERE codigo = 4002;
UPDATE products SET name = 'Bastoncito de Mozzarella x2kg'   WHERE codigo = 4003;
UPDATE products SET name = 'Bastoncito de Mandioca'          WHERE codigo = 4004;
UPDATE products SET name = 'Noisette de Mandioca'            WHERE codigo = 4005;

-- CHIPAS
UPDATE products SET name = 'Chipa Long Gourmet x115g'        WHERE codigo = 5001;
UPDATE products SET name = 'Chipa Bocadito'                  WHERE codigo = 5002;
UPDATE products SET name = 'Chipa Bocadito Premium x500g'    WHERE codigo = 5003;
UPDATE products SET name = 'Chipa Panecillo x2kg'            WHERE codigo = 5004;

-- EMPANADAS
UPDATE products SET name = 'Empanada de Carne'               WHERE codigo = 1001;
UPDATE products SET name = 'Empanada de Pollo'               WHERE codigo = 1002;
UPDATE products SET name = 'Empanada de Verdura'             WHERE codigo = 1003;
UPDATE products SET name = 'Empanada de Acelga'              WHERE codigo = 1004;
UPDATE products SET name = 'Empanada de Humita'              WHERE codigo = 1005;
UPDATE products SET name = 'Empanada Jamón y Mozzarella'     WHERE codigo = 1006;
UPDATE products SET name = 'Empanada Cebolla y Mozzarella'   WHERE codigo = 1007;
UPDATE products SET name = 'Empanada de Caprese'             WHERE codigo = 1008;
UPDATE products SET name = 'Empanada de Pacú'                WHERE codigo = 1009;
UPDATE products SET name = 'Empanada Carne Cort. Cuchillo'   WHERE codigo = 1010;
UPDATE products SET name = 'Empanada Cheeseburguer'          WHERE codigo = 1011;

-- PIZZAS
UPDATE products SET name = 'Pizza Masamadre Mozzarella'      WHERE codigo = 6001;
UPDATE products SET name = 'Pizza Masamadre 4 porciones'     WHERE codigo = 6010;
UPDATE products SET name = 'Pizza Mandioca 4 porciones'      WHERE codigo = 6011;

-- Verificación: mostrar los 26 productos actualizados
SELECT codigo, name
FROM products
WHERE codigo IN (
  3001,3002,3003,
  4001,4002,4003,4004,4005,
  5001,5002,5003,5004,
  1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,
  6001,6010,6011
)
ORDER BY codigo;
