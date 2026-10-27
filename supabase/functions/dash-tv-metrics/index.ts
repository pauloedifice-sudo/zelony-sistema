// Edge Function: dash-tv-metrics
// Fornece numeros agregados para o painel de TV de agendamentos sem exigir
// login no navegador (o painel e so-visualizacao, sem tela de login).
//
// A tabela `vendas` exige autenticacao para leitura direta (RLS travado em
// 2026-09-18, ver supabase/migrations/20260918170000_lock_usuarios_vendas_rls.sql),
// entao esta funcao roda com a service role (no servidor, nunca exposta ao
// navegador) e devolve apenas um numero agregado — nunca as linhas de vendas
// em si (nada de valores, comissoes, nomes de clientes etc).
//
// Arquivo autossuficiente (sem imports de ../_shared) de proposito, para
// poder ser colado direto no editor do painel do Supabase sem precisar
// subir mais arquivos junto.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers || {});
  Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are missing.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isDataIsoValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo nao suportado." }, { status: 405 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const dataDe = body.dataDe;
  const dataAte = body.dataAte;
  if (!isDataIsoValida(dataDe) || !isDataIsoValida(dataAte) || dataDe > dataAte) {
    return jsonResponse(
      { error: "Informe dataDe e dataAte validos (YYYY-MM-DD), com dataDe <= dataAte." },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("vendas")
      .select("id", { count: "exact", head: true })
      .gte("data", dataDe)
      .lte("data", dataAte)
      .or("distratada.eq.false,distratada.is.null");

    if (error) {
      return jsonResponse({ error: error.message || "Erro ao consultar vendas." }, { status: 500 });
    }

    return jsonResponse({ totalVendas: count || 0, dataDe, dataAte });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, { status: 500 });
  }
});
