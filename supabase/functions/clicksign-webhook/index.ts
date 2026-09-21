import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

// Recebe as notificações do Clicksign quando o contrato de parceria
// (Corretor PJ) é finalizado — todas as assinaturas concluídas — e então
// libera o convite de acesso ao sistema Zelony (mesmo fluxo que hoje roda
// na hora, para os demais perfis, em usuario-self-service:createUserInvite).
//
// Autenticação: como a documentação pública do Clicksign não deixou claro
// o esquema de assinatura HMAC usado nos webhooks, a validação aqui é por
// segredo compartilhado na própria URL (?secret=...), configurado ao
// cadastrar o webhook no painel do Clicksign. Ver CLICKSIGN_WEBHOOK_SECRET
// nas secrets do projeto.
//
// O nome/local exato dos campos do payload (chave do envelope/documento,
// nome do evento de finalização) não pôde ser confirmado 100% pela
// documentação pública — por isso todo payload recebido é gravado em
// `clicksign_webhook_eventos` e a busca do contrato correspondente é feita
// varrendo o payload inteiro por qualquer UUID que bata com um envelope ou
// documento que criamos. Ajustar aqui assim que virmos um payload real.

const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") || "https://www.zelonyimoveisapp.com.br/";
const USER_INVITE_DURATION_DAYS = 7;

const EJS_SERVICE = "service_wirqv1v";
const EJS_TEMPLATE = "template_ylfp3ad";
const EJS_PUBLIC_KEY = "GEXIho24PuM7N3RTZ";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function extractUuids(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const found = text.match(UUID_RE) || [];
  return Array.from(new Set(found.map((item) => item.toLowerCase())));
}

