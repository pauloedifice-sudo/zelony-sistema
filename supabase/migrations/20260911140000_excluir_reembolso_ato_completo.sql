create or replace function public.excluir_reembolso_ato_completo(p_id bigint)
returns table (
  reembolso_id bigint,
  financeiro_lancamento_id_removido bigint,
  comprovante_storage_bucket_removido text,
  comprovante_storage_path_removido text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reembolso public.reembolsos_ato%rowtype;
begin
  select r.*
    into v_reembolso
    from public.reembolsos_ato r
   where r.id = p_id
   for update;

  if not found then
    return;
  end if;

  delete from public.financeiro_lancamentos f
   where f.ref_local = ('fin-reembolso-ato-' || p_id::text)
      or (
        v_reembolso.financeiro_lancamento_id is not null
        and f.id = v_reembolso.financeiro_lancamento_id
      );

  delete from public.reembolsos_ato r
   where r.id = p_id;

  return query
  select
    v_reembolso.id,
    v_reembolso.financeiro_lancamento_id,
    v_reembolso.comprovante_storage_bucket,
    v_reembolso.comprovante_storage_path;
end;
$$;

revoke all on function public.excluir_reembolso_ato_completo(bigint)
  from public, anon, authenticated;

grant execute on function public.excluir_reembolso_ato_completo(bigint)
  to service_role;
