-- Bucket de storage para la foto de evidencia (factura/remito) de una
-- recepción, y columna para guardar su URL. Mismo patrón que 007_storage.sql
-- (product-images).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recepciones', 'recepciones', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

do $$ begin
  create policy "recepciones: lectura pública"
    on storage.objects for select
    using (bucket_id = 'recepciones');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "recepciones: subida autenticada"
    on storage.objects for insert
    with check (bucket_id = 'recepciones' and auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "recepciones: actualizar autenticada"
    on storage.objects for update
    using (bucket_id = 'recepciones' and auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "recepciones: borrar autenticada"
    on storage.objects for delete
    using (bucket_id = 'recepciones' and auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

alter table public.recepciones add column if not exists imagen_url text;
