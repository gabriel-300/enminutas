-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Reset demo + seed para admin@enminutas.com.ar
--              y noeliabeatrizmachado@gmail.com
-- Correr en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  v_old_client  uuid;
  v_admin_id    uuid;
  v_noelia_id   uuid;
  v_zona_id     uuid;
  v_order_id    uuid;

  -- Productos
  p_pacu        uuid;
  p_carne       uuid;
  p_burg        uuid;
  p_pollo_boc   uuid;
  p_mozza       uuid;
  p_pizza_mm4   uuid;
  p_pizza_mand  uuid;
  p_chipa       uuid;
  p_chipa_long  uuid;

begin
  -- ── 0. Limpiar datos del usuario anterior ───────────────────────────
  select id into v_old_client from auth.users where email = 'lytwyn.gabriel@gmail.com';

  if v_old_client is not null then
    delete from public.order_lines
      where order_id in (select id from public.orders where customer_id = v_old_client);
    delete from public.orders where customer_id = v_old_client;
    delete from public.profiles where id = v_old_client;
    raise notice 'Datos demo anteriores eliminados para lytwyn.gabriel@gmail.com';
  end if;

  -- ── 1. Obtener IDs ──────────────────────────────────────────────────
  select id into v_admin_id  from auth.users where email = 'admin@enminutas.com.ar';
  select id into v_noelia_id from auth.users where email = 'noeliabeatrizmachado@gmail.com';
  select id into v_zona_id   from public.delivery_zones
    where name ilike '%posadas%' or name ilike '%NEA%' or name ilike '%costanera%'
    limit 1;

  if v_admin_id is null  then raise exception 'No se encontró admin@enminutas.com.ar'; end if;
  if v_noelia_id is null then raise exception 'No se encontró noeliabeatrizmachado@gmail.com'; end if;
  if v_zona_id is null   then raise exception 'No se encontró zona de entrega'; end if;

  -- ── 2. Productos ────────────────────────────────────────────────────
  select id into p_pacu      from public.products where sku = 'EMP-PACU-36';
  select id into p_carne     from public.products where sku = 'EMP-CARNE-36';
  select id into p_burg      from public.products where sku = 'EMP-BURG-36';
  select id into p_pollo_boc from public.products where sku = 'BOC-POLLO-500';
  select id into p_mozza     from public.products where sku = 'BAT-MOZZA-500';
  select id into p_pizza_mm4 from public.products where sku = 'PIZ-MM-4P';
  select id into p_pizza_mand from public.products where sku = 'PIZ-MAND-4P';
  select id into p_chipa     from public.products where sku = 'CHIPA-PREM-500';
  select id into p_chipa_long from public.products where sku = 'CHIPA-LONG-30';

  -- ════════════════════════════════════════════════════════════════════
  -- PEDIDOS DE admin@enminutas.com.ar
  -- ════════════════════════════════════════════════════════════════════

  -- Pedido A-1: DELIVERED (hace 30 días)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0001', 'b2b_mayorista', v_admin_id, 'delivered',
    520000, 0, 0, 520000, 0.15, 78000,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '29 days', now() - interval '27 days',
    now() - interval '30 days', now() - interval '27 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"gastro"}', 2, 173750, 347500),
    (v_order_id, p_carne, '{"name":"Empanadas de Carne x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"gastro"}', 1, 137500, 137500),
    (v_order_id, p_chipa, '{"name":"Chipa Premium","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"gastro"}',          1,  35000,  35000);

  -- Pedido A-2: DELIVERED (hace 14 días)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0002', 'b2b_mayorista', v_admin_id, 'delivered',
    350000, 0, 0, 350000, 0.15, 52500,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '13 days', now() - interval '11 days',
    now() - interval '14 days', now() - interval '11 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pizza_mm4,  '{"name":"Pizza Masa Madre 4p","unit_label":"pizza 4p","bolsas_caja":8,"canal":"gastro"}',  2,  98000, 196000),
    (v_order_id, p_pizza_mand, '{"name":"Pizza de Mandioca 4p","unit_label":"pizza 4p","bolsas_caja":8,"canal":"gastro"}', 1,  92000,  92000),
    (v_order_id, p_mozza,      '{"name":"Batoncitos de Mozzarella","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"gastro"}', 1, 62000, 62000);

  -- Pedido A-3: DESPACHADO (hace 3 días)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0003', 'b2b_mayorista', v_admin_id, 'despachado',
    415000, 0, 0, 415000, 0.15, 62250,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '4 days', now() - interval '3 days',
    now() - interval '5 days', now() - interval '3 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,     '{"name":"Empanadas de Pacu x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"gastro"}', 1, 173750, 173750),
    (v_order_id, p_burg,     '{"name":"Empanadas Cheeseburger x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"gastro"}', 1, 137500, 137500),
    (v_order_id, p_chipa_long,'{"name":"Chipa Long x30","unit_label":"caja x30 u","bolsas_caja":4,"canal":"gastro"}', 1, 103750, 103750);

  -- Pedido A-4: PENDING_PAYMENT (hoy — esperando aprobación)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    created_at, updated_at
  ) values (
    'B2B-2026-0004', 'b2b_mayorista', v_admin_id, 'pending_payment',
    277500, 0, 0, 277500, 0.15, 41625,
    'b2b_despacho', 'transferencia', v_zona_id,
    now() - interval '45 minutes', now() - interval '45 minutes'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"gastro"}', 1, 173750, 173750),
    (v_order_id, p_mozza, '{"name":"Batoncitos de Mozzarella","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"gastro"}', 1, 62000, 62000),
    (v_order_id, p_chipa, '{"name":"Chipa Premium","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"gastro"}', 1, 35000, 35000),
    (v_order_id, p_pollo_boc, '{"name":"Bocaditos de Pollo","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"gastro"}', 1, 50000, 50000);

  raise notice 'OK — 4 pedidos creados para admin@enminutas.com.ar';

  -- ════════════════════════════════════════════════════════════════════
  -- PEDIDOS DE noeliabeatrizmachado@gmail.com
  -- ════════════════════════════════════════════════════════════════════

  -- Pedido N-1: DELIVERED (hace 20 días)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0005', 'b2b_mayorista', v_noelia_id, 'delivered',
    275000, 0, 0, 275000, 0.15, 41250,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '19 days', now() - interval '17 days',
    now() - interval '20 days', now() - interval '17 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_carne,     '{"name":"Empanadas de Carne x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"dist"}', 2, 137500, 275000);

  -- Pedido N-2: DELIVERED (hace 8 días)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0006', 'b2b_mayorista', v_noelia_id, 'delivered',
    462000, 0, 0, 462000, 0.15, 69300,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '7 days', now() - interval '5 days',
    now() - interval '8 days', now() - interval '5 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,      '{"name":"Empanadas de Pacu x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"dist"}', 1, 173750, 173750),
    (v_order_id, p_pollo_boc, '{"name":"Bocaditos de Pollo","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"dist"}',     2,  50000, 100000),
    (v_order_id, p_pizza_mand,'{"name":"Pizza de Mandioca 4p","unit_label":"pizza 4p","bolsas_caja":8,"canal":"dist"}',      2,  94125, 188250);

  -- Pedido N-3: ENVIADO_PROD (en producción ahora)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, created_at, updated_at
  ) values (
    'B2B-2026-0007', 'b2b_mayorista', v_noelia_id, 'enviado_prod',
    347500, 0, 0, 347500, 0.15, 52125,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '6 hours',
    now() - interval '10 hours', now() - interval '6 hours'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"dist"}', 2, 173750, 347500);

  -- Pedido N-4: APROBADO (aprobado, esperando producción)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, created_at, updated_at
  ) values (
    'B2B-2026-0008', 'b2b_mayorista', v_noelia_id, 'aprobado',
    312000, 0, 0, 312000, 0.15, 46800,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '2 hours',
    now() - interval '4 hours', now() - interval '2 hours'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_carne,     '{"name":"Empanadas de Carne x36","unit_label":"bolsa x36 u","bolsas_caja":6,"canal":"dist"}', 1, 137500, 137500),
    (v_order_id, p_chipa_long,'{"name":"Chipa Long x30","unit_label":"caja x30 u","bolsas_caja":4,"canal":"dist"}',          1, 103750, 103750),
    (v_order_id, p_mozza,     '{"name":"Batoncitos de Mozzarella","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"dist"}',1,  62000,  62000),
    (v_order_id, p_pollo_boc, '{"name":"Bocaditos de Pollo","unit_label":"bolsa 500g","bolsas_caja":12,"canal":"dist"}',      1,  50000,  50000);

  -- Pedido N-5: PENDING_PAYMENT (recién cargado, sin aprobar)
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    created_at, updated_at
  ) values (
    'B2B-2026-0009', 'b2b_mayorista', v_noelia_id, 'pending_payment',
    196000, 0, 0, 196000, 0.15, 29400,
    'b2b_despacho', 'transferencia', v_zona_id,
    now() - interval '15 minutes', now() - interval '15 minutes'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pizza_mm4, '{"name":"Pizza Masa Madre 4p","unit_label":"pizza 4p","bolsas_caja":8,"canal":"dist"}', 2, 98000, 196000);

  raise notice 'OK — 5 pedidos creados para noeliabeatrizmachado@gmail.com';
  raise notice 'TOTAL: 9 pedidos demo creados';
end; $$;
