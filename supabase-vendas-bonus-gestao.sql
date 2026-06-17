-- Gestao operacional do bonus nas vendas
-- Execute este script no SQL Editor do projeto Supabase usado pelo sistema.

alter table public.vendas
  add column if not exists bonus_forma text,
  add column if not exists bonus_status text,
  add column if not exists bonus_obs text;

update public.vendas
set
  bonus_forma = case
    when coalesce(bonus, 0) > 0 then coalesce(nullif(trim(bonus_forma), ''), 'comissao')
    else null
  end,
  bonus_status = case
    when coalesce(bonus, 0) > 0 then coalesce(nullif(trim(bonus_status), ''), 'pendente')
    else null
  end,
  bonus_obs = case
    when coalesce(bonus, 0) > 0 then coalesce(bonus_obs, '')
    else null
  end
where bonus_forma is null
   or bonus_status is null
   or bonus_obs is null
   or (coalesce(bonus, 0) <= 0 and (bonus_forma is not null or bonus_status is not null or bonus_obs is not null));
