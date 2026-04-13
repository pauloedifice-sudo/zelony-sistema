-- Bucket e politicas para o modulo Documentos
-- Execute este script no SQL Editor do projeto Supabase usado pelo sistema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Documentos select" on storage.objects;
create policy "Documentos select"
on storage.objects
for select
to public
using (bucket_id = 'documentos');

drop policy if exists "Documentos insert" on storage.objects;
create policy "Documentos insert"
on storage.objects
for insert
to public
with check (bucket_id = 'documentos');

drop policy if exists "Documentos update" on storage.objects;
create policy "Documentos update"
on storage.objects
for update
to public
using (bucket_id = 'documentos')
with check (bucket_id = 'documentos');

drop policy if exists "Documentos delete" on storage.objects;
create policy "Documentos delete"
on storage.objects
for delete
to public
using (bucket_id = 'documentos');
