// FINANCEIRO
// Modulo Financeiro - calendario de previsoes de recebimento

let finMesAtual = new Date().getMonth();
let finAnoAtual = new Date().getFullYear();
let finFiltroUnidade = '';
let finFiltroConstrutora = '';
let finFiltroGerente = '';
let finFiltroSituacao = '';
let finFiltroFaixa = '';

function syncFinState() {
  zSetState('state.ui.finMesAtual', finMesAtual);
  zSetState('state.ui.finAnoAtual', finAnoAtual);
  zSetState('state.ui.finFiltroUnidade', finFiltroUnidade);
  zSetState('state.ui.finFiltroConstrutora', finFiltroConstrutora);
  zSetState('state.ui.finFiltroGerente', finFiltroGerente);
  zSetState('state.ui.finFiltroSituacao', finFiltroSituacao);
  zSetState('state.ui.finFiltroFaixa', finFiltroFaixa);
}

syncFinState();

function finMeses() {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
}

function finOpcoes(lista) {
  return [...new Set((lista || []).filter(Boolean))].sort((a, b) => zUiText(a).localeCompare(zUiText(b), 'pt-BR'));
}

function finMatchFaixa(valor, faixa) {
  if (!faixa) return true;
  if (faixa === 'ate5') return valor <= 5000;
  if (faixa === '5a10') return valor > 5000 && valor <= 10000;
  if (faixa === '10a20') return valor > 10000 && valor <= 20000;
  if (faixa === '20mais') return valor > 20000;
  return true;
}

function finMatchBase(v) {
  if (v.distratada) return false;
  if (finFiltroUnidade && v.unidade !== finFiltroUnidade) return false;
  if (finFiltroConstrutora && v.construtora !== finFiltroConstrutora) return false;
  if (finFiltroGerente && v.gerente !== finFiltroGerente) return false;
  return true;
}

function finColetarMes(mes, ano) {
  const previsoesPorDia = {};
  const previsoes = [];
  const recebidas = [];
  const todos = [];

  VENDAS.forEach(v => {
    if (!finMatchBase(v)) return;

    const bruto = (v.valor || 0) * (v.pct || 0);
    const liquido = comZ(v);

    if (!finMatchFaixa(bruto, finFiltroFaixa)) return;

    const concluida = v.etapa === ETAPAS.length - 1;
    if (concluida) {
      const ultHist = v.hist && v.hist.length ? v.hist[v.hist.length - 1] : null;
      const ultHistInfo = obterMomentoHistorico(ultHist, { preferTs: false });
      if (!ultHistInfo || !ultHistInfo.date || ultHistInfo.precision === 'daymonth') return;
      const dia = ultHistInfo.date.getDate();
      const mesHist = ultHistInfo.date.getMonth();
      const anoHist = ultHistInfo.date.getFullYear();
      if (mesHist !== mes || anoHist !== ano) return;
      if (finFiltroSituacao && finFiltroSituacao !== 'recebida') return;
      const item = {
        tipo: 'recebida',
        status: 'recebida',
        dia,
        bruto,
        liquido,
        atraso: 0,
        v,
        dataRef: new Date(anoHist, mesHist, dia)
      };
      recebidas.push(item);
      todos.push(item);
      return;
    }

    if (v.etapa >= ETAPAS.length - 1) return;
    const prev = calcPrevisao(v);
    if (!prev || !prev.data) return;
    const partes = prev.data.split('/');
    if (partes.length < 3) return;
    const dia = parseInt(partes[0], 10);
    const mesPrev = parseInt(partes[1], 10) - 1;
    const anoPrev = parseInt(partes[2], 10);
    if (mesPrev !== mes || anoPrev !== ano) return;

    const status = prev.totalAtraso > 0 ? 'atrasada' : 'prazo';
    if (finFiltroSituacao && finFiltroSituacao !== status) return;

    const item = {
      tipo: 'prevista',
      status,
      dia,
      bruto,
      liquido,
      atraso: prev.totalAtraso || 0,
      prev,
      v,
      dataRef: new Date(anoPrev, mesPrev, dia)
    };
    if (!previsoesPorDia[dia]) previsoesPorDia[dia] = [];
    previsoesPorDia[dia].push(item);
    previsoes.push(item);
    todos.push(item);
  });

  previsoes.forEach(item => {
    previsoesPorDia[item.dia].sort((a, b) => b.bruto - a.bruto);
  });
  recebidas.sort((a, b) => a.dataRef - b.dataRef || b.bruto - a.bruto);
  previsoes.sort((a, b) => a.dataRef - b.dataRef || b.bruto - a.bruto);
  todos.sort((a, b) => a.dataRef - b.dataRef || b.bruto - a.bruto);

  return {
    previsoesPorDia,
    previsoes,
    recebidas,
    todos,
    totalPrevistoBrut: previsoes.reduce((s, item) => s + item.bruto, 0),
    totalPrevistoLiq: previsoes.reduce((s, item) => s + item.liquido, 0),
    totalRecebidoBrut: recebidas.reduce((s, item) => s + item.bruto, 0),
    totalRecebidoLiq: recebidas.reduce((s, item) => s + item.liquido, 0)
  };
}

