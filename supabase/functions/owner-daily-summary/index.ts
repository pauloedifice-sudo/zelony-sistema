import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  buildOwnerReportBaseMessage,
  buildOwnerReportSnapshot,
  rewriteOwnerReportWithAi,
  type OwnerReportAgendamento,
  type OwnerReportFinanceiro,
  type OwnerReportUsuario,
  type OwnerReportVenda,
} from "../_shared/owner-report.ts";
import { normalizePhoneToZapi, normalizeText, statusUsuarioAtivo } from "../_shared/zapi.ts";

function getEnv(name: string, fallback = "") {
  return Deno.env.get(name) || fallback;
}

function normalizePerfil(perfil: unknown) {
  const value = normalizeText(perfil);
  if (value === "DONO") return "dono";
  if (value === "CORRETOR") return "cor";
  if (value === "CAPITAO") return "cap";
  if (value === "GERENTE") return "ger";
  if (value === "DIRETOR") return "dir";
  if (value === "FINANCEIRO") return "fin";
  if (value === "RH") return "rh";
  return "cor";
}

function activeOwners(users: OwnerReportUsuario[]) {
  return users.filter((user) => statusUsuarioAtivo(user.status) && normalizePerfil(user.perfil) === "dono");
}

function dedupeOwnersByPhone(users: OwnerReportUsuario[]) {
  const map = new Map<string, OwnerReportUsuario>();
  users.forEach((user) => {
    const phone = normalizePhoneToZapi(user.tel);
    if (!phone) return;
    if (!map.has(phone)) map.set(phone, user);
  });
  return Array.from(map.values());
}

function resolveManualRequester(users: OwnerReportUsuario[], userId: number) {
  if (!Number.isFinite(userId)) return null;
  return activeOwners(users).find((user) => Number(user.id) === Number(userId)) || null;
}

function reportStatusSummary(items: Array<Record<string, unknown>>) {
  return {
    total: items.length,
    sent: items.filter((item) => item.send_status === "enfileirada").length,
    failed: items.filter((item) => item.send_status === "falha").length,
    skipped: items.filter((item) => item.send_status === "ignorado").length,
  };
}

