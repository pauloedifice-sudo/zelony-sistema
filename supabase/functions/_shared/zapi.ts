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

export function buildStageMessage(venda: Record<string, unknown>, etapaAnterior: number, etapaNova: number, responsavel: string) {
  const cliente = String(venda.cliente || "").trim() || "Cliente não informado";
  const produto = String(venda.produto || "").trim() || "Produto não informado";
  const unidade = String(venda.unidade || "").trim() || "Unidade não informada";
  const etapaAnteriorNome = ETAPAS_VENDA[etapaAnterior] || `Etapa ${etapaAnterior}`;
  const etapaNovaNome = ETAPAS_VENDA[etapaNova] || `Etapa ${etapaNova}`;
  const dataHora = formatDateTimePtBr(new Date());
  return [
    "Zelony | Evolução de venda",
    "",
    `A venda de ${cliente} avançou de "${etapaAnteriorNome}" para "${etapaNovaNome}".`,
    "",
    `Produto: ${produto}`,
    `Unidade: ${unidade}`,
    `Data da atualização: ${dataHora}`,
    `Responsável pelo avanço: ${responsavel || "Sistema"}`,
  ].join("\n");
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
