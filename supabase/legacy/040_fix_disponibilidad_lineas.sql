-- Migración 040: agregar UNIQUE constraint en disponibilidad_lineas
-- El seed de 039 usaba ON CONFLICT DO NOTHING sin constraint, lo que permitía duplicados.

-- Eliminar duplicados: conservar la fila más reciente por linea_id
delete from public.disponibilidad_lineas dl
where id not in (
  select id from public.disponibilidad_lineas dl2
  where dl2.linea_id = dl.linea_id
  order by created_at desc
  limit 1
);

-- Agregar constraint
alter table public.disponibilidad_lineas
  add constraint disponibilidad_lineas_linea_id_key unique (linea_id);
