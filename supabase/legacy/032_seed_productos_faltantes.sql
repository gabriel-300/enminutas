-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Productos faltantes + fix nombres pizza
-- Ejecutar ANTES de 031_precios_productos.sql
-- ══════════════════════════════════════════════════════════════════════

-- Fix nombres de pizzas para que coincidan con los patrones de 031
-- PIZ-MM-8P: agregar "Mozzarella" para que matchee el primer UPDATE de pizzas
update public.products
  set name = 'Pizza Mozzarella Masa Madre — 8 porciones'
  where sku = 'PIZ-MM-8P';

-- PIZ-MM-4P: agregar "4p" literal para que matchee el segundo UPDATE de pizzas
update public.products
  set name = 'Pizza Masa Madre 4p — 4 porciones'
  where sku = 'PIZ-MM-4P';

-- ── Empanadas faltantes (bolsa x36 u · 1440g) ────────────────────────
insert into public.products (
  sku, slug, name, short_description,
  category_id, price_b2c, price_b2b, min_quantity_b2b,
  unit_label, weight_grams
)
values
  ('EMP-VERDURA-36', 'empanadas-verdura-x36',
   'Empanadas de Verdura — x36',
   'Relleno de verduras frescas cocidas en horno Rational.',
   (select id from public.categories where slug = 'empanadas'),
   22000, 16500, 1, 'bolsa x36 u', 1440),

  ('EMP-ACELGA-36', 'empanadas-acelga-x36',
   'Empanadas de Acelga — x36',
   'Acelga salteada con ricota y condimentos.',
   (select id from public.categories where slug = 'empanadas'),
   22000, 16500, 1, 'bolsa x36 u', 1440),

  ('EMP-JAMON-36', 'empanadas-jamon-x36',
   'Empanadas de Jamón y Queso — x36',
   'Jamón cocido y mozzarella, clásica y suave.',
   (select id from public.categories where slug = 'empanadas'),
   27000, 20250, 1, 'bolsa x36 u', 1440),

  ('EMP-CEBOLLA-36', 'empanadas-cebolla-x36',
   'Empanadas de Cebolla — x36',
   'Cebolla caramelizada con queso.',
   (select id from public.categories where slug = 'empanadas'),
   25000, 18750, 1, 'bolsa x36 u', 1440),

  ('EMP-CUCHI-36', 'empanadas-cuchi-x36',
   'Empanadas de Cuchi — x36',
   'Cerdo de campo (cuchi) con condimentos regionales.',
   (select id from public.categories where slug = 'empanadas'),
   28000, 21000, 1, 'bolsa x36 u', 1440)
on conflict (sku) do nothing;

-- ── Bocaditos 2kg faltantes (bolsa 2kg) ──────────────────────────────
insert into public.products (
  sku, slug, name, short_description,
  category_id, price_b2c, price_b2b, min_quantity_b2b,
  unit_label, weight_grams
)
values
  ('BOC-PACU-2KG', 'bocaditos-pacu-2kg',
   'Bocaditos de Pacú — 2kg',
   'Pacu de Rosamonte en cobertura de mandioca. Formato gastronomía.',
   (select id from public.categories where slug = 'bocaditos'),
   19000, 14250, 1, 'bolsa 2kg', 2000),

  ('BOC-POLLO-2KG', 'bocaditos-pollo-2kg',
   'Bocaditos de Pollo — 2kg',
   'Bocaditos de pollo tiernos en formato economía.',
   (select id from public.categories where slug = 'bocaditos'),
   16000, 12000, 1, 'bolsa 2kg', 2000),

  ('BAT-MOZZA-2KG', 'batoncitos-mozzarella-2kg',
   'Batoncitos de Mozzarella — 2kg',
   'Mozzarella cubierta de masa dorada. Formato gastronomía.',
   (select id from public.categories where slug = 'bocaditos'),
   15000, 11250, 1, 'bolsa 2kg', 2000),

  ('BOC-MAND-2KG', 'bocaditos-mandioca-2kg',
   'Bocaditos de Mandioca — 2kg',
   'Bocaditos de mandioca crocante. Formato economía.',
   (select id from public.categories where slug = 'bocaditos'),
   8500, 6375, 1, 'bolsa 2kg', 2000),

  ('BOC-NOIS-2KG', 'noisette-mandioca-2kg',
   'Noisette de Mandioca — 2kg',
   'Noisettes de mandioca, formato buffet y catering.',
   (select id from public.categories where slug = 'bocaditos'),
   8500, 6375, 1, 'bolsa 2kg', 2000)
on conflict (sku) do nothing;

-- ── Chipa 10kg ────────────────────────────────────────────────────────
insert into public.products (
  sku, slug, name, short_description,
  category_id, price_b2c, price_b2b, min_quantity_b2b,
  unit_label, weight_grams
)
values
  ('CHIPA-10KG', 'chipa-10kg',
   'Chipa — 10kg',
   'Chipa premium a granel. Ideal para distribución y revendedores.',
   (select id from public.categories where slug = 'chipas'),
   68000, 51000, 1, 'bolsa 10kg', 10000)
on conflict (sku) do nothing;

-- Verificación: todos los productos con precio B2B cargado o pendiente
select
  c.name   as categoria,
  p.sku,
  p.name,
  p.unit_label,
  p.precio_dist,
  p.precio_gastro,
  p.precio_min
from public.products p
join public.categories c on c.id = p.category_id
order by c.sort_order, p.name;
