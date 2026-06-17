export const ETAPAS_VENDA = [
  "Aguardando demanda",
  "Entrevista",
  "Ass. formulários",
  "Envio CEHOP",
  "Entrevista Caixa",
  "Aguard. Ass. CEF",
  "Assinado CEF",
  "Nota emitida",
  "Comissão recebida",
];

export const ETAPA_COMISSAO_RECEBIDA = ETAPAS_VENDA.length - 1;

export type ZapiNotificationEventType =
  | "cadastro_venda"
  | "evolucao_etapa"
  | "comissao_recebida"
  | "distrato_venda";

type HistoryRecord = Record<string, unknown>;

export function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function buildNameKeys(name: unknown) {
  const normalized = normalizeText(name);
  if (!normalized) return [];
  const parts = normalized.split(" ").filter(Boolean);
  const keys = [normalized];
  const firstName = parts[0] || "";
  if (firstName.length >= 3 && !keys.includes(firstName)) keys.push(firstName);
  if (parts.length >= 2) {
    const shortName = parts.slice(0, 2).join(" ");
    if (!keys.includes(shortName)) keys.push(shortName);
  }
  return keys;
}

export function namesMatch(storedName: unknown, userName: unknown) {
  const target = normalizeText(storedName);
  const candidate = normalizeText(userName);
  if (!target || !candidate) return false;
  if (target === candidate) return true;
  const keys = buildNameKeys(userName);
  if (keys.some((key) => key !== candidate && key === target)) return true;
  return keys.some((key) => key.includes(" ") && (target.startsWith(`${key} `) || key.startsWith(`${target} `)));
}

export function normalizePhoneToZapi(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return "";
}

export function statusUsuarioAtivo(status: unknown) {
  return normalizeText(status) === "ATIVO";
}

export function formatMommentToIso(momment: unknown) {
  const value = Number(momment);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(value).toISOString();
}

export function formatDatePtBr(dateInput: Date | string | number) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTimePtBr(dateInput: Date | string | number) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrencyPtBr(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value, 0)));
}

function firstName(name: unknown) {
  return String(name || "").trim().split(/\s+/).filter(Boolean)[0] || "";
}

function roleLabel(role: string) {
  switch (role) {
    case "corretor":
      return "Corretor";
    case "capitao":
      return "Capitão";
    case "gerente":
      return "Gerente";
    case "diretor":
      return "Diretor";
    case "diretor2":
      return "Diretor 2";
    default:
      return "Responsável";
  }
}

function normalizeRoles(recipient: Record<string, unknown>) {
  const base = Array.isArray(recipient.papeis)
    ? recipient.papeis
    : recipient.papel
      ? [recipient.papel]
      : [];
  return [...new Set(base.map((item) => String(item || "").trim()).filter(Boolean))];
}

function calcCommission(venda: Record<string, unknown>, pct: number) {
  const valor = toNumber(venda.valor, 0);
  const imposto = toNumber(venda.imp, 0.11);
  return (valor * pct) - (valor * pct * imposto);
}

function commissionByRole(venda: Record<string, unknown>, role: string) {
  switch (role) {
    case "corretor":
      return calcCommission(venda, toNumber(venda.pct_cor, 0));
    case "capitao":
      return calcCommission(venda, toNumber(venda.pct_cap, 0));
    case "gerente":
      return calcCommission(venda, toNumber(venda.pct_ger, 0));
    case "diretor":
      return calcCommission(venda, toNumber(venda.pct_dir, 0));
    case "diretor2":
      return calcCommission(venda, toNumber(venda.pct_dir2, 0));
    default:
      return 0;
  }
}

function bonusByRole(venda: Record<string, unknown>, role: string) {
  const bonus = toNumber(venda.bonus, 0);
  if (bonus <= 0) return 0;
  switch (role) {
    case "corretor":
      return bonus * (toNumber(venda.bonus_pct_cor, 0) / 100);
    case "gerente":
      return bonus * (toNumber(venda.bonus_pct_ger, 0) / 100);
    case "diretor":
      return bonus * (toNumber(venda.bonus_pct_dir, 0) / 100);
    case "diretor2":
      return bonus * (toNumber(venda.bonus_pct_dir2, 0) / 100);
    default:
      return 0;
  }
}

function recipientFinancials(venda: Record<string, unknown>, recipient: Record<string, unknown>) {
  const roles = normalizeRoles(recipient);
  const commission = roles.reduce((total, role) => total + commissionByRole(venda, role), 0);
  const bonus = roles.reduce((total, role) => total + bonusByRole(venda, role), 0);
  return {
    roles,
    commission,
    bonus,
  };
}

function recipientRoleText(recipient: Record<string, unknown>) {
  const roles = normalizeRoles(recipient);
  if (!roles.length) return roleLabel("responsavel");
  return roles.map(roleLabel).join(", ");
}

