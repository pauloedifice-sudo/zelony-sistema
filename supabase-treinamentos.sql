-- Estrutura minima para compartilhar treinamentos entre todos os acessos.
-- Sem essas colunas, os videos ficam apenas no navegador/localStorage
-- de quem cadastrou o treinamento.

alter table if exists public.treinamentos
  add column if not exists videos jsonb not null default '[]'::jsonb;

alter table if exists public.treinamentos
  add column if not exists obrigatorio boolean not null default false;

alter table if exists public.treinamentos
  add column if not exists prerequisito text not null default '';

update public.treinamentos
set videos = '[]'::jsonb
where videos is null;

update public.treinamentos
set prerequisito = ''
where prerequisito is null;

