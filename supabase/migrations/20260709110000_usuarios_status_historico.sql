alter table public.usuarios
  add column if not exists data_ativacao date,
  add column if not exists data_inativacao date,
  add column if not exists historico_status jsonb not null default '[]'::jsonb;

comment on column public.usuarios.data_ativacao is 'Data em que o usuario entrou na operacao ativa.';
comment on column public.usuarios.data_inativacao is 'Data da inativacao mais recente do usuario.';
comment on column public.usuarios.historico_status is 'Linha do tempo com ativacoes, inativacoes, reativacoes e trocas de equipe.';
