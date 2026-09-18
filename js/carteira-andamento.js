// CARTEIRA - parte 3/4: em andamento (metricas, resumo, board) e ativas (metricas, resumo, board)
function carteiraHojeRef() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function carteiraDiffDiasAssinado(inicio, fim) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return null;
  if (!(fim instanceof Date) || Number.isNaN(fim.getTime())) return null;
  const refInicio = new Date(inicio.getTime());
  const refFim = new Date(fim.getTime());
  refInicio.setHours(0, 0, 0, 0);
  refFim.setHours(0, 0, 0, 0);
  return Math.round((refFim.getTime() - refInicio.getTime()) / (1000 * 60 * 60 * 24));
}

function carteiraDataTexto(valor) {
  if (!valor) return null;
  const info = obterMomentoHistorico({ d: valor }, { preferTs: false }) || obterMomentoHistorico({ d: valor });
  return info && info.date ? new Date(info.date.getTime()) : null;
}

function carteiraDataEntradaEtapaAtual(v) {
  if (!v) return null;
  const hist = carteiraHistoricoFluxo(v);
  const etapaAtual = Number(v.etapa);
  const registro = [...hist].reverse().find(item => Number(item.e) === etapaAtual);
  if (registro) return new Date(registro.__date.getTime());
  const cadastro = carteiraDataVenda(v);
  return cadastro ? new Date(cadastro.getTime()) : null;
}

function carteiraMetricaAndamento(v) {
  if (!v || v.distratada || v.etapa >= ETAPAS.length - 1) return null;
  const hoje = carteiraHojeRef();
  const cadastro = carteiraDataVenda(v);
  const entradaEtapa = carteiraDataEntradaEtapaAtual(v);
  const diasAbertos = carteiraDiffDias(cadastro, hoje);
  const diasEtapa = carteiraDiffDias(entradaEtapa, hoje);
  const atrasoBruto = typeof calcAtraso === 'function' ? calcAtraso(v) : null;
  const atrasoDias = Number.isFinite(atrasoBruto) ? atrasoBruto : null;
  const prazoInfo = typeof labelAtraso === 'function' ? labelAtraso(v) : null;
  const previsao = typeof calcPrevisao === 'function' ? calcPrevisao(v) : null;
  const dataPrevisao = previsao && previsao.data ? carteiraDataTexto(previsao.data) : null;
  const diasAtePrevisao = dataPrevisao ? carteiraDiffDiasAssinado(hoje, dataPrevisao) : null;
  const pendencia = typeof getPendenciaComercial === 'function' ? getPendenciaComercial(v) : null;
  const cliente = clienteVendaTexto(v.cliente) || 'Venda';
  const prazoTipo = prazoInfo ? prazoInfo.tipo : (PRAZOS_ETAPA[v.etapa] === null ? 'sem_sla' : 'sem_base');
  const prazoLabel = prazoInfo ? prazoInfo.label : (PRAZOS_ETAPA[v.etapa] === null ? 'Sem SLA' : 'Sem base');

  return {
    cadastro,
    entradaEtapa,
    diasAbertos,
    diasEtapa,
    atrasoDias,
    prazoTipo,
    prazoLabel,
    previsao,
    dataPrevisao,
    diasAtePrevisao,
    previsaoManual: !!(previsao && previsao.manual),
    pendenciaAberta: !!pendencia,
    cliente
  };
}

