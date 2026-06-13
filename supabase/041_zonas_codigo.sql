-- Migración 041: agregar código corto a delivery_zones y corregir capacidad_kg
-- El spec define códigos POS/OBE/IGU/ROS/BSAS/COR y capacidad 1.200 kg

alter table public.delivery_zones
  add column if not exists codigo varchar(6);

-- Corregir capacidad_kg a 1200 (spec dice 1.200 kg, la migración 039 puso 1500)
update public.delivery_zones set capacidad_kg = 1200 where capacidad_kg = 1500;

-- Seed de códigos por nombre
update public.delivery_zones set codigo = 'POS' where name ilike '%posadas%' or name ilike '%nea%';
update public.delivery_zones set codigo = 'OBE' where name ilike '%ober%';
update public.delivery_zones set codigo = 'IGU' where name ilike '%igua%';
update public.delivery_zones set codigo = 'ROS' where name ilike '%rosario%';
update public.delivery_zones set codigo = 'BSAS' where name ilike '%buenos aires%' or name ilike '%bsas%';
update public.delivery_zones set codigo = 'COR' where name ilike '%c%rdoba%';

-- Verificación
select codigo, name, km, precio_km, capacidad_kg,
       (km * 2 * precio_km) as costo_viaje
from public.delivery_zones
order by km;
