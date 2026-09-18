-- Etapa 1 da migração de login para o Supabase Auth.
--
-- Adiciona uma coluna que liga cada linha de `usuarios` à conta oficial
-- correspondente no sistema de login do Supabase (`auth.users`). A coluna
-- começa vazia (null) para todo mundo e é preenchida pela função temporária
-- `migrate-create-auth-users` na primeira execução.
--
-- Esta migração é 100% aditiva: não altera nem remove nada que já existe,
-- não muda o comportamento do sistema para os usuários atuais.

alter table public.usuarios
  add column if not exists auth_user_id uuid unique;

create index if not exists usuarios_auth_user_id_idx
  on public.usuarios (auth_user_id);

comment on column public.usuarios.auth_user_id is
  'ID da conta correspondente em auth.users (Supabase Auth). Preenchido pela migração de login; usado pelas políticas de RLS para saber quem está de fato logado.';
