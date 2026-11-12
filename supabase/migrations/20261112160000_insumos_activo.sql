-- Insumos inactivos: se puede archivar un insumo (por ejemplo uno duplicado) sin perder su historial de compras
-- y movimientos. Un insumo inactivo no aparece en la lista, las alertas de stock ni los selectores.
-- La app no deja desactivar un insumo que esté en recetas.
alter table public.insumos add column if not exists activo boolean not null default true;

comment on column public.insumos.activo is
  'false = archivado: no aparece en listas, alertas ni selectores, pero conserva compras y movimientos. Nunca está en recetas.';
