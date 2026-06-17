import { ETAPAS_VENDA, namesMatch, normalizePhoneToZapi, normalizeText, statusUsuarioAtivo } from "./zapi.ts";

const MONTH_NAMES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const STAGE_SLAS = [null, 5, 5, 6, 3, 3, 4, 15, null];
const TEAM_RANKING_MIN_BASE = 5;
const UNIT_RANKING_MIN_BASE = 2;
const DISTRATO_RANKING_MIN_BASE = 3;
const FINAL_STAGE = ETAPAS_VENDA.length - 1;

type JsonRecord = Record<string, unknown>;

export type OwnerReportVenda = {
  id: number;
  data?: string | null;
  mes?: string | null;
  cliente?: string | null;
  produto?: string | null;
  construtora?: string | null;
  origem?: string | null;
  unidade?: string | null;
  corretor?: string | null;
  capitao?: string | null;
  gerente?: string | null;
  diretor?: string | null;
  diretor2?: string | null;
  valor?: number | null;
  pct?: number | null;
  imp?: number | null;
  pct_cor?: number | null;
  pct_cap?: number | null;
  pct_ger?: number | null;
  pct_dir?: number | null;
  pct_dir2?: number | null;
  pct_rh?: number | null;
  bonus?: number | null;
  bonus_pct_dir?: number | null;
  bonus_pct_dir2?: number | null;
  bonus_pct_ger?: number | null;
  bonus_pct_cor?: number | null;
  etapa?: number | null;
  hist?: JsonRecord[] | null;
  distratada?: boolean | null;
};

export type OwnerReportUsuario = {
  id: number;
  nome: string;
  perfil?: string | null;
  status?: string | null;
  tel?: string | null;
  equipe?: string | null;
};

export type OwnerReportAgendamento = {
  id?: number | null;
  unidade?: string | null;
  equipe?: string | null;
  corretor?: string | null;
  cliente?: string | null;
  data_agendamento?: string | null;
  dataAgendamento?: string | null;
  horario_agendamento?: string | null;
  horarioAgendamento?: string | null;
  tipo_visita?: string | null;
  tipoVisita?: string | null;
  situacao?: string | null;
  status?: string | null;
};

export type OwnerReportFinanceiro = {
  id?: number | null;
  tipo?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  status?: string | null;
  valor?: number | null;
  unidade?: string | null;
  data_prevista?: string | null;
  dataPrevista?: string | null;
  data_realizada?: string | null;
  dataRealizada?: string | null;
  observacao?: string | null;
  ref_local?: string | null;
  refLocal?: string | null;
};

export type OwnerReportSnapshot = Record<string, unknown>;

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeVenda(venda: OwnerReportVenda) {
  return {
    ...venda,
    valor: numberOrZero(venda.valor),
    pct: numberOrZero(venda.pct),
    imp: numberOrZero(venda.imp || 0.11),
    pct_cor: numberOrZero(venda.pct_cor),
    pct_cap: numberOrZero(venda.pct_cap),
    pct_ger: numberOrZero(venda.pct_ger),
    pct_dir: numberOrZero(venda.pct_dir),
    pct_dir2: numberOrZero(venda.pct_dir2),
    pct_rh: numberOrZero(venda.pct_rh),
    bonus: numberOrZero(venda.bonus),
    bonus_pct_dir: numberOrZero(venda.bonus_pct_dir),
    bonus_pct_dir2: numberOrZero(venda.bonus_pct_dir2),
    bonus_pct_ger: numberOrZero(venda.bonus_pct_ger),
    bonus_pct_cor: numberOrZero(venda.bonus_pct_cor),
    etapa: Number.isFinite(Number(venda.etapa)) ? Number(venda.etapa) : 0,
  };
}

function historyAffectsFlow(hist: JsonRecord) {
  const tipo = String(hist?.tipo || "").trim().toLowerCase();
  return tipo !== "edicao"
    && tipo !== "distrato"
    && tipo !== "reversao"
    && tipo !== "obs"
    && tipo !== "pend_comercial"
    && tipo !== "pend_comercial_editada"
    && tipo !== "pend_comercial_resolvida"
    && tipo !== "corretor_vinculo"
    && tipo !== "prev_receb_manual"
    && tipo !== "prev_receb_editada";
}

function parseHistoryMoment(hist: unknown, preferTs = true) {
  if (!hist || typeof hist !== "object") return null;
  const record = hist as JsonRecord;
  let infoTs: { date: Date; precision: "datetime" } | null = null;
  let infoData: { date: Date; precision: "date" | "daymonth" } | null = null;

  if (typeof record.ts === "string" && record.ts.trim()) {
    const dateTs = new Date(record.ts);
    if (!Number.isNaN(dateTs.getTime())) {
      infoTs = { date: dateTs, precision: "datetime" };
    }
  }

  const raw = typeof record.d === "string" ? record.d.trim() : "";
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

function parseIsoDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractIsoDatePrefix(value: unknown) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function vendaDate(venda: OwnerReportVenda) {
  const hist = Array.isArray(venda.hist) ? venda.hist : [];
  const histBase = hist.find((item) => item && historyAffectsFlow(item)) || hist[0] || null;
  const infoHist = histBase ? (parseHistoryMoment(histBase, false) || parseHistoryMoment(histBase, true)) : null;
  if (infoHist?.date) return new Date(infoHist.date.getTime());
  const infoData = venda.data ? parseHistoryMoment({ d: venda.data }, false) : null;
  return infoData?.date ? new Date(infoData.date.getTime()) : null;
}

function distratoRecord(venda: OwnerReportVenda) {
  if (!Array.isArray(venda.hist)) return null;
  const hist = [...venda.hist].reverse();
  return hist.find((item) => item && String(item.tipo || "").trim().toLowerCase() === "distrato") || null;
}

function distratoDate(venda: OwnerReportVenda) {
  const hist = distratoRecord(venda);
  if (!hist) return null;
  const info = parseHistoryMoment(hist, false) || parseHistoryMoment(hist, true);
  return info?.date ? new Date(info.date.getTime()) : null;
}

function sameMonth(date: Date | null, month: number, year: number) {
  return !!date && date.getMonth() === month && date.getFullYear() === year;
}

function saleInCurrentMonth(venda: OwnerReportVenda, month: number, year: number) {
  const date = vendaDate(venda);
  if (sameMonth(date, month, year)) return true;
  return normalizeText(venda.mes) === normalizeText(MONTH_NAMES[month]);
}

function percentValue(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(numberOrZero(value)));
}

function formatPercent(value: number) {
  return `${percentValue(value).toFixed(1).replace(".", ",")}%`;
}

function formatDatePtBr(dateInput: Date | string | number) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTimePtBr(dateInput: Date | string | number) {
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

function firstName(name: unknown) {
  return String(name || "").trim().split(/\s+/).filter(Boolean)[0] || "";
}

function stageName(index: number) {
  return ETAPAS_VENDA[index] || `Etapa ${index}`;
}

function commissionBruta(vendaRaw: OwnerReportVenda) {
  const venda = normalizeVenda(vendaRaw);
  return venda.valor * venda.pct;
}

function commissionForPct(vendaRaw: OwnerReportVenda, pct: number) {
  const venda = normalizeVenda(vendaRaw);
  return (venda.valor * pct) - (venda.valor * pct * venda.imp);
}

function commissionTotal(vendaRaw: OwnerReportVenda) {
  const venda = normalizeVenda(vendaRaw);
  return venda.valor * venda.pct * (1 - venda.imp);
}

function pctZelony(vendaRaw: OwnerReportVenda) {
  const venda = normalizeVenda(vendaRaw);
  return Math.max(
    venda.pct
    - venda.pct_cor
    - venda.pct_cap
    - venda.pct_ger
    - venda.pct_dir
    - venda.pct_dir2
    - venda.pct_rh,
    0,
  );
}

function commissionZelony(venda: OwnerReportVenda) {
  return commissionForPct(venda, pctZelony(venda));
}

function categoriaDistrato(venda: OwnerReportVenda) {
  const record = distratoRecord(venda);
  if (!record) return "Nao informado";
  const raw = String(record.categoriaDistrato || record.categoria || "").trim();
  return raw || "Nao informado";
}

function motivoDistrato(venda: OwnerReportVenda) {
  const record = distratoRecord(venda);
  if (!record) return "";
  return String(record.observacaoDistrato || record.motivoDistrato || record.o || "").trim();
}

function latestHistoryForStage(venda: OwnerReportVenda, stage: number) {
  const hist = Array.isArray(venda.hist) ? [...venda.hist].reverse() : [];
  return hist.find((item) => item && Number(item.e) === stage && historyAffectsFlow(item)) || null;
}

function calcAtraso(vendaRaw: OwnerReportVenda, now: Date) {
  const venda = normalizeVenda(vendaRaw);
  const stage = venda.etapa;
  const sla = STAGE_SLAS[stage];
  if (sla === null || stage >= FINAL_STAGE || venda.distratada) return null;
  const refHist = latestHistoryForStage(venda, stage) || (Array.isArray(venda.hist) && venda.hist.length ? venda.hist[0] : null);
  const refInfo = parseHistoryMoment(refHist, false) || parseHistoryMoment(refHist, true);
  if (!refInfo?.date) return 0;
  const startDate = new Date(refInfo.date.getTime());
  startDate.setHours(0, 0, 0, 0);
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);
  const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysElapsed - sla;
}

