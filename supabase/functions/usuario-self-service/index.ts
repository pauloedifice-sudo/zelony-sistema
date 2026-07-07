import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const DEFAULT_PASSWORD = "Mudar@123";
const DEFAULT_SESSION_HOURS = 12;

type UsuarioRow = {
  id: number;
  nome: string;
  email: string;
  perfil?: string | null;
  status?: string | null;
  unidade?: string | null;
  equipe?: string | null;
  tel?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: string | null;
  pix_tipo?: string | null;
  pix?: string | null;
  cpf?: string | null;
  nasc?: string | null;
  cep?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  rh_contratacao?: boolean | null;
};

type SessaoRow = {
  usuario_id: number;
  email: string;
  token: string;
  expira_em: string;
};

type UpdatePayload = {
  tel?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  pixTipo?: string;
  pix?: string;
};

function getSessionDurationHours() {
  const hours = Number(Deno.env.get("USER_SELF_SERVICE_SESSION_HOURS") || DEFAULT_SESSION_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SESSION_HOURS;
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value: unknown, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function isUsuarioAtivo(status: unknown) {
  return String(status || "Ativo").trim().toLowerCase() === "ativo";
}

function generateSessionToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildSessionExpiryIso() {
  const expiresAt = new Date(Date.now() + getSessionDurationHours() * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

function mapUsuarioResponse(usuario: UsuarioRow) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil || "",
    status: usuario.status || "Ativo",
    unidade: usuario.unidade || "",
    equipe: usuario.equipe || "",
    tel: usuario.tel || "",
    banco: usuario.banco || "",
    agencia: usuario.agencia || "",
    conta: usuario.conta || "",
    tipoConta: usuario.tipo_conta || "",
    pixTipo: usuario.pix_tipo || "",
    pix: usuario.pix || "",
    cpf: usuario.cpf || "",
    nasc: usuario.nasc || "",
    cep: usuario.cep || "",
    endereco: usuario.endereco || "",
    cidade: usuario.cidade || "",
    estado: usuario.estado || "",
    rhContratacao: !!usuario.rh_contratacao,
  };
}

async function loadUsuarioByEmail(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
) {
  return await supabase
    .from("usuarios")
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao")
    .eq("email", email)
    .maybeSingle();
}

async function loadSenhaByEmail(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
) {
  return await supabase
    .from("senhas")
    .select("email,senha")
    .eq("email", email)
    .maybeSingle();
}

async function loadSessionByToken(
  supabase: ReturnType<typeof createServiceClient>,
  token: string,
) {
  return await supabase
    .from("usuario_sessoes_app")
    .select("usuario_id,email,token,expira_em")
    .eq("token", token)
    .maybeSingle();
}

function buildAllowedSelfUpdate(updates: UpdatePayload) {
  return {
    tel: normalizeText(updates.tel, 30),
    banco: normalizeText(updates.banco, 60),
    agencia: normalizeText(updates.agencia, 20),
    conta: normalizeText(updates.conta, 30),
    tipo_conta: normalizeText(updates.tipoConta, 30),
    pix_tipo: normalizeText(updates.pixTipo, 30),
    pix: normalizeText(updates.pix, 120),
  };
}

async function issueSession(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const senha = String(body.senha || "");

  if (!email || !senha) {
    return jsonResponse({ error: "E-mail e senha são obrigatórios para liberar a sessão protegida." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: usuario, error: usuarioError } = await loadUsuarioByEmail(supabase, email);
  if (usuarioError) throw usuarioError;
  if (!usuario) {
    return jsonResponse({ error: "Usuário não encontrado para a sessão protegida." }, { status: 404 });
  }
  if (!isUsuarioAtivo(usuario.status)) {
    return jsonResponse({ error: "Usuário inativo. Sessão protegida não liberada." }, { status: 403 });
  }

  const { data: senhaRegistro, error: senhaError } = await loadSenhaByEmail(supabase, email);
  if (senhaError) throw senhaError;

  const senhaEsperada = String((senhaRegistro && senhaRegistro.senha) || DEFAULT_PASSWORD);
  if (senha !== senhaEsperada) {
    return jsonResponse({ error: "Não foi possível validar a sessão protegida com as credenciais informadas." }, { status: 401 });
  }

  const token = generateSessionToken();
  const expiraEm = buildSessionExpiryIso();
  const agora = new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("usuario_sessoes_app")
    .upsert({
      usuario_id: usuario.id,
      email,
      token,
      expira_em: expiraEm,
      atualizado_em: agora,
      criado_em: agora,
    }, { onConflict: "usuario_id" });

  if (upsertError) throw upsertError;

  return jsonResponse({
    ok: true,
    sessionToken: token,
    sessionExpiresAt: expiraEm,
    usuario: mapUsuarioResponse(usuario),
  });
}

async function updateSelf(body: Record<string, unknown>) {
  const sessionToken = normalizeText(body.sessionToken, 160);
  if (!sessionToken) {
    return jsonResponse({ error: "Sessão protegida ausente para atualizar seus dados." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: sessao, error: sessaoError } = await loadSessionByToken(supabase, sessionToken);
  if (sessaoError) throw sessaoError;
  if (!sessao) {
    return jsonResponse({ error: "Sessão protegida inválida. Entre novamente para continuar." }, { status: 401 });
  }

  const expiraEmMs = Date.parse(sessao.expira_em || "");
  if (!Number.isFinite(expiraEmMs) || expiraEmMs <= Date.now()) {
    await supabase.from("usuario_sessoes_app").delete().eq("usuario_id", sessao.usuario_id);
    return jsonResponse({ error: "Sessão protegida expirada. Entre novamente para atualizar seus dados." }, { status: 401 });
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao")
    .eq("id", sessao.usuario_id)
    .maybeSingle();

  if (usuarioError) throw usuarioError;
  if (!usuario) {
    return jsonResponse({ error: "Usuário da sessão protegida não foi encontrado." }, { status: 404 });
  }
  if (!isUsuarioAtivo(usuario.status)) {
    return jsonResponse({ error: "Usuário inativo. Não foi possível atualizar os dados." }, { status: 403 });
  }

  const updates = buildAllowedSelfUpdate((body.updates || {}) as UpdatePayload);
  if (!updates.tel || !updates.banco || !updates.conta || !updates.tipo_conta || !updates.pix_tipo || !updates.pix) {
    return jsonResponse({ error: "Telefone, banco, conta, tipo de conta, tipo de Pix e chave Pix são obrigatórios." }, { status: 400 });
  }

  const { data: usuarioAtualizado, error: updateError } = await supabase
    .from("usuarios")
    .update(updates)
    .eq("id", usuario.id)
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao")
    .single();

  if (updateError) throw updateError;

  await supabase
    .from("usuario_sessoes_app")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("usuario_id", usuario.id);

  return jsonResponse({
    ok: true,
    usuario: mapUsuarioResponse(usuarioAtualizado),
    sessionExpiresAt: sessao.expira_em,
  });
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
    const action = String(body?.action || "").trim().toLowerCase();

    if (action === "issue_session") {
      return await issueSession(body);
    }

    if (action === "update_self") {
      return await updateSelf(body);
    }

    return jsonResponse({ error: "Ação inválida para o autoatendimento." }, { status: 400 });
  } catch (error) {
    console.error("usuario-self-service", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
