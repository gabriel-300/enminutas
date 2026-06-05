-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Precios B2B finales por producto (del PDF lista_precio)
-- TOTAL C/IVA por caja según canal
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- EMPANADAS (36 u/caja · 5 kg/caja)
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=55011, precio_gastro=59217, precio_min=64189 where name ilike '%carne%' and name ilike '%empanada%' and name not ilike '%cuchi%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=55011, precio_gastro=59217, precio_min=64189 where name ilike '%pollo%' and name ilike '%empanada%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=46533, precio_gastro=50034, precio_min=54170 where name ilike '%verdura%' and name ilike '%empanada%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=46533, precio_gastro=50034, precio_min=54170 where name ilike '%acelga%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=51543, precio_gastro=55460, precio_min=60090 where name ilike '%humita%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=63874, precio_gastro=68819, precio_min=74663 where name ilike '%jamón%' or name ilike '%jamon%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=58479, precio_gastro=62974, precio_min=68287 where name ilike '%cebolla%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=65415, precio_gastro=70489, precio_min=76485 where name ilike '%caprese%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=84297, precio_gastro=90944, precio_min=98799 where name ilike '%pacú%' and name ilike '%empanada%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=81599, precio_gastro=88021, precio_min=95611 where name ilike '%cuchi%';
update public.products set bolsas_caja=36, kg_caja=5, precio_dist=75434, precio_gastro=81342, precio_min=88325 where name ilike '%cheese%' or name ilike '%cheeseburger%' or name ilike '%cheeseburguer%';

-- BOCADITOS x500g (10 bolsas/caja · 5 kg/caja)
update public.products set bolsas_caja=10, kg_caja=5, precio_dist=74144, precio_gastro=80090, precio_min=87357 where name ilike '%pacú%' and name ilike '%500%';
update public.products set bolsas_caja=10, kg_caja=5, precio_dist=52795, precio_gastro=55971, precio_min=59723 where name ilike '%pollo%' and name ilike '%500%';
update public.products set bolsas_caja=10, kg_caja=5, precio_dist=49584, precio_gastro=52492, precio_min=55928 where (name ilike '%mozzarella%' or name ilike '%mozz%') and name ilike '%500%';

-- BOCADITOS x2kg (10 bolsas/caja · 10 kg/caja)
update public.products set bolsas_caja=10, kg_caja=10, precio_dist=250109, precio_gastro=274144, precio_min=303520 where name ilike '%pacú%' and name ilike '%2kg%';
update public.products set bolsas_caja=10, kg_caja=10, precio_dist=162181, precio_gastro=174883, precio_min=189895 where name ilike '%pollo%' and name ilike '%2kg%';
update public.products set bolsas_caja=10, kg_caja=10, precio_dist=149337, precio_gastro=160968, precio_min=174715 where (name ilike '%mozzarella%' or name ilike '%mozz%') and name ilike '%2kg%';
update public.products set bolsas_caja=10, kg_caja=10, precio_dist=62889,  precio_gastro=68202,  precio_min=74695  where name ilike '%mandioca%' and name ilike '%2kg%' and name not ilike '%noisette%';
update public.products set bolsas_caja=10, kg_caja=10, precio_dist=62889,  precio_gastro=68202,  precio_min=74695  where name ilike '%noisette%';

-- CHIPAS (precios por caja)
update public.products set bolsas_caja=4,  kg_caja=14, precio_dist=122957, precio_gastro=156764, precio_min=143446 where name ilike '%long%' and (name ilike '%chipa%' or name ilike '%chip%');
update public.products set bolsas_caja=1,  kg_caja=10, precio_dist=89053,  precio_gastro=113592, precio_min=103925 where name ilike '%10kg%' and (name ilike '%chipa%' or name ilike '%chip%');
update public.products set bolsas_caja=10, kg_caja=5,  precio_dist=55578,  precio_gastro=58985,  precio_min=63012  where (name ilike '%chipa%' or name ilike '%chip%') and name ilike '%500%';

-- PIZZAS (10 u/caja · 7 kg/caja)
update public.products set bolsas_caja=10, kg_caja=7, precio_dist=111310, precio_gastro=119909, precio_min=130071 where name ilike '%pizza%' and (name ilike '%mozz%' or name ilike '%mozzarella%') and name not ilike '%4p%';
update public.products set bolsas_caja=10, kg_caja=7, precio_dist=60467,  precio_gastro=64829,  precio_min=69984  where name ilike '%pizza%' and name ilike '%masa%' and name ilike '%4p%';
update public.products set bolsas_caja=10, kg_caja=7, precio_dist=64924,  precio_gastro=70604,  precio_min=77546  where name ilike '%pizza%' and name ilike '%mandioca%';

-- Verificación
select name, bolsas_caja, kg_caja, precio_dist, precio_gastro, precio_min
from public.products
where precio_dist is not null
order by name;
