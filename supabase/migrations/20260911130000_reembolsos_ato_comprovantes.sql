alter table public.reembolsos_ato
  add column if not exists comprovante_nome text,
  add column if not exists comprovante_mime text,
  add column if not exists comprovante_size bigint,
  add column if not exists comprovante_storage_bucket text,
  add column if not exists comprovante_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reembolsos-ato',
  'reembolsos-ato',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','image/jpg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O bucket permanece privado e sem politicas para anon/authenticated.
-- Upload e visualizacao usam URLs assinadas geradas pela Edge Function depois
-- de validar a sessao e o perfil Dono/Financeiro.
