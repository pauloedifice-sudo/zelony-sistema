alter table public.agendamentos add column if not exists renda_bruta_familiar numeric(14,2);
alter table public.agendamentos add column if not exists local_compra text;
alter table public.agendamentos add column if not exists tipo_imovel_interesse text;
alter table public.agendamentos add column if not exists finalidade_imovel text;

alter table public.agendamentos drop constraint if exists agendamentos_local_compra_check;
alter table public.agendamentos add constraint agendamentos_local_compra_check
  check (local_compra is null or local_compra in ('Curitiba', 'Região metropolitana')) not valid;

alter table public.agendamentos drop constraint if exists agendamentos_tipo_imovel_interesse_check;
alter table public.agendamentos add constraint agendamentos_tipo_imovel_interesse_check
  check (tipo_imovel_interesse is null or tipo_imovel_interesse in ('Casa', 'Apartamento')) not valid;

alter table public.agendamentos drop constraint if exists agendamentos_finalidade_imovel_check;
alter table public.agendamentos add constraint agendamentos_finalidade_imovel_check
  check (finalidade_imovel is null or finalidade_imovel in ('Moradia', 'Investimento')) not valid;

alter table public.agendamentos drop constraint if exists agendamentos_documentacao_recebida_dados_check;
alter table public.agendamentos add constraint agendamentos_documentacao_recebida_dados_check
  check (
    tipo_visita <> 'Envio de documentacao online'
    or situacao <> 'Concluída'
    or (
      renda_bruta_familiar is not null
      and renda_bruta_familiar > 0
      and local_compra is not null
      and tipo_imovel_interesse is not null
      and finalidade_imovel is not null
    )
  ) not valid;
