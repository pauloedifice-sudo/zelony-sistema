create table if not exists public.usuario_sessoes_app (
  usuario_id bigint primary key references public.usuarios(id) on delete cascade,
  email text not null,
  token text not null unique,
  expira_em timestamptz not null,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

create index if not exists usuario_sessoes_app_token_idx
  on public.usuario_sessoes_app (token);

create index if not exists usuario_sessoes_app_expira_em_idx
  on public.usuario_sessoes_app (expira_em);

alter table public.usuario_sessoes_app enable row level security;

revoke all on public.usuario_sessoes_app from public;
revoke all on public.usuario_sessoes_app from anon;
revoke all on public.usuario_sessoes_app from authenticated;