function previsaoRecebimentoManual(venda: OwnerReportVenda) {
  if (!Array.isArray(venda.hist)) return null;
  const hist = [...venda.hist].reverse().find((item) => item
    && (item.tipo === "prev_receb_manual" || item.tipo === "prev_receb_editada")
    && String(item.prevData || "").trim());
  if (!hist) return null;
  const info = parseHistoryMoment({ d: String(hist.prevData || "") }, false);
  if (!info?.date) return null;
  const date = new Date(info.date.getTime());
  date.setHours(0, 0, 0, 0);
  return {
    data: formatDatePtBr(date),
    date,
    manual: true,
  };
}

function calcPrevisao(vendaRaw: OwnerReportVenda, now: Date) {
  const venda = normalizeVenda(vendaRaw);
  if (venda.distratada || venda.etapa >= FINAL_STAGE || STAGE_SLAS[venda.etapa] === null) return null;
  const manual = previsaoRecebimentoManual(venda);
  if (venda.etapa >= ETAPAS_VENDA.indexOf("Nota emitida") && manual?.date) {
    const today = new Date(now.getTime());
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - manual.date.getTime()) / (1000 * 60 * 60 * 24));
    return {
      data: manual.data,
      totalAtraso: diffDays > 0 ? diffDays : 0,
      manual: true,
    };
  }

  const hist = Array.isArray(venda.hist) ? venda.hist : [];
  const firstStageOne = hist.find((item) => item && Number(item.e) === 1 && historyAffectsFlow(item));
  const startRef = firstStageOne || hist[0] || null;
  const startInfo = parseHistoryMoment(startRef, false) || parseHistoryMoment(startRef, true);
  if (!startInfo?.date) return null;

  let baseDate = new Date(startInfo.date.getTime());
  baseDate.setHours(0, 0, 0, 0);

  let remainingSla = 0;
  for (let i = 1; i < FINAL_STAGE; i += 1) {
    remainingSla += STAGE_SLAS[i] || 0;
  }

  let cumulativeAdjust = 0;
  let cumulativeDelay = 0;
  for (let i = 1; i < venda.etapa; i += 1) {
    const enterHist = hist.find((item) => item && Number(item.e) === i && historyAffectsFlow(item));
    const nextHist = hist.find((item) => item && Number(item.e) === i + 1 && historyAffectsFlow(item));
    const enterInfo = parseHistoryMoment(enterHist, false) || parseHistoryMoment(enterHist, true);
    const nextInfo = parseHistoryMoment(nextHist, false) || parseHistoryMoment(nextHist, true);
    if (!enterInfo?.date || !nextInfo?.date) continue;
    const enterDate = new Date(enterInfo.date.getTime());
    const nextDate = new Date(nextInfo.date.getTime());
    enterDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    const daysAtStage = Math.floor((nextDate.getTime() - enterDate.getTime()) / (1000 * 60 * 60 * 24));
    const diff = daysAtStage - (STAGE_SLAS[i] || 0);
    cumulativeAdjust += diff;
    if (diff > 0) cumulativeDelay += diff;
  }

  const currentDelay = calcAtraso(venda, now);
  const totalDelay = currentDelay && currentDelay > 0 ? currentDelay : 0;
  const totalDays = remainingSla + cumulativeAdjust + totalDelay;
  const finalDate = new Date(baseDate.getTime());
  finalDate.setDate(finalDate.getDate() + totalDays);
  return {
    data: formatDatePtBr(finalDate),
    totalAtraso: cumulativeDelay + totalDelay,
    manual: false,
  };
}

function infoRecebimentoComissao(venda: OwnerReportVenda) {
  const hist = Array.isArray(venda.hist) ? venda.hist : [];
  const finalHist = [...hist].reverse().find((item) => item && Number(item.e) === FINAL_STAGE && historyAffectsFlow(item)) || null;
  const finalInfo = finalHist ? parseHistoryMoment(finalHist, false) : null;
  if (finalInfo?.date) {
    return {
      date: new Date(finalInfo.date.getFullYear(), finalInfo.date.getMonth(), finalInfo.date.getDate(), 12, 0, 0, 0),
      precision: finalInfo.precision,
    };
  }
  const fallbackHist = [...hist].reverse().find((item) => item && historyAffectsFlow(item)) || null;
  const fallbackInfo = fallbackHist ? parseHistoryMoment(fallbackHist, false) : null;
  if (fallbackInfo?.date) {
    return {
      date: new Date(fallbackInfo.date.getFullYear(), fallbackInfo.date.getMonth(), fallbackInfo.date.getDate(), 12, 0, 0, 0),
      precision: fallbackInfo.precision,
    };
  }
  return null;
}

function normalizePerfil(perfil: unknown) {
  const value = normalizeText(perfil);
  if (value === "DONO") return "dono";
  if (value === "CORRETOR") return "cor";
  if (value === "CAPITAO") return "cap";
  if (value === "GERENTE") return "ger";
  if (value === "DIRETOR") return "dir";
  if (value === "FINANCEIRO") return "fin";
  if (value === "RH") return "rh";
  return "cor";
}

function countsAsActiveManager(user: OwnerReportUsuario | null | undefined) {
  if (!user || !statusUsuarioAtivo(user.status)) return false;
  const perfil = normalizePerfil(user.perfil);
  // The gerente field in sales can be assigned to any active leadership role.
  return perfil === "ger" || perfil === "dir" || perfil === "cap" || perfil === "dono";
}

function findUserByName(users: OwnerReportUsuario[], name: unknown) {
  const target = String(name || "").trim();
  if (!target) return null;
  return users.find((user) => namesMatch(target, user.nome)) || null;
}

function teamForVenda(venda: OwnerReportVenda, users: OwnerReportUsuario[]) {
  const manager = findUserByName(users, venda.gerente);
  if (manager?.equipe) return String(manager.equipe).trim();
  const capitao = findUserByName(users, venda.capitao);
  if (capitao?.equipe) return String(capitao.equipe).trim();
  const corretor = findUserByName(users, venda.corretor);
  if (corretor?.equipe) return String(corretor.equipe).trim();
  return String(venda.gerente || venda.capitao || "Sem equipe").trim() || "Sem equipe";
}

function normalizeUnitKey(name: unknown) {
  const normalized = normalizeText(name);
  if (normalized === "CENTRO") return "centro";
  if (normalized === "CRISTO REI") return "cristo_rei";
  return normalized.toLowerCase().replace(/\s+/g, "_") || "sem_unidade";
}

function monthRange(now: Date) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    month,
    year,
    monthStart,
    monthEnd,
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

function groupSalesByUnit(vendas: OwnerReportVenda[]) {
  const map = new Map<string, { name: string; sales_count: number; vgv: number; avg_ticket: number }>();
  vendas.forEach((venda) => {
    const name = String(venda.unidade || "Sem unidade").trim() || "Sem unidade";
    const key = normalizeUnitKey(name);
    if (!map.has(key)) {
      map.set(key, { name, sales_count: 0, vgv: 0, avg_ticket: 0 });
    }
    const item = map.get(key)!;
    item.sales_count += 1;
    item.vgv += numberOrZero(venda.valor);
  });
  for (const item of map.values()) {
    item.avg_ticket = item.sales_count ? item.vgv / item.sales_count : 0;
  }
  return map;
}

