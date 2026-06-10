import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { formatMommentToIso } from "../_shared/zapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload = await req.json();
    const supabase = createServiceClient();
    const messageId = String(payload?.messageId || "").trim();
    const zaapId = String(payload?.zaapId || "").trim();
    const phone = String(payload?.phone || "").trim();
    const eventAt = formatMommentToIso(payload?.momment) || new Date().toISOString();
    const errorMessage = payload?.error ? String(payload.error) : "";

    await supabase.from("venda_notificacoes_zapi_eventos").insert({
      tipo: "delivery",
      instance_id: payload?.instanceId ? String(payload.instanceId) : null,
      phone: phone || null,
      message_id: messageId || zaapId || null,
      payload,
    });

    const status = errorMessage ? "falha" : "enviada";
    const updatePayload: Record<string, unknown> = {
      status,
      erro: errorMessage || null,
      payload_delivery: payload,
      atualizado_em: eventAt,
    };
    if (!errorMessage) updatePayload.enviado_em = eventAt;
    if (payload?.instanceId) updatePayload.zapi_instance_id = String(payload.instanceId);
    if (phone) updatePayload.telefone_e164 = phone;
    if (messageId) updatePayload.zapi_message_id = messageId;
    if (zaapId) updatePayload.zapi_zaap_id = zaapId;

    let query = supabase.from("venda_notificacoes_zapi").update(updatePayload);
    if (messageId) {
      query = query.eq("zapi_message_id", messageId);
    } else if (zaapId) {
      query = query.eq("zapi_zaap_id", zaapId);
    } else {
      return jsonResponse({ value: true });
    }
    await query;

    return jsonResponse({ value: true });
  } catch (error) {
    console.error("zapi-webhook-delivery", error);
    return jsonResponse({ value: false }, { status: 500 });
  }
});