function extractEmails(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const found = text.match(EMAIL_RE) || [];
  return Array.from(new Set(found.map((item) => item.toLowerCase())));
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

function montarPayloadEmailConvite(params: {
  nome: string;
  email: string;
  perfil: string;
  equipe: string;
  unidade: string;
  rhContratacao: boolean;
  link: string;
}) {
  const primeiroNome = String(params.nome || "").trim().split(" ")[0] || "";
  const mensagem = [
    `Olá, ${primeiroNome || params.nome}!`,
    "Seu contrato foi assinado e seu acesso ao sistema Zelony foi liberado.",
    `Perfil: ${params.perfil}`,
    params.unidade ? `Unidade: ${params.unidade}` : "",
    params.equipe ? `Equipe: ${params.equipe}` : "",
    params.rhContratacao ? "Origem: RH" : "",
    "",
    "Use o link abaixo para concluir seu cadastro:",
    params.link,
  ].filter(Boolean).join("\n");

  return {
    nome: params.nome,
    name: params.nome,
    nome_completo: params.nome,
    to_name: primeiroNome || params.nome,
    primeiro_nome: primeiroNome || params.nome,
    email: params.email,
    email_para: params.email,
    to_email: params.email,
    user_email: params.email,
    destinatario_email: params.email,
    cargo: params.perfil,
    perfil: params.perfil,
    equipe: params.equipe,
    unidade: params.unidade,
    rh: params.rhContratacao ? "Sim" : "Nao",
    diretor: "Zelony Imóveis",
    from_name: "Zelony Imóveis",
    reply_to: CLICKSIGN_ZELONY_SIGNER_EMAIL,
    link: params.link,
    invite_link: params.link,
    convite_link: params.link,
    onboarding_link: params.link,
    assunto: "Contrato assinado — acesso ao sistema Zelony liberado",
    subject: "Contrato assinado — acesso ao sistema Zelony liberado",
    mensagem,
  };
}

const CLICKSIGN_ZELONY_SIGNER_EMAIL = "contato@zelonyimoveis.com.br";

async function enviarEmailConviteAcesso(params: {
  nome: string;
  email: string;
  perfil: string;
  equipe: string;
  unidade: string;
  rhContratacao: boolean;
  link: string;
}) {
  const privateKey = Deno.env.get("EMAILJS_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("EMAILJS_PRIVATE_KEY não configurado nas secrets do projeto — não foi possível enviar o e-mail de acesso.");
  }
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EJS_SERVICE,
      template_id: EJS_TEMPLATE,
      user_id: EJS_PUBLIC_KEY,
      accessToken: privateKey,
      template_params: montarPayloadEmailConvite(params),
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`EmailJS falhou (HTTP ${response.status}): ${text.slice(0, 400)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(req.url);
  const secretEsperado = Deno.env.get("CLICKSIGN_WEBHOOK_SECRET");
  const secretRecebido = url.searchParams.get("secret") || "";
  if (!secretEsperado || secretRecebido !== secretEsperado) {
    return jsonResponse({ error: "Assinatura inválida." }, { status: 401 });
  }

  const supabase = createServiceClient();
  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const eventoNome = String(
    (payload as any)?.event?.name || (payload as any)?.event?.data?.name || "desconhecido",
  );

  // Sempre grava o payload bruto, mesmo que nada mais dê certo — é a única
  // forma de ver o formato real e ajustar a extração acima com segurança.
  const { data: logRow } = await supabase
    .from("clicksign_webhook_eventos")
    .insert({ evento: eventoNome, payload })
    .select("id")
    .single();

  try {
    const uuids = extractUuids(payload);
    if (uuids.length === 0) {
      return jsonResponse({ ok: true, ignorado: "sem identificador reconhecível no payload" });
    }

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos_clicksign_pendentes")
      .select("*")
      .eq("status", "aguardando_assinatura")
      .or(
        uuids.map((id) => `clicksign_envelope_key.eq.${id}`).join(",") +
          "," +
          uuids.map((id) => `clicksign_document_key.eq.${id}`).join(","),
      )
      .maybeSingle();
    if (contratoError) throw contratoError;

    if (!contrato) {
      return jsonResponse({ ok: true, ignorado: "nenhum contrato pendente correspondente" });
    }

    // O acesso deve liberar assim que o CORRETOR assinar — não é preciso
    // esperar a contra-assinatura da Zelony (Paulo assina a parte dele
    // manualmente, sem pressa, depois). Como a documentação pública não deixa
    // claro o nome exato do evento de "um signatário específico assinou",
    // usamos duas checagens complementares:
    //   1) evento de assinatura/conclusão (nome contém sign/assin/conclu) E
    //      o e-mail do CORRETOR aparece no payload — é o sinal mais direto
    //      de que foi a assinatura dele.
    //   2) evento de fechamento do envelope/documento inteiro (close/closed)
    //      — serve de rede de segurança: se o envelope fechou, o corretor
    //      necessariamente já assinou, então também libera (mesmo que o
    //      evento por-signatário não tenha sido reconhecido acima).
    const emails = extractEmails(payload);
    const corretorEmail = String(contrato.email || "").toLowerCase();
    const eventoDeAssinatura = /sign|assin|conclu/i.test(eventoNome);
    const eventoDeFechamento = /close|closed|finaliz/i.test(eventoNome);
    const foiOCorretorQueAssinou = eventoDeAssinatura && emails.includes(corretorEmail);

    if (!foiOCorretorQueAssinou && !eventoDeFechamento) {
      return jsonResponse({ ok: true, ignorado: `evento '${eventoNome}' não indica a assinatura do corretor` });
    }

    const token = generateUserInviteToken();
    const tokenHash = await hashUserInviteToken(token);
    const expiraEm = buildUserInviteExpiryIso();

    const { data: registration, error: registrationError } = await supabase.rpc("registrar_convite_usuario", {
      p_token_hash: tokenHash,
      p_nome: contrato.nome,
      p_email: contrato.email,
      p_perfil: contrato.perfil,
      p_equipe: contrato.equipe,
      p_unidade: contrato.unidade,
      p_rh_contratacao: contrato.rh_contratacao,
      p_expira_em: expiraEm,
      p_criado_por: contrato.criado_por,
      p_criado_por_id: contrato.criado_por_id,
      p_criado_por_email: contrato.criado_por_email,
    });
    if (registrationError) throw registrationError;

    const usuarioId = Number(Array.isArray(registration) ? registration[0]?.usuario_id : 0);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new Error("O banco não confirmou o usuário pendente ao concluir o contrato.");
    }

    const { error: updateUsuarioError } = await supabase
      .from("usuarios")
      .update({
        nome_empresa: contrato.nome_empresa,
        cnpj_empresa: contrato.cnpj_empresa,
        endereco_empresa: contrato.endereco_empresa,
        contrato_status: "assinado",
        contrato_clicksign_envelope_key: contrato.clicksign_envelope_key,
        contrato_enviado_em: contrato.criado_em,
        contrato_assinado_em: new Date().toISOString(),
      })
      .eq("id", usuarioId);
    if (updateUsuarioError) throw updateUsuarioError;

    const { error: updateContratoError } = await supabase
      .from("contratos_clicksign_pendentes")
      .update({ status: "assinado", assinado_em: new Date().toISOString(), usuario_id: usuarioId })
      .eq("id", contrato.id);
    if (updateContratoError) throw updateContratoError;

    const link = buildUserInviteLink(token);
    await enviarEmailConviteAcesso({
      nome: contrato.nome,
      email: contrato.email,
      perfil: contrato.perfil,
      equipe: contrato.equipe,
      unidade: contrato.unidade,
      rhContratacao: contrato.rh_contratacao,
      link,
    });

    if (logRow?.id) {
      await supabase
        .from("clicksign_webhook_eventos")
        .update({ processado: true, contrato_id: contrato.id })
        .eq("id", logRow.id);
    }

    return jsonResponse({ ok: true, usuarioId });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.error("clicksign-webhook", mensagem);
    if (logRow?.id) {
      await supabase.from("clicksign_webhook_eventos").update({ erro: mensagem.slice(0, 800) }).eq("id", logRow.id);
    }
    // Responde 200 mesmo em erro para não entrar em loop de reentrega
    // indefinida enquanto ajustamos o parsing do payload real; o erro fica
    // registrado em clicksign_webhook_eventos para investigação manual.
    return jsonResponse({ ok: false, error: mensagem });
  }
});
