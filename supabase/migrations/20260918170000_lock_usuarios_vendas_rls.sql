-- etapa 3 da migração de login para o Supabase Auth.
--
-- Fecha a falha de segurança encontrada nesta migração: hoje, as tabelas
-- `usuarios` e `vendas` podem ser lidas por QUALQUER pessoa que tenha a
-- chave pública do sistema (a "anon key") — e essa chave é pública por
-- natureza, ela vai em todo carregamento da página, então isso expõe dados
-- sensíveis (inclusive dados bancários e PIX de todos os funcionários) sem
-- exigir login nenhum.
--
-- Pré-requisitos já concluídos antes desta etapa:
--  - etapa 1: toda conta de `usuarios` já tem uma conta oficial equivalente
--    no Supabase Auth (auth_user_id preenchido), com a MESMA senha de hoje.
--  - etapa 2: a tela de login já usa o Supabase Auth de verdade, e a
--    checagem de e-mail/status na tela de login não depende mais de ler a
--    tabela `usuarios` sem estar logado (ver ação `check_login_email` em
--    supabase/functions/usuario-self-service).
--
-- O que esta migração faz:
--  - Liga o RLS (Row Level Security) em `usuarios` e `vendas`.
--  - Permite acesso total — leitura e escrita — só para quem estiver
--    autenticado de verdade (logado pelo Supabase Auth). Não restringe
--    nada além disso: não muda o que cada perfil pode ver ou fazer dentro
--    do sistema, só passa a exigir estar logado. Isso é exatamente o
--    mesmo nível de acesso que já existe hoje para quem está logado — a
--    única mudança é que visitantes sem login deixam de conseguir ler
--    essas tabelas.
--
-- Sem isso, qualquer visitante sem login consegue ler todos os dados
-- dessas duas tabelas.

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_authenticated_all" on public.usuarios;
create policy "usuarios_authenticated_all"
  on public.usuarios
  for all
  to authenticated
  using (true)
  with check (true);

alter table public.vendas enable row level security;

drop policy if exists "vendas_authenticated_all" on public.vendas;
create policy "vendas_authenticated_all"
  on public.vendas
  for all
  to authenticated
  using (true)
  with check (true);