function finDelta(atual, anterior) {
  const delta = atual - anterior;
  const pct = anterior > 0 ? (delta / anterior) * 100 : (atual > 0 ? 100 : 0);
  return { delta, pct };
}

function finFmtDelta(info) {
  if (!info.delta) return zUiText('Estável');
  const sinal = info.delta > 0 ? '+' : '-';
  return `${sinal}${fmtK(Math.abs(info.delta))}`;
}

function finFmtDeltaPct(info) {
  if (!Number.isFinite(info.pct) || info.delta === 0) return zUiText('sem variação');
  const sinal = info.pct > 0 ? '+' : '';
  return `${sinal}${info.pct.toFixed(1).replace('.', ',')}%`;
}

function finStatusItem(item) {
  return item.status === 'recebida'
    ? zUiText('Recebida')
    : item.status === 'atrasada'
      ? zUiText(`${item.atraso}d atraso`)
      : zUiText('No prazo');
}

function finClasseItem(item) {
  if (item.status === 'recebida') return 'ok';
  if (item.status === 'atrasada') return 'delay';
  return 'soon';
}

function finPeriodoComparado() {
  if (finMesAtual === 0) return { mes: 11, ano: finAnoAtual - 1 };
  return { mes: finMesAtual - 1, ano: finAnoAtual };
}

function finSetFiltro(chave, valor) {
  if (chave === 'unidade') finFiltroUnidade = valor;
  if (chave === 'construtora') finFiltroConstrutora = valor;
  if (chave === 'gerente') finFiltroGerente = valueOrEmpty(valor);
  if (chave === 'situacao') finFiltroSituacao = valor;
  if (chave === 'faixa') finFiltroFaixa = valor;
  syncFinState();
  renderFinanceiro();
}

function valueOrEmpty(valor) {
  return valor || '';
}

function finAnterior() {
  finMesAtual--;
  if (finMesAtual < 0) {
    finMesAtual = 11;
    finAnoAtual--;
  }
  syncFinState();
  renderFinanceiro();
}

function finProximo() {
  finMesAtual++;
  if (finMesAtual > 11) {
    finMesAtual = 0;
    finAnoAtual++;
  }
  syncFinState();
  renderFinanceiro();
}

function finHoje() {
  finMesAtual = new Date().getMonth();
  finAnoAtual = new Date().getFullYear();
  syncFinState();
  renderFinanceiro();
}