function buildGreeting(recipient: Record<string, unknown>) {
  const nome = firstName(recipient.destinatario_nome);
  return nome ? `Olá, ${nome}!` : "Olá!";
}

function parseHistoryMoment(hist: unknown, preferTs = true) {
  if (!hist || typeof hist !== "object") return null;
  const history = hist as HistoryRecord;
  let infoTs: { date: Date; precision: "datetime" } | null = null;
  let infoData: { date: Date; precision: "date" | "daymonth" } | null = null;

  if (typeof history.ts === "string" && history.ts.trim()) {
    const dateTs = new Date(history.ts);
    if (!Number.isNaN(dateTs.getTime())) {
      infoTs = { date: dateTs, precision: "datetime" };
    }
  }

  const raw = typeof history.d === "string" ? history.d.trim() : "";
  if (raw) {
    const parts = raw.split("/");
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      if (Number.isFinite(day) && Number.isFinite(month) && month >= 0 && month <= 11) {
        if (parts.length >= 3) {
          const year = parseInt(parts[2], 10);
          if (Number.isFinite(year)) {
            infoData = { date: new Date(year, month, day, 12, 0, 0, 0), precision: "date" };
          }
        } else {
          const now = new Date();
          infoData = {
            date: new Date(now.getFullYear(), month, day, 12, 0, 0, 0),
            precision: "daymonth",
          };
        }
      }
    }
  }

  return preferTs ? (infoTs || infoData) : (infoData || infoTs);
}

function formatHistoryMomentPtBr(hist: unknown) {
  const info = parseHistoryMoment(hist, true);
  if (!info) return formatDateTimePtBr(new Date());
  if (info.precision === "datetime") return formatDateTimePtBr(info.date);
  return formatDatePtBr(info.date);
}

function findLatestHistoryByType(venda: Record<string, unknown>, tipo: string) {
  const hist = Array.isArray(venda.hist) ? [...venda.hist].reverse() : [];
  return hist.find((item) => item && String((item as HistoryRecord).tipo || "").trim().toLowerCase() === tipo) || null;
}

export function resolveNotificationEventType(rawType: unknown, etapaNova: number): ZapiNotificationEventType {
  const value = String(rawType || "").trim().toLowerCase();
  if (value === "cadastro_venda") return "cadastro_venda";
  if (value === "comissao_recebida") return "comissao_recebida";
  if (value === "distrato_venda") return "distrato_venda";
  if (value === "evolucao_etapa") return "evolucao_etapa";
  return etapaNova === ETAPA_COMISSAO_RECEBIDA ? "comissao_recebida" : "evolucao_etapa";
}

function buildCadastroMessage(
  venda: Record<string, unknown>,
  recipient: Record<string, unknown>,
  responsavel: string,
) {
  const cliente = String(venda.cliente || "").trim() || "Cliente não informado";
  const produto = String(venda.produto || "").trim() || "Produto não informado";
  const unidade = String(venda.unidade || "").trim() || "Unidade não informada";
  const dataHora = formatDateTimePtBr(new Date());
  const financials = recipientFinancials(venda, recipient);
  return [
    "Zelony | Venda cadastrada",
    "",
    buildGreeting(recipient),
    "",
    `Parabéns! A venda de ${cliente} foi cadastrada com sucesso e você acaba de adicionar mais esse saldo à sua carteira Zelony Imóveis.`,
    "",
    `Produto: ${produto}`,
    `Unidade: ${unidade}`,
    `Sua participação: ${recipientRoleText(recipient)}`,
    `Comissão estimada: ${formatCurrencyPtBr(financials.commission)}`,
    ...(financials.bonus > 0 ? [`Bônus estimado nesta venda: ${formatCurrencyPtBr(financials.bonus)}`] : []),
    `Responsável pelo cadastro: ${responsavel || "Sistema"}`,
    `Data do cadastro: ${dataHora}`,
  ].join("\n");
}

function buildComissaoRecebidaMessage(
  venda: Record<string, unknown>,
  recipient: Record<string, unknown>,
  responsavel: string,
) {
  const cliente = String(venda.cliente || "").trim() || "Cliente não informado";
  const produto = String(venda.produto || "").trim() || "Produto não informado";
  const unidade = String(venda.unidade || "").trim() || "Unidade não informada";
  const dataHora = formatDateTimePtBr(new Date());
  const financials = recipientFinancials(venda, recipient);
  return [
    "Zelony | Comissão recebida",
    "",
    buildGreeting(recipient),
    "",
    `Parabéns! A venda de ${cliente} chegou à etapa "Comissão recebida".`,
    `O valor de ${formatCurrencyPtBr(financials.commission)} foi registrado como recebido na sua conta bancária.`,
    "",
    `Produto: ${produto}`,
    `Unidade: ${unidade}`,
    `Sua participação: ${recipientRoleText(recipient)}`,
    `Atualização registrada em: ${dataHora}`,
    `Responsável pela atualização: ${responsavel || "Sistema"}`,
  ].join("\n");
}

