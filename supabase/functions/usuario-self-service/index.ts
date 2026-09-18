import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

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
  auth_user_id?: string | null;
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

type PayrollPayload = {
  nome?: string;
  cpf?: string;
  funcao?: string;
  salario?: number | string;
  chave_pix?: string;
  chavePix?: string;
  banco?: string;
};

type AtoRefundPayload = {
  cliente?: string;
  telefone?: string;
  valor?: number | string;
  data_prevista?: string;
  dataPrevista?: string;
  banco?: string;
  chave_pix?: string;
  chavePix?: string;
};

type UserInvitePayload = {
  nome?: string;
  email?: string;
  perfil?: string;
  equipe?: string;
  unidade?: string;
  rhContratacao?: boolean;
  rh_contratacao?: boolean;
};

type UserInviteCompletionPayload = {
  nome?: string;
  tel?: string;
  nasc?: string;
  cpf?: string;
  cep?: string;
  endereco?: string;
  end?: string;
  cidade?: string;
  estado?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  tipo_conta?: string;
  pixTipo?: string;
  pix_tipo?: string;
  pix?: string;
};

const ATO_RECEIPT_BUCKET = "reembolsos-ato";
const ATO_RECEIPT_MAX_SIZE = 10 * 1024 * 1024;
const ATO_REFUND_SELECT = "id,cliente,telefone,valor,data_prevista,banco,chave_pix,status,data_reembolso,financeiro_lancamento_id,comprovante_nome,comprovante_mime,comprovante_size,comprovante_storage_bucket,comprovante_storage_path,criado_por,criado_por_id,criado_por_email,atualizado_em";
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") || "https://zelony-sistema.netlify.app/";
const USER_INVITE_DURATION_DAYS = 7;
const USER_INVITE_SELECT = "id,usuario_id,nome,email,perfil,equipe,unidade,rh_contratacao,expira_em,usado_em,revogado_em";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value: unknown, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return normalizeText(error.message, 500);
  if (error && typeof error === "object") {
    const details = error as Record<string, unknown>;
    for (const candidate of [details.message, details.error_description, details.details, details.hint, details.code]) {
      if (typeof candidate === "string" && candidate.trim()) return normalizeText(candidate, 500);
    }
  }
  const fallback = normalizeText(error, 500);
  return fallback && fallback !== "[object Object]" ? fallback : "Não foi possível concluir a operação no banco de dados.";
}

function isUsuarioAtivo(status: unknown) {
  return String(status || "Ativo").trim().toLowerCase() === "ativo";
}

function normalizeProfile(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function canManagePayroll(profile: unknown) {
  return ["dono", "financeiro"].includes(normalizeProfile(profile));
}

function canManageAtoRefunds(profile: unknown) {
  return ["dono", "financeiro"].includes(normalizeProfile(profile));
}

function canManageUserInvites(profile: unknown) {
  return ["dono", "diretor", "financeiro", "rh"].includes(normalizeProfile(profile));
}

function canonicalInviteProfile(value: unknown) {
  const profiles: Record<string, string> = {
    dono: "Dono",
    corretor: "Corretor",
    capitao: "Capitão",
    gerente: "Gerente",
    diretor: "Diretor",
    financeiro: "Financeiro",
    rh: "RH",
  };
  return profiles[normalizeProfile(value)] || "";
}

function canonicalInviteUnit(value: unknown) {
  const normalized = normalizeProfile(value);
  if (normalized === "centro") return "Centro";
  if (normalized === "cristo rei") return "Cristo Rei";
  if (normalized === "ambas") return "Ambas";
  return "";
}

function normalizeIsoDate(value: unknown) {
  const date = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return "";
  return date;
}

function normalizeReceiptName(value: unknown) {
  return String(value || "comprovante")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180) || "comprovante";
}

function normalizeReceiptMime(value: unknown) {
  const mime = String(value || "").trim().toLowerCase();
  return ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime) ? mime : "";
}

