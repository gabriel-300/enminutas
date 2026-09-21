-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Seed B2B: costos, márgenes y datos de prueba
-- Correr DESPUÉS de 002_b2b_schema.sql y 003_phase2_triggers.sql
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Zonas de entrega B2B — confirmar flete_kg ─────────────────────
-- Si ya existen de 002_b2b_schema.sql, solo actualiza los valores

update public.delivery_zones set flete_kg = 450
where name ilike '%posadas%' or name ilike '%costanera%' or name ilike '%NEA%';

update public.delivery_zones set flete_kg = 450
where name ilike '%Posadas / NEA%';

update public.delivery_zones set flete_kg = 1335
where name ilike '%rosario%';

update public.delivery_zones set flete_kg = 1450
where name ilike '%buenos aires%' or name ilike '%CABA%';

update public.delivery_zones set flete_kg = 1280
where name ilike '%córdoba%' or name ilike '%cordoba%';

-- ── 2. Datos B2B de productos ─────────────────────────────────────────
-- costo      = costo de producción por unidad (bolsa/caja/pizza)
-- kg_caja    = peso total de una caja de despacho en kg
-- bolsas_caja= unidades por caja de despacho
-- pkg_unitario= costo de packaging por unidad (bolsa + etiqueta)
-- pkg_bulto  = costo de packaging por caja (caja + film + frío)
-- mult_bolsas= true: precio × bolsas_caja; false: precio por caja directo
-- márgenes   = fracción, ej: 0.38 = 38%

-- ── Bocaditos (bolsa 500g · 12 u/caja) ───────────────────────────────
update public.products set
  costo         = 1800,
  kg_caja       = 6.0,
  bolsas_caja   = 12,
  pkg_unitario  = 65,
  pkg_bulto     = 380,
  mult_bolsas   = true,
  margen_dist   = 0.38,
  margen_gastro = 0.43,
  margen_min    = 0.48
where sku = 'BOC-PACU-500';

update public.products set
  costo         = 1500,
  kg_caja       = 6.0,
  bolsas_caja   = 12,
  pkg_unitario  = 60,
  pkg_bulto     = 350,
  mult_bolsas   = true,
  margen_dist   = 0.36,
  margen_gastro = 0.41,
  margen_min    = 0.46
where sku = 'BAT-MOZZA-500';

update public.products set
  costo         = 1350,
  kg_caja       = 6.0,
  bolsas_caja   = 12,
  pkg_unitario  = 60,
  pkg_bulto     = 350,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku = 'BOC-POLLO-500';

-- ── Chipas ────────────────────────────────────────────────────────────
-- Chipa Premium (bolsa 360g · 12 u/caja = 4.32 kg)
update public.products set
  costo         = 1200,
  kg_caja       = 4.3,
  bolsas_caja   = 12,
  pkg_unitario  = 55,
  pkg_bulto     = 320,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku = 'CHIPA-PREM-500';

-- Chipa Long × 30 (caja 3.45 kg · 4 cajas/bulto = 13.8 kg)
update public.products set
  costo         = 3800,
  kg_caja       = 13.8,
  bolsas_caja   = 4,
  pkg_unitario  = 220,
  pkg_bulto     = 550,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku = 'CHIPA-LONG-30';

-- ── Pizzas ────────────────────────────────────────────────────────────
-- Pizza Mandioca 4p (580g · 8 pizzas/caja = 4.64 kg)
update public.products set
  costo         = 3000,
  kg_caja       = 4.6,
  bolsas_caja   = 8,
  pkg_unitario  = 130,
  pkg_bulto     = 420,
  mult_bolsas   = true,
  margen_dist   = 0.36,
  margen_gastro = 0.41,
  margen_min    = 0.46
where sku = 'PIZ-MAND-4P';

-- Pizza Masa Madre 4p (620g · 8 pizzas/caja = 4.96 kg)
update public.products set
  costo         = 3200,
  kg_caja       = 5.0,
  bolsas_caja   = 8,
  pkg_unitario  = 130,
  pkg_bulto     = 420,
  mult_bolsas   = true,
  margen_dist   = 0.36,
  margen_gastro = 0.41,
  margen_min    = 0.46
where sku = 'PIZ-MM-4P';

-- Pizza Masa Madre 8p (1200g · 4 pizzas/caja = 4.8 kg)
update public.products set
  costo         = 6000,
  kg_caja       = 4.8,
  bolsas_caja   = 4,
  pkg_unitario  = 200,
  pkg_bulto     = 450,
  mult_bolsas   = true,
  margen_dist   = 0.36,
  margen_gastro = 0.41,
  margen_min    = 0.46
where sku = 'PIZ-MM-8P';

-- ── Empanadas (bolsa x36 · 1.44 kg · 6 bolsas/caja = 8.64 kg) ────────
update public.products set
  costo         = 12000,    -- pacu es el premium
  kg_caja       = 8.6,
  bolsas_caja   = 6,
  pkg_unitario  = 160,
  pkg_bulto     = 620,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku = 'EMP-PACU-36';

update public.products set
  costo         = 8500,
  kg_caja       = 8.6,
  bolsas_caja   = 6,
  pkg_unitario  = 150,
  pkg_bulto     = 600,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku in ('EMP-CARNE-36', 'EMP-BURG-36');

update public.products set
  costo         = 7500,
  kg_caja       = 8.6,
  bolsas_caja   = 6,
  pkg_unitario  = 150,
  pkg_bulto     = 600,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku = 'EMP-POLLO-36';

update public.products set
  costo         = 6500,
  kg_caja       = 8.6,
  bolsas_caja   = 6,
  pkg_unitario  = 150,
  pkg_bulto     = 600,
  mult_bolsas   = true,
  margen_dist   = 0.35,
  margen_gastro = 0.40,
  margen_min    = 0.45
where sku in ('EMP-HUMITA-36', 'EMP-CAPRESE-36');

-- ── 3. Verificación de precios ────────────────────────────────────────
-- Muestra el precio c/IVA para todos los productos,
-- para Distribuidor en Posadas/NEA (flete $450/kg)

select
  p.name,
  p.sku,
  p.bolsas_caja,
  p.kg_caja,
  (public.calc_precio_b2b(
    p.costo, p.kg_caja, p.bolsas_caja,
    p.pkg_unitario, p.pkg_bulto, p.mult_bolsas,
    p.margen_dist, 450, 0.15
  ) ->> 'total_civa')::numeric as total_civa_dist,
  (public.calc_precio_b2b(
    p.costo, p.kg_caja, p.bolsas_caja,
    p.pkg_unitario, p.pkg_bulto, p.mult_bolsas,
    p.margen_gastro, 450, 0.15
  ) ->> 'total_civa')::numeric as total_civa_gastro
from public.products p
where p.costo is not null
order by p.name;

-- ── 4. Clientes B2B de prueba ─────────────────────────────────────────
-- Para crear usuarios de prueba:
-- 1. Ir a Supabase → Authentication → Add user
--    o usar el formulario en /registro de la app
--
-- Datos sugeridos:
--   Empresa: "Restaurante La Misionera"   · gastro · Posadas/NEA
--   Empresa: "Distribuidora El Litoral"   · dist   · Posadas/NEA
--   Empresa: "Minimarket San Lorenzo"     · min    · Rosario
--   Empresa: "Hotel & Spa Cataratas"      · gastro · Córdoba
--
-- Una vez registrados y aprobados desde /admin/clientes-b2b,
-- sus precios se calculan automáticamente con los datos de arriba.