function computeDashboard(vendas: OwnerReportVenda[], users: OwnerReportUsuario[], now: Date) {
  const { month, year, dayOfMonth, daysInMonth } = monthRange(now);
  const currentMonthSales = vendas
    .map(normalizeVenda)
    .filter((venda) => !venda.distratada && saleInCurrentMonth(venda, month, year));
  const previousMonthDate = new Date(year, month - 1, 15, 12, 0, 0, 0);
  const previousMonth = previousMonthDate.getMonth();
  const previousYear = previousMonthDate.getFullYear();
  const previousMonthSales = vendas
    .map(normalizeVenda)
    .filter((venda) => !venda.distratada && saleInCurrentMonth(venda, previousMonth, previousYear));

  const salesCount = currentMonthSales.length;
  const vgv = currentMonthSales.reduce((total, venda) => total + numberOrZero(venda.valor), 0);
  const avgTicket = salesCount ? vgv / salesCount : 0;
  const unitsMap = groupSalesByUnit(currentMonthSales);
  const unitsList = Array.from(unitsMap.values()).sort((a, b) => b.vgv - a.vgv || b.sales_count - a.sales_count);
  const unitCandidates = unitsList.filter((item) => item.sales_count >= UNIT_RANKING_MIN_BASE);
  const bestUnit = unitCandidates[0] || unitsList[0] || null;
  const worstUnit = unitCandidates.length > 1
    ? [...unitCandidates].sort((a, b) => a.vgv - b.vgv || a.sales_count - b.sales_count)[0]
    : (unitsList.length > 1 ? [...unitsList].sort((a, b) => a.vgv - b.vgv || a.sales_count - b.sales_count)[0] : bestUnit);

  const previousSalesCount = previousMonthSales.length;
  const previousVgv = previousMonthSales.reduce((total, venda) => total + numberOrZero(venda.valor), 0);
  const projectedSalesCount = dayOfMonth > 0 ? (salesCount / dayOfMonth) * daysInMonth : salesCount;
  const projectedVgv = dayOfMonth > 0 ? (vgv / dayOfMonth) * daysInMonth : vgv;
  const salesVsPreviousPct = previousSalesCount ? ((projectedSalesCount - previousSalesCount) / previousSalesCount) * 100 : 0;
  const vgvVsPreviousPct = previousVgv ? ((projectedVgv - previousVgv) / previousVgv) * 100 : 0;

  let status = "yellow";
  if (salesVsPreviousPct <= -20 || vgvVsPreviousPct <= -20) status = "red";
  else if (salesVsPreviousPct >= 10 || vgvVsPreviousPct >= 10) status = "green";

  const units: Record<string, { sales_count: number; vgv: number; avg_ticket: number }> = {};
  for (const [key, item] of unitsMap.entries()) {
    units[key] = {
      sales_count: item.sales_count,
      vgv: item.vgv,
      avg_ticket: item.avg_ticket,
    };
  }

  return {
    sales_count: salesCount,
    vgv,
    avg_ticket: avgTicket,
    units,
    best_unit: bestUnit ? {
      name: bestUnit.name,
      criterion: "vgv",
      sales_count: bestUnit.sales_count,
      vgv: bestUnit.vgv,
      avg_ticket: bestUnit.avg_ticket,
    } : null,
    worst_unit: worstUnit ? {
      name: worstUnit.name,
      criterion: "vgv",
      sales_count: worstUnit.sales_count,
      vgv: worstUnit.vgv,
      avg_ticket: worstUnit.avg_ticket,
    } : null,
    projection: {
      projected_sales_count: projectedSalesCount,
      projected_vgv: projectedVgv,
      vs_previous_month_sales_pct: salesVsPreviousPct,
      vs_previous_month_vgv_pct: vgvVsPreviousPct,
    },
    status,
    top_team: currentMonthSales.length ? teamForVenda(currentMonthSales[0], users) : "",
  };
}

function agendamentoDate(item: OwnerReportAgendamento) {
  const prefix = extractIsoDatePrefix(item.data_agendamento || item.dataAgendamento || "");
  return prefix ? parseIsoDate(prefix) : null;
}

function agendamentoTipo(item: OwnerReportAgendamento) {
  const tipo = normalizeText(item.tipo_visita || item.tipoVisita || "Primeiro atendimento");
  if (tipo === "FECHAMENTO") return "Fechamento";
  if (tipo === "ENVIO DE DOCUMENTACAO ONLINE") return "Envio de documentacao online";
  return "Primeiro atendimento";
}

function agendamentoSituacao(item: OwnerReportAgendamento) {
  const value = normalizeText(item.situacao || item.status || "Agendado");
  if (value === "CONCLUIDA") return "concluida";
  if (value === "REAGENDADO") return "reagendado";
  if (value === "CLIENTE CANCELOU") return "cliente cancelou";
  return "agendado";
}

function agendamentoTipoKey(item: OwnerReportAgendamento) {
  const tipo = agendamentoTipo(item);
  if (tipo === "Fechamento") return "closing";
  if (tipo === "Envio de documentacao online") return "documentation";
  return "visit";
}

function agendamentoNoMes(item: OwnerReportAgendamento, month: number, year: number) {
  const prefix = extractIsoDatePrefix(item.data_agendamento || item.dataAgendamento || "");
  if (prefix) {
    const expectedPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return prefix.startsWith(expectedPrefix);
  }
  return sameMonth(agendamentoDate(item), month, year);
}

function emptyAppointmentStats() {
  return {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
    conversion_pct: 0,
    cancellation_pct: 0,
    status: "yellow",
  };
}

function finalizeAppointmentStats(stats: ReturnType<typeof emptyAppointmentStats>) {
  const total = stats.scheduled;
  stats.conversion_pct = total ? (stats.completed / total) * 100 : 0;
  stats.cancellation_pct = total ? (stats.cancelled / total) * 100 : 0;
  return stats;
}

function appointmentStatus(type: "visit" | "documentation" | "closing", conversion: number, cancellation: number) {
  if (cancellation > 25) return "red";
  if (type === "visit") {
    if (conversion < 35) return "red";
    if (conversion >= 60 && cancellation < 10) return "green";
    return "yellow";
  }
  if (type === "documentation") {
    if (conversion < 55) return "red";
    if (conversion >= 80 && cancellation < 10) return "green";
    return "yellow";
  }
  if (conversion < 45) return "red";
  if (conversion >= 70 && cancellation < 10) return "green";
  return "yellow";
}

function weightedConversion(team: Record<string, unknown>) {
  const visit = numberOrZero(team.visit_conversion_pct);
  const documentation = numberOrZero(team.documentation_conversion_pct);
  const closing = numberOrZero(team.closing_conversion_pct);
  return (visit * 0.25) + (documentation * 0.30) + (closing * 0.45);
}

