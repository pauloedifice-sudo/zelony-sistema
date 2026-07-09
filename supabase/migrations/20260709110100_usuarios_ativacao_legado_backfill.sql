-- Backfill da data de ativacao dos usuarios legados.
-- Regra:
-- 1. Mantem data_ativacao ja gravada.
-- 2. Usa a primeira ativacao/reativacao real do historico quando existir.
-- 3. Usa a primeira venda somente se ela for anterior a 2026-07-01.
-- 4. Caso contrario, fixa 2026-07-01 para o legado sem venda previa.

with parametros as (
  select date '2026-07-01' as data_base
),
usuarios_base as (
  select
    u.id,
    u.status,
    u.data_ativacao,
    coalesce(u.historico_status, '[]'::jsonb) as historico_status,
    lower(
      regexp_replace(
        translate(
          trim(coalesce(u.nome, '')),
          U&'\00C1\00C0\00C3\00C2\00C4\00E1\00E0\00E3\00E2\00E4\00C9\00C8\00CA\00CB\00E9\00E8\00EA\00EB\00CD\00CC\00CE\00CF\00ED\00EC\00EE\00EF\00D3\00D2\00D5\00D4\00D6\00F3\00F2\00F5\00F4\00F6\00DA\00D9\00DB\00DC\00FA\00F9\00FB\00FC\00C7\00E7',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as nome_key
  from public.usuarios u
),
historico_ativacao as (
  select
    ub.id,
    min(
      case
        when trim(coalesce(evento->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}(T|t|\s)' then (evento->>'ts')::timestamptz::date
        when trim(coalesce(evento->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (evento->>'ts')::date
        when trim(coalesce(evento->>'data', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (evento->>'data')::date
        when trim(coalesce(evento->>'data', '')) ~ '^\d{2}/\d{2}/\d{4}$' then to_date(evento->>'data', 'DD/MM/YYYY')
        else null
      end
    ) as data_hist
  from usuarios_base ub
  join lateral jsonb_array_elements(ub.historico_status) as evento on true
  where lower(trim(coalesce(evento->>'tipo', ''))) in ('ativado', 'reativado')
  group by ub.id
),
vendas_base as (
  select
    lower(
      regexp_replace(
        translate(
          trim(coalesce(v.corretor, '')),
          U&'\00C1\00C0\00C3\00C2\00C4\00E1\00E0\00E3\00E2\00E4\00C9\00C8\00CA\00CB\00E9\00E8\00EA\00EB\00CD\00CC\00CE\00CF\00ED\00EC\00EE\00EF\00D3\00D2\00D5\00D4\00D6\00F3\00F2\00F5\00F4\00F6\00DA\00D9\00DB\00DC\00FA\00F9\00FB\00FC\00C7\00E7',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) as corretor_key,
    coalesce(
      fluxo.data_ref,
      case
        when trim(coalesce(v.data, '')) ~ '^\d{4}-\d{2}-\d{2}$' then trim(v.data)::date
        when trim(coalesce(v.data, '')) ~ '^\d{2}/\d{2}/\d{4}$' then to_date(trim(v.data), 'DD/MM/YYYY')
        else null
      end
    ) as data_venda
  from public.vendas v
  left join lateral (
    select
      case
        when trim(coalesce(h.elem->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}(T|t|\s)' then (h.elem->>'ts')::timestamptz::date
        when trim(coalesce(h.elem->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (h.elem->>'ts')::date
        when trim(coalesce(h.elem->>'d', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (h.elem->>'d')::date
        when trim(coalesce(h.elem->>'d', '')) ~ '^\d{2}/\d{2}/\d{4}$' then to_date(h.elem->>'d', 'DD/MM/YYYY')
        else null
      end as data_ref
    from jsonb_array_elements(coalesce(v.hist::jsonb, '[]'::jsonb)) with ordinality as h(elem, ord)
    where lower(trim(coalesce(h.elem->>'tipo', ''))) not in (
      'edicao',
      'distrato',
      'reversao',
      'obs',
      'pend_comercial',
      'pend_comercial_editada',
      'pend_comercial_resolvida',
      'corretor_vinculo',
      'prev_receb_manual',
      'prev_receb_editada'
    )
    order by h.ord
    limit 1
  ) fluxo on true
  where coalesce(v.distratada, false) = false
),
primeira_venda as (
  select
    ub.id,
    min(vb.data_venda) as data_primeira_venda
  from usuarios_base ub
  join vendas_base vb on vb.corretor_key = ub.nome_key
  where vb.data_venda is not null
  group by ub.id
),
ativacao_final as (
  select
    ub.id,
    case
      when ub.data_ativacao is not null then ub.data_ativacao
      when ha.data_hist is not null then ha.data_hist
      when lower(trim(coalesce(ub.status, ''))) = 'pendente' then null
      when pv.data_primeira_venda is not null and pv.data_primeira_venda < p.data_base then pv.data_primeira_venda
      else p.data_base
    end as data_ativacao_final
  from usuarios_base ub
  cross join parametros p
  left join historico_ativacao ha on ha.id = ub.id
  left join primeira_venda pv on pv.id = ub.id
)
update public.usuarios u
set data_ativacao = af.data_ativacao_final
from ativacao_final af
where u.id = af.id
  and af.data_ativacao_final is not null
  and u.data_ativacao is distinct from af.data_ativacao_final;

with usuarios_sem_evento as (
  select
    u.id,
    u.data_ativacao,
    coalesce(u.historico_status, '[]'::jsonb) as historico_status
  from public.usuarios u
  where u.data_ativacao is not null
    and lower(trim(coalesce(u.status, ''))) <> 'pendente'
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(u.historico_status, '[]'::jsonb)) as evento
      where lower(trim(coalesce(evento->>'tipo', ''))) in ('ativado', 'reativado')
    )
)
update public.usuarios u
set historico_status = usev.historico_status || jsonb_build_array(
  jsonb_build_object(
    'tipo', 'ativado',
    'data', to_char(usev.data_ativacao, 'DD/MM/YYYY'),
    'ts', to_char(usev.data_ativacao, 'YYYY-MM-DD') || 'T12:00:00.000Z',
    'por', 'Sistema',
    'statusAnterior', '',
    'statusNovo', 'Ativo',
    'origem', 'backfill_ativacao_legado'
  )
)
from usuarios_sem_evento usev
where u.id = usev.id;
