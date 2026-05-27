-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Pedidos de demostración para Restaurante La Misionera
-- ══════════════════════════════════════════════════════════════════════

do $$
declare
  v_client_id   uuid;
  v_admin_id    uuid;
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
begin
  -- Obtener IDs necesarios
  select id into v_client_id from auth.users where email = 'lytwyn.gabriel@gmail.com';
  select id into v_admin_id  from auth.users where email = 'admin@enminutas.com.ar';
  select id into v_zona_id   from public.delivery_zones where name ilike '%costanera%' or name ilike '%posadas%' limit 1;

  select id into p_pacu      from public.products where sku = 'EMP-PACU-36';
  select id into p_carne     from public.products where sku = 'EMP-CARNE-36';
  select id into p_burg      from public.products where sku = 'EMP-BURG-36';
  select id into p_pollo_boc from public.products where sku = 'BOC-POLLO-500';
  select id into p_mozza     from public.products where sku = 'BAT-MOZZA-500';
  select id into p_pizza_mm4 from public.products where sku = 'PIZ-MM-4P';
  select id into p_pizza_mand from public.products where sku = 'PIZ-MAND-4P';
  select id into p_chipa     from public.products where sku = 'CHIPA-PREM-500';

  if v_client_id is null then
    raise exception 'Cliente no encontrado — verificá el email';
  end if;

  -- ── Pedido 1: DELIVERED (hace 3 semanas) ────────────────────────────
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0001', 'b2b_mayorista', v_client_id, 'delivered',
    485000, 0, 0, 485000,
    0.15, 72750,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '21 days', now() - interval '19 days',
    now() - interval '22 days', now() - interval '19 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 2, 173750, 347500),
    (v_order_id, p_carne, '{"name":"Empanadas de Carne — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 1, 137500, 137500);

  -- ── Pedido 2: DELIVERED (hace 10 días) ──────────────────────────────
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0002', 'b2b_mayorista', v_client_id, 'delivered',
    312000, 0, 0, 312000,
    0.15, 46800,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '10 days', now() - interval '8 days',
    now() - interval '11 days', now() - interval '8 days'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pizza_mm4,  '{"name":"Pizza Masa Madre — 4 porciones","unit_label":"pizza 4p","bolsas_caja":8}', 1, 98000,  98000),
    (v_order_id, p_pizza_mand, '{"name":"Pizza de Mandioca — 4 porciones","unit_label":"pizza 4p","bolsas_caja":8}', 1, 92000,  92000),
    (v_order_id, p_chipa,      '{"name":"Chipa Premium — Bocadito","unit_label":"bolsa 500g","bolsas_caja":12}',       2, 61000, 122000);

  -- ── Pedido 3: DESPACHADO (ayer) ─────────────────────────────────────
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, despachado_at, created_at, updated_at
  ) values (
    'B2B-2026-0003', 'b2b_mayorista', v_client_id, 'despachado',
    520000, 0, 0, 520000,
    0.15, 78000,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '2 days', now() - interval '1 day',
    now() - interval '3 days', now() - interval '1 day'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 2, 173750, 347500),
    (v_order_id, p_burg,  '{"name":"Empanadas Cheeseburger — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 1, 137500, 137500),
    (v_order_id, p_mozza, '{"name":"Batoncitos de Mozzarella","unit_label":"bolsa 500g","bolsas_caja":12}', 1, 35000, 35000);

  -- ── Pedido 4: ENVIADO_PROD (en preparación ahora) ───────────────────
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, created_at, updated_at
  ) values (
    'B2B-2026-0004', 'b2b_mayorista', v_client_id, 'enviado_prod',
    390000, 0, 0, 390000,
    0.15, 58500,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '5 hours',
    now() - interval '8 hours', now() - interval '5 hours'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_carne,     '{"name":"Empanadas de Carne — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 1, 137500, 137500),
    (v_order_id, p_pollo_boc, '{"name":"Bocaditos de Pollo","unit_label":"bolsa 500g","bolsas_caja":12}',        2, 50000,  100000),
    (v_order_id, p_pizza_mm4, '{"name":"Pizza Masa Madre — 4 porciones","unit_label":"pizza 4p","bolsas_caja":8}', 1, 98000, 98000),
    (v_order_id, p_chipa,     '{"name":"Chipa Premium — Bocadito","unit_label":"bolsa 500g","bolsas_caja":12}',  1, 54500,  54500);

  -- ── Pedido 5: APROBADO (en cola de producción) ──────────────────────
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    aprobado_por, aprobado_at, created_at, updated_at
  ) values (
    'B2B-2026-0005', 'b2b_mayorista', v_client_id, 'aprobado',
    347500, 0, 0, 347500,
    0.15, 52125,
    'b2b_despacho', 'transferencia', v_zona_id,
    v_admin_id, now() - interval '1 hour',
    now() - interval '2 hours', now() - interval '1 hour'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_pacu,  '{"name":"Empanadas de Pacu — x36","unit_label":"bolsa x36 u","bolsas_caja":6}', 2, 173750, 347500);

  -- ── Pedido 6: PENDING_PAYMENT (recién enviado, esperando aprobación) ─
  insert into public.orders (
    order_number, channel, customer_id, status,
    subtotal, shipping_fee, discount, total,
    ideaia_commission_rate, ideaia_commission_amount,
    shipping_method, payment_method, delivery_zone_id,
    created_at, updated_at
  ) values (
    'B2B-2026-0006', 'b2b_mayorista', v_client_id, 'pending_payment',
    228000, 0, 0, 228000,
    0.15, 34200,
    'b2b_despacho', 'transferencia', v_zona_id,
    now() - interval '20 minutes', now() - interval '20 minutes'
  ) returning id into v_order_id;

  insert into public.order_lines (order_id, product_id, product_snapshot, quantity, unit_price, line_total) values
    (v_order_id, p_mozza,     '{"name":"Batoncitos de Mozzarella","unit_label":"bolsa 500g","bolsas_caja":12}', 2, 35000,  70000),
    (v_order_id, p_pollo_boc, '{"name":"Bocaditos de Pollo","unit_label":"bolsa 500g","bolsas_caja":12}',       2, 50000, 100000),
    (v_order_id, p_pizza_mand,'{"name":"Pizza de Mandioca — 4 porciones","unit_label":"pizza 4p","bolsas_caja":8}', 1, 58000, 58000);

  raise notice 'OK — 6 pedidos creados para el cliente %', v_client_id;
end; $$;