function carteiraSerieMensalAndamento(lista) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa < ETAPAS.length - 1)
    .forEach(v => {
      const metrica = carteiraMetricaAndamento(v);
      const cadastro = (metrica && metrica.cadastro) || carteiraDataVenda(v);
      const labelFallback = v.mes || 'Sem data';
      const chave = cadastro
        ? `${cadastro.getFullYear()}-${pad2(cadastro.getMonth() + 1)}`
        : `MES-${normalizarCarteiraTexto(labelFallback)}`;
      const ordem = cadastro
        ? (cadastro.getFullYear() * 100) + (cadastro.getMonth() + 1)
        : (900000 + ordemMesCarteira(labelFallback));
      if (!mapa[chave]) {
        mapa[chave] = {
          nome: cadastro ? carteiraMesAnoLabel(cadastro) : labelFallback,
          ordem,
          total: 0,
          vgv: 0,
          liq: 0,
          zelony: 0,
          totalDiasAbertos: 0,
          comAbertos: 0,
          totalDiasEtapa: 0,
          comEtapa: 0,
          atrasadas: 0,
          pendencias: 0
        };
      }
      mapa[chave].total++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      mapa[chave].zelony += comZ(v);
      if (metrica && Number.isFinite(metrica.diasAbertos)) {
        mapa[chave].totalDiasAbertos += metrica.diasAbertos;
        mapa[chave].comAbertos++;
      }
      if (metrica && Number.isFinite(metrica.diasEtapa)) {
        mapa[chave].totalDiasEtapa += metrica.diasEtapa;
        mapa[chave].comEtapa++;
      }
      if (metrica && Number.isFinite(metrica.atrasoDias) && metrica.atrasoDias > 0) mapa[chave].atrasadas++;
      if (metrica && metrica.pendenciaAberta) mapa[chave].pendencias++;
    });

  return Object.values(mapa)
    .map(item => ({
      ...item,
      diasMediosAbertos: item.comAbertos ? Math.round(item.totalDiasAbertos / item.comAbertos) : null,
      diasMediosEtapa: item.comEtapa ? Math.round(item.totalDiasEtapa / item.comEtapa) : null,
      pctAtraso: item.total ? (item.atrasadas / item.total) * 100 : 0
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraSeriePrevisaoAndamento(lista) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa < ETAPAS.length - 1)
    .forEach(v => {
      const metrica = carteiraMetricaAndamento(v);
      const dataPrevisao = metrica && metrica.dataPrevisao;
      const semPrevisao = !(dataPrevisao instanceof Date) || Number.isNaN(dataPrevisao.getTime());
      const chave = semPrevisao ? 'SEM-PREVISAO' : `${dataPrevisao.getFullYear()}-${pad2(dataPrevisao.getMonth() + 1)}`;
      const ordem = semPrevisao ? 999999 : (dataPrevisao.getFullYear() * 100) + (dataPrevisao.getMonth() + 1);
      if (!mapa[chave]) {
        mapa[chave] = {
          chave,
          nome: semPrevisao ? 'Sem previsão' : carteiraMesAnoLabel(dataPrevisao),
          ordem,
          total: 0,
          vgv: 0,
          liq: 0,
          manuais: 0,
          estouradas: 0,
          pendencias: 0
        };
      }
      mapa[chave].total++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      if (metrica && metrica.previsaoManual) mapa[chave].manuais++;
      if (metrica && Number.isFinite(metrica.diasAtePrevisao) && metrica.diasAtePrevisao < 0) mapa[chave].estouradas++;
      if (metrica && metrica.pendenciaAberta) mapa[chave].pendencias++;
    });

  const itens = Object.values(mapa).sort((a, b) => a.ordem - b.ordem);
  const semPrevisao = itens.find(item => item.chave === 'SEM-PREVISAO') || null;
  const comData = itens.filter(item => item.chave !== 'SEM-PREVISAO');
  const base = comData.slice(0, semPrevisao ? 5 : 6);
  return semPrevisao ? [...base, semPrevisao] : base;
}

function carteiraEtapasAndamento(lista) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa < ETAPAS.length - 1)
    .forEach(v => {
      const nome = ETAPAS[v.etapa] || 'Etapa';
      const chave = normalizarCarteiraTexto(nome);
      const metrica = carteiraMetricaAndamento(v);
      if (!mapa[chave]) {
        mapa[chave] = {
          nome,
          total: 0,
          vgv: 0,
          totalDiasEtapa: 0,
          comEtapa: 0,
          atrasadas: 0,
          pendencias: 0,
          manuais: 0
        };
      }
      mapa[chave].total++;
      mapa[chave].vgv += v.valor || 0;
      if (metrica && Number.isFinite(metrica.diasEtapa)) {
        mapa[chave].totalDiasEtapa += metrica.diasEtapa;
        mapa[chave].comEtapa++;
      }
      if (metrica && Number.isFinite(metrica.atrasoDias) && metrica.atrasoDias > 0) mapa[chave].atrasadas++;
      if (metrica && metrica.pendenciaAberta) mapa[chave].pendencias++;
      if (metrica && metrica.previsaoManual) mapa[chave].manuais++;
    });

  return Object.values(mapa)
    .map(item => ({
      ...item,
      diasMediosEtapa: item.comEtapa ? Math.round(item.totalDiasEtapa / item.comEtapa) : null,
      pctAtraso: item.total ? (item.atrasadas / item.total) * 100 : 0,
      pctPendencia: item.total ? (item.pendencias / item.total) * 100 : 0
    }))
    .sort((a, b) => b.atrasadas - a.atrasadas || (b.diasMediosEtapa || 0) - (a.diasMediosEtapa || 0) || b.total - a.total)
    .slice(0, 5);
}

