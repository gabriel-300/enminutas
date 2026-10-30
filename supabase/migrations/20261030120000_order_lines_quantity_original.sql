-- Cantidad originalmente pedida por línea. `quantity` pasa a reflejar lo despachado/entregado
-- (ajuste al despachar, entrega parcial); `quantity_original` nunca se modifica después del alta.

ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS quantity_original numeric;

-- Pedidos existentes: el original real de los que ya tuvieron ajuste no se puede recuperar.
UPDATE order_lines SET quantity_original = quantity WHERE quantity_original IS NULL;

ALTER TABLE order_lines ALTER COLUMN quantity_original SET NOT NULL;

-- Las líneas nuevas toman su cantidad inicial sin tocar cada punto de inserción de la app.
CREATE OR REPLACE FUNCTION order_lines_set_quantity_original()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity_original IS NULL THEN
    NEW.quantity_original := NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_lines_quantity_original ON order_lines;
CREATE TRIGGER trg_order_lines_quantity_original
  BEFORE INSERT ON order_lines
  FOR EACH ROW EXECUTE FUNCTION order_lines_set_quantity_original();