async function ensureReportsTable(supabase: ReturnType<typeof createServiceClient>) {
  const probe = await supabase.from("owner_daily_reports").select("id").limit(1);
  if (!probe.error) return;
  throw new Error("A tabela owner_daily_reports ainda nao existe no Supabase. Execute o SQL desta funcionalidade antes de usar o relatorio.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "send").trim().toLowerCase();
    const triggerReason = String(body?.triggerReason || "manual").trim().toLowerCase() || "manual";
    const requestedByUserId = Number(body?.requestedByUserId);
    const requestedByName = String(body?.requestedByName || "Sistema").trim() || "Sistema";
    const now = new Date();
    const supabase = createServiceClient();

    await ensureReportsTable(supabase);

    const [
      vendasResp,
      usuariosResp,
      agendamentosResp,
      financeiroResp,
    ] = await Promise.all([
      supabase.from("vendas").select("id,data,mes,cliente,produto,construtora,origem,unidade,corretor,capitao,gerente,diretor,diretor2,valor,pct,imp,pct_cor,pct_cap,pct_ger,pct_dir,pct_dir2,pct_rh,bonus,bonus_pct_dir,bonus_pct_ger,bonus_pct_cor,etapa,hist,distratada"),
      supabase.from("usuarios").select("id,nome,perfil,status,tel,equipe"),
      supabase.from("agendamentos").select("*").order("data_agendamento", { ascending: true }).order("horario_agendamento", { ascending: true }),
      supabase.from("financeiro_lancamentos").select("*"),
    ]);

    if (vendasResp.error) throw vendasResp.error;
    if (usuariosResp.error) throw usuariosResp.error;
    if (agendamentosResp.error) throw agendamentosResp.error;
    if (financeiroResp.error) throw financeiroResp.error;

    const vendas = Array.isArray(vendasResp.data) ? vendasResp.data as OwnerReportVenda[] : [];
    const usuarios = Array.isArray(usuariosResp.data) ? usuariosResp.data as OwnerReportUsuario[] : [];
    const agendamentos = Array.isArray(agendamentosResp.data) ? agendamentosResp.data as OwnerReportAgendamento[] : [];
    const financeiro = Array.isArray(financeiroResp.data) ? financeiroResp.data as OwnerReportFinanceiro[] : [];

    const owners = activeOwners(usuarios);
    if (!owners.length) {
      return jsonResponse({ error: "Nenhum usuario com perfil Dono e status Ativo foi encontrado." }, { status: 400 });
    }

    const manualRequester = resolveManualRequester(usuarios, requestedByUserId);
    if (triggerReason === "manual" && !manualRequester) {
      return jsonResponse({ error: "Somente usuarios com perfil Dono e status Ativo podem solicitar este resumo manualmente." }, { status: 403 });
    }

    const recipients = dedupeOwnersByPhone(owners);
    if (!recipients.length) {
      return jsonResponse({ error: "Nenhum dono ativo possui telefone valido para envio." }, { status: 400 });
    }

    const snapshot = buildOwnerReportSnapshot({
      vendas,
      usuarios,
      agendamentos,
      financeiro,
      owners,
      now,
    });
    const messageBase = buildOwnerReportBaseMessage(snapshot);
    const aiResult = await rewriteOwnerReportWithAi({
      apiKey: getEnv("OPENAI_API_KEY"),
      model: getEnv("OPENAI_MODEL", "gpt-4.1-mini"),
      snapshot,
      baseMessage: messageBase,
    });
    const messageFinal = aiResult.message || messageBase;
    const usedAi = !!aiResult.usedAi;

    if (mode === "preview") {
      return jsonResponse({
        ok: true,
        mode,
        triggerReason,
        owners: recipients.map((item) => ({
          id: item.id,
          name: item.nome,
          phone: normalizePhoneToZapi(item.tel),
        })),
        usedAi,
        aiError: aiResult.error || "",
        snapshot,
        messageBase,
        messageFinal,
      });
    }

    const zapiInstanceId = getEnv("ZAPI_INSTANCE_ID");
    const zapiInstanceToken = getEnv("ZAPI_INSTANCE_TOKEN");
    const zapiClientToken = getEnv("ZAPI_CLIENT_TOKEN");
    if (!zapiInstanceId || !zapiInstanceToken || !zapiClientToken) {
      throw new Error("As secrets da Z-API estao incompletas no Supabase para enviar o relatorio dos donos.");
    }

    const zapiUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-text`;
    const reportRef = crypto.randomUUID();
    const rows: Array<Record<string, unknown>> = [];

    for (const owner of recipients) {
      const phone = normalizePhoneToZapi(owner.tel);
      const rowBase = {
        report_ref: reportRef,
        data_referencia: String(snapshot.report_date || now.toISOString().slice(0, 10)),
        executado_em: String(snapshot.executed_at || now.toISOString()),
        trigger_reason: triggerReason,
        requested_by_user_id: manualRequester ? manualRequester.id : (Number.isFinite(requestedByUserId) ? requestedByUserId : null),
        requested_by_name: manualRequester?.nome || requestedByName,
        owner_user_id: owner.id,
        owner_name: owner.nome,
        owner_phone: phone || null,
        snapshot_json: snapshot,
        message_base: messageBase,
        message_final: messageFinal,
        used_ai: usedAi,
        ai_error: aiResult.error || "",
        send_status: "pendente",
      };

      if (!phone) {
        rows.push({
          ...rowBase,
          send_status: "ignorado",
          send_error: "Dono ativo sem telefone valido para envio.",
        });
        continue;
      }

      const payload = {
        phone,
        message: messageFinal,
      };

      const response = await fetch(zapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": zapiClientToken,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => null);
      if (!response.ok) {
        rows.push({
          ...rowBase,
          send_status: "falha",
          send_error: responseBody && (responseBody.error || responseBody.message)
            ? String(responseBody.error || responseBody.message)
            : `Falha HTTP ${response.status} no envio da Z-API.`,
          payload_envio: {
            request: payload,
            response: responseBody,
          },
        });
        continue;
      }

      rows.push({
        ...rowBase,
        send_status: "enfileirada",
        zapi_message_id: responseBody?.messageId ? String(responseBody.messageId) : responseBody?.id ? String(responseBody.id) : null,
        zapi_zaap_id: responseBody?.zaapId ? String(responseBody.zaapId) : null,
        payload_envio: {
          request: payload,
          response: responseBody,
        },
      });
    }

    const insertResp = await supabase.from("owner_daily_reports").insert(rows).select("id,owner_name,owner_phone,send_status,send_error,zapi_message_id");
    if (insertResp.error) throw insertResp.error;

    return jsonResponse({
      ok: true,
      reportRef,
      usedAi,
      aiError: aiResult.error || "",
      triggerReason,
      summary: reportStatusSummary(rows),
      reports: insertResp.data || [],
    });
  } catch (error) {
    console.error("owner-daily-summary", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
