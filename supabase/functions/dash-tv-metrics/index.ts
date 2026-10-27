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
// Importante sobre a coluna `vendas.data`: ela guarda so "DD/MM", sem ano
// (confirmado em js/vendas.js, onde a propria tela de edicao monta e le a
// data assim). Por isso o filtro de periodo nao pode ser feito no banco com
// um simples gte/lte na coluna `data` (a comparacao de texto "DD/MM" nao
// segue a ordem cronologica quando o periodo cruza um mes, ex: "05/11"
// viria antes de "27/10" em ordem de texto). A funcao busca as vendas nao
// distratadas e recalcula a data completa (assumindo o ano do periodo
// pedido) para comparar corretamente.
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

function parseDiaMes(valor: unknown): { dia: number; mes: number } | null {
  const texto = String(valor || "").trim();
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(texto);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  if (!(dia >= 1 && dia <= 31) || !(mes >= 1 && mes <= 12)) return null;
  return { dia, mes };
}

// Reconstroi a data completa da venda (so temos DD/MM) testando o(s) ano(s)
// do periodo pedido, e diz se ela cai dentro de [dataDe, dataAte].
function vendaDentroDoPeriodo(dataVenda: unknown, dataDe: string, dataAte: string): boolean {
  const partes = parseDiaMes(dataVenda);
  if (!partes) return false;
  const anoDe = parseInt(dataDe.slice(0, 4), 10);
  const anoAte = parseInt(dataAte.slice(0, 4), 10);
  const anosCandidatos = anoDe === anoAte ? [anoDe] : [anoDe, anoAte];
  const mm = String(partes.mes).padStart(2, "0");
  const dd = String(partes.dia).padStart(2, "0");
  for (const ano of anosCandidatos) {
    const isoCandidato = `${ano}-${mm}-${dd}`;
    if (isoCandidato >= dataDe && isoCandidato <= dataAte) return true;
  }
  return false;
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
    const { data: linhas, error } = await supabase
      .from("vendas")
      .select("data,distratada")
      .or("distratada.eq.false,distratada.is.null")
      .limit(20000);

    if (error) {
      return jsonResponse({ error: error.message || "Erro ao consultar vendas." }, { status: 500 });
    }

    const totalVendas = (linhas || []).filter((linha) =>
      vendaDentroDoPeriodo((linha as { data?: unknown }).data, dataDe, dataAte)
    ).length;

    return jsonResponse({ totalVendas, dataDe, dataAte });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, { status: 500 });
  }
});
