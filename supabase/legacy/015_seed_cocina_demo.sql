-- ── 015: Seed demo — Cocina, Stock y Recetas ─────────────────────────────────
-- Ejecutar DESPUÉS de 013 y 014.
-- Usa SKUs para no depender de IDs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Stock actual y mínimos por producto
-- ─────────────────────────────────────────────────────────────────────────────
update products set stock_cajas = 3,  stock_minimo = 20 where sku = 'BAT-MOZZA-500';
update products set stock_cajas = 8,  stock_minimo = 15 where sku = 'BOC-PACU-500';
update products set stock_cajas = 0,  stock_minimo = 15 where sku = 'BOC-POLLO-500';
update products set stock_cajas = 12, stock_minimo = 10 where sku = 'CHIPA-PREM-500';
update products set stock_cajas = 2,  stock_minimo = 8  where sku = 'CHIPA-LONG-30';
update products set stock_cajas = 0,  stock_minimo = 12 where sku = 'EMP-CARNE-36';
update products set stock_cajas = 5,  stock_minimo = 12 where sku = 'EMP-BURG-36';
update products set stock_cajas = 0,  stock_minimo = 10 where sku = 'EMP-PACU-36';
update products set stock_cajas = 4,  stock_minimo = 10 where sku = 'EMP-POLLO-36';
update products set stock_cajas = 6,  stock_minimo = 10 where sku = 'EMP-HUMITA-36';
update products set stock_cajas = 3,  stock_minimo = 10 where sku = 'EMP-CAPRESE-36';
update products set stock_cajas = 2,  stock_minimo = 6  where sku = 'PIZ-MAND-4P';
update products set stock_cajas = 4,  stock_minimo = 6  where sku = 'PIZ-MM-4P';
update products set stock_cajas = 1,  stock_minimo = 4  where sku = 'PIZ-MM-8P';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Movimientos de stock históricos (últimos 7 días)
-- ─────────────────────────────────────────────────────────────────────────────
insert into stock_movements (product_id, qty, type, notes, created_at)
select id, 20, 'produccion', 'Lote semanal — lunes mañana', now() - interval '6 days'
from products where sku = 'BAT-MOZZA-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, -17, 'despacho', 'Despachos acumulados semana', now() - interval '4 days'
from products where sku = 'BAT-MOZZA-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, 15, 'produccion', 'Lote semanal', now() - interval '5 days'
from products where sku = 'BOC-PACU-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, -7, 'despacho', 'Pedidos de la semana', now() - interval '3 days'
from products where sku = 'BOC-PACU-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, 15, 'produccion', 'Lote semanal', now() - interval '5 days'
from products where sku = 'BOC-POLLO-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, -15, 'despacho', 'Pedidos de la semana', now() - interval '2 days'
from products where sku = 'BOC-POLLO-500';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, 12, 'produccion', 'Lote de empanadas', now() - interval '4 days'
from products where sku = 'EMP-CARNE-36';

