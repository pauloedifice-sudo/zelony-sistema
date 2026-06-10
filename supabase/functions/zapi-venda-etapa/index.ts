import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  ETAPAS_VENDA,
  buildStageMessage,
  dedupeRecipients,
  namesMatch,
  normalizePhoneToZapi,
  normalizeText,
  statusUsuarioAtivo,
} from "../_shared/zapi.ts";

type VendaRecord = {
  id: number;
  ref_local?: string | null;
  cliente?: string | null;
  produto?: string | null;
  unidade?: string | null;
  corretor?: string | null;
  gerente?: string | null;
  diretor?: string | null;
  diretor2?: string | null;
  etapa?: number | null;
  hist?: Array<Record<string, unknown>> | null;
  distratada?: boolean | null;
};

type UsuarioRecord = {
  id: number;
  nome: string;
  perfil?: string | null;
  status?: string | null;
  tel?: string | null;
};

function getEnvOrThrow(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function latestCorretorRefId(venda: VendaRecord) {
  const hist = Array.isArray(venda.hist) ? [...venda.hist].reverse() : [];
  const meta = hist.find((item) => item && (typeof item.corretorOrigem === "string" || item.corretorRefId != null));
  if (!meta) return null;
  if (String(meta.corretorOrigem || "").trim().toLowerCase() === "externo") return null;
  const refId = Number(meta.corretorRefId);
  return Number.isFinite(refId) && refId > 0 ? refId : null;
}

function findUserByName(users: UsuarioRecord[], name: unknown) {
  const target = String(name || "").trim();
  if (!target) return null;
  return users.find((user) => namesMatch(target, user.nome)) || null;
}

function buildRecipientCandidates(venda: VendaRecord, users: UsuarioRecord[]) {
  const recipients: Array<Record<string, unknown>> = [];
  const corretorRefId = latestCorretorRefId(venda);
  const corretorUsuario = corretorRefId
    ? users.find((user) => Number(user.id) === corretorRefId) || null
    : findUserByName(users, venda.corretor);
  if (corretorUsuario) {
    recipients.push({
      papel: "corretor",
      destinatario_usuario_id: corretorUsuario.id,
      destinatario_nome: corretorUsuario.nome,
      destinatario_perfil: corretorUsuario.perfil || "",
      telefone_bruto: corretorUsuario.tel || "",
      status_usuario: corretorUsuario.status || "",
    });
  }
  const gerenteUsuario = findUserByName(users, venda.gerente);
  if (gerenteUsuario) {
    recipients.push({
      papel: "gerente",
      destinatario_usuario_id: gerenteUsuario.id,
      destinatario_nome: gerenteUsuario.nome,
      destinatario_perfil: gerenteUsuario.perfil || "",
      telefone_bruto: gerenteUsuario.tel || "",
      status_usuario: gerenteUsuario.status || "",
    });
  }
  const diretorUsuario = findUserByName(users, venda.diretor);
  if (diretorUsuario) {
    recipients.push({
      papel: "diretor",
      destinatario_usuario_id: diretorUsuario.id,
      destinatario_nome: diretorUsuario.nome,
      destinatario_perfil: diretorUsuario.perfil || "",
      telefone_bruto: diretorUsuario.tel || "",
      status_usuario: diretorUsuario.status || "",
    });
  }
  const diretor2Usuario = findUserByName(users, venda.diretor2);
  if (diretor2Usuario) {
    recipients.push({
      papel: "diretor2",
      destinatario_usuario_id: diretor2Usuario.id,
      destinatario_nome: diretor2Usuario.nome,
      destinatario_perfil: diretor2Usuario.perfil || "",
      telefone_bruto: diretor2Usuario.tel || "",
      status_usuario: diretor2Usuario.status || "",
    });
  }
  return recipients;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const vendaId = Number(body?.vendaId);
    const etapaAnterior = Number(body?.etapaAnterior);
    const etapaNova = Number(body?.etapaNova);
    const responsavel = String(body?.responsavel || "Sistema").trim() || "Sistema";

    if (!Number.isFinite(vendaId) || vendaId <= 0) {
      return jsonResponse({ error: "vendaId inválido." }, { status: 400 });
    }
    if (!Number.isFinite(etapaNova) || etapaNova < 0) {
      return jsonResponse({ error: "etapaNova inválida." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select("id,ref_local,cliente,produto,unidade,corretor,gerente,diretor,diretor2,etapa,hist,distratada")
      .eq("id", vendaId)
      .single();

    if (vendaError || !venda) {
      return jsonResponse({ error: "Venda não encontrada no Supabase." }, { status: 404 });
    }
    if (venda.distratada) {
      return jsonResponse({ ok: true, skipped: true, reason: "Venda distratada." });
    }

    const { data: users, error: usersError } = await supabase
      .from("usuarios")
      .select("id,nome,perfil,status,tel");

    if (usersError || !Array.isArray(users)) {
      throw new Error("Não foi possível carregar os usuários para a notificação.");
    }

    const instanceId = getEnvOrThrow("ZAPI_INSTANCE_ID");
    const token = getEnvOrThrow("ZAPI_INSTANCE_TOKEN");
    const clientToken = getEnvOrThrow("ZAPI_CLIENT_TOKEN");
    const delayMessage = Number(Deno.env.get("ZAPI_DELAY_MESSAGE") || "0");
    const delayTyping = Number(Deno.env.get("ZAPI_DELAY_TYPING") || "0");
    const apiBase = `https://api.z-api.io/instances/${instanceId}/token/${token}`;

    const etapaAnteriorFinal = Number.isFinite(etapaAnterior) ? etapaAnterior : Math.max(0, etapaNova - 1);
    const etapaAnteriorNome = ETAPAS_VENDA[etapaAnteriorFinal] || `Etapa ${etapaAnteriorFinal}`;
    const etapaNovaNome = ETAPAS_VENDA[etapaNova] || `Etapa ${etapaNova}`;
    const message = buildStageMessage(venda as unknown as Record<string, unknown>, etapaAnteriorFinal, etapaNova, responsavel);

    const rawRecipients = buildRecipientCandidates(venda, users as UsuarioRecord[]);
    const normalizedRecipients = rawRecipients.map((item) => ({
      ...item,
      phone: normalizePhoneToZapi(item.telefone_bruto),
    }));
    const recipients = dedupeRecipients(normalizedRecipients.filter((item) => item.phone));

    const summary = {
      ok: true,
      vendaId,
      etapaAnterior: etapaAnteriorFinal,
      etapaNova,
      etapaAnteriorNome,
      etapaNovaNome,
      sent: 0,
      skipped: 0,
      failed: 0,
      notifications: [] as Array<Record<string, unknown>>,
    };

    for (const item of normalizedRecipients.filter((entry) => !entry.phone)) {
      await supabase.from("venda_notificacoes_zapi").insert({
        venda_id: venda.id,
        venda_ref_local: venda.ref_local || null,
        etapa_anterior: etapaAnteriorFinal,
        etapa_anterior_nome: etapaAnteriorNome,
        etapa_nova: etapaNova,
        etapa_nova_nome: etapaNovaNome,
        responsavel_avanco: responsavel,
        destinatario_usuario_id: item.destinatario_usuario_id || null,
        destinatario_nome: item.destinatario_nome || "Responsável sem telefone",
        destinatario_perfil: item.destinatario_perfil || null,
        destinatario_papel: item.papel || "desconhecido",
        destinatario_papeis: item.papeis || (item.papel ? [item.papel] : []),
        telefone_bruto: item.telefone_bruto || null,
        telefone_e164: null,
        mensagem: message,
        status: "sem_telefone",
        tentativas: 0,
        erro: "Usuário sem telefone válido para envio na Z-API.",
      });
      summary.skipped += 1;
    }

    for (const recipient of recipients) {
      const active = statusUsuarioAtivo(recipient.status_usuario);
      const papelPrincipal = String(recipient.papeis?.[0] || recipient.papel || "responsavel");
      const dedupeKey = `venda:${venda.id}|etapa:${etapaNova}|phone:${recipient.phone}`;

      if (!active) {
        await supabase.from("venda_notificacoes_zapi").upsert({
          venda_id: venda.id,
          venda_ref_local: venda.ref_local || null,
          etapa_anterior: etapaAnteriorFinal,
          etapa_anterior_nome: etapaAnteriorNome,
          etapa_nova: etapaNova,
          etapa_nova_nome: etapaNovaNome,
          responsavel_avanco: responsavel,
          destinatario_usuario_id: recipient.destinatario_usuario_id || null,
          destinatario_nome: recipient.destinatario_nome || "Responsável inativo",
          destinatario_perfil: recipient.destinatario_perfil || null,
          destinatario_papel: papelPrincipal,
          destinatario_papeis: recipient.papeis || [],
          telefone_bruto: recipient.telefone_bruto || null,
          telefone_e164: recipient.phone,
          mensagem: message,
          status: "usuario_inativo",
          tentativas: 0,
          dedupe_key: dedupeKey,
          erro: "Usuário inativo. Notificação não enviada.",
          atualizado_em: new Date().toISOString(),
        }, { onConflict: "dedupe_key" });
        summary.skipped += 1;
        continue;
      }

      const { data: existing } = await supabase
        .from("venda_notificacoes_zapi")
        .select("id,status")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) {
        summary.skipped += 1;
        summary.notifications.push({
          destinatario: recipient.destinatario_nome,
          phone: recipient.phone,
          status: existing.status,
          duplicate: true,
        });
        continue;
      }

      const sendPayload: Record<string, unknown> = {
        phone: recipient.phone,
        message,
      };
      if (Number.isFinite(delayMessage) && delayMessage > 0) sendPayload.delayMessage = delayMessage;
      if (Number.isFinite(delayTyping) && delayTyping > 0) sendPayload.delayTyping = delayTyping;

      const response = await fetch(`${apiBase}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": clientToken,
        },
        body: JSON.stringify(sendPayload),
      });

      let responseBody: Record<string, unknown> | null = null;
      try {
        responseBody = await response.json();
      } catch (_error) {
        responseBody = null;
      }

      if (!response.ok) {
        const errorText = responseBody && (responseBody.error || responseBody.message)
          ? String(responseBody.error || responseBody.message)
          : `Falha HTTP ${response.status} ao enviar para a Z-API.`;
        await supabase.from("venda_notificacoes_zapi").insert({
          venda_id: venda.id,
          venda_ref_local: venda.ref_local || null,
          etapa_anterior: etapaAnteriorFinal,
          etapa_anterior_nome: etapaAnteriorNome,
          etapa_nova: etapaNova,
          etapa_nova_nome: etapaNovaNome,
          responsavel_avanco: responsavel,
          destinatario_usuario_id: recipient.destinatario_usuario_id || null,
          destinatario_nome: recipient.destinatario_nome || "Responsável",
          destinatario_perfil: recipient.destinatario_perfil || null,
          destinatario_papel: papelPrincipal,
          destinatario_papeis: recipient.papeis || [],
          telefone_bruto: recipient.telefone_bruto || null,
          telefone_e164: recipient.phone,
          mensagem: message,
          status: "falha",
          tentativas: 1,
          dedupe_key: dedupeKey,
          erro: errorText,
          zapi_instance_id: instanceId,
          payload_envio: sendPayload,
          atualizado_em: new Date().toISOString(),
        });
        summary.failed += 1;
        summary.notifications.push({
          destinatario: recipient.destinatario_nome,
          phone: recipient.phone,
          status: "falha",
          error: errorText,
        });
        continue;
      }

      await supabase.from("venda_notificacoes_zapi").insert({
        venda_id: venda.id,
        venda_ref_local: venda.ref_local || null,
        etapa_anterior: etapaAnteriorFinal,
        etapa_anterior_nome: etapaAnteriorNome,
        etapa_nova: etapaNova,
        etapa_nova_nome: etapaNovaNome,
        responsavel_avanco: responsavel,
        destinatario_usuario_id: recipient.destinatario_usuario_id || null,
        destinatario_nome: recipient.destinatario_nome || "Responsável",
        destinatario_perfil: recipient.destinatario_perfil || null,
        destinatario_papel: papelPrincipal,
        destinatario_papeis: recipient.papeis || [],
        telefone_bruto: recipient.telefone_bruto || null,
        telefone_e164: recipient.phone,
        mensagem: message,
        status: "enfileirada",
        tentativas: 1,
        dedupe_key: dedupeKey,
        zapi_instance_id: instanceId,
        zapi_zaap_id: responseBody?.zaapId ? String(responseBody.zaapId) : null,
        zapi_message_id: responseBody?.messageId ? String(responseBody.messageId) : responseBody?.id ? String(responseBody.id) : null,
        payload_envio: {
          request: sendPayload,
          response: responseBody,
        },
        enviado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      });
      summary.sent += 1;
      summary.notifications.push({
        destinatario: recipient.destinatario_nome,
        phone: recipient.phone,
        status: "enfileirada",
        messageId: responseBody?.messageId || responseBody?.id || null,
      });
    }

    return jsonResponse(summary);
  } catch (error) {
    console.error("zapi-venda-etapa", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
