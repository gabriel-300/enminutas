-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 007: Storage para imágenes de productos
-- Correr en SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════════════

-- Bucket público para imágenes de productos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Columna para imágenes adicionales (hasta 4 extras + cover_image_url = 5 total)
alter table public.products
  add column if not exists extra_images text[] default '{}'::text[];

-- Lectura pública (cualquiera puede ver las imágenes)
do $$ begin
  create policy "product-images: lectura pública"
    on storage.objects for select
    using (bucket_id = 'product-images');
exception when duplicate_object then null; end $$;

-- Solo usuarios autenticados pueden subir
do $$ begin
  create policy "product-images: subida autenticada"
    on storage.objects for insert
    with check (
      bucket_id = 'product-images'
      and auth.role() = 'authenticated'
    );
exception when duplicate_object then null; end $$;

-- Solo usuarios autenticados pueden actualizar y borrar
do $$ begin
  create policy "product-images: actualizar autenticada"
    on storage.objects for update
    using (
      bucket_id = 'product-images'
      and auth.role() = 'authenticated'
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "product-images: borrar autenticada"
    on storage.objects for delete
    using (
      bucket_id = 'product-images'
      and auth.role() = 'authenticated'
    );
exception when duplicate_object then null; end $$;