function computeAppointments(agendamentos: OwnerReportAgendamento[], now: Date) {
  const { month, year } = monthRange(now);
  const list = agendamentos.filter((item) => agendamentoNoMes(item, month, year));
  const visit = emptyAppointmentStats();
  const documentation = emptyAppointmentStats();
  const closing = emptyAppointmentStats();
  const teamsMap = new Map<string, Record<string, unknown>>();

  list.forEach((item) => {
    const typeKey = agendamentoTipoKey(item);
    const situation = agendamentoSituacao(item);
    const target = typeKey === "visit" ? visit : typeKey === "documentation" ? documentation : closing;
    target.scheduled += 1;
    if (situation === "concluida") target.completed += 1;
    if (situation === "cliente cancelou") target.cancelled += 1;
    if (situation === "reagendado") target.rescheduled += 1;

    const teamName = String(item.equipe || "Sem equipe").trim() || "Sem equipe";
    if (!teamsMap.has(teamName)) {
      teamsMap.set(teamName, {
        name: teamName,
        total_appointments: 0,
        visit_total: 0,
        visit_completed: 0,
        documentation_total: 0,
        documentation_completed: 0,
        closing_total: 0,
        closing_completed: 0,
      });
    }
    const team = teamsMap.get(teamName)!;
    team.total_appointments = numberOrZero(team.total_appointments) + 1;
    if (typeKey === "visit") {
      team.visit_total = numberOrZero(team.visit_total) + 1;
      if (situation === "concluida") team.visit_completed = numberOrZero(team.visit_completed) + 1;
    }
    if (typeKey === "documentation") {
      team.documentation_total = numberOrZero(team.documentation_total) + 1;
      if (situation === "concluida") team.documentation_completed = numberOrZero(team.documentation_completed) + 1;
    }
    if (typeKey === "closing") {
      team.closing_total = numberOrZero(team.closing_total) + 1;
      if (situation === "concluida") team.closing_completed = numberOrZero(team.closing_completed) + 1;
    }
  });

  finalizeAppointmentStats(visit);
  finalizeAppointmentStats(documentation);
  finalizeAppointmentStats(closing);
  visit.status = appointmentStatus("visit", visit.conversion_pct, visit.cancellation_pct);
  documentation.status = appointmentStatus("documentation", documentation.conversion_pct, documentation.cancellation_pct);
  closing.status = appointmentStatus("closing", closing.conversion_pct, closing.cancellation_pct);

  const teams = Array.from(teamsMap.values()).map((team) => {
    const visitConversion = numberOrZero(team.visit_total) ? (numberOrZero(team.visit_completed) / numberOrZero(team.visit_total)) * 100 : 0;
    const documentationConversion = numberOrZero(team.documentation_total) ? (numberOrZero(team.documentation_completed) / numberOrZero(team.documentation_total)) * 100 : 0;
    const closingConversion = numberOrZero(team.closing_total) ? (numberOrZero(team.closing_completed) / numberOrZero(team.closing_total)) * 100 : 0;
    const weighted = (visitConversion * 0.25) + (documentationConversion * 0.30) + (closingConversion * 0.45);
    const status = numberOrZero(team.total_appointments) < TEAM_RANKING_MIN_BASE
      ? "yellow"
      : weighted >= 70 ? "green" : weighted < 45 ? "red" : "yellow";
    return {
      name: String(team.name),
      total_appointments: numberOrZero(team.total_appointments),
      visit_conversion_pct: visitConversion,
      documentation_conversion_pct: documentationConversion,
      closing_conversion_pct: closingConversion,
      weighted_conversion_pct: weighted,
      status,
    };
  }).sort((a, b) => b.weighted_conversion_pct - a.weighted_conversion_pct || b.total_appointments - a.total_appointments);

  const eligibleTeams = teams.filter((item) => item.total_appointments >= TEAM_RANKING_MIN_BASE);
  const bestTeam = eligibleTeams[0] || null;
  const worstTeam = eligibleTeams.length > 1
    ? [...eligibleTeams].sort((a, b) => a.weighted_conversion_pct - b.weighted_conversion_pct || b.total_appointments - a.total_appointments)[0]
    : null;

  function teamHighlight(team: typeof bestTeam) {
    if (!team) return "";
    const map = [
      { key: "visit", value: team.visit_conversion_pct },
      { key: "documentation", value: team.documentation_conversion_pct },
      { key: "closing", value: team.closing_conversion_pct },
    ].sort((a, b) => b.value - a.value);
    return map[0]?.key || "";
  }

  return {
    total_appointments_in_month: list.length,
    visit,
    documentation,
    closing,
    teams,
    best_team: bestTeam ? {
      name: bestTeam.name,
      highlight: teamHighlight(bestTeam),
      weighted_conversion_pct: bestTeam.weighted_conversion_pct,
    } : null,
    worst_team: worstTeam ? {
      name: worstTeam.name,
      highlight: teamHighlight(worstTeam),
      weighted_conversion_pct: worstTeam.weighted_conversion_pct,
    } : null,
    minimum_base_for_team_ranking: TEAM_RANKING_MIN_BASE,
  };
}

function financeiroTipo(item: OwnerReportFinanceiro) {
  const value = normalizeText(item.tipo);
  if (value === "SAIDA") return "saida";
  return "entrada";
}

function financeiroStatus(item: OwnerReportFinanceiro, now: Date) {
  const status = normalizeText(item.status);
  if (status === "REALIZADO" || status === "RECEBIDA" || status === "PAGA") return "realizado";
  const dueDate = parseIsoDate(item.data_prevista || item.dataPrevista || "");
  if (dueDate) {
    const today = new Date(now.getTime());
    today.setHours(0, 0, 0, 0);
    if (dueDate.getTime() < today.getTime()) return "atrasado";
  }
  return "previsto";
}

function financeiroReferenceDate(item: OwnerReportFinanceiro) {
  return parseIsoDate(item.data_realizada || item.dataRealizada || "") || parseIsoDate(item.data_prevista || item.dataPrevista || "");
}

function comissaoItem(venda: OwnerReportVenda, date: Date, status: "previsto" | "atrasado" | "realizado") {
  return {
    natureza: "entrada",
    status,
    valor_bruto: commissionBruta(venda),
    valor_liquido: commissionZelony(venda),
    data_ref: date,
    categoria: "COMISSAO",
    descricao: String(venda.cliente || "").split("/")[0].trim() || "COMISSAO",
    unidade: String(venda.unidade || "").trim(),
    gerente: String(venda.gerente || "").trim(),
    venda_id: venda.id,
  };
}

function collectCommissionMonth(vendas: OwnerReportVenda[], month: number, year: number, now: Date) {
  const previstas: Array<Record<string, unknown>> = [];
  const realizadas: Array<Record<string, unknown>> = [];
  vendas.map(normalizeVenda).forEach((venda) => {
    if (venda.distratada) return;
    if (venda.etapa === FINAL_STAGE) {
      const info = infoRecebimentoComissao(venda);
      if (!info?.date || info.precision === "daymonth") return;
      if (!sameMonth(info.date, month, year)) return;
      realizadas.push(comissaoItem(venda, info.date, "realizado"));
      return;
    }
    const previsao = calcPrevisao(venda, now);
    if (!previsao?.data) return;
    const parts = String(previsao.data).split("/");
    if (parts.length < 3) return;
    const day = parseInt(parts[0], 10);
    const itemMonth = parseInt(parts[1], 10) - 1;
    const itemYear = parseInt(parts[2], 10);
    if (!Number.isFinite(day) || itemMonth !== month || itemYear !== year) return;
    const date = new Date(itemYear, itemMonth, day, 12, 0, 0, 0);
    previstas.push(comissaoItem(venda, date, numberOrZero(previsao.totalAtraso) > 0 ? "atrasado" : "previsto"));
  });
  return { previstas, realizadas };
}

function collectManualMonth(financeiro: OwnerReportFinanceiro[], month: number, year: number, now: Date) {
  const entriesProjected: Array<Record<string, unknown>> = [];
  const entriesRealized: Array<Record<string, unknown>> = [];
  const exitsProjected: Array<Record<string, unknown>> = [];
  const exitsRealized: Array<Record<string, unknown>> = [];

  financeiro.forEach((item) => {
    const dateRef = financeiroReferenceDate(item);
    if (!sameMonth(dateRef, month, year)) return;
    const status = financeiroStatus(item, now);
    const normalized = {
      natureza: financeiroTipo(item),
      status,
      valor_bruto: Math.abs(numberOrZero(item.valor)),
      valor_liquido: Math.abs(numberOrZero(item.valor)),
      data_ref: dateRef,
      categoria: String(item.categoria || "").trim() || (financeiroTipo(item) === "saida" ? "OUTRAS SAIDAS" : "OUTRAS ENTRADAS"),
      descricao: String(item.descricao || "").trim() || (financeiroTipo(item) === "saida" ? "SAIDA MANUAL" : "ENTRADA MANUAL"),
      observacao: String(item.observacao || "").trim(),
      unidade: String(item.unidade || "").trim(),
    };
    if (normalized.natureza === "saida") {
      if (status === "realizado") exitsRealized.push(normalized);
      else exitsProjected.push(normalized);
      return;
    }
    if (status === "realizado") entriesRealized.push(normalized);
    else entriesProjected.push(normalized);
  });

  return { entriesProjected, entriesRealized, exitsProjected, exitsRealized };
}

function realizedExitTotalForMonth(financeiro: OwnerReportFinanceiro[], month: number, year: number, now: Date) {
  return financeiro.reduce((total, item) => {
    if (financeiroTipo(item) !== "saida") return total;
    const dateRef = parseIsoDate(item.data_realizada || item.dataRealizada || "");
    if (!sameMonth(dateRef, month, year)) return total;
    if (financeiroStatus(item, now) !== "realizado") return total;
    return total + Math.abs(numberOrZero(item.valor));
  }, 0);
}