function carteiraFaixasPrazoAndamento(lista) {
  const definicoes = [
    { chave: 'atraso_critico', nome: 'Atraso crítico', ordem: 1 },
    { chave: 'atraso_moderado', nome: 'Atraso moderado', ordem: 2 },
    { chave: 'atraso_leve', nome: 'Atraso leve', ordem: 3 },
    { chave: 'vence_hoje', nome: 'Vence hoje', ordem: 4 },
    { chave: 'no_prazo', nome: 'No prazo', ordem: 5 },
    { chave: 'sem_sla', nome: 'Sem SLA', ordem: 6 }
  ];
  const mapa = {};
  definicoes.forEach(item => {
    mapa[item.chave] = { ...item, total: 0, vgv: 0, totalDiasAbertos: 0, comAbertos: 0 };
  });

  lista
    .filter(v => !v.distratada && v.etapa < ETAPAS.length - 1)
    .forEach(v => {
      const metrica = carteiraMetricaAndamento(v);
      let chave = 'sem_sla';
      if (metrica && Number.isFinite(metrica.atrasoDias)) {
        if (metrica.atrasoDias < 0) chave = 'no_prazo';
        else if (metrica.atrasoDias === 0) chave = 'vence_hoje';
        else if (metrica.atrasoDias <= 5) chave = 'atraso_leve';
        else if (metrica.atrasoDias <= 10) chave = 'atraso_moderado';
        else chave = 'atraso_critico';
      }
      mapa[chave].total++;
      mapa[chave].vgv += v.valor || 0;
      if (metrica && Number.isFinite(metrica.diasAbertos)) {
        mapa[chave].totalDiasAbertos += metrica.diasAbertos;
        mapa[chave].comAbertos++;
      }
    });

  const total = lista.filter(v => !v.distratada && v.etapa < ETAPAS.length - 1).length;
  return Object.values(mapa)
    .filter(item => item.total > 0)
    .map(item => ({
      ...item,
      diasMediosAbertos: item.comAbertos ? Math.round(item.totalDiasAbertos / item.comAbertos) : null,
      taxa: total ? (item.total / total) * 100 : 0
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

function carteiraGruposAndamento(lista, valorFn, opts = {}) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa < ETAPAS.length - 1)
    .forEach(v => {
      const nomeBruto = valorFn(v);
      const nome = carteiraRotuloPadrao(nomeBruto, opts.fallback || 'Não informado');
      const chave = normalizarCarteiraTexto(nome);
      const metrica = carteiraMetricaAndamento(v);
      if (!mapa[chave]) {
        mapa[chave] = {
          nome,
          total: 0,
          vgv: 0,
          liq: 0,
          zelony: 0,
          totalDiasAbertos: 0,
          comAbertos: 0,
          totalDiasEtapa: 0,
          comEtapa: 0,
          atrasadas: 0,
          pendencias: 0,
          manuais: 0
        };
      }
      mapa[chave].total++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      mapa[chave].zelony += comZ(v);
      if (metrica && Number.isFinite(metrica.diasAbertos)) {
        mapa[chave].totalDiasAbertos += metrica.diasAbertos;
        mapa[chave].comAbertos++;
      }
      if (metrica && Number.isFinite(metrica.diasEtapa)) {
        mapa[chave].totalDiasEtapa += metrica.diasEtapa;
        mapa[chave].comEtapa++;
      }
      if (metrica && Number.isFinite(metrica.atrasoDias) && metrica.atrasoDias > 0) mapa[chave].atrasadas++;
      if (metrica && metrica.pendenciaAberta) mapa[chave].pendencias++;
      if (metrica && metrica.previsaoManual) mapa[chave].manuais++;
    });

  return Object.values(mapa)
    .map(item => ({
      ...item,
      diasMediosAbertos: item.comAbertos ? Math.round(item.totalDiasAbertos / item.comAbertos) : null,
      diasMediosEtapa: item.comEtapa ? Math.round(item.totalDiasEtapa / item.comEtapa) : null,
      pctAtraso: item.total ? (item.atrasadas / item.total) * 100 : 0,
      pctPendencia: item.total ? (item.pendencias / item.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total || b.vgv - a.vgv || b.atrasadas - a.atrasadas)
    .slice(0, opts.limite || 5);
}

function resumoAndamentoCarteira(listaRecorte, listaComparativa) {
  const base = Array.isArray(listaRecorte) ? [...listaRecorte] : [];
  const comparativa = Array.isArray(listaComparativa) ? [...listaComparativa] : [...base];
  const abertas = base.filter(v => !v.distratada && v.etapa < ETAPAS.length - 1);
  const metricas = abertas.map(v => ({ venda: v, metrica: carteiraMetricaAndamento(v) })).filter(item => item.metrica);
  const idades = metricas.map(item => item.metrica.diasAbertos).filter(valor => Number.isFinite(valor));
  const etapasDias = metricas.map(item => item.metrica.diasEtapa).filter(valor => Number.isFinite(valor));
  const totalEmAndamento = abertas.length;
  const vgvPipeline = abertas.reduce((s, v) => s + (v.valor || 0), 0);
  const comissaoPotencial = abertas.reduce((s, v) => s + comTotal(v), 0);
  const lucroPotencial = abertas.reduce((s, v) => s + comZ(v), 0);
  const ticketMedio = totalEmAndamento ? vgvPipeline / totalEmAndamento : 0;
  const diasMediosAbertos = idades.length ? Math.round(idades.reduce((s, valor) => s + valor, 0) / idades.length) : null;
  const diasMedianaAbertos = carteiraMediana(idades);
  const diasMaiorAbertura = idades.length ? Math.max(...idades) : null;
  const diasMediosEtapa = etapasDias.length ? Math.round(etapasDias.reduce((s, valor) => s + valor, 0) / etapasDias.length) : null;
  const atrasadas = metricas.filter(item => Number.isFinite(item.metrica.atrasoDias) && item.metrica.atrasoDias > 0).length;
  const taxaAtraso = totalEmAndamento ? (atrasadas / totalEmAndamento) * 100 : 0;
  const pendenciasAbertas = metricas.filter(item => item.metrica.pendenciaAberta).length;
  const taxaPendencia = totalEmAndamento ? (pendenciasAbertas / totalEmAndamento) * 100 : 0;
  const previsoesManuais = metricas.filter(item => item.metrica.previsaoManual).length;
  const taxaPrevisaoManual = totalEmAndamento ? (previsoesManuais / totalEmAndamento) * 100 : 0;
  const semPrevisao = metricas.filter(item => !(item.metrica.dataPrevisao instanceof Date) || Number.isNaN(item.metrica.dataPrevisao.getTime())).length;
  const coortesCadastro = carteiraSerieMensalAndamento(comparativa);
  const previsoes = carteiraSeriePrevisaoAndamento(comparativa);
  const etapas = carteiraEtapasAndamento(base);
  const prazos = carteiraFaixasPrazoAndamento(base);
  const unidades = carteiraGruposAndamento(base, v => v.unidade, { fallback: 'Não informada' });
  const construtoras = carteiraGruposAndamento(base, v => v.construtora, { fallback: 'Não informada' });
  const origens = carteiraGruposAndamento(base, v => v.origem, { fallback: 'Não informada' });
  const gerentes = carteiraGruposAndamento(base, v => v.gerente, { fallback: 'Não informado' });
  const corretores = carteiraGruposAndamento(base, v => v.corretor, { fallback: 'Não informado' });
  const principalEtapa = etapas[0] || null;
  const principalPrazo = prazos.find(item => item.chave !== 'no_prazo' && item.chave !== 'sem_sla') || prazos[0] || null;
  const proximaPrevisao = metricas
    .filter(item => item.metrica.dataPrevisao instanceof Date && !Number.isNaN(item.metrica.dataPrevisao.getTime()) && Number.isFinite(item.metrica.diasAtePrevisao) && item.metrica.diasAtePrevisao >= 0)
    .sort((a, b) => a.metrica.diasAtePrevisao - b.metrica.diasAtePrevisao)[0] || null;
  const origemMaisSaudavel = [...origens]
    .sort((a, b) => a.pctAtraso - b.pctAtraso || (a.diasMediosEtapa || 0) - (b.diasMediosEtapa || 0) || b.total - a.total)[0] || null;

  return {
    totalEmAndamento,
    vgvPipeline,
    comissaoPotencial,
    lucroPotencial,
    ticketMedio,
    diasMediosAbertos,
    diasMedianaAbertos,
    diasMaiorAbertura,
    diasMediosEtapa,
    atrasadas,
    taxaAtraso,
    pendenciasAbertas,
    taxaPendencia,
    previsoesManuais,
    taxaPrevisaoManual,
    semPrevisao,
    coortesCadastro,
    previsoes,
    etapas,
    prazos,
    unidades,
    construtoras,
    origens,
    gerentes,
    corretores,
    principalEtapa,
    principalPrazo,
    proximaPrevisao,
    origemMaisSaudavel
  };
}

function renderCarteiraAndamentoRanking(lista, titulo, subtitulo, legenda) {
  return `
    <div class="cart-ranking-card">
      <div class="cart-ranking-head">
        <div>
          <div class="cart-ranking-tag">${carteiraUiHtml(subtitulo)}</div>
          <div class="cart-ranking-title">${carteiraUiHtml(titulo)}</div>
        </div>
        <span>${carteiraUiHtml(legenda)}</span>
      </div>
      <div class="cart-ranking-list">
        ${lista.length ? lista.map((item, idx) => `
          <div class="cart-ranking-item">
            <div class="cart-ranking-pos">${idx + 1}</div>
            <div class="cart-ranking-main">
              <div class="cart-ranking-name">${carteiraUiHtml(item.nome)}</div>
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.total} abertas • ${fmtPctCarteira(item.pctAtraso)} atrasadas • idade média de ${carteiraFmtDias(item.diasMediosAbertos)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.liq))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de pipeline neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraAndamentoBoard(analise, opts = {}) {
  const diasMedios = carteiraFmtDias(analise.diasMediosAbertos);
  const diasMediana = carteiraFmtDias(analise.diasMedianaAbertos);
  const diasMaior = carteiraFmtDias(analise.diasMaiorAbertura);
  const chips = [
    analise.principalEtapa ? `Etapa mais pressionada: ${analise.principalEtapa.nome}` : '',
    analise.principalPrazo ? `Radar de prazo: ${analise.principalPrazo.nome}` : '',
    analise.proximaPrevisao ? `Próxima previsão: ${analise.proximaPrevisao.metrica.cliente} em ${formatarDataLocal(analise.proximaPrevisao.metrica.dataPrevisao, { comAno: true })}` : '',
    analise.origemMaisSaudavel ? `Origem mais saudável: ${analise.origemMaisSaudavel.nome}` : '',
    analise.semPrevisao ? `${analise.semPrevisao} venda${analise.semPrevisao !== 1 ? 's' : ''} sem previsão de recebimento` : ''
  ].filter(Boolean).slice(0, 4);

  return `
    <div class="cart-conclusao-board">
      <div class="cart-conclusao-hero">
        <div class="cart-conclusao-hero-main cart-andamento-hero-main">
          <div class="cart-conclusao-kicker">${carteiraUiHtml('Inteligência do pipeline')}</div>
          <div class="cart-conclusao-title">${carteiraUiHtml('Tempo médio desde o cadastro até hoje')}</div>
          <div class="cart-conclusao-big">${carteiraUiHtml(diasMedios)}</div>
          <div class="cart-conclusao-copy">${carteiraUiHtml(`${analise.totalEmAndamento} venda${analise.totalEmAndamento !== 1 ? 's' : ''} em andamento no recorte • ${fmtK(analise.vgvPipeline)} em VGV no pipeline • ${fmtK(analise.comissaoPotencial)} de comissão potencial`)}</div>
          ${chips.length ? `<div class="cart-conclusao-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Em andamento')}</span>
            <strong>${analise.totalEmAndamento}</strong>
            <small>${carteiraUiHtml('vendas ainda dentro do pipeline')}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Atrasadas')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaAtraso))}</strong>
            <small>${carteiraUiHtml(`${analise.atrasadas} venda${analise.atrasadas !== 1 ? 's' : ''} acima do SLA da etapa`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Previsões manuais')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaPrevisaoManual))}</strong>
            <small>${carteiraUiHtml(`${analise.previsoesManuais} venda${analise.previsoesManuais !== 1 ? 's' : ''} com previsão ajustada`)}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Pendências comerciais')}</span>
            <strong>${analise.pendenciasAbertas}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaPendencia)} do pipeline com alerta aberto`)}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV no pipeline')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvPipeline))}</strong>
          <small>${carteiraUiHtml('volume financeiro ainda em processamento')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Comissão potencial')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoPotencial))}</strong>
          <small>${carteiraUiHtml('receita líquida em aberto')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Lucro Zelony potencial')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.lucroPotencial))}</strong>
          <small>${carteiraUiHtml('resultado projetado se o pipeline converter')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketMedio))}</strong>
          <small>${carteiraUiHtml('VGV médio por venda em andamento')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Mediana de idade')}</span>
          <strong>${carteiraUiHtml(diasMediana)}</strong>
          <small>${carteiraUiHtml('tempo central das vendas em aberto')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Venda mais antiga')}</span>
          <strong>${carteiraUiHtml(diasMaior)}</strong>
          <small>${carteiraUiHtml('maior permanência ainda aberta')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês de entrada')}</div>
              <h3>${carteiraUiHtml('Backlog por coorte de cadastro')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Mostra quais meses continuam carregando mais vendas abertas, com idade média e peso financeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.coortesCadastro, {
            vazio: 'Sem base suficiente para montar a evolução do pipeline por mês de cadastro.',
            tone: 'gold',
            widthFn: item => item.total,
            valueFn: item => item.diasMediosAbertos === null ? 'Sem base' : carteiraFmtDias(item.diasMediosAbertos),
            metaFn: item => `${item.total} abertas • ${item.atrasadas} atrasadas`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês previsto')}</div>
              <h3>${carteiraUiHtml('Quando a carteira tende a receber')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Agrupa as previsões de recebimento para mostrar concentração, carga manual e previsões já vencidas.')}</div>
          ${renderCarteiraDistratoRows(analise.previsoes, {
            vazio: 'Nenhuma previsão de recebimento foi encontrada para este recorte.',
            tone: 'success',
            widthFn: item => item.total,
            valueFn: item => `${item.total} prevista${item.total !== 1 ? 's' : ''}`,
            metaFn: item => `${item.manuais} manual${item.manuais !== 1 ? 's' : ''} • ${item.estouradas} vencida${item.estouradas !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas críticas')}</div>
              <h3>${carteiraUiHtml('Onde o pipeline está segurando')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Cruza volume na etapa, tempo parado e atraso para indicar onde a gestão precisa entrar primeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Sem base suficiente para medir a pressão por etapa.',
            tone: 'danger',
            widthFn: item => item.atrasadas || item.total,
            valueFn: item => item.diasMediosEtapa === null ? 'Sem base' : carteiraFmtDias(item.diasMediosEtapa),
            metaFn: item => `${item.total} abertas • ${item.atrasadas} atrasadas`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Radar de prazo')}</div>
              <h3>${carteiraUiHtml('Distribuição do risco operacional')}</h3>
            </div>
            <span>${carteiraUiHtml('Agora')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Lê o pipeline pela situação de prazo da etapa atual para mostrar onde existe risco imediato de estourar o fluxo.')}</div>
          ${renderCarteiraDistratoRows(analise.prazos, {
            vazio: 'Nenhuma venda em andamento com base de prazo neste recorte.',
            tone: 'danger',
            widthFn: item => item.total,
            valueFn: item => `${item.total} caso${item.total !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • idade média de ${carteiraFmtDias(item.diasMediosAbertos)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Unidades')}</div>
              <h3>${carteiraUiHtml('Onde o pipeline está mais pesado')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Combina quantidade aberta, VGV e taxa de atraso para apontar as unidades que pedem mais energia operacional.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem base suficiente para ranquear unidades no pipeline.',
            tone: 'gold',
            widthFn: item => item.total,
            valueFn: item => fmtPctCarteira(item.pctAtraso),
            metaFn: item => `${item.total} abertas • idade média de ${carteiraFmtDias(item.diasMediosAbertos)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Construtoras')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior carga aberta')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Ajuda a ver onde o volume em processamento, os atrasos e o tempo parado estão mais concentrados.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem base suficiente para ranquear construtoras no pipeline.',
            tone: 'gold',
            widthFn: item => item.total,
            valueFn: item => fmtPctCarteira(item.pctAtraso),
            metaFn: item => `${item.total} abertas • idade média de ${carteiraFmtDias(item.diasMediosAbertos)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card" style="grid-column:1 / -1;">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Origens')}</div>
              <h3>${carteiraUiHtml('Canais com maior volume e menor fricção')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais origens estão trazendo mais carteira aberta e quais delas estão conseguindo rodar com menos atraso.')}</div>
          ${renderCarteiraDistratoRows(analise.origens, {
            vazio: 'Sem base suficiente para ranquear origens no pipeline.',
            tone: 'success',
            widthFn: item => item.total,
            valueFn: item => fmtPctCarteira(item.pctAtraso),
            metaFn: item => `${item.total} abertas • etapa média de ${carteiraFmtDias(item.diasMediosEtapa)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraAndamentoRanking(analise.corretores, 'Corretores com maior pipeline', 'Radar comercial', 'comissão potencial')}
        ${renderCarteiraAndamentoRanking(analise.gerentes, 'Gerentes com maior pipeline', 'Liderança', 'comissão potencial')}
      </div>
    </div>`;
}

function carteiraSerieMensalAtivas(lista) {
  const mapa = {};
  lista.forEach(v => {
    const cadastro = carteiraDataVenda(v);
    const labelFallback = v.mes || 'Sem data';
    const chave = cadastro
      ? `${cadastro.getFullYear()}-${pad2(cadastro.getMonth() + 1)}`
      : `MES-${normalizarCarteiraTexto(labelFallback)}`;
    const ordem = cadastro
      ? (cadastro.getFullYear() * 100) + (cadastro.getMonth() + 1)
      : (900000 + ordemMesCarteira(labelFallback));
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: cadastro ? carteiraMesAnoLabel(cadastro) : labelFallback,
        ordem,
        total: 0,
        ativas: 0,
        concluidas: 0,
        andamento: 0,
        distratos: 0,
        vgvAtivo: 0,
        liqAtiva: 0,
        zelonyAtivo: 0
      };
    }
    mapa[chave].total++;
    if (v.distratada) {
      mapa[chave].distratos++;
      return;
    }
    mapa[chave].ativas++;
    mapa[chave].vgvAtivo += v.valor || 0;
    mapa[chave].liqAtiva += comTotal(v);
    mapa[chave].zelonyAtivo += comZ(v);
    if (v.etapa === ETAPAS.length - 1) mapa[chave].concluidas++;
    else mapa[chave].andamento++;
  });

  return Object.values(mapa)
    .map(item => ({
      ...item,
      taxaAtiva: item.total ? (item.ativas / item.total) * 100 : 0,
      taxaConclusaoAtiva: item.ativas ? (item.concluidas / item.ativas) * 100 : 0,
      taxaDistrato: item.total ? (item.distratos / item.total) * 100 : 0
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraMixAtivas(lista) {
  const total = Array.isArray(lista) ? lista.length : 0;
  const concluidas = (lista || []).filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
  const andamento = (lista || []).filter(v => !v.distratada && v.etapa < ETAPAS.length - 1);
  const distratos = (lista || []).filter(v => v.distratada);
  return [
    {
      chave: 'concluidas',
      nome: 'Concluídas ativas',
      total: concluidas.length,
      taxa: total ? (concluidas.length / total) * 100 : 0,
      vgv: concluidas.reduce((s, v) => s + (v.valor || 0), 0),
      valorSecundario: concluidas.reduce((s, v) => s + comZ(v), 0)
    },
    {
      chave: 'andamento',
      nome: 'Em andamento',
      total: andamento.length,
      taxa: total ? (andamento.length / total) * 100 : 0,
      vgv: andamento.reduce((s, v) => s + (v.valor || 0), 0),
      valorSecundario: andamento.reduce((s, v) => s + comTotal(v), 0)
    },
    {
      chave: 'distratos',
      nome: 'Distratos',
      total: distratos.length,
      taxa: total ? (distratos.length / total) * 100 : 0,
      vgv: distratos.reduce((s, v) => s + (v.valor || 0), 0),
      valorSecundario: distratos.reduce((s, v) => s + comTotal(v), 0)
    }
  ];
}

function carteiraGruposAtivas(lista, valorFn, opts = {}) {
  const mapa = {};
  lista.forEach(v => {
    const nomeBruto = valorFn(v);
    const nome = carteiraRotuloPadrao(nomeBruto, opts.fallback || 'Não informado');
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        total: 0,
        ativas: 0,
        concluidas: 0,
        andamento: 0,
        distratos: 0,
        vgvAtivo: 0,
        vgvPipeline: 0,
        liqAtiva: 0,
        zelonyAtivo: 0,
        perdido: 0
      };
    }
    mapa[chave].total++;
    if (v.distratada) {
      mapa[chave].distratos++;
      mapa[chave].perdido += comTotal(v);
      return;
    }
    mapa[chave].ativas++;
    mapa[chave].vgvAtivo += v.valor || 0;
    mapa[chave].liqAtiva += comTotal(v);
    mapa[chave].zelonyAtivo += comZ(v);
    if (v.etapa === ETAPAS.length - 1) mapa[chave].concluidas++;
    else {
      mapa[chave].andamento++;
      mapa[chave].vgvPipeline += v.valor || 0;
    }
  });

  return Object.values(mapa)
    .map(item => ({
      ...item,
      taxaAtiva: item.total ? (item.ativas / item.total) * 100 : 0,
      taxaConclusaoAtiva: item.ativas ? (item.concluidas / item.ativas) * 100 : 0,
      taxaDistrato: item.total ? (item.distratos / item.total) * 100 : 0
    }))
    .sort((a, b) => b.ativas - a.ativas || b.vgvAtivo - a.vgvAtivo || b.zelonyAtivo - a.zelonyAtivo)
    .slice(0, opts.limite || 5);
}

function resumoAtivasCarteira(listaRecorte, listaComparativa) {
  const base = Array.isArray(listaRecorte) ? [...listaRecorte] : [];
  const comparativa = Array.isArray(listaComparativa) ? [...listaComparativa] : [...base];
  const ativas = base.filter(v => !v.distratada);
  const concluidas = ativas.filter(v => v.etapa === ETAPAS.length - 1);
  const andamento = ativas.filter(v => v.etapa < ETAPAS.length - 1);
  const analiseAndamento = resumoAndamentoCarteira(base, comparativa);
  const analiseConcluidas = resumoConclusoesCarteira(base, comparativa);
  const totalLancadas = base.length;
  const totalAtivas = ativas.length;
  const totalConcluidas = concluidas.length;
  const totalEmAndamento = andamento.length;
  const taxaAtiva = totalLancadas ? (totalAtivas / totalLancadas) * 100 : 0;
  const taxaConclusaoAtiva = totalAtivas ? (totalConcluidas / totalAtivas) * 100 : 0;
  const taxaPipelineAtivo = totalAtivas ? (totalEmAndamento / totalAtivas) * 100 : 0;
  const vgvAtivo = ativas.reduce((s, v) => s + (v.valor || 0), 0);
  const vgvPipeline = andamento.reduce((s, v) => s + (v.valor || 0), 0);
  const comissaoAtiva = ativas.reduce((s, v) => s + comTotal(v), 0);
  const lucroAtivo = ativas.reduce((s, v) => s + comZ(v), 0);
  const ticketMedio = totalAtivas ? vgvAtivo / totalAtivas : 0;
  const mixStatus = carteiraMixAtivas(base);
  const coortes = carteiraSerieMensalAtivas(comparativa);
  const unidades = carteiraGruposAtivas(base, v => v.unidade, { fallback: 'Não informada' });
  const construtoras = carteiraGruposAtivas(base, v => v.construtora, { fallback: 'Não informada' });
  const origens = carteiraGruposAtivas(base, v => v.origem, { fallback: 'Não informada' });
  const gerentes = carteiraGruposAtivas(base, v => v.gerente, { fallback: 'Não informado' });
  const corretores = carteiraGruposAtivas(base, v => v.corretor, { fallback: 'Não informado' });
  const principalEtapa = analiseAndamento.principalEtapa || null;
  const principalPrazo = analiseAndamento.principalPrazo || null;
  const melhorOrigem = [...origens]
    .sort((a, b) => b.taxaAtiva - a.taxaAtiva || b.taxaConclusaoAtiva - a.taxaConclusaoAtiva || b.ativas - a.ativas)[0] || null;

  return {
    totalLancadas,
    totalAtivas,
    totalConcluidas,
    totalEmAndamento,
    taxaAtiva,
    taxaConclusaoAtiva,
    taxaPipelineAtivo,
    vgvAtivo,
    vgvPipeline,
    comissaoAtiva,
    lucroAtivo,
    ticketMedio,
    mixStatus,
    coortes,
    unidades,
    construtoras,
    origens,
    gerentes,
    corretores,
    principalEtapa,
    principalPrazo,
    melhorOrigem,
    diasMediosConclusao: analiseConcluidas.diasMedios,
    diasMediosAbertos: analiseAndamento.diasMediosAbertos,
    atrasadas: analiseAndamento.atrasadas,
    taxaAtraso: analiseAndamento.taxaAtraso,
    pendenciasAbertas: analiseAndamento.pendenciasAbertas,
    etapas: analiseAndamento.etapas,
    prazos: analiseAndamento.prazos
  };
}

function renderCarteiraAtivasRanking(lista, titulo, subtitulo, legenda) {
  return `
    <div class="cart-ranking-card">
      <div class="cart-ranking-head">
        <div>
          <div class="cart-ranking-tag">${carteiraUiHtml(subtitulo)}</div>
          <div class="cart-ranking-title">${carteiraUiHtml(titulo)}</div>
        </div>
        <span>${carteiraUiHtml(legenda)}</span>
      </div>
      <div class="cart-ranking-list">
        ${lista.length ? lista.map((item, idx) => `
          <div class="cart-ranking-item">
            <div class="cart-ranking-pos">${idx + 1}</div>
            <div class="cart-ranking-main">
              <div class="cart-ranking-name">${carteiraUiHtml(item.nome)}</div>
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.ativas} ativas • ${item.concluidas} concluídas • ${item.andamento} em andamento`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.zelonyAtivo))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de ativas neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraAtivasBoard(analise, opts = {}) {
  const chips = [
    `Mix da carteira: ${fmtPctCarteira(analise.taxaConclusaoAtiva)} concluídas e ${fmtPctCarteira(analise.taxaPipelineAtivo)} em andamento dentro das ativas`,
    analise.principalEtapa ? `Etapa com mais pressão: ${analise.principalEtapa.nome}` : '',
    analise.principalPrazo ? `Radar de prazo: ${analise.principalPrazo.nome}` : '',
    analise.melhorOrigem ? `Origem com melhor retenção: ${analise.melhorOrigem.nome}` : '',
    analise.diasMediosConclusao !== null ? `Ciclo médio concluído: ${carteiraFmtDias(analise.diasMediosConclusao)}` : ''
  ].filter(Boolean).slice(0, 4);

  return `
    <div class="cart-conclusao-board">
      <div class="cart-conclusao-hero">
        <div class="cart-conclusao-hero-main cart-ativas-hero-main">
          <div class="cart-conclusao-kicker">${carteiraUiHtml('Saúde da carteira ativa')}</div>
          <div class="cart-conclusao-title">${carteiraUiHtml('Retenção sobre as vendas lançadas')}</div>
          <div class="cart-conclusao-big">${carteiraUiHtml(fmtPctCarteira(analise.taxaAtiva))}</div>
          <div class="cart-conclusao-copy">${carteiraUiHtml(`${analise.totalAtivas} venda${analise.totalAtivas !== 1 ? 's' : ''} ativa${analise.totalAtivas !== 1 ? 's' : ''} entre ${analise.totalLancadas} lançadas no recorte • ${fmtK(analise.comissaoAtiva)} em comissão líquida preservada`)}</div>
          ${chips.length ? `<div class="cart-conclusao-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Ativas')}</span>
            <strong>${analise.totalAtivas}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaAtiva)} ainda preservadas`)}</small>
          </div>
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Concluídas ativas')}</span>
            <strong>${analise.totalConcluidas}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaConclusaoAtiva)} da carteira ativa`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Em andamento')}</span>
            <strong>${analise.totalEmAndamento}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaPipelineAtivo)} ainda em pipeline`)}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Atraso no pipeline')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaAtraso))}</strong>
            <small>${carteiraUiHtml(`${analise.atrasadas} venda${analise.atrasadas !== 1 ? 's' : ''} abertas acima do SLA`)}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Vendas lançadas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada para ler retenção')}</small>
        </div>
        <div class="cart-distrato-kpi success">
          <span>${carteiraUiHtml('VGV ativo')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvAtivo))}</strong>
          <small>${carteiraUiHtml('volume financeiro ainda vivo na carteira')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV em andamento')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvPipeline))}</strong>
          <small>${carteiraUiHtml('parte do ativo que ainda depende de pipeline')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Comissão líquida ativa')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoAtiva))}</strong>
          <small>${carteiraUiHtml('receita preservada nas vendas não distratadas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio ativo')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketMedio))}</strong>
          <small>${carteiraUiHtml('VGV médio das vendas ativas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Pendências abertas')}</span>
          <strong>${analise.pendenciasAbertas}</strong>
          <small>${carteiraUiHtml('alertas comerciais hoje no pipeline')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Status da carteira')}</div>
              <h3>${carteiraUiHtml('Como as vendas lançadas estão distribuídas')}</h3>
            </div>
            <span>${carteiraUiHtml('Agora')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Concilia concluídas ativas, pipeline aberto e distratos para mostrar a saúde real da carteira.')}</div>
          ${renderCarteiraDistratoRows(analise.mixStatus, {
            vazio: 'Sem base suficiente para montar o mix da carteira.',
            tone: 'success',
            widthFn: item => item.total,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.total} venda${item.total !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.chave === 'distratos' ? item.valorSecundario : item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte ativa')}</div>
              <h3>${carteiraUiHtml('Retenção por mês de entrada')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Mostra quanto de cada mês lançado ainda está ativo e como esse ativo se divide entre concluídas e pipeline.')}</div>
          ${renderCarteiraDistratoRows(analise.coortes, {
            vazio: 'Sem base suficiente para montar a retenção por coorte.',
            tone: 'gold',
            widthFn: item => item.taxaAtiva,
            valueFn: item => fmtPctCarteira(item.taxaAtiva),
            metaFn: item => `${item.ativas} ativas = ${item.concluidas} concluídas + ${item.andamento} em andamento`,
            extraFn: item => fmtK(item.vgvAtivo)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas abertas')}</div>
              <h3>${carteiraUiHtml('Onde a parte viva do pipeline está parada')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em quais etapas a carteira ativa ainda depende de produção operacional para virar resultado.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Sem pipeline suficiente para distribuir por etapa.',
            tone: 'danger',
            widthFn: item => item.total,
            valueFn: item => item.diasMediosEtapa === null ? 'Sem base' : carteiraFmtDias(item.diasMediosEtapa),
            metaFn: item => `${item.total} abertas • ${item.atrasadas} atrasadas`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Prazos em aberto')}</div>
              <h3>${carteiraUiHtml('Qualidade operacional do pipeline ativo')}</h3>
            </div>
            <span>${carteiraUiHtml('Agora')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Lê apenas as vendas ainda abertas para mostrar o tamanho do risco operacional dentro das ativas.')}</div>
          ${renderCarteiraDistratoRows(analise.prazos, {
            vazio: 'Sem base suficiente para ler o prazo das vendas abertas.',
            tone: 'danger',
            widthFn: item => item.total,
            valueFn: item => `${item.total} caso${item.total !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • idade média de ${carteiraFmtDias(item.diasMediosAbertos)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Unidades')}</div>
              <h3>${carteiraUiHtml('Onde a carteira ativa se concentra')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Combina retenção, volume ainda vivo e peso de pipeline para mostrar onde a empresa está mais exposta.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem base suficiente para ranquear unidades ativas.',
            tone: 'success',
            widthFn: item => item.ativas,
            valueFn: item => fmtPctCarteira(item.taxaAtiva),
            metaFn: item => `${item.ativas} ativas • ${item.concluidas} concluídas • ${item.andamento} em andamento`,
            extraFn: item => fmtK(item.vgvAtivo)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Construtoras')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior carteira viva')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Ajuda a ver quem concentra mais ativo, qual parcela já converteu e quanto ainda depende do pipeline.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem base suficiente para ranquear construtoras ativas.',
            tone: 'success',
            widthFn: item => item.ativas,
            valueFn: item => fmtPctCarteira(item.taxaAtiva),
            metaFn: item => `${item.ativas} ativas • ${item.concluidas} concluídas • ${item.andamento} em andamento`,
            extraFn: item => fmtK(item.vgvAtivo)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card" style="grid-column:1 / -1;">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Origens')}</div>
              <h3>${carteiraUiHtml('Canais com melhor retenção e conversão viva')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais canais mantêm mais vendas vivas, quanto disso já concluiu e quanto ainda está em rota de fechamento.')}</div>
          ${renderCarteiraDistratoRows(analise.origens, {
            vazio: 'Sem base suficiente para ranquear origens ativas.',
            tone: 'gold',
            widthFn: item => item.ativas,
            valueFn: item => fmtPctCarteira(item.taxaConclusaoAtiva),
            metaFn: item => `${item.ativas} ativas • ${item.andamento} em andamento • distrato ${fmtPctCarteira(item.taxaDistrato)}`,
            extraFn: item => fmtK(item.vgvAtivo)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraAtivasRanking(analise.corretores, 'Corretores com maior carteira ativa', 'Radar comercial', 'lucro Zelony')}
        ${renderCarteiraAtivasRanking(analise.gerentes, 'Gerentes com maior carteira ativa', 'Liderança', 'lucro Zelony')}
      </div>
    </div>`;
}

