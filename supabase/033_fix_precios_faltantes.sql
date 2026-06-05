-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Fix precios faltantes (5 productos sin precio)
-- Causa: 031 usa patrones ilike en name que no matchearon:
--   - Bocaditos 500g: el name no contiene "500"
--   - Pacú: el name tiene "Pacu" sin acento, 031 busca "pacú"
-- Solución: UPDATE por SKU directo (sin depender del name)
-- ══════════════════════════════════════════════════════════════════════

-- Bocaditos 500g (10 bolsas/caja · 5 kg/caja)
update public.products
  set bolsas_caja=10, kg_caja=5, precio_dist=74144, precio_gastro=80090, precio_min=87357
  where sku = 'BOC-PACU-500';

update public.products
  set bolsas_caja=10, kg_caja=5, precio_dist=52795, precio_gastro=55971, precio_min=59723
  where sku = 'BOC-POLLO-500';

update public.products
  set bolsas_caja=10, kg_caja=5, precio_dist=49584, precio_gastro=52492, precio_min=55928
  where sku = 'BAT-MOZZA-500';

-- Empanadas (36 u/caja · 5 kg/caja)
update public.products
  set bolsas_caja=36, kg_caja=5, precio_dist=84297, precio_gastro=90944, precio_min=98799
  where sku = 'EMP-PACU-36';

update public.products
  set bolsas_caja=36, kg_caja=5, precio_dist=65415, precio_gastro=70489, precio_min=76485
  where sku = 'EMP-CAPRESE-36';

-- Chipa 500g (nombre "Chipa Premium — Bocadito" no contiene "500")
update public.products
  set bolsas_caja=10, kg_caja=5, precio_dist=55578, precio_gastro=58985, precio_min=63012
  where sku = 'CHIPA-PREM-500';

-- Verificación
select sku, name, precio_dist, precio_gastro, precio_min
from public.products
where sku in ('BOC-PACU-500','BOC-POLLO-500','BAT-MOZZA-500','EMP-PACU-36','EMP-CAPRESE-36','CHIPA-PREM-500')
order by sku;
