import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { formatMommentToIso } from "../_shared/zapi.ts";

function mapStatus(status: string) {
  switch (String(status || "").trim().toUpperCase()) {
    case "READ":
    case "READ_BY_ME":
    case "PLAYED":
      return "lida";
    case "RECEIVED":
      return "recebida";
    case "SENT":
      return "enviada";
    default:
      return "enviada";
  }
}

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
    const ids = Array.isArray(payload?.ids) ? payload.ids.map((item: unknown) => String(item || "").trim()).filter(Boolean) : [];
    const phone = String(payload?.phone || "").trim();
    const eventAt = formatMommentToIso(payload?.momment) || new Date().toISOString();
    const mappedStatus = mapStatus(String(payload?.status || ""));

    await supabase.from("venda_notificacoes_zapi_eventos").insert({
      tipo: "status",
      instance_id: payload?.instanceId ? String(payload.instanceId) : null,
      phone: phone || null,
      message_id: ids[0] || null,
      payload,
    });

    for (const id of ids) {
      const updatePayload: Record<string, unknown> = {
        status: mappedStatus,
        payload_status: payload,
        atualizado_em: eventAt,
      };
      if (phone) updatePayload.telefone_e164 = phone;
      if (mappedStatus === "enviada") updatePayload.enviado_em = eventAt;
      if (mappedStatus === "recebida") updatePayload.recebido_em = eventAt;
      if (mappedStatus === "lida") updatePayload.lido_em = eventAt;

      await supabase
        .from("venda_notificacoes_zapi")
        .update(updatePayload)
        .eq("zapi_message_id", id);
    }

    return jsonResponse({ value: true });
  } catch (error) {
    console.error("zapi-webhook-status", error);
    return jsonResponse({ value: false }, { status: 500 });
  }
});
