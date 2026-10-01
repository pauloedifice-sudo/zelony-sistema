-- Reajuste da alíquota de imposto sobre comissão: de 11% para 12,75%.
--
-- Contexto: o imposto que a Zelony paga sobre as vendas mudou de 11% para
-- 12,75%. Este script atualiza o campo `imp` (fração, ex.: 0.11 = 11%) de
-- todas as vendas que ainda estão em andamento — ou seja, que ainda não
-- tiveram a comissão recebida — para a nova alíquota.
--
-- O que NÃO é alterado (por pedido explícito do diretor, 01/10/2026):
--  - Vendas na etapa "Comissão recebida" (índice 8) — a comissão já foi
--    paga com o imposto antigo, então esse histórico financeiro fica
--    intacto.
--  - Vendas distratadas (canceladas) — não fazem parte do fluxo de
--    comissão ativo.
--  - Vendas cujo imposto atual já não seja exatamente 11% — por
--    segurança, só tocamos em vendas que estão exatamente na alíquota
--    antiga. Se alguma venda já tem um valor diferente por outro motivo,
--    ela é deixada como está (a consulta 1c abaixo mostra quais são).
--
-- Etapas afetadas (índices 0 a 7 no array ETAPAS do app, js/vendas.js):
--   0 Aguardando demanda      4 Entrevista Caixa
--   1 Entrevista              5 Aguard. Ass. CEF
--   2 Ass. formulários        6 Assinado CEF
--   3 Envio CEHOP             7 Nota emitida
--   (8 Comissão recebida — propositalmente FORA do alcance deste script)
--
-- COMO USAR no Editor SQL do Supabase:
--  1) Selecione e rode SÓ as consultas da seção 1 (são somente leitura,
--     não alteram nada). Confira se a lista e a contagem fazem sentido.
--  2) Depois de revisar, selecione e rode SÓ o UPDATE da seção 2.
--  3) Rode a conferência da seção 3 para confirmar o resultado.

-- ============================================================
-- 1) PRÉVIA — somente leitura, pode rodar quantas vezes quiser
-- ============================================================

-- 1a) Lista das vendas que SERÃO atualizadas (11% -> 12,75%):
select
  id,
  cliente,
  etapa,
  imp as imposto_atual,
  valor,
  data
from public.vendas
where distratada is not true
  and etapa < 8
  and abs(imp - 0.11) < 0.0001
order by etapa, data;

-- 1b) Quantas vendas serão afetadas:
select count(*) as total_vendas_afetadas
from public.vendas
where distratada is not true
  and etapa < 8
  and abs(imp - 0.11) < 0.0001;

-- 1c) Transparência: vendas nessas mesmas etapas que NÃO serão tocadas
-- por já estarem com um imposto diferente de 11% (ou nulo). Confira se
-- faz sentido deixá-las como estão.
select id, cliente, etapa, imp as imposto_atual
from public.vendas
where distratada is not true
  and etapa < 8
  and (imp is null or abs(imp - 0.11) >= 0.0001)
order by etapa, data;

-- ============================================================
-- 2) ATUALIZAÇÃO — só rode depois de revisar a seção 1
-- ============================================================

update public.vendas
set
  imp = 0.1275,
  hist = coalesce(hist, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'e', etapa,
      'u', 'Sistema',
      'o', 'Imposto sobre comissão atualizado de 11% para 12,75% (ajuste de alíquota, outubro/2026)',
      'tipo', 'edicao',
      'd', to_char(now(), 'DD/MM/YYYY'),
      'ts', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  )
where distratada is not true
  and etapa < 8
  and abs(imp - 0.11) < 0.0001;

-- Confira a mensagem "Success. N rows affected" que o Supabase mostra —
-- deve ser igual à contagem da consulta 1b.

-- ============================================================
-- 3) CONFERÊNCIA FINAL
-- ============================================================

-- Esperado: 0 (não deve sobrar nenhuma venda elegível ainda em 11%)
select count(*) as ainda_em_11_porcento
from public.vendas
where distratada is not true
  and etapa < 8
  and abs(imp - 0.11) < 0.0001;

-- Esperado: igual ao total da consulta 1b (as vendas agora em 12,75%)
select count(*) as total_ja_em_1275_nas_etapas_afetadas
from public.vendas
where distratada is not true
  and etapa < 8
  and abs(imp - 0.1275) < 0.0001;