function receiptExtension(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function normalizeCpf(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function isValidCpf(value: unknown) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function generateUserInviteToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashUserInviteToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildUserInviteExpiryIso() {
  return new Date(Date.now() + USER_INVITE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function buildUserInviteLink(token: string) {
  const url = new URL(APP_PUBLIC_URL);
  url.search = "";
  url.hash = "";
  url.searchParams.set("c", token);
  return url.toString();
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

// Confere a sessão de verdade do Supabase Auth (o token JWT que o front-end
// manda no cabeçalho Authorization) e devolve o usuário correspondente da
// tabela `usuarios`, já checando se está ativo. Substitui o antigo esquema
// de "sessionToken" caseiro guardado em usuario_sessoes_app.
async function requireAuthenticatedUsuario(
  req: Request,
  supabase: ReturnType<typeof createServiceClient>,
) {
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return { response: jsonResponse({ error: "Sessão ausente. Entre novamente para continuar." }, { status: 401 }) };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData || !userData.user) {
    return { response: jsonResponse({ error: "Sessão inválida ou expirada. Entre novamente para continuar." }, { status: 401 }) };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao,auth_user_id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (usuarioError) throw usuarioError;
  if (!usuario) {
    return { response: jsonResponse({ error: "Usuário não encontrado para esta sessão." }, { status: 404 }) };
  }
  if (!isUsuarioAtivo(usuario.status)) {
    return { response: jsonResponse({ error: "Usuário inativo. Não foi possível continuar." }, { status: 403 }) };
  }

  return { supabase, usuario };
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

async function updateSelf(req: Request, body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const auth = await requireAuthenticatedUsuario(req, supabase);
  if ("response" in auth) return auth.response;
  const usuario = auth.usuario;

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

  return jsonResponse({
    ok: true,
    usuario: mapUsuarioResponse(usuarioAtualizado),
  });
}

async function changePassword(req: Request, body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const auth = await requireAuthenticatedUsuario(req, supabase);
  if ("response" in auth) return auth.response;
  const usuario = auth.usuario;

  const novaSenha = String(body.novaSenha || "");
  if (novaSenha.length < 6) {
    return jsonResponse({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  if (!usuario.auth_user_id) {
    return jsonResponse({ error: "Conta sem login oficial vinculado. Fale com o administrador." }, { status: 409 });
  }

  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(usuario.auth_user_id, {
    password: novaSenha,
  });
  if (authUpdateError) throw authUpdateError;

  // Mantido por segurança/rollback durante a transição — não é mais o que
  // decide o login, que agora é sempre conferido pelo Supabase Auth acima.
  const { error: upsertError } = await supabase
    .from("senhas")
    .upsert({ email: usuario.email, senha: novaSenha }, { onConflict: "email" });
  if (upsertError) throw upsertError;

  return jsonResponse({ ok: true });
}

async function authorizeUserInvites(req: Request, _body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const auth = await requireAuthenticatedUsuario(req, supabase);
  if ("response" in auth) return auth;
  if (!canManageUserInvites(auth.usuario.perfil)) {
    return { response: jsonResponse({ error: "Seu perfil não possui permissão para enviar convites." }, { status: 403 }) };
  }
  return auth;
}

async function createUserInvite(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeUserInvites(req, body);
  if ("response" in auth) return auth.response;

  const invite = (body.convite || {}) as UserInvitePayload;
  const nome = normalizeText(invite.nome, 80).toUpperCase();
  const email = normalizeEmail(invite.email);
  const perfil = canonicalInviteProfile(invite.perfil);
  const equipe = normalizeText(invite.equipe, 100);
  const unidade = canonicalInviteUnit(invite.unidade);
  const rhContratacao = Boolean(invite.rhContratacao ?? invite.rh_contratacao);

  if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !perfil || !unidade) {
    return jsonResponse({ error: "Nome, e-mail válido, perfil e unidade são obrigatórios para o convite." }, { status: 400 });
  }

  const token = generateUserInviteToken();
  const tokenHash = await hashUserInviteToken(token);
  const expiraEm = buildUserInviteExpiryIso();
  const { data: registration, error: registrationError } = await auth.supabase.rpc("registrar_convite_usuario", {
    p_token_hash: tokenHash,
    p_nome: nome,
    p_email: email,
    p_perfil: perfil,
    p_equipe: equipe,
    p_unidade: unidade,
    p_rh_contratacao: rhContratacao,
    p_expira_em: expiraEm,
    p_criado_por: auth.usuario.nome,
    p_criado_por_id: auth.usuario.id,
    p_criado_por_email: auth.usuario.email,
  });

  if (registrationError) {
    if (String(registrationError.code || "") === "23505" || /já possui um usuário/i.test(String(registrationError.message || ""))) {
      return jsonResponse({ error: "Este e-mail já possui um usuário ativo ou inativo." }, { status: 409 });
    }
    throw registrationError;
  }

  const result = Array.isArray(registration) ? registration[0] : null;
  const usuarioId = Number(result?.usuario_id || 0);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("O banco não confirmou o usuário pendente do convite.");
  }

  const { data: usuario, error: userError } = await auth.supabase
    .from("usuarios")
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao")
    .eq("id", usuarioId)
    .single();
  if (userError) throw userError;

  return jsonResponse({
    ok: true,
    link: buildUserInviteLink(token),
    expiresAt: expiraEm,
    usuario: mapUsuarioResponse(usuario),
  });
}

async function getUserInvite(body: Record<string, unknown>) {
  const token = normalizeText(body.token, 160).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return jsonResponse({ error: "Convite inválido. Solicite um novo convite ao administrador." }, { status: 404 });
  }

  const supabase = createServiceClient();
  const tokenHash = await hashUserInviteToken(token);
  const { data: invite, error } = await supabase
    .from("convites_usuarios")
    .select(USER_INVITE_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!invite || invite.usado_em || invite.revogado_em) {
    return jsonResponse({ error: "Convite inválido ou já utilizado. Solicite um novo convite." }, { status: 404 });
  }
  if (Date.parse(String(invite.expira_em || "")) <= Date.now()) {
    return jsonResponse({ error: "Este convite expirou. Solicite um novo convite ao administrador." }, { status: 410 });
  }

  return jsonResponse({
    ok: true,
    convite: {
      nome: invite.nome,
      email: invite.email,
      perfil: invite.perfil,
      equipe: invite.equipe || "",
      unidade: invite.unidade,
      rhContratacao: !!invite.rh_contratacao,
      expiresAt: invite.expira_em,
    },
  });
}

async function completeUserInvite(body: Record<string, unknown>) {
  const token = normalizeText(body.token, 160).toLowerCase();
  const details = (body.dados || {}) as UserInviteCompletionPayload;
  const senha = String(body.senha || "");
  const nome = normalizeText(details.nome, 80).toUpperCase();
  const tel = normalizeText(details.tel, 30);
  const nasc = normalizeIsoDate(details.nasc);
  const cpf = normalizeCpf(details.cpf);
  const cep = String(details.cep || "").replace(/\D/g, "").slice(0, 8);
  const endereco = normalizeText(details.endereco || details.end, 180);
  const cidade = normalizeText(details.cidade, 100);
  const estado = normalizeText(details.estado, 2).toUpperCase();
  const banco = normalizeText(details.banco, 100);
  const agencia = normalizeText(details.agencia, 30);
  const conta = normalizeText(details.conta, 40);
  const tipoConta = normalizeText(details.tipoConta || details.tipo_conta, 30);
  const pixTipo = normalizeText(details.pixTipo || details.pix_tipo, 30);
  const pix = normalizeText(details.pix, 180);

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return jsonResponse({ error: "Convite inválido. Solicite um novo convite ao administrador." }, { status: 404 });
  }
  if (!nome || tel.replace(/\D/g, "").length < 8 || !nasc || !isValidCpf(cpf) || cep.length !== 8 || !endereco || !cidade || estado.length !== 2) {
    return jsonResponse({ error: "Revise os dados pessoais obrigatórios antes de concluir o cadastro." }, { status: 400 });
  }
  if (!banco || !conta || !tipoConta || !pixTipo || !pix) {
    return jsonResponse({ error: "Banco, conta, tipo de conta e chave Pix são obrigatórios." }, { status: 400 });
  }
  if (senha.length < 6 || senha.length > 200) {
    return jsonResponse({ error: "A senha deve ter entre 6 e 200 caracteres." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const tokenHash = await hashUserInviteToken(token);
  const { data: completion, error: completionError } = await supabase.rpc("concluir_convite_usuario", {
    p_token_hash: tokenHash,
    p_nome: nome,
    p_tel: tel,
    p_nasc: nasc,
    p_cpf: cpf,
    p_cep: cep,
    p_endereco: endereco,
    p_cidade: cidade,
    p_estado: estado,
    p_banco: banco,
    p_agencia: agencia,
    p_conta: conta,
    p_tipo_conta: tipoConta,
    p_pix_tipo: pixTipo,
    p_pix: pix,
    p_senha: senha,
  });

  if (completionError) {
    const message = String(completionError.message || "");
    if (/expirou/i.test(message)) return jsonResponse({ error: message }, { status: 410 });
    if (/inválido|utilizado|pendente/i.test(message)) return jsonResponse({ error: message }, { status: 409 });
    throw completionError;
  }

  const result = Array.isArray(completion) ? completion[0] : null;
  const usuarioId = Number(result?.usuario_id || 0);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("O banco não confirmou a conclusão do cadastro.");
  }

  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("id,nome,email,perfil,status,unidade,equipe,tel,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao")
    .eq("id", usuarioId)
    .single();
  if (userError) throw userError;

  return jsonResponse({ ok: true, usuario: mapUsuarioResponse(usuario) });
}

async function authorizePayroll(req: Request, _body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const auth = await requireAuthenticatedUsuario(req, supabase);
  if ("response" in auth) return auth;
  if (!canManagePayroll(auth.usuario.perfil)) {
    return { response: jsonResponse({ error: "Seu perfil não possui acesso à folha de pagamento." }, { status: 403 }) };
  }
  return auth;
}

async function listPayroll(req: Request, body: Record<string, unknown>) {
  const auth = await authorizePayroll(req, body);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("folha_pagamento_colaboradores")
    .select("id,nome,cpf,funcao,salario,chave_pix,banco,criado_por,criado_por_id,criado_por_email,atualizado_em")
    .order("nome");
  if (error) throw error;

  return jsonResponse({ ok: true, colaboradores: data || [] });
}

async function savePayroll(req: Request, body: Record<string, unknown>) {
  const auth = await authorizePayroll(req, body);
  if ("response" in auth) return auth.response;

  const colaborador = (body.colaborador || {}) as PayrollPayload;
  const id = Number(body.id || 0);
  const nome = normalizeText(colaborador.nome, 160).toUpperCase();
  const cpf = normalizeCpf(colaborador.cpf);
  const funcao = normalizeText(colaborador.funcao, 100).toUpperCase();
  const salario = Number(colaborador.salario || 0);
  const chavePix = normalizeText(colaborador.chave_pix || colaborador.chavePix, 180);
  const banco = normalizeText(colaborador.banco, 100).toUpperCase();

  if (!nome || !isValidCpf(cpf) || !funcao || !Number.isFinite(salario) || salario <= 0 || !chavePix || !banco) {
    return jsonResponse({ error: "Nome, CPF válido, função, salário, chave PIX e banco são obrigatórios." }, { status: 400 });
  }

  const payload = {
    nome,
    cpf,
    funcao,
    salario,
    chave_pix: chavePix,
    banco,
    criado_por: auth.usuario.nome,
    criado_por_id: auth.usuario.id,
    criado_por_email: auth.usuario.email,
    atualizado_em: new Date().toISOString(),
  };

  const query = id > 0
    ? auth.supabase.from("folha_pagamento_colaboradores").update(payload).eq("id", id)
    : auth.supabase.from("folha_pagamento_colaboradores").insert(payload);
  const { data, error } = await query
    .select("id,nome,cpf,funcao,salario,chave_pix,banco,criado_por,criado_por_id,criado_por_email,atualizado_em")
    .single();

  if (error) {
    if (String(error.code || "") === "23505") {
      return jsonResponse({ error: "Este CPF já está cadastrado na folha de pagamento." }, { status: 409 });
    }
    throw error;
  }

  return jsonResponse({ ok: true, colaborador: data });
}

async function deletePayroll(req: Request, body: Record<string, unknown>) {
  const auth = await authorizePayroll(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ error: "Cadastro inválido para exclusão." }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("folha_pagamento_colaboradores")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return jsonResponse({ ok: true });
}

async function authorizeAtoRefunds(req: Request, _body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const auth = await requireAuthenticatedUsuario(req, supabase);
  if ("response" in auth) return auth;
  if (!canManageAtoRefunds(auth.usuario.perfil)) {
    return { response: jsonResponse({ error: "Seu perfil não possui acesso aos reembolsos de ATO." }, { status: 403 }) };
  }
  return auth;
}

async function listAtoRefunds(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("reembolsos_ato")
    .select(ATO_REFUND_SELECT)
    .order("data_prevista")
    .order("cliente");
  if (error) throw error;
  return jsonResponse({ ok: true, reembolsos: data || [] });
}

async function saveAtoRefund(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;

  const reembolso = (body.reembolso || {}) as AtoRefundPayload;
  const id = Number(body.id || 0);
  const cliente = normalizeText(reembolso.cliente, 160).toUpperCase();
  const telefone = normalizeText(reembolso.telefone, 30);
  const valor = Number(reembolso.valor || 0);
  const dataPrevista = normalizeIsoDate(reembolso.data_prevista || reembolso.dataPrevista);
  const banco = normalizeText(reembolso.banco, 100).toUpperCase();
  const chavePix = normalizeText(reembolso.chave_pix || reembolso.chavePix, 180);

  if (!cliente || telefone.replace(/\D/g, "").length < 8 || !Number.isFinite(valor) || valor <= 0 || !dataPrevista || !banco || !chavePix) {
    return jsonResponse({ error: "Cliente, telefone, valor, data prevista, banco e chave PIX são obrigatórios." }, { status: 400 });
  }

  if (id > 0) {
    const { data: atual, error: atualError } = await auth.supabase
      .from("reembolsos_ato")
      .select("id,status")
      .eq("id", id)
      .maybeSingle();
    if (atualError) throw atualError;
    if (!atual) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });
    if (String(atual.status) === "reembolsado") {
      return jsonResponse({ error: "Este reembolso já foi reembolsado e não pode ser alterado." }, { status: 409 });
    }
  }

  const payload = {
    cliente,
    telefone,
    valor,
    data_prevista: dataPrevista,
    banco,
    chave_pix: chavePix,
    criado_por: auth.usuario.nome,
    criado_por_id: auth.usuario.id,
    criado_por_email: auth.usuario.email,
    atualizado_em: new Date().toISOString(),
  };
  const query = id > 0
    ? auth.supabase.from("reembolsos_ato").update(payload).eq("id", id)
    : auth.supabase.from("reembolsos_ato").insert(payload);
  const { data, error } = await query.select(ATO_REFUND_SELECT).single();
  if (error) throw error;
  return jsonResponse({ ok: true, reembolso: data });
}

async function deleteAtoRefund(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ error: "Reembolso inválido para exclusão." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("excluir_reembolso_ato_completo", { p_id: id });
  if (error) throw error;
  const removido = Array.isArray(data) ? data[0] : null;
  if (!removido) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });

  const receiptBucket = String(removido.comprovante_storage_bucket_removido || "");
  const receiptPath = String(removido.comprovante_storage_path_removido || "");
  let receiptRemoved = !receiptPath;
  if (receiptBucket === ATO_RECEIPT_BUCKET && receiptPath.startsWith(`${id}/`)) {
    const { error: removeError } = await auth.supabase.storage.from(ATO_RECEIPT_BUCKET).remove([receiptPath]);
    if (removeError) {
      console.warn("Falha ao remover comprovante do ATO excluído", { id, receiptPath, error: removeError.message });
    } else {
      receiptRemoved = true;
    }
  }

  return jsonResponse({
    ok: true,
    reembolsoId: removido.reembolso_id,
    financeiroLancamentoId: removido.financeiro_lancamento_id_removido || null,
    financeiroRefLocal: `fin-reembolso-ato-${id}`,
    comprovanteRemovido: receiptRemoved,
  });
}

async function markAtoRefunded(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  const requestedDate = normalizeIsoDate(body.data_reembolso);
  if (!Number.isInteger(id) || id <= 0 || !requestedDate) {
    return jsonResponse({ error: "Reembolso ou data de pagamento inválidos para a baixa." }, { status: 400 });
  }

  const { data: reembolso, error: refundError } = await auth.supabase
    .from("reembolsos_ato")
    .select(ATO_REFUND_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (refundError) throw refundError;
  if (!reembolso) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });

  const dataReembolso = String(reembolso.status) === "reembolsado"
    ? normalizeIsoDate(reembolso.data_reembolso) || requestedDate
    : requestedDate;
  const refLocal = `fin-reembolso-ato-${id}`;
  let { data: lancamento, error: financeLookupError } = await auth.supabase
    .from("financeiro_lancamentos")
    .select("*")
    .eq("ref_local", refLocal)
    .maybeSingle();
  if (financeLookupError) throw financeLookupError;

  if (!lancamento) {
    const financePayload = {
      tipo: "saida",
      categoria: "REEMBOLSO",
      descricao: `REEMBOLSO ATO - ${String(reembolso.cliente || "CLIENTE").toUpperCase()}`,
      status: "realizado",
      valor: Number(reembolso.valor || 0),
      unidade: "",
      data_prevista: reembolso.data_prevista,
      data_realizada: dataReembolso,
      observacao: "GERADO PELO MÓDULO DE REEMBOLSOS DE ATO",
      criado_por: auth.usuario.nome,
      criado_por_id: auth.usuario.id,
      criado_por_email: auth.usuario.email,
      atualizado_em: new Date().toISOString(),
      ref_local: refLocal,
      sync_pendente: false,
      sync_erro: "",
    };
    const { data: novoLancamento, error: financeInsertError } = await auth.supabase
      .from("financeiro_lancamentos")
      .insert(financePayload)
      .select("*")
      .single();
    if (financeInsertError) {
      if (String(financeInsertError.code || "") !== "23505") throw financeInsertError;
      const retry = await auth.supabase.from("financeiro_lancamentos").select("*").eq("ref_local", refLocal).single();
      if (retry.error) throw retry.error;
      lancamento = retry.data;
    } else {
      lancamento = novoLancamento;
    }
  }

  const { data: atualizado, error: updateError } = await auth.supabase
    .from("reembolsos_ato")
    .update({
      status: "reembolsado",
      data_reembolso: dataReembolso,
      financeiro_lancamento_id: lancamento.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ATO_REFUND_SELECT)
    .single();
  if (updateError) throw updateError;

  return jsonResponse({ ok: true, reembolso: atualizado, lancamento });
}

async function createAtoReceiptUpload(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  const name = normalizeReceiptName(body.nome);
  const mime = normalizeReceiptMime(body.mime);
  const size = Number(body.size || 0);
  if (!Number.isInteger(id) || id <= 0 || !mime || !Number.isFinite(size) || size <= 0 || size > ATO_RECEIPT_MAX_SIZE) {
    return jsonResponse({ error: "Envie um comprovante em PDF, JPG, PNG ou WEBP com no máximo 10MB." }, { status: 400 });
  }

  const { data: reembolso, error: refundError } = await auth.supabase
    .from("reembolsos_ato")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (refundError) throw refundError;
  if (!reembolso) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });
  if (String(reembolso.status) !== "reembolsado") {
    return jsonResponse({ error: "O comprovante só pode ser anexado depois que o reembolso for concluído." }, { status: 409 });
  }

  const path = `${id}/${crypto.randomUUID()}.${receiptExtension(mime)}`;
  const { data, error } = await auth.supabase.storage
    .from(ATO_RECEIPT_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  if (!data?.token) throw new Error("O armazenamento não retornou a autorização para o upload.");

  return jsonResponse({
    ok: true,
    upload: {
      bucket: ATO_RECEIPT_BUCKET,
      path,
      token: data.token,
      nome: name,
      mime,
      size,
    },
  });
}

async function confirmAtoReceiptUpload(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  const name = normalizeReceiptName(body.nome);
  const mime = normalizeReceiptMime(body.mime);
  const size = Number(body.size || 0);
  const bucket = String(body.bucket || "").trim();
  const path = String(body.path || "").trim();
  const expectedPrefix = `${id}/`;
  if (!Number.isInteger(id) || id <= 0 || bucket !== ATO_RECEIPT_BUCKET || !path.startsWith(expectedPrefix) || path.includes("..") || !mime || !Number.isFinite(size) || size <= 0 || size > ATO_RECEIPT_MAX_SIZE) {
    return jsonResponse({ error: "Dados do comprovante inválidos para confirmação." }, { status: 400 });
  }

  const { data: reembolso, error: refundError } = await auth.supabase
    .from("reembolsos_ato")
    .select(ATO_REFUND_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (refundError) throw refundError;
  if (!reembolso) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });
  if (String(reembolso.status) !== "reembolsado") {
    return jsonResponse({ error: "O comprovante só pode ser anexado depois que o reembolso for concluído." }, { status: 409 });
  }

  const fileName = path.slice(expectedPrefix.length);
  if (!fileName || fileName.includes("/")) {
    return jsonResponse({ error: "Caminho do comprovante inválido." }, { status: 400 });
  }
  const { data: objects, error: listError } = await auth.supabase.storage
    .from(ATO_RECEIPT_BUCKET)
    .list(String(id), { search: fileName, limit: 20 });
  if (listError) throw listError;
  if (!(objects || []).some((item) => item.name === fileName)) {
    return jsonResponse({ error: "O arquivo enviado não foi localizado no armazenamento." }, { status: 400 });
  }

  const oldBucket = String(reembolso.comprovante_storage_bucket || "");
  const oldPath = String(reembolso.comprovante_storage_path || "");
  const { data: atualizado, error: updateError } = await auth.supabase
    .from("reembolsos_ato")
    .update({
      comprovante_nome: name,
      comprovante_mime: mime,
      comprovante_size: Math.round(size),
      comprovante_storage_bucket: ATO_RECEIPT_BUCKET,
      comprovante_storage_path: path,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ATO_REFUND_SELECT)
    .single();
  if (updateError) throw updateError;

  if (oldBucket === ATO_RECEIPT_BUCKET && oldPath && oldPath !== path) {
    const { error: removeError } = await auth.supabase.storage.from(ATO_RECEIPT_BUCKET).remove([oldPath]);
    if (removeError) console.warn("Falha ao remover comprovante substituído do ATO", { id, oldPath, error: removeError.message });
  }
  return jsonResponse({ ok: true, reembolso: atualizado });
}

async function getAtoReceiptUrl(req: Request, body: Record<string, unknown>) {
  const auth = await authorizeAtoRefunds(req, body);
  if ("response" in auth) return auth.response;
  const id = Number(body.id || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return jsonResponse({ error: "Reembolso inválido para abrir o comprovante." }, { status: 400 });
  }

  const { data: reembolso, error: refundError } = await auth.supabase
    .from("reembolsos_ato")
    .select("id,comprovante_nome,comprovante_storage_bucket,comprovante_storage_path")
    .eq("id", id)
    .maybeSingle();
  if (refundError) throw refundError;
  if (!reembolso) return jsonResponse({ error: "Reembolso não encontrado." }, { status: 404 });
  const bucket = String(reembolso.comprovante_storage_bucket || "");
  const path = String(reembolso.comprovante_storage_path || "");
  if (bucket !== ATO_RECEIPT_BUCKET || !path.startsWith(`${id}/`)) {
    return jsonResponse({ error: "Este reembolso ainda não possui comprovante." }, { status: 404 });
  }

  const { data, error } = await auth.supabase.storage.from(ATO_RECEIPT_BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Não foi possível gerar o acesso temporário ao comprovante.");
  return jsonResponse({ ok: true, url: data.signedUrl, nome: reembolso.comprovante_nome || "Comprovante", expiresIn: 300 });
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

    if (action === "change_password") {
      return await changePassword(req, body);
    }

    if (action === "update_self") {
      return await updateSelf(req, body);
    }

    if (action === "create_user_invite") {
      return await createUserInvite(req, body);
    }

    if (action === "get_user_invite") {
      return await getUserInvite(body);
    }

    if (action === "complete_user_invite") {
      return await completeUserInvite(body);
    }

    if (action === "list_payroll") {
      return await listPayroll(req, body);
    }

    if (action === "save_payroll") {
      return await savePayroll(req, body);
    }

    if (action === "delete_payroll") {
      return await deletePayroll(req, body);
    }

    if (action === "list_ato_refunds") {
      return await listAtoRefunds(req, body);
    }

    if (action === "save_ato_refund") {
      return await saveAtoRefund(req, body);
    }

    if (action === "delete_ato_refund") {
      return await deleteAtoRefund(req, body);
    }

    if (action === "mark_ato_refunded") {
      return await markAtoRefunded(req, body);
    }

    if (action === "create_ato_receipt_upload") {
      return await createAtoReceiptUpload(req, body);
    }

    if (action === "confirm_ato_receipt_upload") {
      return await confirmAtoReceiptUpload(req, body);
    }

    if (action === "get_ato_receipt_url") {
      return await getAtoReceiptUrl(req, body);
    }

    return jsonResponse({ error: "Ação inválida para o autoatendimento." }, { status: 400 });
  } catch (error) {
    console.error("usuario-self-service", error);
    return jsonResponse({
      error: normalizeErrorMessage(error),
    }, { status: 500 });
  }
});