function buildDistratoMessage(
  venda: Record<string, unknown>,
  recipient: Record<string, unknown>,
  responsavel: string,
) {
  const cliente = String(venda.cliente || "").trim() || "Cliente não informado";
  const produto = String(venda.produto || "").trim() || "Produto não informado";
  const unidade = String(venda.unidade || "").trim() || "Unidade não informada";
  const financials = recipientFinancials(venda, recipient);
  const history = findLatestHistoryByType(venda, "distrato") as HistoryRecord | null;
  const categoria = String(history?.categoriaDistrato || history?.categoria || "").trim() || "Sem categoria informada";
  const observacao = String(history?.observacaoDistrato || history?.motivoDistrato || history?.o || "").trim() || "Sem observação informada";
  const responsavelFinal = String(history?.u || responsavel || "Sistema").trim() || "Sistema";
  const dataHora = history ? formatHistoryMomentPtBr(history) : formatDateTimePtBr(new Date());
  return [
    "Zelony | Distrato de venda",
    "",
    buildGreeting(recipient),
    "",
    `A venda de ${cliente} foi marcada como distratada.`,
    "",
    `Produto: ${produto}`,
    `Unidade: ${unidade}`,
    `Sua participação: ${recipientRoleText(recipient)}`,
    `Impacto estimado na sua comissão: ${formatCurrencyPtBr(financials.commission)}`,
    ...(financials.bonus > 0 ? [`Impacto estimado no bônus: ${formatCurrencyPtBr(financials.bonus)}`] : []),
    `Categoria do distrato: ${categoria}`,
    `Observação: ${observacao}`,
    `Responsável pelo registro: ${responsavelFinal}`,
    `Data da atualização: ${dataHora}`,
  ].join("\n");
}

export function buildStageMessage(
  venda: Record<string, unknown>,
  etapaAnterior: number,
  etapaNova: number,
  responsavel: string,
  recipient: Record<string, unknown> = {},
) {
  const cliente = String(venda.cliente || "").trim() || "Cliente não informado";
  const produto = String(venda.produto || "").trim() || "Produto não informado";
  const unidade = String(venda.unidade || "").trim() || "Unidade não informada";
  const etapaAnteriorNome = ETAPAS_VENDA[etapaAnterior] || `Etapa ${etapaAnterior}`;
  const etapaNovaNome = ETAPAS_VENDA[etapaNova] || `Etapa ${etapaNova}`;
  const dataHora = formatDateTimePtBr(new Date());
  return [
    "Zelony | Evolução de venda",
    "",
    buildGreeting(recipient),
    "",
    `A venda de ${cliente} avançou de "${etapaAnteriorNome}" para "${etapaNovaNome}".`,
    "",
    `Produto: ${produto}`,
    `Unidade: ${unidade}`,
    `Sua participação: ${recipientRoleText(recipient)}`,
    `Data da atualização: ${dataHora}`,
    `Responsável pelo avanço: ${responsavel || "Sistema"}`,
  ].join("\n");
}

export function buildNotificationMessage(params: {
  venda: Record<string, unknown>;
  recipient?: Record<string, unknown>;
  etapaAnterior: number;
  etapaNova: number;
  responsavel: string;
  tipoEvento?: ZapiNotificationEventType | string | null;
}) {
  const {
    venda,
    recipient = {},
    etapaAnterior,
    etapaNova,
    responsavel,
    tipoEvento,
  } = params;
  const resolvedType = resolveNotificationEventType(tipoEvento, etapaNova);
  if (resolvedType === "cadastro_venda") {
    return buildCadastroMessage(venda, recipient, responsavel);
  }
  if (resolvedType === "comissao_recebida") {
    return buildComissaoRecebidaMessage(venda, recipient, responsavel);
  }
  if (resolvedType === "distrato_venda") {
    return buildDistratoMessage(venda, recipient, responsavel);
  }
  return buildStageMessage(venda, etapaAnterior, etapaNova, responsavel, recipient);
}

export function dedupeRecipients<T extends { phone: string }>(items: T[]) {
  const map = new Map<string, T & { papeis: string[] }>();
  items.forEach((item) => {
    if (!item || !item.phone) return;
    const existing = map.get(item.phone);
    const papel = String((item as Record<string, unknown>).papel || "").trim();
    if (!existing) {
      map.set(item.phone, {
        ...item,
        papeis: papel ? [papel] : [],
      });
      return;
    }
    if (papel && !existing.papeis.includes(papel)) existing.papeis.push(papel);
    const existingRecord = existing as Record<string, unknown>;
    const itemRecord = item as Record<string, unknown>;
    if (!existingRecord.destinatario_usuario_id && itemRecord.destinatario_usuario_id) {
      existingRecord.destinatario_usuario_id = itemRecord.destinatario_usuario_id;
    }
  });
  return Array.from(map.values());
}