function financeTrend(currentNetCash: number, previousNetCash: number) {
  return currentNetCash >= previousNetCash ? "approaching" : "moving_away";
}

function criticalAccounts(financeiro: OwnerReportFinanceiro[], now: Date) {
  const openExits = financeiro
    .filter((item) => financeiroTipo(item) === "saida")
    .map((item) => {
      const dueDate = parseIsoDate(item.data_prevista || item.dataPrevista || "");
      if (!dueDate) return null;
      const status = financeiroStatus(item, now);
      if (status === "realizado") return null;
      const today = new Date(now.getTime());
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousMonthOpen = diffDays > 0 && (dueDate.getMonth() !== now.getMonth() || dueDate.getFullYear() !== now.getFullYear());
      return {
        description: String(item.descricao || "").trim() || "Conta sem descricao",
        category: String(item.categoria || "").trim() || "OUTRAS SAIDAS",
        amount: Math.abs(numberOrZero(item.valor)),
        due_date: dueDate.toISOString().slice(0, 10),
        days_overdue: diffDays > 0 ? diffDays : null,
        days_to_due: diffDays < 0 ? Math.abs(diffDays) : diffDays === 0 ? 0 : null,
        priority_reason: previousMonthOpen ? "open_from_previous_month" : (diffDays > 0 ? "overdue_current_month" : "upcoming"),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const overdue = openExits
    .filter((item) => numberOrZero(item.days_overdue) > 0)
    .sort((a, b) => {
      const previousPriority = String(a.priority_reason) === "open_from_previous_month" ? -1 : 0;
      const previousPriorityB = String(b.priority_reason) === "open_from_previous_month" ? -1 : 0;
      if (previousPriority !== previousPriorityB) return previousPriority - previousPriorityB;
      return numberOrZero(b.days_overdue) - numberOrZero(a.days_overdue) || numberOrZero(b.amount) - numberOrZero(a.amount);
    });

  if (overdue.length) {
    return {
      mode: "overdue",
      items: overdue.slice(0, 3),
    };
  }

  const upcoming = openExits
    .sort((a, b) => numberOrZero(a.days_to_due) - numberOrZero(b.days_to_due) || numberOrZero(b.amount) - numberOrZero(a.amount))
    .slice(0, 3);

  return {
    mode: "upcoming",
    items: upcoming,
  };
}

function computeFinance(vendas: OwnerReportVenda[], financeiro: OwnerReportFinanceiro[], now: Date) {
  const { month, year } = monthRange(now);
  const commissionMonth = collectCommissionMonth(vendas, month, year, now);
  const manualMonth = collectManualMonth(financeiro, month, year, now);
  const entriesProjected = [
    ...commissionMonth.previstas.map((item) => numberOrZero(item.valor_bruto)),
    ...manualMonth.entriesProjected.map((item) => numberOrZero(item.valor_bruto)),
  ].reduce((total, value) => total + value, 0);
  const entriesRealized = [
    ...commissionMonth.realizadas.map((item) => numberOrZero(item.valor_bruto)),
    ...manualMonth.entriesRealized.map((item) => numberOrZero(item.valor_bruto)),
  ].reduce((total, value) => total + value, 0);
  const exitsProjected = manualMonth.exitsProjected.reduce((total, item) => total + numberOrZero(item.valor_bruto), 0);
  const exitsPaid = manualMonth.exitsRealized.reduce((total, item) => total + numberOrZero(item.valor_bruto), 0);
  const netCash = entriesRealized - exitsPaid;

  const previousDate = new Date(year, month - 1, 15, 12, 0, 0, 0);
  const previousCommissionMonth = collectCommissionMonth(vendas, previousDate.getMonth(), previousDate.getFullYear(), now);
  const previousManualMonth = collectManualMonth(financeiro, previousDate.getMonth(), previousDate.getFullYear(), now);
  const previousNetCash = (
    previousCommissionMonth.realizadas.reduce((total, item) => total + numberOrZero(item.valor_bruto), 0)
    + previousManualMonth.entriesRealized.reduce((total, item) => total + numberOrZero(item.valor_bruto), 0)
  ) - previousManualMonth.exitsRealized.reduce((total, item) => total + numberOrZero(item.valor_bruto), 0);

  const closedMonths: Array<{ month: number; year: number; exits: number }> = [];
  for (let i = 1; i <= 3; i += 1) {
    const ref = new Date(year, month - i, 15, 12, 0, 0, 0);
    closedMonths.push({
      month: ref.getMonth(),
      year: ref.getFullYear(),
      exits: realizedExitTotalForMonth(financeiro, ref.getMonth(), ref.getFullYear(), now),
    });
  }
  const averageMonthlyExits = closedMonths.length
    ? closedMonths.reduce((total, item) => total + item.exits, 0) / closedMonths.length
    : 0;
  const reserveTarget = averageMonthlyExits * 3;
  const coveragePct = reserveTarget > 0 ? (netCash / reserveTarget) * 100 : 0;
  const gapAmount = Math.max(reserveTarget - netCash, 0);
  const critical = criticalAccounts(financeiro, now);

  let status = "yellow";
  if (netCash < 0 || critical.mode === "overdue" || coveragePct < 25) status = "red";
  else if (!critical.items.length && coveragePct >= 80) status = "green";

  return {
    entries_realized: entriesRealized,
    entries_projected: entriesProjected,
    exits_paid: exitsPaid,
    exits_projected: exitsProjected,
    net_cash: netCash,
    vs_previous_month_pct: previousNetCash ? ((netCash - previousNetCash) / Math.abs(previousNetCash)) * 100 : 0,
    reserve_goal: {
      months: 3,
      average_monthly_paid_exits_last_3_closed_months: averageMonthlyExits,
      target_amount: reserveTarget,
      coverage_pct: coveragePct,
      gap_amount: gapAmount,
      trend: financeTrend(netCash, previousNetCash),
    },
    critical_accounts: critical,
    status,
  };
}

function buildStalledSales(vendas: OwnerReportVenda[], now: Date) {
  return vendas
    .map(normalizeVenda)
    .filter((venda) => !venda.distratada && venda.etapa < FINAL_STAGE)
    .map((venda) => {
      const delay = calcAtraso(venda, now);
      return {
        venda,
        delay: delay !== null && delay > 0 ? delay : 0,
      };
    })
    .filter((item) => item.delay > 0)
    .sort((a, b) => b.delay - a.delay || numberOrZero(b.venda.valor) - numberOrZero(a.venda.valor));
}

function computeWallet(vendas: OwnerReportVenda[], now: Date) {
  const normalized = vendas.map(normalizeVenda);
  const activeSales = normalized.filter((venda) => !venda.distratada);
  const completedSales = activeSales.filter((venda) => venda.etapa === FINAL_STAGE);
  const pipelineSales = activeSales.filter((venda) => venda.etapa < FINAL_STAGE);
  const stalled = buildStalledSales(activeSales, now);
  const stalledPct = activeSales.length ? (stalled.length / activeSales.length) * 100 : 0;

  let status = "yellow";
  if (stalled.length >= 5 || stalledPct >= 20 || stalled.some((item) => item.delay >= 7)) status = "red";
  else if (stalledPct <= 5 && stalled.every((item) => item.delay < 7)) status = "green";

  return {
    active_sales_count: activeSales.length,
    completed_sales_count: completedSales.length,
    pipeline_sales_count: pipelineSales.length,
    stalled_sales_count: stalled.length,
    stalled_sales_pct: stalledPct,
    top_stalled_sales: stalled.slice(0, 3).map((item) => ({
      sale_id: item.venda.id,
      client: String(item.venda.cliente || "").trim() || "Cliente nao informado",
      unit: String(item.venda.unidade || "").trim() || "Sem unidade",
      stage: stageName(item.venda.etapa),
      days_overdue: item.delay,
      manager: String(item.venda.gerente || "").trim() || "Sem gerente",
      vgv: numberOrZero(item.venda.valor),
    })),
    status,
  };
}

function computeDistratos(vendas: OwnerReportVenda[], users: OwnerReportUsuario[], now: Date) {
  const { month, year } = monthRange(now);
  const allSales = vendas.map(normalizeVenda);
  const currentMonthSales = allSales.filter((venda) => saleInCurrentMonth(venda, month, year));
  const allDistratos = allSales.filter((venda) => venda.distratada);
  const monthDistratos = currentMonthSales.filter((venda) => venda.distratada);
  const groupBy = <T extends { nome: string; total: number; distratos: number; perdido: number }>(
    keyFn: (venda: OwnerReportVenda) => string,
    baseFilter?: (venda: OwnerReportVenda) => boolean,
  ) => {
    const map = new Map<string, T>();
    allSales.filter((venda) => (baseFilter ? baseFilter(venda) : true)).forEach((venda) => {
      const name = keyFn(venda) || "Nao informado";
      if (!map.has(name)) {
        map.set(name, { nome: name, total: 0, distratos: 0, perdido: 0 } as T);
      }
      const item = map.get(name)!;
      item.total += 1;
      if (venda.distratada) {
        item.distratos += 1;
        item.perdido += commissionTotal(venda);
      }
    });
    return Array.from(map.values())
      .map((item) => ({ ...item, rate_pct: item.total ? (item.distratos / item.total) * 100 : 0 }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.rate_pct - a.rate_pct || b.distratos - a.distratos || b.perdido - a.perdido);
  };

  const activeManagers = groupBy(
    (venda) => String(venda.gerente || "").trim() || "Nao informado",
    (venda) => {
      const manager = findUserByName(users, venda.gerente);
      return countsAsActiveManager(manager);
    },
  );
  const units = groupBy((venda) => String(venda.unidade || "").trim() || "Nao informada");
  const reasonsMap = new Map<string, number>();
  allDistratos.forEach((venda) => {
    const reason = categoriaDistrato(venda);
    reasonsMap.set(reason, (reasonsMap.get(reason) || 0) + 1);
  });
  const topReasonEntry = Array.from(reasonsMap.entries()).sort((a, b) => b[1] - a[1])[0] || null;
  const ignoredInactiveManagers = allDistratos.filter((venda) => {
    const manager = findUserByName(users, venda.gerente);
    return !countsAsActiveManager(manager);
  }).length;

  const eligibleUnit = units.filter((item) => item.total >= DISTRATO_RANKING_MIN_BASE)[0] || units[0] || null;
  const eligibleManager = activeManagers.filter((item) => item.total >= DISTRATO_RANKING_MIN_BASE)[0] || activeManagers[0] || null;

  const generalRate = allSales.length ? (allDistratos.length / allSales.length) * 100 : 0;
  let status = "yellow";
  if (generalRate >= 12 || numberOrZero(eligibleUnit?.rate_pct) >= 15 || numberOrZero(eligibleManager?.rate_pct) >= 15) status = "red";
  else if (generalRate < 5 && numberOrZero(eligibleUnit?.rate_pct) < 8 && numberOrZero(eligibleManager?.rate_pct) < 8) status = "green";

  return {
    historical_total_sales: allSales.length,
    historical_total_distratos: allDistratos.length,
    current_month_sales: currentMonthSales.length,
    current_month_distratos: monthDistratos.length,
    general_rate_pct: generalRate,
    worst_unit: eligibleUnit ? {
      name: eligibleUnit.nome,
      sales_count: eligibleUnit.total,
      distratos: eligibleUnit.distratos,
      rate_pct: eligibleUnit.rate_pct,
    } : null,
    worst_active_manager: eligibleManager ? {
      name: eligibleManager.nome,
      sales_count: eligibleManager.total,
      distratos: eligibleManager.distratos,
      rate_pct: eligibleManager.rate_pct,
    } : null,
    ignored_inactive_managers: ignoredInactiveManagers,
    top_reason: topReasonEntry ? { name: topReasonEntry[0], count: topReasonEntry[1] } : null,
    status,
  };
}

function buildPositiveBullets(snapshot: Record<string, unknown>) {
  const positives: Array<{ area: string; text: string }> = [];
  const dashboard = snapshot.dashboard as Record<string, unknown>;
  const appointments = snapshot.appointments as Record<string, unknown>;
  const finance = snapshot.finance as Record<string, unknown>;
  const wallet = snapshot.wallet as Record<string, unknown>;
  const distratos = snapshot.distratos as Record<string, unknown>;

  const bestUnit = dashboard.best_unit as Record<string, unknown> | null;
  if (bestUnit && numberOrZero(bestUnit.sales_count) > 0) {
    positives.push({
      area: "dashboard",
      text: `${String(bestUnit.name || "Unidade lider")} lidera o mes com ${numberOrZero(bestUnit.sales_count)} venda(s) e VGV de ${formatCurrency(numberOrZero(bestUnit.vgv))}.`,
    });
  }

  const bestTeam = appointments.best_team as Record<string, unknown> | null;
  if (bestTeam && numberOrZero(bestTeam.weighted_conversion_pct) >= 60) {
    positives.push({
      area: "appointments",
      text: `${String(bestTeam.name || "Equipe")} puxa a melhor conversao ponderada do mes, em ${formatPercent(numberOrZero(bestTeam.weighted_conversion_pct))}.`,
    });
  }

  if (numberOrZero(distratos.general_rate_pct) < 5 && numberOrZero(distratos.historical_total_sales) > 0) {
    positives.push({
      area: "distratos",
      text: `A taxa geral de distrato esta controlada em ${formatPercent(numberOrZero(distratos.general_rate_pct))}.`,
    });
  }

  const reserve = finance.reserve_goal as Record<string, unknown>;
  if (String(finance.status || "") === "green" || (String(reserve.trend || "") === "approaching" && numberOrZero(finance.net_cash) > 0)) {
    positives.push({
      area: "finance",
      text: `O caixa caminha na direcao da reserva, com saldo liquido de ${formatCurrency(numberOrZero(finance.net_cash))}.`,
    });
  }

  if (numberOrZero(wallet.stalled_sales_count) === 0) {
    positives.push({
      area: "wallet",
      text: "Nao ha vendas travadas acima do prazo ideal no pipeline ativo.",
    });
  }

  return positives.slice(0, 3);
}

function buildExecutiveInputs(snapshot: Record<string, unknown>) {
  const dashboard = snapshot.dashboard as Record<string, unknown>;
  const finance = snapshot.finance as Record<string, unknown>;
  const wallet = snapshot.wallet as Record<string, unknown>;
  const distratos = snapshot.distratos as Record<string, unknown>;
  const appointments = snapshot.appointments as Record<string, unknown>;
  const positives = buildPositiveBullets(snapshot);

  let strongestPoint = "volume comercial";
  if (positives.length) strongestPoint = positives[0].text;

  let mainBottleneck = "conversao operacional";
  let mainRisk = "conversao";
  if (String(finance.status || "") === "red") {
    mainBottleneck = "caixa e contas em aberto";
    mainRisk = "financeiro";
  } else if (String(wallet.status || "") === "red") {
    mainBottleneck = "vendas travadas no pipeline";
    mainRisk = "carteira";
  } else if (String(distratos.status || "") === "red") {
    mainBottleneck = "distratos acima do ideal";
    mainRisk = "distrato";
  }

  const priorities = [];
  if (numberOrZero(wallet.stalled_sales_count) > 0) priorities.push("cobrar evolucao das vendas travadas ha mais tempo");
  if (numberOrZero(distratos.historical_total_distratos) > 0) priorities.push("atacar a origem dos distratos da unidade e da lideranca mais critica");
  const criticalAccountsData = finance.critical_accounts as Record<string, unknown> | null;
  const criticalItems = Array.isArray(criticalAccountsData?.items) ? criticalAccountsData.items : [];
  if (criticalItems.length) priorities.push("resolver as contas mais criticas do caixa");
  const worstTeam = appointments.worst_team as Record<string, unknown> | null;
  if (worstTeam) priorities.push(`alinhar a equipe ${String(worstTeam.name || "").trim()} para corrigir a conversao do mes`);

  return {
    strongest_point: strongestPoint,
    main_bottleneck: mainBottleneck,
    main_risk: mainRisk,
    today_priorities: priorities.slice(0, 3),
  };
}

function statusSummary(snapshot: Record<string, unknown>) {
  const wallet = snapshot.wallet as Record<string, unknown>;
  const distratos = snapshot.distratos as Record<string, unknown>;
  const finance = snapshot.finance as Record<string, unknown>;
  const appointments = snapshot.appointments as Record<string, unknown>;

  const urgent = [];
  if (String(wallet.status || "") === "red") {
    urgent.push({
      id: "wallet_stalled_sales",
      area: "wallet",
      title: "Vendas travadas acima do prazo ideal",
      summary: `Temos ${numberOrZero(wallet.stalled_sales_count)} venda(s) travada(s) acima do prazo ideal.`,
      action_hint: "Cobrar evolucao imediata das vendas mais atrasadas.",
    });
  }
  if (String(distratos.status || "") === "red") {
    urgent.push({
      id: "distrato_rate",
      area: "distratos",
      title: "Distratos acima do limite",
      summary: `A taxa geral de distrato subiu para ${formatPercent(numberOrZero(distratos.general_rate_pct))}.`,
      action_hint: "Atuar na qualidade da venda e no acompanhamento do cliente.",
    });
  }
  if (String(finance.status || "") === "red") {
    urgent.push({
      id: "finance_cash_risk",
      area: "finance",
      title: "Caixa com pressao",
      summary: `O saldo liquido atual esta em ${formatCurrency(numberOrZero(finance.net_cash))}.`,
      action_hint: "Priorizar contas vencidas e preservar caixa.",
    });
  }

  const important = [];
  if (String(appointments.visit && (appointments.visit as Record<string, unknown>).status || "") !== "green") {
    important.push({
      id: "appointments_visit",
      area: "appointments",
      title: "Conversao de visitas pede atencao",
      summary: `A conversao de visitas esta em ${formatPercent(numberOrZero((appointments.visit as Record<string, unknown>)?.conversion_pct))}.`,
    });
  }

  const positive = buildPositiveBullets(snapshot).map((item, index) => ({
    id: `positive_${index + 1}`,
    area: item.area,
    summary: item.text,
  }));

  return { urgent, important, positive };
}

function greetByTime(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function bestUnitLine(snapshot: Record<string, unknown>) {
  const dashboard = snapshot.dashboard as Record<string, unknown>;
  const bestUnit = dashboard.best_unit as Record<string, unknown> | null;
  const worstUnit = dashboard.worst_unit as Record<string, unknown> | null;
  return {
    best: bestUnit
      ? `A unidade que mais performa hoje e ${String(bestUnit.name || "Sem unidade")}, com destaque em volume, VGV e ticket.`
      : "Ainda nao existe base suficiente para apontar a unidade lider do mes.",
    worst: worstUnit
      ? `A unidade com menor performance no recorte atual e ${String(worstUnit.name || "Sem unidade")}, exigindo acompanhamento mais proximo.`
      : "Ainda nao existe base suficiente para apontar a unidade com menor performance.",
  };
}

export function buildOwnerReportSnapshot(params: {
  vendas: OwnerReportVenda[];
  usuarios: OwnerReportUsuario[];
  agendamentos: OwnerReportAgendamento[];
  financeiro: OwnerReportFinanceiro[];
  owners: OwnerReportUsuario[];
  now?: Date;
}) {
  const now = params.now instanceof Date ? new Date(params.now.getTime()) : new Date();
  const { month, year, monthStart, monthEnd, dayOfMonth, daysInMonth } = monthRange(now);
  const dashboard = computeDashboard(params.vendas, params.usuarios, now);
  const appointments = computeAppointments(params.agendamentos, now);
  const finance = computeFinance(params.vendas, params.financeiro, now);
  const wallet = computeWallet(params.vendas, now);
  const distratos = computeDistratos(params.vendas, params.usuarios, now);
  const alerts = statusSummary({ dashboard, appointments, finance, wallet, distratos });
  const executiveInputs = buildExecutiveInputs({ dashboard, appointments, finance, wallet, distratos });

  return {
    report_date: now.toISOString().slice(0, 10),
    executed_at: now.toISOString(),
    timezone: "America/Sao_Paulo",
    owner_count: params.owners.length,
    period: {
      month: MONTH_NAMES[month],
      year,
      month_start: monthStart.toISOString().slice(0, 10),
      month_end: monthEnd.toISOString().slice(0, 10),
      day_of_month: dayOfMonth,
      days_in_month: daysInMonth,
    },
    dashboard,
    appointments,
    finance,
    wallet,
    distratos,
    alerts,
    executive_inputs: executiveInputs,
    data_quality: {
      has_owner_phone: params.owners.some((owner) => !!normalizePhoneToZapi(owner.tel)),
      has_active_manager_base: !!(distratos as Record<string, unknown>).worst_active_manager,
      has_finance_history_for_reserve: numberOrZero(((finance as Record<string, unknown>).reserve_goal as Record<string, unknown>).target_amount) > 0,
      notes: [],
    },
  };
}

export function buildOwnerReportBaseMessage(snapshot: OwnerReportSnapshot) {
  const now = new Date(String(snapshot.executed_at || new Date().toISOString()));
  const greeting = greetByTime(now);
  const period = snapshot.period as Record<string, unknown>;
  const wallet = snapshot.wallet as Record<string, unknown>;
  const distratos = snapshot.distratos as Record<string, unknown>;
  const finance = snapshot.finance as Record<string, unknown>;
  const dashboard = snapshot.dashboard as Record<string, unknown>;
  const appointments = snapshot.appointments as Record<string, unknown>;
  const executiveInputs = snapshot.executive_inputs as Record<string, unknown>;
  const bestWorstUnit = bestUnitLine(snapshot);

  const stalledSales = Array.isArray(wallet.top_stalled_sales) ? wallet.top_stalled_sales as Array<Record<string, unknown>> : [];
  const stalledLines = stalledSales.length
    ? stalledSales.map((item) => `- ${String(item.client || "Cliente")} / ${String(item.unit || "Sem unidade")} / ${String(item.stage || "Sem etapa")} / ${numberOrZero(item.days_overdue)} dias atrasados / ${String(item.manager || "Sem gerente")}`).join("\n")
    : "- No momento, nao ha vendas travadas acima do prazo ideal de evolucao.";

  const worstUnit = distratos.worst_unit as Record<string, unknown> | null;
  const worstManager = distratos.worst_active_manager as Record<string, unknown> | null;
  const reserve = finance.reserve_goal as Record<string, unknown>;
  const criticalAccountsData = finance.critical_accounts as Record<string, unknown> | null;
  const criticalItems = Array.isArray(criticalAccountsData?.items) ? criticalAccountsData.items as Array<Record<string, unknown>> : [];
  const criticalTitle = criticalAccountsData?.mode === "overdue" ? "Contas mais criticas do caixa hoje:" : "Contas que vencem primeiro:";
  const criticalLines = criticalItems.length
    ? criticalItems.map((item) => {
      const due = item.days_overdue != null
        ? `${formatDatePtBr(String(item.due_date || ""))} / ${numberOrZero(item.days_overdue)} dia(s) em atraso`
        : `${formatDatePtBr(String(item.due_date || ""))} / vence em ${numberOrZero(item.days_to_due)} dia(s)`;
      return `- ${String(item.description || "Conta")} / ${String(item.category || "Sem categoria")} / ${formatCurrency(numberOrZero(item.amount))} / ${due}`;
    }).join("\n")
    : "- Sem contas vencidas ou proximas de vencer no recorte atual.";

  const visit = appointments.visit as Record<string, unknown>;
  const documentation = appointments.documentation as Record<string, unknown>;
  const closing = appointments.closing as Record<string, unknown>;
  const bestTeam = appointments.best_team as Record<string, unknown> | null;
  const worstTeam = appointments.worst_team as Record<string, unknown> | null;
  const positiveBullets = (snapshot.alerts as Record<string, unknown>).positive as Array<Record<string, unknown>> || [];
  const positiveLines = positiveBullets.length
    ? positiveBullets.map((item) => `- ${String(item.summary || "")}`).join("\n")
    : "- A operacao segue sem destaques positivos fortes o suficiente para o bloco de hoje.";

  const suggestions = Array.isArray(executiveInputs.today_priorities)
    ? (executiveInputs.today_priorities as string[]).map((item) => `- ${item.charAt(0).toUpperCase()}${item.slice(1)}.`).join("\n")
    : "- Cobrar evolucao das vendas travadas ha mais tempo.";

  return [
    `${greeting}. Segue o resumo diario da operacao Zelony de ${formatDatePtBr(String(snapshot.report_date || now.toISOString().slice(0, 10)))}, com base em Dashboard, Agendamentos, Financeiro e Minha Carteira.`,
    "",
    "URGENTE",
    "",
    "1. Minha Carteira",
    `Temos ${numberOrZero(wallet.stalled_sales_count)} venda(s) travada(s) acima do prazo ideal de evolucao.`,
    "As principais que exigem atencao imediata sao:",
    stalledLines,
    "",
    "2. Distratos",
    `A taxa geral historica de distrato esta em ${formatPercent(numberOrZero(distratos.general_rate_pct))}, com ${numberOrZero(distratos.historical_total_distratos)} distrato(s) em ${numberOrZero(distratos.historical_total_sales)} venda(s) na base acumulada.`,
    `No mes atual, tivemos ${numberOrZero(distratos.current_month_distratos)} distrato(s) em ${numberOrZero(distratos.current_month_sales)} venda(s).`,
    worstUnit
      ? `A unidade com maior preocupacao hoje e ${String(worstUnit.name || "Sem unidade")}, com ${formatPercent(numberOrZero(worstUnit.rate_pct))}.`
      : "Ainda nao existe base suficiente para apontar a unidade mais critica do recorte.",
    worstManager
      ? `A lideranca ativa com numero mais preocupante e ${String(worstManager.name || "Sem gestor")}, com ${formatPercent(numberOrZero(worstManager.rate_pct))}.`
      : "Ainda nao existe base suficiente para ranquear liderancas ativas com justica neste recorte.",
    numberOrZero(distratos.ignored_inactive_managers) > 0
      ? `Ha ${numberOrZero(distratos.ignored_inactive_managers)} caso(s) ligados a liderancas fora da base ativa, fora do ranking atual.`
      : "Isso indica necessidade de atuacao direta sobre qualidade da venda, alinhamento comercial e acompanhamento do cliente no pos-venda.",
    "",
    "3. Financeiro",
    `O saldo liquido atual e de ${formatCurrency(numberOrZero(finance.net_cash))}.`,
    `A meta de reserva de emergencia de 3 meses e de ${formatCurrency(numberOrZero(reserve.target_amount))}.`,
    `Hoje faltam ${formatCurrency(numberOrZero(reserve.gap_amount))} para atingir essa seguranca financeira.`,
    `No ritmo atual de entradas e saidas, estamos ${String(reserve.trend || "approaching") === "approaching" ? "aproximando" : "afastando"} dessa meta.`,
    "",
    criticalTitle,
    criticalLines,
    "",
    "IMPORTANTE",
    "",
    "4. Dashboard comercial",
    `No mes atual, ja temos ${numberOrZero(dashboard.sales_count)} venda(s), com VGV de ${formatCurrency(numberOrZero(dashboard.vgv))} e ticket medio de ${formatCurrency(numberOrZero(dashboard.avg_ticket))}.`,
    "Distribuicao por unidade:",
    `- Centro: ${numberOrZero(((dashboard.units as Record<string, unknown>)?.centro as Record<string, unknown>)?.sales_count) || 0} venda(s)`,
    `- Cristo Rei: ${numberOrZero(((dashboard.units as Record<string, unknown>)?.cristo_rei as Record<string, unknown>)?.sales_count) || 0} venda(s)`,
    "",
    bestWorstUnit.best,
    bestWorstUnit.worst,
    "",
    "5. Agendamentos",
    "Visitas:",
    `- Agendados: ${numberOrZero(visit.scheduled)}`,
    `- Concluidos: ${numberOrZero(visit.completed)}`,
    `- Cancelados: ${numberOrZero(visit.cancelled)}`,
    `- Conversao: ${formatPercent(numberOrZero(visit.conversion_pct))}`,
    "",
    "Documentacao:",
    `- Agendados: ${numberOrZero(documentation.scheduled)}`,
    `- Recebidos: ${numberOrZero(documentation.completed)}`,
    `- Cancelados: ${numberOrZero(documentation.cancelled)}`,
    `- Conversao: ${formatPercent(numberOrZero(documentation.conversion_pct))}`,
    "",
    "Fechamento:",
    `- Agendados: ${numberOrZero(closing.scheduled)}`,
    `- Concluidos: ${numberOrZero(closing.completed)}`,
    `- Cancelados: ${numberOrZero(closing.cancelled)}`,
    `- Conversao: ${formatPercent(numberOrZero(closing.conversion_pct))}`,
    "",
    bestTeam
      ? `Equipe com melhor performance: ${String(bestTeam.name || "Sem equipe")}, com destaque em ${String(bestTeam.highlight || "conversao")}.`
      : "Equipe com melhor performance: base insuficiente para ranqueamento justo neste recorte.",
    worstTeam
      ? `Equipe com menor performance: ${String(worstTeam.name || "Sem equipe")}, principalmente em ${String(worstTeam.highlight || "conversao")}.`
      : "Equipe com menor performance: base insuficiente para ranqueamento justo neste recorte.",
    "",
    "MANDANDO BEM",
    "",
    positiveLines,
    "",
    "LEITURA EXECUTIVA",
    "",
    `Hoje a operacao mostra forca em ${String(executiveInputs.strongest_point || "volume comercial")}, mas pede atencao imediata em ${String(executiveInputs.main_bottleneck || "conversao operacional")}.`,
    `O maior risco do momento esta em ${String(executiveInputs.main_risk || "conversao")}.`,
    Array.isArray(executiveInputs.today_priorities) && executiveInputs.today_priorities.length
      ? `A prioridade do dia deve ser atacar ${String(executiveInputs.today_priorities[0] || "")}, alinhar ${String(executiveInputs.today_priorities[1] || "a operacao comercial")} e acelerar ${String(executiveInputs.today_priorities[2] || "o pipeline aberto")}.`
      : "A prioridade do dia deve ser manter o ritmo da operacao e corrigir rapidamente qualquer desvio que surgir.",
    "",
    "SUGESTOES PRATICAS PARA HOJE",
    "",
    suggestions,
  ].join("\n");
}

export async function rewriteOwnerReportWithAi(params: {
  apiKey?: string | null;
  model?: string | null;
  snapshot: OwnerReportSnapshot;
  baseMessage: string;
}) {
  const apiKey = String(params.apiKey || "").trim();
  if (!apiKey) {
    return {
      usedAi: false,
      message: params.baseMessage,
      error: "OPENAI_API_KEY ausente.",
    };
  }

  const model = String(params.model || "").trim() || "gpt-4.1-mini";
  const systemPrompt = [
    "Voce escreve resumos executivos para uma operacao imobiliaria do Minha Casa Minha Vida.",
    "Responda em portugues do Brasil, com tom direto, profissional e objetivo.",
    "Nao invente dados. Nao altere numeros. Use somente o snapshot recebido.",
    "Mantenha a estrutura da mensagem: URGENTE, IMPORTANTE, MANDANDO BEM, LEITURA EXECUTIVA, SUGESTOES PRATICAS PARA HOJE.",
    "Evite frases longas e floreios.",
  ].join(" ");

  const userPrompt = [
    "Reescreva a mensagem executiva abaixo sem mudar os numeros, mantendo a mesma estrutura e deixando o texto mais natural para WhatsApp.",
    "",
    "SNAPSHOT:",
    JSON.stringify(params.snapshot),
    "",
    "MENSAGEM BASE:",
    params.baseMessage,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorText = String((data && (data.error?.message || data.message)) || `Falha HTTP ${response.status} na OpenAI.`);
    return {
      usedAi: false,
      message: params.baseMessage,
      error: errorText,
    };
  }

  const outputText = typeof data?.output_text === "string" && data.output_text.trim()
    ? data.output_text.trim()
    : Array.isArray(data?.output)
      ? data.output
        .flatMap((item: Record<string, unknown>) => Array.isArray(item?.content) ? item.content : [])
        .map((item: Record<string, unknown>) => String(item?.text || item?.value || "").trim())
        .filter(Boolean)
        .join("\n")
      : "";

  if (!outputText) {
    return {
      usedAi: false,
      message: params.baseMessage,
      error: "A OpenAI nao retornou texto utilizavel para o resumo.",
    };
  }

  return {
    usedAi: true,
    message: outputText,
    error: "",
  };
}