insert into stock_movements (product_id, qty, type, notes, created_at)
select id, -12, 'despacho', 'Pedidos B2B', now() - interval '2 days'
from products where sku = 'EMP-CARNE-36';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recetas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Batoncitos de Mozzarella (lote: 10 cajas de 500g) ────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 10, 'Lote de 10 cajas. Requiere mozzarella en bloque, pan rallado y huevo.'
  from products where sku = 'BAT-MOZZA-500'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Pesar y cortar mozzarella en bastones de 10 cm',        15.0, '120g por bastón aprox.'),
  (2, 'Preparar rebozado: huevo batido + pan rallado con ajo',   8.0, null),
  (3, 'Rebozar cada bastón (paso por huevo y pan x2)',          45.0, '2 personas trabajan en paralelo'),
  (4, 'Acomodar en bandeja y pre-congelar',                     5.0,  'Bandeja plana, no superponer'),
  (5, 'Pre-congelado en cámara',                               90.0, 'Mínimo 90 min hasta que estén firmes'),
  (6, 'Embolsar y sellar al vacío (bolsas x12 u.)',            20.0, null),
  (7, 'Armar cajas y etiquetar con fecha de producción',       10.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Bocaditos de Mandioca y Pacu (lote: 8 cajas) ─────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 8, 'Lote de 8 cajas. Pacu fresco de criadero Rosamonte. Masa de mandioca rallada.'
  from products where sku = 'BOC-PACU-500'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Desespinar y desmenuzar el pacu',                       30.0, 'Cuidado con las espinas finas'),
  (2, 'Rallar y escurrir mandioca',                            20.0, 'Escurrir bien para que no quede aguada'),
  (3, 'Mezclar pacu, mandioca, condimentos y aglutinante',     10.0, null),
  (4, 'Formar bocaditos de 20g cada uno',                      40.0, '2 personas en paralelo'),
  (5, 'Pre-congelar en bandeja',                               60.0, null),
  (6, 'Embolsar x12 unidades y sellar',                        20.0, null),
  (7, 'Armar cajas y etiquetar',                               8.0,  null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Bocaditos de Pollo (lote: 8 cajas) ───────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 8, 'Lote de 8 cajas. Cocción previa en horno Rational.'
  from products where sku = 'BOC-POLLO-500'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Pesar y cortar pechuga en cubos de 2cm',               20.0, null),
  (2, 'Marinar con especias 30 min en cámara',                30.0, 'Puede hacerse el día anterior'),
  (3, 'Preparar rebozado: harina, huevo, pan rallado',          8.0, null),
  (4, 'Rebozar y armar bocaditos',                             35.0, '2 personas'),
  (5, 'Cocción parcial en horno Rational 180°C × 8 min',      15.0, 'Quedan crudos por dentro, terminan en casa'),
  (6, 'Enfriar y acomodar en bandeja',                        10.0, null),
  (7, 'Pre-congelar',                                          60.0, null),
  (8, 'Embolsar y sellar x12',                                20.0, null),
  (9, 'Armar cajas y etiquetar',                               8.0,  null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Chipa Premium Bocadito (lote: 12 cajas) ──────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 12, 'Lote de 12 cajas (144 bolsas de 500g). Tres quesos: sardo, tybo y provolone.'
  from products where sku = 'CHIPA-PREM-500'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Pesar almidón de mandioca, quesos y demás ingredientes', 8.0, null),
  (2, 'Calentar leche y manteca hasta disolver',               5.0,  null),
  (3, 'Amasar: almidón + líquido caliente + quesos + huevos', 15.0, 'Amasar hasta que no se pegue'),
  (4, 'Dar forma a las chipas (bola de 20g aprox.)',           40.0, '2 personas en paralelo'),
  (5, 'Cocción en horno 200°C × 15 min (doradas)',            20.0, 'Vigilar que no se quemen'),
  (6, 'Enfriar completamente en rejilla',                      20.0, 'No embolsar calientes'),
  (7, 'Embolsar x12 unidades y sellar',                        25.0, null),
  (8, 'Armar cajas y etiquetar',                               10.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Chipa Long Gourmet x30 (lote: 4 cajas) ───────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 4, 'Lote de 4 cajas (120 chipas long de 115g). Formato cafetería.'
  from products where sku = 'CHIPA-LONG-30'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Pesar y mezclar ingredientes secos',                     8.0, null),
  (2, 'Incorporar líquidos y queso, amasar',                   15.0, null),
  (3, 'Dar forma larga de 15cm c/u (115g por unidad)',         50.0, 'Una persona hace ~2 por minuto'),
  (4, 'Cocción en horno 200°C × 18 min',                      25.0, null),
  (5, 'Enfriar y acomodar en caja de 30 unidades',             15.0, null),
  (6, 'Sellar y etiquetar cajas',                               8.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas de Carne x36 (lote: 6 cajas) ───────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas = 216 empanadas. Cocción en horno Rational. Reposo del relleno: 1 noche.'
  from products where sku = 'EMP-CARNE-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Picar cebolla, morrón y condimentar',                   20.0, '2 min por kg de cebolla'),
  (2, 'Dorar carne picada en sartén',                          25.0, null),
  (3, 'Integrar verduras, aceitunas y huevo duro',              10.0, null),
  (4, 'Enfriar relleno en cámara (mínimo 1 hora)',             60.0, 'Idealmente de un día para el otro'),
  (5, 'Estirar y cortar tapas de empanada',                    30.0, '3 personas: 1 estira, 2 cortan'),
  (6, 'Armar y repulgar empanadas',                            60.0, '~2 min por docena con práctica'),
  (7, 'Cocción en horno Rational 190°C × 12 min',             20.0, 'Dos hornadas de ~108 empanadas'),
  (8, 'Enfriar sobre rejilla',                                 15.0, null),
  (9, 'Embolsar x36 unidades y sellar',                        20.0, null),
  (10,'Armar cajas y etiquetar',                               8.0,  null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas Cheeseburger x36 (lote: 6 cajas) ───────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas. Misma base que carne, se agrega cheddar, pepino y mostaza al armar.'
  from products where sku = 'EMP-BURG-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Preparar relleno de carne con cebolla',                 25.0, null),
  (2, 'Cortar cheddar en cubos pequeños, preparar pepino',     10.0, null),
  (3, 'Enfriar relleno',                                       60.0, null),
  (4, 'Estirar y cortar tapas',                                30.0, null),
  (5, 'Armar: carne + cheddar + pepino + toque de mostaza',    70.0, 'Proceso más lento por los ingredientes extra'),
  (6, 'Cocción horno Rational 190°C × 12 min',                20.0, null),
  (7, 'Enfriar, embolsar y armar cajas',                       30.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas de Pacu x36 (lote: 4 cajas) ────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 4, 'Lote de 4 cajas. Pacu fresco. El desespinado es el paso más delicado.'
  from products where sku = 'EMP-PACU-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Desespinar pacu a mano (tarea delicada)',               45.0, 'El paso más lento — 15 min por kg'),
  (2, 'Saltear con cebolla, morrón y tomate',                  20.0, null),
  (3, 'Enfriar relleno de pescado',                            45.0, null),
  (4, 'Estirar tapas y armar empanadas',                       55.0, null),
  (5, 'Cocción horno 185°C × 10 min',                         18.0, 'Temperatura más baja para el pescado'),
  (6, 'Enfriar, embolsar y armar cajas',                       20.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas de Pollo x36 (lote: 6 cajas) ───────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas. Pollo desmenuzado con verduras.'
  from products where sku = 'EMP-POLLO-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Cocinar y desmenuzar pechuga',                          30.0, null),
  (2, 'Saltear verduras y mezclar con pollo',                  15.0, null),
  (3, 'Enfriar relleno',                                       45.0, null),
  (4, 'Estirar tapas y armar empanadas',                       60.0, null),
  (5, 'Cocción horno 190°C × 12 min',                         20.0, null),
  (6, 'Enfriar, embolsar y armar cajas',                       25.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas de Humita x36 (lote: 6 cajas) ──────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas. Humita cremosa con choclo fresco.'
  from products where sku = 'EMP-HUMITA-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Rallar choclo y exprimir',                              25.0, null),
  (2, 'Cocinar humita con leche, queso y albahaca',            20.0, null),
  (3, 'Enfriar relleno',                                       40.0, null),
  (4, 'Estirar tapas y armar empanadas',                       55.0, null),
  (5, 'Cocción horno 185°C × 10 min',                         18.0, null),
  (6, 'Enfriar, embolsar y armar cajas',                       25.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Empanadas Caprese x36 (lote: 6 cajas) ────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas. Sin carne. Tomate, mozzarella y albahaca fresca.'
  from products where sku = 'EMP-CAPRESE-36'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Cortar tomate en cubos, escurrir bien',                 15.0, 'Si queda líquido rompe la tapa'),
  (2, 'Cortar mozzarella en cubos, picar albahaca',            10.0, null),
  (3, 'Mezclar y salpimentar',                                  5.0, null),
  (4, 'Estirar tapas y armar empanadas',                       55.0, null),
  (5, 'Cocción horno 185°C × 10 min',                         18.0, null),
  (6, 'Enfriar, embolsar y armar cajas',                       22.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Pizza de Mandioca 4p (lote: 6 cajas) ─────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 cajas = 6 pizzas de 4 porciones. Masa de mandioca única.'
  from products where sku = 'PIZ-MAND-4P'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Hervir y procesar mandioca hasta obtener puré',         25.0, null),
  (2, 'Mezclar con almidón, huevo y sal. Amasar.',             15.0, null),
  (3, 'Estirar masa en molde (30 cm diámetro)',                20.0, '~3 min por pizza'),
  (4, 'Pre-cocción de la masa 10 min en horno 200°C',         15.0, null),
  (5, 'Aplicar salsa y mozzarella',                            15.0, null),
  (6, 'Cocción final 8 min hasta dorar el queso',             12.0, null),
  (7, 'Enfriar, porcionar y embolsar',                         20.0, null),
  (8, 'Armar cajas y etiquetar',                               8.0,  null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Pizza Masa Madre 4p (lote: 6 cajas) ──────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 6, 'Lote de 6 pizzas 4p. La masa madre fermenta 48hs — planificar con anticipación.'
  from products where sku = 'PIZ-MM-4P'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Refrescar masa madre (hacer día anterior)',             10.0, 'La masa debe estar activa — burbujas visibles'),
  (2, 'Amasar: harina, agua, sal y masa madre',               20.0, null),
  (3, 'Fermentación en frío 48hs en cámara',                  10.0, 'Solo 10 min de trabajo — el resto es tiempo'),
  (4, 'Estirar bollos en molde',                              18.0, null),
  (5, 'Fermentación final 1h a temperatura ambiente',          5.0, null),
  (6, 'Aplicar salsa y mozzarella artesanal',                 15.0, null),
  (7, 'Cocción en horno 240°C × 10 min (muy caliente)',       15.0, 'Piedra de horno precalentada 1h'),
  (8, 'Enfriar, porcionar, embolsar y armar cajas',           22.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;

-- ── Pizza Masa Madre 8p (lote: 3 cajas) ──────────────────────────────────────
with r as (
  insert into recipes (product_id, yield_cajas, notes)
  select id, 3, 'Lote de 3 pizzas familiares 8p. Misma receta que la 4p, doble tamaño.'
  from products where sku = 'PIZ-MM-8P'
  on conflict (product_id) do update set yield_cajas = excluded.yield_cajas, notes = excluded.notes
  returning id
)
insert into recipe_steps (recipe_id, step_order, description, minutes, notes)
select r.id, s.step_order, s.description, s.minutes, s.notes
from r, (values
  (1, 'Refrescar masa madre (hacer día anterior)',              10.0, null),
  (2, 'Amasar con doble cantidad de ingredientes',             25.0, null),
  (3, 'Fermentación en frío 48hs',                            10.0, null),
  (4, 'Estirar en molde grande 45 cm',                        20.0, null),
  (5, 'Fermentación final 1h',                                 5.0, null),
  (6, 'Aplicar salsa y mozzarella (doble cantidad)',           18.0, null),
  (7, 'Cocción 240°C × 12 min',                               18.0, null),
  (8, 'Enfriar, porcionar, embolsar y armar cajas',           20.0, null)
) as s(step_order, description, minutes, notes)
on conflict do nothing;
