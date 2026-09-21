-- Migración 042: tabla de parámetros globales del sistema de precios
-- IVA y comisión son editables desde /admin/parametros

create table if not exists public.parametros_globales (
  clave          text        primary key,
  valor          numeric     not null,
  descripcion    text,
  actualizado_at timestamptz not null default now(),
  actualizado_por uuid       references auth.users(id)
);

grant all on public.parametros_globales to anon, authenticated, service_role;

alter table public.parametros_globales enable row level security;

create policy "parametros: lectura publica" on public.parametros_globales
  for select using (true);
create policy "parametros: solo service_role escribe" on public.parametros_globales
  for all using (auth.role() = 'service_role');

insert into public.parametros_globales (clave, valor, descripcion) values
  ('iva_pct',      0.21, '21% — se aplica sobre la Lista s/IVA'),
  ('comision_pct', 0.15, '15% sobre la Lista s/IVA (acordado con Alex)')
on conflict (clave) do nothing;

-- Verificación
select clave, valor, descripcion from public.parametros_globales order by clave;
