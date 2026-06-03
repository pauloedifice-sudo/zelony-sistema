-- Idempotencia para o cadastro de vendas
-- Execute este script no SQL Editor do projeto Supabase usado pelo sistema.

alter table public.vendas
  add column if not exists ref_local text;

update public.vendas
set ref_local = concat('db:', id)
where ref_local is null;

create unique index if not exists idx_vendas_ref_local
  on public.vendas (ref_local)
  where ref_local is not null;