function renderFinanceiro() {
  if (!['dono','fin','dir'].includes(role)) {
    document.getElementById('financeiro-content').innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;"><div style="font-size:48px;">${zUiText('🔒')}</div><div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Acesso restrito')}</div><div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;">${zUiText('Apenas o Dono, Diretor e Financeiro têm acesso a este módulo.')}</div></div>`;
    return;
  }

  syncFinState();

  const meses = finMeses();
  const mes = finMesAtual;
  const ano = finAnoAtual;
  const hoje = new Date();
  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const unidades = finOpcoes(VENDAS.map(v => v.unidade));
  const construtoras = finOpcoes(VENDAS.map(v => v.construtora));
  const gerentes = finOpcoes(VENDAS.map(v => v.gerente));

  const atual = finColetarMes(mes, ano);
  const anteriorRef = finPeriodoComparado();
  const anterior = finColetarMes(anteriorRef.mes, anteriorRef.ano);

  const totalAtualBrut = atual.totalPrevistoBrut + atual.totalRecebidoBrut;
  const totalAtualLiq = atual.totalPrevistoLiq + atual.totalRecebidoLiq;
  const totalAnteriorBrut = anterior.totalPrevistoBrut + anterior.totalRecebidoBrut;

  const realizadoPct = totalAtualBrut > 0 ? (atual.totalRecebidoBrut / totalAtualBrut) * 100 : 0;
  const ticketMedio = atual.todos.length ? totalAtualBrut / atual.todos.length : 0;
  const deltaMes = finDelta(totalAtualBrut, totalAnteriorBrut);
  const deltaRecebido = finDelta(atual.totalRecebidoBrut, anterior.totalRecebidoBrut);

  const dataInicioRecorte = (mes === hoje.getMonth() && ano === hoje.getFullYear())
    ? new Date(ano, mes, hoje.getDate())
    : new Date(ano, mes, 1);
  const dataFim7 = new Date(dataInicioRecorte);
  dataFim7.setDate(dataFim7.getDate() + 7);

  const proximos7 = atual.previsoes
    .filter(item => item.dataRef >= dataInicioRecorte && item.dataRef <= dataFim7)
    .sort((a, b) => a.dataRef - b.dataRef || b.bruto - a.bruto)
    .slice(0, 5);

  const maioresMes = atual.todos
    .slice()
    .sort((a, b) => b.bruto - a.bruto)
    .slice(0, 5);

  const atrasosCriticos = atual.previsoes
    .filter(item => item.status === 'atrasada')
    .slice()
    .sort((a, b) => b.atraso - a.atraso || b.bruto - a.bruto)
    .slice(0, 5);

  let cells = '';
  for (let i = 0; i < primeiroDia; i++) cells += `<div class="fcal-cell fcal-empty"></div>`;

  for (let d = 1; d <= diasNoMes; d++) {
    const dataDia = new Date(ano, mes, d);
    const isHoje = d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
    const prevs = atual.previsoesPorDia[d] || [];
    const receb = atual.recebidas.filter(item => item.dia === d);
    const diaEventos = [...receb, ...prevs].sort((a, b) => {
      const prioridade = status => status === 'atrasada' ? 0 : status === 'recebida' ? 1 : 2;
      return prioridade(a.status) - prioridade(b.status) || b.bruto - a.bruto;
    });
    const visiveis = diaEventos.slice(0, 2);
    const extra = diaEventos.length - visiveis.length;
    const totalDiaBrut = diaEventos.reduce((s, item) => s + item.bruto, 0);

    cells += `<div class="fcal-cell${isHoje ? ' fcal-hoje' : ''}">
      <div class="fcal-headline">
        <div class="fcal-num${isHoje ? ' fcal-num-hoje' : ''}">${d}</div>
        ${totalDiaBrut > 0 ? `<div class="fcal-day-total">${fmtK(totalDiaBrut)}</div>` : ''}
      </div>
      <div class="fcal-events">
        ${visiveis.map(item => `<button class="fcal-ev ${item.status === 'recebida' ? 'fcal-ev-ok' : item.status === 'atrasada' ? 'fcal-ev-delay' : 'fcal-ev-soon'}" onclick="irParaVenda(${item.v.id})" title="${zUiText(item.v.cliente.split('/')[0].trim())}">
          <div class="fcal-ev-top">
            <span class="fcal-ev-status">${item.status === 'recebida' ? zUiText('Recebida') : item.status === 'atrasada' ? zUiText(`${item.atraso}d atraso`) : zUiText('Prevista')}</span>
            <strong>${fmtK(item.bruto)}</strong>
          </div>
          <div class="fcal-ev-name">${zUiText(nomeCalendario(item.v.cliente))}</div>
          <div class="fcal-ev-meta">${zUiText(item.v.construtora || 'Sem construtora')} · ${zUiText(item.v.gerente || 'Sem gerente')}</div>
        </button>`).join('')}
        ${extra > 0 ? `<div class="fcal-more">+${extra} ${zUiText('movimentações')}</div>` : ''}
      </div>
    </div>`;
  }

  const sideList = (titulo, subtitulo, itens, vazio) => `
    <div class="fcal-side-card">
      <div class="fcal-side-title">${titulo}</div>
      <div class="fcal-side-sub">${subtitulo}</div>
      <div class="fcal-side-list">
        ${itens.length ? itens.map(item => `<button class="fcal-side-item ${finClasseItem(item)}" onclick="irParaVenda(${item.v.id})">
          <div class="fcal-side-item-top">
            <strong>${zUiText(nomeCalendario(item.v.cliente))}</strong>
            <span>${fmtK(item.bruto)}</span>
          </div>
          <div class="fcal-side-item-meta">${zUiText(item.v.construtora || 'Sem construtora')} · ${zUiText(finStatusItem(item))}</div>
        </button>`).join('') : `<div class="fcal-empty-state">${vazio}</div>`}
      </div>
    </div>`;

  document.getElementById('financeiro-content').innerHTML = `
  <style>
    .fcal-wrap{display:flex;flex-direction:column;gap:14px;padding:16px;overflow-y:auto;background:linear-gradient(180deg,#FCFBF7 0%,#FAF7EF 100%);}
    .fcal-header{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;box-shadow:0 10px 24px rgba(184,144,42,0.06);}
    .fcal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--gold);}
    .fcal-title-wrap{display:flex;flex-direction:column;gap:4px;}
    .fcal-title-sub{font-size:11px;color:var(--tm);}
    .fcal-nav{display:flex;gap:8px;flex-wrap:wrap;}
    .fcal-nav button{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px;color:var(--ts);font-family:'Inter',sans-serif;}
    .fcal-nav button:hover{border-color:var(--gold);color:var(--gold);}
    .fcal-nav .today{background:var(--gold-bg);border-color:var(--gold-bd);color:var(--gold);}
    .fcal-filterbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-filter-group{display:flex;gap:8px;flex-wrap:wrap;flex:1;}
    .fcal-filter-group select{min-width:160px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--ts);outline:none;font-family:'Inter',sans-serif;}
    .fcal-filter-group select:focus{border-color:var(--gold-l);}
    .fcal-filter-meta{font-size:10px;color:var(--tm);}
    .fcal-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
    .fcal-kpi{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-kpi-l{font-size:9px;text-transform:uppercase;letter-spacing:0.09em;color:var(--tm);font-weight:700;margin-bottom:6px;}
    .fcal-kpi-v{font-size:20px;font-weight:700;font-family:'Playfair Display',serif;}
    .fcal-kpi-s{font-size:10px;color:var(--tm);margin-top:4px;line-height:1.45;}
    .fcal-kpi-s.good{color:#2E9E6E;}
    .fcal-kpi-s.bad{color:#C05030;}
    .fcal-board{display:grid;grid-template-columns:minmax(0,2.4fr) minmax(300px,0.95fr);gap:12px;align-items:start;}
    .fcal-calendar-card,.fcal-side-wrap{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-calendar-card{padding:12px;}
    .fcal-grid-header{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;}
    .fcal-dow{text-align:center;font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;padding:4px 0;}
    .fcal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
    .fcal-cell{background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);border:1px solid rgba(184,144,42,0.18);border-radius:10px;padding:8px;min-height:104px;display:flex;flex-direction:column;gap:8px;}
    .fcal-cell.fcal-empty{background:transparent;border-color:transparent;box-shadow:none;}
    .fcal-cell.fcal-hoje{border-color:var(--gold);box-shadow:0 0 0 1px rgba(184,144,42,0.2);}
    .fcal-headline{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .fcal-num{font-size:12px;font-weight:700;color:var(--tm);}
    .fcal-num-hoje{color:var(--gold);}
    .fcal-day-total{font-size:9px;font-weight:700;color:var(--gold);background:var(--gold-bg);padding:2px 6px;border-radius:999px;border:1px solid var(--gold-bd);}
    .fcal-events{display:flex;flex-direction:column;gap:6px;min-height:0;}
    .fcal-ev{background:#fff;border:1px solid rgba(184,144,42,0.16);border-left:3px solid transparent;border-radius:8px;padding:6px 7px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease;}
    .fcal-ev:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(184,144,42,0.08);}
    .fcal-ev-ok{background:#F1FAF4;border-left-color:#2E9E6E;}
    .fcal-ev-soon{background:#F1F6FE;border-left-color:#3060B8;}
    .fcal-ev-delay{background:#FEF3EE;border-left-color:#C05030;}
    .fcal-ev-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .fcal-ev-top strong{font-size:11px;color:var(--gold);}
    .fcal-ev-status{font-size:8px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:700;}
    .fcal-ev-name{font-size:10px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-ev-meta{font-size:9px;color:var(--tm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-more{font-size:9px;color:var(--tm);padding-top:2px;}
    .fcal-side-wrap{padding:12px;display:flex;flex-direction:column;gap:10px;}
    .fcal-side-card{border:1px solid rgba(184,144,42,0.16);border-radius:12px;padding:12px;background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);}
    .fcal-side-title{font-size:11px;text-transform:uppercase;letter-spacing:0.09em;color:var(--gold);font-weight:700;}
    .fcal-side-sub{font-size:10px;color:var(--tm);margin-top:4px;line-height:1.45;}
    .fcal-side-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .fcal-side-item{background:var(--bg2);border:1px solid rgba(184,144,42,0.14);border-left:3px solid transparent;border-radius:9px;padding:9px 10px;text-align:left;cursor:pointer;}
    .fcal-side-item.ok{border-left-color:#2E9E6E;background:#F1FAF4;}
    .fcal-side-item.soon{border-left-color:#3060B8;background:#F1F6FE;}
    .fcal-side-item.delay{border-left-color:#C05030;background:#FEF3EE;}
    .fcal-side-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .fcal-side-item-top strong{font-size:11px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-side-item-top span{font-size:10px;font-weight:700;color:var(--gold);white-space:nowrap;}
    .fcal-side-item-meta{font-size:9px;color:var(--tm);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-empty-state{font-size:10px;color:var(--tm);padding:6px 0 2px;}
    .fcal-legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:10px;color:var(--tm);padding-top:2px;}
    .fcal-leg-dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:4px;}
    @media (max-width:1360px){
      .fcal-kpis{grid-template-columns:repeat(3,minmax(0,1fr));}
      .fcal-board{grid-template-columns:1fr;}
    }
    @media (max-width:980px){
      .fcal-filter-group{grid-template-columns:1fr;}
      .fcal-grid{grid-template-columns:repeat(2,1fr);}
      .fcal-grid-header{display:none;}
    }
  </style>
  <div class="fcal-wrap">
    <div class="fcal-header">
      <div class="fcal-title-wrap">
        <div class="fcal-title">${zUiText('📅')} ${zUiText(meses[mes])} ${ano}</div>
        <div class="fcal-title-sub">${zUiText('Previsão de recebimento de comissões com leitura executiva do mês')}</div>
      </div>
      <div class="fcal-nav">
        <button onclick="finAnterior()">${zUiText('← Anterior')}</button>
        <button class="today" onclick="finHoje()">${zUiText('Hoje')}</button>
        <button onclick="finProximo()">${zUiText('Próximo →')}</button>
      </div>
    </div>

    <div class="fcal-filterbar">
      <div class="fcal-filter-group">
        <select onchange="finSetFiltro('unidade', this.value)">
          <option value="">${zUiText('Todas as unidades')}</option>
          ${unidades.map(item => `<option value="${item}" ${finFiltroUnidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
        </select>
        <select onchange="finSetFiltro('construtora', this.value)">
          <option value="">${zUiText('Todas as construtoras')}</option>
          ${construtoras.map(item => `<option value="${item}" ${finFiltroConstrutora === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
        </select>
        <select onchange="finSetFiltro('gerente', this.value)">
          <option value="">${zUiText('Todos os gerentes')}</option>
          ${gerentes.map(item => `<option value="${item}" ${finFiltroGerente === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
        </select>
        <select onchange="finSetFiltro('situacao', this.value)">
          <option value="">${zUiText('Todas as situações')}</option>
          <option value="recebida" ${finFiltroSituacao === 'recebida' ? 'selected' : ''}>${zUiText('Recebidas')}</option>
          <option value="prazo" ${finFiltroSituacao === 'prazo' ? 'selected' : ''}>${zUiText('Previstas no prazo')}</option>
          <option value="atrasada" ${finFiltroSituacao === 'atrasada' ? 'selected' : ''}>${zUiText('Previstas com atraso')}</option>
        </select>
        <select onchange="finSetFiltro('faixa', this.value)">
          <option value="">${zUiText('Todas as faixas')}</option>
          <option value="ate5" ${finFiltroFaixa === 'ate5' ? 'selected' : ''}>${zUiText('Até R$ 5k')}</option>
          <option value="5a10" ${finFiltroFaixa === '5a10' ? 'selected' : ''}>${zUiText('R$ 5k a R$ 10k')}</option>
          <option value="10a20" ${finFiltroFaixa === '10a20' ? 'selected' : ''}>${zUiText('R$ 10k a R$ 20k')}</option>
          <option value="20mais" ${finFiltroFaixa === '20mais' ? 'selected' : ''}>${zUiText('Acima de R$ 20k')}</option>
        </select>
      </div>
      <div class="fcal-filter-meta">${zUiText(`${atual.todos.length} movimentações no recorte`)}</div>
    </div>

    <div class="fcal-kpis">
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('Previsto no mês')}</div>
        <div class="fcal-kpi-v" style="color:var(--gold);">${fmt(atual.totalPrevistoBrut)}</div>
        <div class="fcal-kpi-s good">${zUiText(`Líquido: ${fmt(atual.totalPrevistoLiq)}`)}</div>
        <div class="fcal-kpi-s">${zUiText(`${atual.previsoes.length} movimentações projetadas`)}</div>
      </div>
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('Já recebido')}</div>
        <div class="fcal-kpi-v" style="color:#2E9E6E;">${fmt(atual.totalRecebidoBrut)}</div>
        <div class="fcal-kpi-s good">${zUiText(`Líquido: ${fmt(atual.totalRecebidoLiq)}`)}</div>
        <div class="fcal-kpi-s">${zUiText(`${atual.recebidas.length} vendas concluídas`)}</div>
      </div>
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('Total do mês')}</div>
        <div class="fcal-kpi-v" style="color:#3060B8;">${fmt(totalAtualBrut)}</div>
        <div class="fcal-kpi-s">${zUiText(`Líquido: ${fmt(totalAtualLiq)}`)}</div>
        <div class="fcal-kpi-s">${zUiText('Previsto + recebido')}</div>
      </div>
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('Vs mês anterior')}</div>
        <div class="fcal-kpi-v" style="color:${deltaMes.delta >= 0 ? '#2E9E6E' : '#C05030'};">${finFmtDelta(deltaMes)}</div>
        <div class="fcal-kpi-s ${deltaMes.delta >= 0 ? 'good' : 'bad'}">${zUiText(`${zUiText(meses[mes])} vs ${zUiText(meses[anteriorRef.mes])} • ${finFmtDeltaPct(deltaMes)}`)}</div>
      </div>
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('% realizado')}</div>
        <div class="fcal-kpi-v" style="color:#2E9E6E;">${realizadoPct.toFixed(1).replace('.', ',')}%</div>
        <div class="fcal-kpi-s">${zUiText(`${fmt(atual.totalRecebidoBrut)} de ${fmt(totalAtualBrut)}`)}</div>
      </div>
      <div class="fcal-kpi">
        <div class="fcal-kpi-l">${zUiText('Ticket médio')}</div>
        <div class="fcal-kpi-v">${fmt(ticketMedio)}</div>
        <div class="fcal-kpi-s">${zUiText(`Recebido vs mês anterior: ${finFmtDelta(deltaRecebido)} • ${finFmtDeltaPct(deltaRecebido)}`)}</div>
      </div>
    </div>

    <div class="fcal-board">
      <div class="fcal-calendar-card">
        <div class="fcal-grid-header">${diasSemana.map(item => `<div class="fcal-dow">${zUiText(item)}</div>`).join('')}</div>
        <div class="fcal-grid">${cells}</div>
        <div class="fcal-legend">
          <span><span class="fcal-leg-dot" style="background:#F1FAF4;border-left:2px solid #2E9E6E;"></span>${zUiText('Comissão recebida')}</span>
          <span><span class="fcal-leg-dot" style="background:#F1F6FE;border-left:2px solid #3060B8;"></span>${zUiText('Previsão no prazo')}</span>
          <span><span class="fcal-leg-dot" style="background:#FEF3EE;border-left:2px solid #C05030;"></span>${zUiText('Previsão com atraso')}</span>
        </div>
      </div>

      <div class="fcal-side-wrap">
        ${sideList(
          zUiText('Próximos 7 dias'),
          zUiText('O que tende a cair no curtíssimo prazo dentro do recorte selecionado.'),
          proximos7,
          zUiText('Nenhuma movimentação prevista para os próximos 7 dias.')
        )}
        ${sideList(
          zUiText('Maiores recebimentos do mês'),
          zUiText('Os maiores valores, recebidos ou previstos, para leitura rápida da carteira.'),
          maioresMes,
          zUiText('Nenhum recebimento no recorte.')
        )}
        ${sideList(
          zUiText('Atrasos críticos'),
          zUiText('Casos que pedem atenção imediata por atraso acumulado.'),
          atrasosCriticos,
          zUiText('Nenhuma previsão atrasada neste recorte.')
        )}
      </div>
    </div>
  </div>`;
}

zRegisterModule('financeiro', {
  renderFinanceiro
});
