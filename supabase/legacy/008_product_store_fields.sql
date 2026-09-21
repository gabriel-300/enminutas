-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 008: Campos de tienda en productos
-- Correr en SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists slug              text unique,
  add column if not exists short_description text,
  add column if not exists description       text,
  add column if not exists cooking_methods   text[] default '{}'::text[],
  add column if not exists freezer_required  boolean default true,
  add column if not exists min_quantity_b2b  integer default 1;

-- Auto-generar slug desde el nombre para productos existentes
update public.products
set slug = lower(
  regexp_replace(
    regexp_replace(
      translate(name, 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || lower(regexp_replace(sku, '[^a-zA-Z0-9]', '-', 'g'))
where slug is null;

-- Función para generar slug al insertar/actualizar
create or replace function public.products_set_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(
      regexp_replace(
        regexp_replace(
          translate(new.name, 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU'),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    ) || '-' || lower(regexp_replace(new.sku, '[^a-zA-Z0-9]', '-', 'g'));
  end if;
  return new;
end; $$;

drop trigger if exists products_slug_trigger on public.products;
create trigger products_slug_trigger
  before insert or update on public.products
  for each row execute function public.products_set_slug();
