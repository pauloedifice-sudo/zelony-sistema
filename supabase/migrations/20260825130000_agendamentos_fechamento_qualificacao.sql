alter table public.agendamentos add column if not exists renda_bruta_familiar numeric(14,2);
alter table public.agendamentos add column if not exists tipo_imovel_interesse text;
alter table public.agendamentos add column if not exists finalidade_imovel text;
alter table public.agendamentos add column if not exists assinou_proposta_compra boolean;
alter table public.agendamentos add column if not exists pagou_ato boolean;

alter table public.agendamentos drop constraint if exists agendamentos_fechamento_concluido_dados_check;
alter table public.agendamentos add constraint agendamentos_fechamento_concluido_dados_check
  check (
    tipo_visita <> 'Fechamento'
    or situacao <> 'Concluída'
    or (
      renda_bruta_familiar is not null
      and renda_bruta_familiar > 0
      and tipo_imovel_interesse is not null
      and finalidade_imovel is not null
      and assinou_proposta_compra is not null
      and pagou_ato is not null
    )
  ) not valid;
