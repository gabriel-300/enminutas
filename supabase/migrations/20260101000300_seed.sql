-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Seed de datos iniciales
-- ══════════════════════════════════════════════════════════════════════

-- ── Categorías ───────────────────────────────────────────────────────
insert into public.categories (slug, name, description, sort_order) values
  ('chipas',     'Chipas',                  'Chipas premium elaboradas con almidón de mandioca y tres quesos.', 1),
  ('empanadas',  'Empanadas',               '11 variedades de empanadas ultracongeladas cocidas en horno Rational.', 2),
  ('pizzas',     'Pizzas',                  'Pizza masa madre y pizza de mandioca, únicas en la región.', 3),
  ('bocaditos',  'Bocaditos & Finger Food',  'Bocaditos y batoncitos de pacu, mozzarella y pollo.', 4)
on conflict (slug) do nothing;

-- ── Zona de entrega Posadas (Pedido Ya) ──────────────────────────────
insert into public.delivery_zones (name, polygon, base_fee, estimated_minutes)
values (
  'Costanera y Centro — Posadas',
  '{"type":"Polygon","coordinates":[[
    [-55.913,-27.359],[-55.870,-27.359],
    [-55.870,-27.385],[-55.913,-27.385],
    [-55.913,-27.359]
  ]]}'::jsonb,
  1500,
  40
) on conflict do nothing;

-- ── Productos iniciales ───────────────────────────────────────────────
with cat as (
  select id, slug from public.categories
)
insert into public.products (
  sku, slug, name, short_description,
  category_id, price_b2c, price_b2b, min_quantity_b2b,
  unit_label, weight_grams
)
values
  -- Bocaditos
  ('BOC-PACU-500',  'bocaditos-pacu-500g',      'Bocaditos de Mandioca y Pacu',
   'Pacu de Rosamonte en cobertura de mandioca. Freír o airfryer.',
   (select id from cat where slug='bocaditos'), 4800, 3600, 6, 'bolsa 500g', 500),
  ('BAT-MOZZA-500', 'batoncitos-mozzarella-500g', 'Batoncitos de Mozzarella',
   'Mozzarella cubierta de masa dorada. Ideales como entrada.',
   (select id from cat where slug='bocaditos'), 4500, 3375, 6, 'bolsa 500g', 500),
  ('BOC-POLLO-500', 'bocaditos-pollo-500g',      'Bocaditos de Pollo',
   'Bocaditos de pollo tiernos, cocidos en horno Rational.',
   (select id from cat where slug='bocaditos'), 4200, 3150, 6, 'bolsa 500g', 500),

  -- Chipas
  ('CHIPA-PREM-500', 'chipa-premium-500g',    'Chipa Premium — Bocadito',
   'Tres quesos: sardo, tybo y provolone. Receta exclusiva.',
   (select id from cat where slug='chipas'), 3800, 2850, 12, 'bolsa 500g', 360),
  ('CHIPA-LONG-30',  'chipa-long-gourmet-x30', 'Chipa Long Gourmet x30',
   '115g por unidad. Formato cafetería y estación de servicio.',
   (select id from cat where slug='chipas'), 9500, 7125, 2, 'caja x30 u', 3450),

  -- Pizzas
  ('PIZ-MAND-4P',  'pizza-mandioca-4p',     'Pizza de Mandioca — 4 porciones',
   'Masa de mandioca, única en el mercado regional. Con mozzarella.',
   (select id from cat where slug='pizzas'), 6800, 5100, 4, 'pizza 4p', 580),
  ('PIZ-MM-4P',    'pizza-masa-madre-4p',   'Pizza Masa Madre — 4 porciones',
   'Masa madre fermentada 48 hs, mozzarella artesanal.',
   (select id from cat where slug='pizzas'), 7200, 5400, 4, 'pizza 4p', 620),
  ('PIZ-MM-8P',    'pizza-masa-madre-8p',   'Pizza Masa Madre — 8 porciones',
   'Formato familiar. Misma receta, mayor rendimiento.',
   (select id from cat where slug='pizzas'), 13500, 10125, 2, 'pizza 8p', 1200),

  -- Empanadas
  ('EMP-PACU-36',     'empanadas-pacu-x36',       'Empanadas de Pacu — x36',
   'Pacu de criadero certificado Rosamonte, con cebolla y morrón.',
   (select id from cat where slug='empanadas'), 28000, 21000, 1, 'bolsa x36 u', 1440),
  ('EMP-CARNE-36',    'empanadas-carne-x36',      'Empanadas de Carne — x36',
   'Carne vacuna con aceitunas, huevo duro y especias.',
   (select id from cat where slug='empanadas'), 26000, 19500, 1, 'bolsa x36 u', 1440),
  ('EMP-POLLO-36',    'empanadas-pollo-x36',      'Empanadas de Pollo — x36',
   'Pollo desmenuzado con verduras, cocido en Rational.',
   (select id from cat where slug='empanadas'), 24000, 18000, 1, 'bolsa x36 u', 1440),
  ('EMP-HUMITA-36',   'empanadas-humita-x36',     'Empanadas de Humita — x36',
   'Humita cremosa con choclo y albahaca.',
   (select id from cat where slug='empanadas'), 22000, 16500, 1, 'bolsa x36 u', 1440),
  ('EMP-CAPRESE-36',  'empanadas-caprese-x36',    'Empanadas Caprese — x36',
   'Tomate, mozzarella y albahaca. Sin carne.',
   (select id from cat where slug='empanadas'), 22000, 16500, 1, 'bolsa x36 u', 1440),
  ('EMP-BURG-36',     'empanadas-cheeseburger-x36','Empanadas Cheeseburger — x36',
   'Carne, queso cheddar, pepino y mostaza. La más pedida.',
   (select id from cat where slug='empanadas'), 26000, 19500, 1, 'bolsa x36 u', 1440)
on conflict (sku) do nothing;
