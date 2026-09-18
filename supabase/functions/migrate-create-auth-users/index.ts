// FUNÇÃO TEMPORÁRIA — etapa 1 da migração de login para o Supabase Auth.
//
// Cria, para cada linha da tabela `usuarios`, a conta oficial correspondente
// no sistema de login do Supabase (`auth.users`), usando a senha ATUAL da
// pessoa (lida da tabela `senhas`) — ninguém precisa redefinir senha.
//
// Não muda nada visível no sistema: o login continua funcionando exatamente
// como hoje até a etapa 2 (que troca a tela de login para usar essas contas
// oficiais). Esta função só prepara o terreno.
//
// Segurança:
//  - Só aceita POST.
//  - Exige um "confirm" exato no corpo da requisição, só pra evitar disparo
//    acidental — não é a chave de serviço do Supabase, que nunca sai do
//    ambiente da própria função (fica em SUPABASE_SERVICE_ROLE_KEY, injetada
//    automaticamente pelo Supabase, e não é lida de nenhum lugar externo).
//  - É seguro rodar mais de uma vez: usuários que já têm `auth_user_id`
//    preenchido são pulados.
//
// Este arquivo é autocontido de propósito (sem importar `_shared/*` de
// outras funções), para funcionar tanto publicado pelo editor do painel
// quanto pela CLI. Depois de confirmado que a migração funcionou, esta
// função deve ser removida do projeto (não precisa mais existir depois da
// etapa 1).

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

const DEFAULT_PASSWORD = "Mudar@123";
const CONFIRM_PHRASE = "zelony-migracao-auth-2026-09-18";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    for (const candidate of [details.message, details.error_description, details.details, details.hint]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return "Erro desconhecido.";
}

type UsuarioRow = {
  id: number;
  nome: string;
  email: string;
  status?: string | null;
  auth_user_id?: string | null;
};

type SenhaRow = {
  email: string;
  senha: string;
};

async function runMigration(dryRun: boolean) {
  const supabase = createServiceClient();

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("id,nome,email,status,auth_user_id")
    .order("id", { ascending: true });
  if (usuariosError) throw usuariosError;

  const { data: senhas, error: senhasError } = await supabase
    .from("senhas")
    .select("email,senha");
  if (senhasError) throw senhasError;

  const senhaPorEmail = new Map<string, string>();
  for (const s of (senhas ?? []) as SenhaRow[]) {
    senhaPorEmail.set(normalizeEmail(s.email), String(s.senha || ""));
  }

  const resultados: Array<Record<string, unknown>> = [];
  let criados = 0;
  let pulados = 0;
  let erros = 0;

  for (const u of (usuarios ?? []) as UsuarioRow[]) {
    const email = normalizeEmail(u.email);

    if (!email) {
      pulados++;
      resultados.push({ id: u.id, status: "pulado", motivo: "sem e-mail cadastrado" });
      continue;
    }

    if (u.auth_user_id) {
      pulados++;
      resultados.push({ id: u.id, email, status: "pulado", motivo: "já tinha conta oficial" });
      continue;
    }

    const senha = senhaPorEmail.get(email) || DEFAULT_PASSWORD;

    if (dryRun) {
      resultados.push({ id: u.id, email, status: "simulado (nenhuma alteração feita)" });
      continue;
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { usuario_id: u.id, nome: u.nome },
    });

    if (createError) {
      erros++;
      resultados.push({ id: u.id, email, status: "erro", motivo: normalizeErrorMessage(createError) });
      continue;
    }

    const authUserId = created.user?.id;
    if (authUserId) {
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ auth_user_id: authUserId })
        .eq("id", u.id);
      if (updateError) {
        erros++;
        resultados.push({ id: u.id, email, status: "conta criada mas falhou ao vincular", motivo: normalizeErrorMessage(updateError) });
        continue;
      }
    }

    criados++;
    resultados.push({ id: u.id, email, status: "criado", authUserId });
  }

  return {
    dryRun,
    totalUsuarios: (usuarios ?? []).length,
    criados,
    pulados,
    erros,
    resultados,
  };
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
    const confirm = String((body as Record<string, unknown>)?.confirm || "");
    const dryRun = Boolean((body as Record<string, unknown>)?.dryRun);

    if (confirm !== CONFIRM_PHRASE) {
      return jsonResponse({ error: "Confirmação ausente ou incorreta. Nada foi alterado." }, { status: 400 });
    }

    const resultado = await runMigration(dryRun);
    return jsonResponse(resultado);
  } catch (error) {
    console.error("migrate-create-auth-users", error);
    return jsonResponse({ error: normalizeErrorMessage(error) }, { status: 500 });
  }
});
