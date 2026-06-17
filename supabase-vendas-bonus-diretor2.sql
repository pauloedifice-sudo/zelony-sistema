-- Bonus separado para o Diretor 2 nas vendas
-- Execute este script no SQL Editor do projeto Supabase usado pelo sistema.

alter table public.vendas
  add column if not exists bonus_pct_dir2 numeric default 0;

update public.vendas
set bonus_pct_dir2 = 0
where bonus_pct_dir2 is null;
