-- Diagnóstico: contrato do Maikol Junior Coronel Perez aparecendo como
-- "aguardando assinatura" mesmo ele já estando ativo no sistema.
-- Só leitura — não altera nada.

-- 1) O contrato pendente (o que aparece no painel de Usuários):
select id, nome, email, perfil, equipe, unidade, status, erro,
       clicksign_envelope_key, clicksign_document_key,
       criado_em, criado_por, usuario_id
from public.contratos_clicksign_pendentes
where email ilike '%chrissaiyanc%'
order by criado_em;

-- 2) O usuário ativo correspondente (pra comparar o e-mail exato):
select id, nome, email, perfil, status, contrato_status,
       contrato_clicksign_envelope_key, contrato_enviado_em, contrato_assinado_em
from public.usuarios
where email ilike '%chrissaiyanc%'
order by id;

-- 3) Eventos do webhook do Clicksign relacionados (se algum chegou pra esse envelope/e-mail):
select id, evento, processado, erro, criado_em
from public.clicksign_webhook_eventos
where payload::text ilike '%chrissaiyanc%'
   or payload::text ilike any (
        array(
          select '%' || clicksign_envelope_key || '%'
          from public.contratos_clicksign_pendentes
          where email ilike '%chrissaiyanc%'
        )
      )
order by criado_em;
