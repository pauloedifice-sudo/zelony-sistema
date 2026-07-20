-- Corrige a ativacao dos corretores legados:
-- 1. Se houver venda ativa anterior a 2026-07-01, usa a primeira data comercial da venda.
-- 2. Se nao houver venda ativa anterior a 2026-07-01, fixa 2026-07-01.
-- 3. Atualiza tambem o evento de backfill no historico_status para evitar duplicidade no RH.

with parametros as (
  select date '2026-07-01' as data_base
),
usuarios_legado as (
  select
    u.id,
    u.nome,
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
  where lower(
    regexp_replace(
      translate(
        trim(coalesce(u.perfil, '')),
        U&'\00C1\00C0\00C3\00C2\00C4\00E1\00E0\00E3\00E2\00E4\00C9\00C8\00CA\00CB\00E9\00E8\00EA\00EB\00CD\00CC\00CE\00CF\00ED\00EC\00EE\00EF\00D3\00D2\00D5\00D4\00D6\00F3\00F2\00F5\00F4\00F6\00DA\00D9\00DB\00DC\00FA\00F9\00FB\00FC\00C7\00E7',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) = 'corretor'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(u.historico_status, '[]'::jsonb)) as evento
      where lower(trim(coalesce(evento->>'origem', ''))) = 'backfill_ativacao_legado'
        and lower(trim(coalesce(evento->>'tipo', ''))) in ('ativado', 'reativado')
    )
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
        when trim(coalesce(h.elem->>'d', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (h.elem->>'d')::date
        when trim(coalesce(h.elem->>'d', '')) ~ '^\d{2}/\d{2}/\d{4}$' then to_date(h.elem->>'d', 'DD/MM/YYYY')
        when trim(coalesce(h.elem->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}(T|t|\s)' then (h.elem->>'ts')::timestamptz::date
        when trim(coalesce(h.elem->>'ts', '')) ~ '^\d{4}-\d{2}-\d{2}$' then (h.elem->>'ts')::date
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
primeira_venda_ativa as (
  select
    ul.id,
    min(vb.data_venda) filter (where vb.data_venda < p.data_base) as data_primeira_venda_antes_base
  from usuarios_legado ul
  cross join parametros p
  left join vendas_base vb on vb.corretor_key = ul.nome_key
  group by ul.id
),
ativacao_corrigida as (
  select
    ul.id,
    case
      when lower(trim(coalesce(ul.status, ''))) = 'pendente' then null
      when pva.data_primeira_venda_antes_base is not null then pva.data_primeira_venda_antes_base
      else p.data_base
    end as data_ativacao_corrigida
  from usuarios_legado ul
  cross join parametros p
  left join primeira_venda_ativa pva on pva.id = ul.id
),
usuarios_atualizados as (
  update public.usuarios u
  set data_ativacao = ac.data_ativacao_corrigida
  from ativacao_corrigida ac
  where u.id = ac.id
    and ac.data_ativacao_corrigida is not null
    and u.data_ativacao is distinct from ac.data_ativacao_corrigida
  returning u.id
),
historico_corrigido as (
  select
    ul.id,
    jsonb_agg(
      case
        when lower(trim(coalesce(h.evento->>'origem', ''))) = 'backfill_ativacao_legado'
          and lower(trim(coalesce(h.evento->>'tipo', ''))) in ('ativado', 'reativado')
        then (h.evento - 'data' - 'ts') || jsonb_build_object(
          'data', to_char(ac.data_ativacao_corrigida, 'DD/MM/YYYY'),
          'ts', to_char(ac.data_ativacao_corrigida, 'YYYY-MM-DD') || 'T12:00:00.000Z'
        )
        else h.evento
      end
      order by h.ord
    ) as historico_status_corrigido
  from usuarios_legado ul
  join ativacao_corrigida ac on ac.id = ul.id
  join lateral jsonb_array_elements(ul.historico_status) with ordinality as h(evento, ord) on true
  where ac.data_ativacao_corrigida is not null
  group by ul.id
)
update public.usuarios u
set historico_status = hc.historico_status_corrigido
from historico_corrigido hc
where u.id = hc.id
  and coalesce(u.historico_status, '[]'::jsonb) is distinct from hc.historico_status_corrigido;
