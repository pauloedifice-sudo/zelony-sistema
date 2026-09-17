create or replace function public.concluir_convite_usuario(
  p_token_hash text,
  p_nome text,
  p_tel text,
  p_nasc text,
  p_cpf text,
  p_cep text,
  p_endereco text,
  p_cidade text,
  p_estado text,
  p_banco text,
  p_agencia text,
  p_conta text,
  p_tipo_conta text,
  p_pix_tipo text,
  p_pix text,
  p_senha text
)
returns table (usuario_id bigint, email text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_convite public.convites_usuarios%rowtype;
  v_usuario_status text;
  v_data_ativacao date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select c.*
    into v_convite
    from public.convites_usuarios c
   where c.token_hash = trim(p_token_hash)
   for update;

  if not found or v_convite.usado_em is not null or v_convite.revogado_em is not null then
    raise exception using errcode = 'P0002', message = 'Convite inválido ou já utilizado.';
  end if;
  if v_convite.expira_em <= now() then
    raise exception using errcode = 'P0001', message = 'Este convite expirou. Solicite um novo convite.';
  end if;

  select u.status
    into v_usuario_status
    from public.usuarios u
   where u.id = v_convite.usuario_id
     and lower(trim(u.email)) = lower(trim(v_convite.email))
   for update;

  if not found or lower(trim(coalesce(v_usuario_status, ''))) <> 'pendente' then
    raise exception using errcode = 'P0002', message = 'O usuário deste convite não está mais pendente.';
  end if;

  update public.usuarios u
     set nome = trim(p_nome),
         tel = trim(p_tel),
         status = 'Ativo',
         banco = trim(p_banco),
         agencia = trim(p_agencia),
         conta = trim(p_conta),
         tipo_conta = trim(p_tipo_conta),
         pix_tipo = trim(p_pix_tipo),
         pix = trim(p_pix),
         cpf = trim(p_cpf),
         nasc = trim(p_nasc),
         cep = trim(p_cep),
         endereco = trim(p_endereco),
         cidade = trim(p_cidade),
         estado = upper(trim(p_estado)),
         data_ativacao = coalesce(u.data_ativacao, v_data_ativacao),
         data_inativacao = null,
         historico_status = coalesce(u.historico_status, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object(
             'tipo', 'ativado',
             'data', to_char(v_data_ativacao, 'DD/MM/YYYY'),
             'ts', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
             'por', 'Onboarding',
             'statusAnterior', 'Pendente',
             'statusNovo', 'Ativo',
             'origem', 'convite'
           )
         )
   where u.id = v_convite.usuario_id;

  update public.senhas s
     set senha = p_senha
   where s.email = lower(trim(v_convite.email));

  if not found then
    insert into public.senhas (email, senha)
    values (lower(trim(v_convite.email)), p_senha);
  end if;

  update public.convites_usuarios c
     set usado_em = now()
   where c.id = v_convite.id;

  return query select v_convite.usuario_id, lower(trim(v_convite.email));
end;
$$;

revoke all on function public.concluir_convite_usuario(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;

grant execute on function public.concluir_convite_usuario(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)
  to service_role;
