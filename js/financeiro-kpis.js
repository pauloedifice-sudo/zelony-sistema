// FINANCEIRO - parte 2/4: deltas/KPIs, detalhe do dia, saldo bancario, cards laterais e calendario
function finDelta(atual, anterior) {
  const delta = atual - anterior;
  const pct = anterior > 0 ? (delta / anterior) * 100 : (atual > 0 ? 100 : 0);
  return { delta, pct };
}

function finFmtDelta(info) {
  if (!info.delta) return zUiText('Estavel');
  return info.delta > 0 ? `+${finFmtMoeda(info.delta)}` : `-${finFmtMoeda(Math.abs(info.delta))}`;
}

function finFmtDeltaPct(info) {
  if (!Number.isFinite(info.pct) || info.delta === 0) return zUiText('sem variacao');
  const sinal = info.pct > 0 ? '+' : '';
  return `${sinal}${info.pct.toFixed(1).replace('.', ',')}%`;
}

function finClasseItem(item) {
  if (item.natureza === 'saida') {
    if (item.status === 'realizado') return 'paid';
    if (item.status === 'atrasado') return 'out-delay';
    return 'out';
  }
  if (item.status === 'realizado') return 'ok';
  if (item.status === 'atrasado') return 'delay';
  if (item.manualNota) return 'invoice';
  return 'soon';
}

function finPrioridadeItem(item) {
  const classe = finClasseItem(item);
  if (classe === 'out-delay') return 0;
  if (classe === 'delay') return 1;
  if (classe === 'out') return 2;
  if (classe === 'invoice') return 3;
  if (classe === 'paid') return 4;
  if (classe === 'ok') return 5;
  return 6;
}

function finStatusItem(item, contexto = 'lista') {
  if (item.status === 'realizado') return item.natureza === 'saida' ? zUiText('Paga') : zUiText('Recebida');
  if (item.status === 'atrasado') {
    return item.natureza === 'saida'
      ? zUiText(`${item.atraso}d vencida`)
      : zUiText(`${item.atraso}d atraso${item.manualNota ? ' · programada' : ''}`);
  }
  if (item.natureza === 'saida') return zUiText(contexto === 'calendario' ? 'Prevista' : 'A vencer');
  if (item.manualNota) return zUiText('Programada');
  return zUiText(contexto === 'calendario' ? 'Prevista' : 'No prazo');
}

function finMetaItem(item, opcoes = {}) {
  const config = opcoes || {};
  const includeStatus = config.includeStatus !== false;
  const includeProof = config.includeProof !== false;
  const partes = [];
  if (item.categoria) partes.push(item.categoria);
  if (item.historicoAutomatico) partes.push('historico automatico');
  if (item.unidade) partes.push(item.unidade);
  if (includeStatus) partes.push(finStatusItem(item));
  if (includeProof && finTemComprovante(item)) partes.push(item.natureza === 'saida' ? 'comprovante anexado' : 'anexo');
  return zUiText(partes.filter(Boolean).join(' · '));
}

function finTemComprovante(item) {
  const atual = finResolverComprovanteSalvo(item);
  return !!(atual && ((atual.storageBucket && atual.storagePath) || atual.dataUrl || atual.localId));
}

function finPodeBaixaRapida(item) {
  return !!(item && item.raw && item.status !== 'realizado');
}

function finRotuloBaixaRapida(item) {
  return item && item.natureza === 'saida' ? 'Dar como pago' : 'Dar como recebido';
}

function finLegendaAtual() {
  if (finVisao === 'saidas') {
    return [
      { classe: 'paid', label: 'Pagamento realizado' },
      { classe: 'out', label: 'Saida prevista' },
      { classe: 'out-delay', label: 'Saida vencida' }
    ];
  }
  if (finVisao === 'entradas') {
    return [
      { classe: 'ok', label: 'Recebimento realizado' },
      { classe: 'soon', label: 'Entrada prevista' },
      { classe: 'invoice', label: 'Entrada programada' },
      { classe: 'delay', label: 'Entrada com atraso' }
    ];
  }
  return [
    { classe: 'ok', label: 'Entrada recebida' },
    { classe: 'soon', label: 'Entrada prevista' },
    { classe: 'invoice', label: 'Entrada programada' },
    { classe: 'out', label: 'Saida prevista' },
    { classe: 'out-delay', label: 'Saida vencida' }
  ];
}

function finLegendaStyle(classe) {
  if (classe === 'ok') return 'background:#EBF8F1;border-left:2px solid #15803D;';
  if (classe === 'soon') return 'background:#EEF5FF;border-left:2px solid #7DB3FF;';
  if (classe === 'invoice') return 'background:#E7F0FF;border-left:2px solid #1D4ED8;';
  if (classe === 'delay') return 'background:#FFF4E5;border-left:2px solid #D97706;';
  if (classe === 'paid') return 'background:#EFF8F0;border-left:2px solid #2F8F5B;';
  if (classe === 'out-delay') return 'background:#FAD9D5;border-left:2px solid #B42318;';
  return 'background:#FFF0EE;border-left:2px solid #D65145;';
}

function finPeriodoComparado() {
  if (finMesAtual === 0) return { mes: 11, ano: finAnoAtual - 1 };
  return { mes: finMesAtual - 1, ano: finAnoAtual };
}

function finItensDoDia(coleta, dia) {
  const lista = coleta.agendaPorDia[dia] || [];
  const filtrada = finVisao === 'entradas'
    ? lista.filter(item => item.natureza === 'entrada')
    : finVisao === 'saidas'
      ? lista.filter(item => item.natureza === 'saida')
      : lista.slice();
  return filtrada.sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || b.valorBruto - a.valorBruto);
}

function finResetDetalheDiaState() {
  finDiaDetalheAberto = false;
  finDiaDetalheAtual = 0;
}

function finAbrirDetalheDia(dia) {
  const numero = parseInt(dia, 10) || 0;
  if (!numero) return;
  if (finDiaDetalheAberto && finDiaDetalheAtual === numero) {
    finResetDetalheDiaState();
    renderFinanceiro();
    return;
  }
  const atual = finColetarMes(finMesAtual, finAnoAtual);
  const itens = finItensDoDia(atual, numero);
  if (!itens.length) return;
  finDiaDetalheAberto = true;
  finDiaDetalheAtual = numero;
  renderFinanceiro();
}

function finFecharDetalheDia() {
  finResetDetalheDiaState();
  renderFinanceiro();
}

function finHandleBackdropDetalheDia(event) {
  if (event.target === document.getElementById('m-fin-dia')) finFecharDetalheDia();
}

function finValorTotalDia(itens) {
  if (finVisao === 'geral') {
    return itens.reduce((soma, item) => soma + (item.natureza === 'saida' ? -item.valorBruto : item.valorBruto), 0);
  }
  return itens.reduce((soma, item) => soma + item.valorBruto, 0);
}

function finResumoCard(label, valor, subtitulo, cor, classeSub = '', tom = 'neutral') {
  return `
    <div class="fcal-kpi tone-${finEscapeAttr(tom)}">
      <div class="fcal-kpi-l">${zUiText(label)}</div>
      <div class="fcal-kpi-v" style="color:${cor};">${valor}</div>
      <div class="fcal-kpi-s ${classeSub}">${zUiText(subtitulo)}</div>
    </div>`;
}

function finBuildKpis(atual, anterior, anteriorRef, meses) {
  return finBuildKpisPainel(atual, anterior, anteriorRef, meses);
  if (finVisao === 'saidas') {
    const totalAtual = atual.saidas.totalPrevisto + atual.saidas.totalRealizado;
    const totalAnterior = anterior.saidas.totalPrevisto + anterior.saidas.totalRealizado;
    const deltaMes = finDelta(totalAtual, totalAnterior);
    const realizadoPct = totalAtual > 0 ? (atual.saidas.totalRealizado / totalAtual) * 100 : 0;
    const maiorSaida = atual.saidas.todos.length ? atual.saidas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto)[0].valorBruto : 0;
    return [
      finResumoCard('A vencer', finFmtMoeda(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} lancamentos previstos`, '#C05030', '', 'outflow'),
      finResumoCard('Ja pagas', finFmtMoeda(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
      finResumoCard('Total do mes', finFmtMoeda(totalAtual), 'Previsto + pago', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#C05030' : '#2E9E6E', deltaMes.delta >= 0 ? 'bad' : 'good'),
      finResumoCard('% pago', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${finFmtMoeda(atual.saidas.totalRealizado)} de ${finFmtMoeda(totalAtual)}`, '#7A5A00', '', 'progress'),
      finResumoCard('Maior saida', finFmtMoeda(maiorSaida), 'Maior valor projetado ou pago no periodo', '#8B6C1A', '', 'neutral')
    ].join('');
  }

  if (finVisao === 'entradas') {
    const totalAtual = atual.entradas.totalPrevisto + atual.entradas.totalRealizado;
    const totalAnterior = anterior.entradas.totalPrevisto + anterior.entradas.totalRealizado;
    const deltaMes = finDelta(totalAtual, totalAnterior);
    const realizadoPct = totalAtual > 0 ? (atual.entradas.totalRealizado / totalAtual) * 100 : 0;
    const totalManuais = atual.manuais.entradas.totalPrevisto + atual.manuais.entradas.totalRealizado;
    const qtdManuais = atual.manuais.entradas.todos.length;
    return [
      finResumoCard('Previsto no mes', finFmtMoeda(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)'),
      finResumoCard('Ja recebido', finFmtMoeda(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas realizadas`, '#2E9E6E', 'good'),
      finResumoCard('Total do mes', finFmtMoeda(totalAtual), 'Entradas previstas + recebidas, incluindo historico', '#3060B8'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#2E9E6E' : '#C05030', deltaMes.delta >= 0 ? 'good' : 'bad'),
      finResumoCard('% realizado', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${finFmtMoeda(atual.entradas.totalRealizado)} de ${finFmtMoeda(totalAtual)}`, '#2E9E6E', 'good'),
      finResumoCard('Manuais do mes', finFmtMoeda(totalManuais), `${qtdManuais} entradas manuais no recorte`, '#8B6C1A')
    ].join('');
  }

  const entradasTotal = atual.entradas.totalPrevisto + atual.entradas.totalRealizado;
  const saidasTotal = atual.saidas.totalPrevisto + atual.saidas.totalRealizado;
  const saldoTotal = entradasTotal - saidasTotal;
  const saldoRealizado = atual.entradas.totalRealizado - atual.saidas.totalRealizado;
  const saldoAnterior = (anterior.entradas.totalPrevisto + anterior.entradas.totalRealizado) - (anterior.saidas.totalPrevisto + anterior.saidas.totalRealizado);
  const deltaSaldo = finDelta(saldoTotal, saldoAnterior);
  const qtdManuais = atual.manuais.entradas.todos.length + atual.manuais.saidas.todos.length;

  return [
    finResumoCard('Entradas previstas', finFmtMoeda(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)'),
    finResumoCard('Entradas realizadas', finFmtMoeda(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas recebidas`, '#2E9E6E', 'good'),
    finResumoCard('Saidas previstas', finFmtMoeda(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} saidas previstas`, '#C05030', 'bad'),
    finResumoCard('Saidas pagas', finFmtMoeda(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00'),
    finResumoCard('Saldo liquido', finFmtAssinado(saldoTotal), `Realizado: ${finFmtAssinado(saldoRealizado)}`, saldoTotal >= 0 ? '#2E9E6E' : '#C05030', saldoTotal >= 0 ? 'good' : 'bad'),
    finResumoCard('Vs mes anterior', finFmtDelta(deltaSaldo), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaSaldo)} • ${qtdManuais} manuais`, deltaSaldo.delta >= 0 ? '#2E9E6E' : '#C05030', deltaSaldo.delta >= 0 ? 'good' : 'bad')
  ].join('');
}

function finBuildKpisPainel(atual, anterior, anteriorRef, meses) {
  if (finVisao === 'saidas') {
    const totalAtual = atual.saidas.totalPrevisto + atual.saidas.totalRealizado;
    const totalAnterior = anterior.saidas.totalPrevisto + anterior.saidas.totalRealizado;
    const deltaMes = finDelta(totalAtual, totalAnterior);
    const realizadoPct = totalAtual > 0 ? (atual.saidas.totalRealizado / totalAtual) * 100 : 0;
    const maiorSaida = atual.saidas.todos.length ? atual.saidas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto)[0].valorBruto : 0;
    return [
      finResumoCard('A vencer', finFmtMoeda(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} lancamentos previstos`, '#C05030', '', 'outflow'),
      finResumoCard('Ja pagas', finFmtMoeda(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
      finResumoCard('Total do mes', finFmtMoeda(totalAtual), 'Previsto + pago', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#C05030' : '#2E9E6E', deltaMes.delta >= 0 ? 'bad' : 'good', 'compare'),
      finResumoCard('% pago', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${finFmtMoeda(atual.saidas.totalRealizado)} de ${finFmtMoeda(totalAtual)}`, '#7A5A00', '', 'progress'),
      finResumoCard('Maior saida', finFmtMoeda(maiorSaida), 'Maior valor projetado ou pago no periodo', '#8B6C1A', '', 'neutral')
    ].join('');
  }

  if (finVisao === 'entradas') {
    const totalAtual = atual.entradas.totalPrevisto + atual.entradas.totalRealizado;
    const totalAnterior = anterior.entradas.totalPrevisto + anterior.entradas.totalRealizado;
    const deltaMes = finDelta(totalAtual, totalAnterior);
    const realizadoPct = totalAtual > 0 ? (atual.entradas.totalRealizado / totalAtual) * 100 : 0;
    const totalManuais = atual.manuais.entradas.totalPrevisto + atual.manuais.entradas.totalRealizado;
    const qtdManuais = atual.manuais.entradas.todos.length;
    return [
      finResumoCard('Previsto no mes', finFmtMoeda(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)', '', 'projected'),
      finResumoCard('Ja recebido', finFmtMoeda(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas realizadas`, '#2E9E6E', 'good', 'realized'),
      finResumoCard('Total do mes', finFmtMoeda(totalAtual), 'Entradas previstas + recebidas, incluindo historico', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#2E9E6E' : '#C05030', deltaMes.delta >= 0 ? 'good' : 'bad', 'compare'),
      finResumoCard('% realizado', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${finFmtMoeda(atual.entradas.totalRealizado)} de ${finFmtMoeda(totalAtual)}`, '#2E9E6E', 'good', 'progress'),
      finResumoCard('Manuais do mes', finFmtMoeda(totalManuais), `${qtdManuais} entradas manuais no recorte`, '#8B6C1A', '', 'neutral')
    ].join('');
  }

  const saldoEmConta = atual.entradas.totalRealizado - atual.saidas.totalRealizado;
  const saldoAnterior = anterior.entradas.totalRealizado - anterior.saidas.totalRealizado;
  const deltaSaldo = finDelta(saldoEmConta, saldoAnterior);
  const qtdManuais = atual.manuais.entradas.todos.length + atual.manuais.saidas.todos.length;

  return [
    finResumoCard('Entradas previstas', finFmtMoeda(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)', '', 'projected'),
    finResumoCard('Entradas realizadas', finFmtMoeda(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas recebidas`, '#2E9E6E', 'good', 'realized'),
    finResumoCard('Saidas previstas', finFmtMoeda(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} saidas previstas`, '#C05030', 'bad', 'outflow'),
    finResumoCard('Saidas pagas', finFmtMoeda(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
    finResumoCard('Movimento liquido', finFmtAssinado(saldoEmConta), 'Entradas recebidas - saidas pagas no mes', saldoEmConta >= 0 ? '#2E9E6E' : '#C05030', saldoEmConta >= 0 ? 'good' : 'bad', 'balance'),
    finResumoCard('Vs mes anterior', finFmtDelta(deltaSaldo), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaSaldo)} • ${qtdManuais} manuais`, deltaSaldo.delta >= 0 ? '#2E9E6E' : '#C05030', deltaSaldo.delta >= 0 ? 'good' : 'bad', 'compare')
  ].join('');
}

function finFmtDataCurta(dataOuIso) {
  const data = dataOuIso instanceof Date ? dataOuIso : finDataIsoParaDate(dataOuIso);
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR');
}

function finBuildConciliacaoBancaria(conciliacao) {
  if (!conciliacao) return '';
  const saldoBase = conciliacao.saldoBase || conciliacao.saldoAnterior;
  const temBase = !!saldoBase;
  const temBanco = !!conciliacao.saldoBancario;
  const bancoAtualizado = !!conciliacao.saldoBancarioAtualizado;
  const temDiferenca = conciliacao.diferenca != null;
  let statusClasse = 'pending';
  let statusTexto = 'Aguardando saldo bancario';
  if (!temBase) {
    statusClasse = 'setup';
    statusTexto = 'Cadastre o saldo anterior para iniciar';
  } else if (temDiferenca && conciliacao.conciliado) {
    statusClasse = 'ok';
    statusTexto = 'Conciliado';
  } else if (temDiferenca) {
    statusClasse = 'warn';
    statusTexto = `Diferenca de ${finFmtAssinado(conciliacao.diferenca)}`;
  } else if (temBanco) {
    statusTexto = 'Saldo bancario desatualizado';
  }

  const referenciaTexto = finFmtDataCurta(conciliacao.dataReferencia);
  const baseTexto = temBase ? `Informado em ${finFmtDataCurta(saldoBase.dataReferencia)}` : 'Nenhum saldo-base anterior';
  const movimentoTexto = temBase
    ? `Realizado no mes ate ${referenciaTexto}`
    : 'Disponivel apos informar o saldo anterior';
  const bancoTexto = temBanco
    ? `Informado em ${finFmtDataCurta(conciliacao.saldoBancario.dataReferencia)}`
    : `Informe o saldo de ${referenciaTexto}`;
  const diferencaTexto = temDiferenca
    ? (conciliacao.conciliado
      ? 'Sistema e banco estao conciliados'
      : 'Saldo bancario - saldo esperado')
    : (bancoAtualizado ? 'Informe os dois saldos para comparar' : 'Atualize o saldo bancario de hoje para comparar');

  const metrica = (rotulo, valor, detalhe, classe = '') => `
    <div class="fin-recon-metric ${classe}">
      <div class="fin-recon-label">${zUiText(rotulo)}</div>
      <div class="fin-recon-value">${valor}</div>
      <div class="fin-recon-detail">${zUiText(detalhe)}</div>
    </div>`;

  return `
    <section class="fin-recon-card" aria-label="${finEscapeAttr(zUiText('Conciliacao bancaria'))}">
      <div class="fin-recon-head">
        <div class="fin-recon-title-wrap">
          <div class="fin-recon-kicker">${zUiText('CONCILIACAO BANCARIA')}</div>
          <div class="fin-recon-title">${zUiText('Saldo da conta x saldo do sistema')}</div>
          <div class="fin-recon-copy">${zUiText('O fechamento anterior ao mes vira a base; todas as entradas recebidas somam e todas as saidas pagas no mes subtraem do saldo esperado.')}</div>
        </div>
        <div class="fin-recon-actions">
          <span class="fin-recon-status ${statusClasse}">${zUiText(statusTexto)}</span>
          ${!temBase ? `<button class="fin-recon-secondary" type="button" onclick="finAbrirModalSaldoBancario('anterior')">${zUiText('Cadastrar saldo anterior')}</button>` : ''}
          <button class="fin-recon-primary" type="button" onclick="finAbrirModalSaldoBancario('atual')">${zUiText(temBanco ? 'Atualizar saldo bancario' : 'Informar saldo bancario')}</button>
        </div>
      </div>
      <div class="fin-recon-grid">
        ${metrica('Saldo-base do mes', temBase ? finFmtMoeda(saldoBase.saldo) : '—', baseTexto, temBase ? '' : 'muted')}
        ${metrica('Movimento realizado', temBase ? finFmtAssinado(conciliacao.movimentoSistema) : '—', movimentoTexto)}
        ${metrica('Saldo esperado hoje', conciliacao.saldoSistema != null ? finFmtMoeda(conciliacao.saldoSistema) : '—', 'Saldo-base + entradas recebidas - saidas pagas', 'system')}
        ${metrica('Saldo bancario informado', temBanco ? finFmtMoeda(conciliacao.saldoBancario.saldo) : '—', bancoTexto, 'bank')}
        ${metrica('Diferenca', temDiferenca ? finFmtAssinado(conciliacao.diferenca) : '—', diferencaTexto, temDiferenca ? (conciliacao.conciliado ? 'matched' : 'difference') : 'muted')}
      </div>
    </section>`;
}

function finSaldoBancarioPorData(dataReferencia) {
  const data = String(dataReferencia || '').slice(0, 10);
  return finSaldosBancariosRegistrados().find(item => item.conta === 'CONTA PRINCIPAL' && item.dataReferencia === data) || null;
}

function finDataSaldoAnteriorPadrao() {
  return finDateParaIso(new Date(finAnoAtual, finMesAtual, 0, 12, 0, 0, 0));
}

function finAbrirModalSaldoBancario(modo = 'atual') {
  const conciliacao = finConciliacaoMes(finMesAtual, finAnoAtual);
  finSaldoModalData = modo === 'anterior'
    ? finDataSaldoAnteriorPadrao()
    : (conciliacao.saldoBancario ? conciliacao.saldoBancario.dataReferencia : finDateParaIso(conciliacao.dataPainel));
  finSaldoModalAberto = true;
  renderFinanceiro();
}

function finFecharModalSaldoBancario() {
  if (finSaldoSalvando) return;
  finSaldoModalAberto = false;
  finSaldoModalData = '';
  renderFinanceiro();
}

function finHandleBackdropSaldoBancario(event) {
  if (event.target === document.getElementById('m-fin-saldo')) finFecharModalSaldoBancario();
}

function finCarregarSaldoModalPorData(dataReferencia) {
  finSaldoModalData = String(dataReferencia || '').slice(0, 10);
  renderFinanceiro();
}

function finSetSaldoLoading(ativo) {
  finSaldoSalvando = !!ativo;
  const salvarEl = document.getElementById('fin-saldo-save-btn');
  const excluirEl = document.getElementById('fin-saldo-excluir-btn');
  const cancelarEl = document.getElementById('fin-saldo-cancel-btn');
  if (salvarEl) {
    salvarEl.disabled = finSaldoSalvando;
    salvarEl.textContent = zUiText(finSaldoSalvando ? 'Salvando...' : 'Salvar saldo bancario');
  }
  if (excluirEl) excluirEl.disabled = finSaldoSalvando;
  if (cancelarEl) cancelarEl.disabled = finSaldoSalvando;
}

async function finSalvarSaldoBancario() {
  if (finSaldoSalvando) return;
  if (typeof appPodePersistirNoSupabase === 'function' && !appPodePersistirNoSupabase({ mensagem: 'Sem conexao com o Supabase. A conciliacao esta em modo consulta.' })) return;
  const dataEl = document.getElementById('fin-saldo-data');
  const valorEl = document.getElementById('fin-saldo-valor');
  const observacaoEl = document.getElementById('fin-saldo-observacao');
  const dataReferencia = String(dataEl && dataEl.value || '').slice(0, 10);
  const valorBruto = String(valorEl && valorEl.value || '').trim();
  const saldo = Number(finNormalizarTextoValor(valorBruto));
  if (!finDataValidaIso(dataReferencia)) { showToast('⚠️', zUiText('Informe a data do saldo bancario.')); return; }
  if (!valorBruto || !Number.isFinite(saldo)) { showToast('⚠️', zUiText('Informe um saldo bancario valido.')); return; }

  const existente = finSaldoBancarioPorData(dataReferencia);
  const agoraIso = new Date().toISOString();
  const registro = {
    id: existente ? existente.id : 0,
    conta: 'CONTA PRINCIPAL',
    dataReferencia,
    saldo,
    observacao: finTextoMaiusculo(observacaoEl && observacaoEl.value),
    criadoPor: existente ? existente.criadoPor : (usuarioLogado ? usuarioLogado.nome || '' : 'Sistema'),
    criadoPorId: existente ? existente.criadoPorId : (usuarioLogado ? parseInt(usuarioLogado.id, 10) || 0 : 0),
    criadoPorEmail: existente ? existente.criadoPorEmail : (usuarioLogado ? usuarioLogado.email || '' : ''),
    atualizadoEm: agoraIso
  };

  finSetSaldoLoading(true);
  try {
    const salvo = typeof dbSalvarSaldoBancario === 'function' ? await dbSalvarSaldoBancario(registro) : registro;
    const indice = FINANCEIRO_SALDOS_BANCARIOS.findIndex(item => {
      const atual = typeof mapSaldoBancarioIn === 'function' ? mapSaldoBancarioIn(item) : item;
      return atual && atual.conta === salvo.conta && atual.dataReferencia === salvo.dataReferencia;
    });
    if (indice >= 0) FINANCEIRO_SALDOS_BANCARIOS.splice(indice, 1, salvo);
    else FINANCEIRO_SALDOS_BANCARIOS.push(salvo);
    FINANCEIRO_SALDOS_BANCARIOS.sort((a, b) => String(a.dataReferencia || '').localeCompare(String(b.dataReferencia || '')));
    zSetState('state.data.financeiroSaldosBancarios', FINANCEIRO_SALDOS_BANCARIOS);
    if (typeof salvarLS === 'function') salvarLS();
    finSaldoModalAberto = false;
    finSaldoModalData = '';
    showToast('✅', zUiText('Saldo bancario salvo. A conciliacao foi recalculada.'));
    renderFinanceiro();
  } catch (erro) {
    console.warn('Falha ao salvar saldo bancario:', erro);
    showToast('⚠️', zUiText('Nao foi possivel salvar o saldo bancario no Supabase.'));
  } finally {
    finSetSaldoLoading(false);
  }
}

async function finExcluirSaldoBancarioAtual() {
  if (finSaldoSalvando) return;
  const dataEl = document.getElementById('fin-saldo-data');
  const registro = finSaldoBancarioPorData(dataEl && dataEl.value);
  if (!registro) return;
  if (!confirm(zUiText(`Excluir o saldo bancario de ${finFmtDataCurta(registro.dataReferencia)}?`))) return;
  finSetSaldoLoading(true);
  try {
    if (typeof dbExcluirSaldoBancario === 'function') await dbExcluirSaldoBancario(registro);
    const indice = FINANCEIRO_SALDOS_BANCARIOS.findIndex(item => {
      const atual = typeof mapSaldoBancarioIn === 'function' ? mapSaldoBancarioIn(item) : item;
      return atual && atual.conta === registro.conta && atual.dataReferencia === registro.dataReferencia;
    });
    if (indice >= 0) FINANCEIRO_SALDOS_BANCARIOS.splice(indice, 1);
    zSetState('state.data.financeiroSaldosBancarios', FINANCEIRO_SALDOS_BANCARIOS);
    if (typeof salvarLS === 'function') salvarLS();
    finSaldoModalAberto = false;
    finSaldoModalData = '';
    showToast('✅', zUiText('Saldo bancario removido.'));
    renderFinanceiro();
  } catch (erro) {
    console.warn('Falha ao excluir saldo bancario:', erro);
    showToast('⚠️', zUiText('Nao foi possivel excluir o saldo bancario.'));
  } finally {
    finSetSaldoLoading(false);
  }
}

function finSideList(titulo, subtitulo, itens, vazio) {
  return `
    <div class="fcal-side-card">
      <div class="fcal-side-title">${zUiText(titulo)}</div>
      <div class="fcal-side-sub">${zUiText(subtitulo)}</div>
      <div class="fcal-side-list">
        ${itens.length ? itens.map(item => finSideItem(item)).join('') : `<div class="fcal-empty-state">${zUiText(vazio)}</div>`}
      </div>
    </div>`;
}

function finAcaoItem(item) {
  return finAcaoItemComOpcao(item, false);
}

function finAcaoItemComOpcao(item, pararEvento = false) {
  if (!item) return '';
  const prefixo = pararEvento ? 'event.stopPropagation();' : '';
  if (item.origem === 'venda') return `onclick="${prefixo}irParaVenda(${Number(item.v.id)})"`;
  const chave = finEscapeAttr(finChaveItem(item));
  return `onclick="${prefixo}finEditarLancamentoManual('${chave}')"`; 
}

function finNomeItem(item) {
  return item.descricao || item.categoria || (item.natureza === 'saida' ? 'SAIDA MANUAL' : 'ENTRADA MANUAL');
}

function finSideItem(item) {
  return `<div class="fcal-side-item-wrap">
    <button class="fcal-side-item ${finClasseItem(item)}" ${finAcaoItem(item)}>
      <div class="fcal-side-item-top">
        <strong>${zUiText(finNomeItem(item))}</strong>
        <span>${item.natureza === 'saida' ? `-${finFmtMoeda(item.valorBruto)}` : finFmtMoeda(item.valorBruto)}</span>
      </div>
      <div class="fcal-side-item-meta">${finMetaItem(item)}</div>
    </button>
    ${finAcoesSecundariasItem(item)}
  </div>`;
}

function finTituloDetalheDia(dia) {
  if (finVisao === 'saidas') return `Saidas do dia ${dia}`;
  if (finVisao === 'entradas') return `Entradas do dia ${dia}`;
  return `Movimentacoes do dia ${dia}`;
}

function finSubtituloDetalheDia(dia, mes, ano, itens) {
  const meses = finMeses();
  const dataTexto = `${dia} de ${meses[mes]} de ${ano}`;
  const total = finVisao === 'geral' ? finFmtAssinado(finValorTotalDia(itens)) : finFmtMoeda(finValorTotalDia(itens));
  const rotulo = finVisao === 'saidas' ? 'saidas' : finVisao === 'entradas' ? 'entradas' : 'movimentacoes';
  return `${itens.length} ${rotulo} em ${dataTexto} · Total ${total}`;
}

function finDetalheDiaItem(item) {
  const valor = item.natureza === 'saida' ? `-${finFmtMoeda(item.valorBruto)}` : finFmtMoeda(item.valorBruto);
  return `<div class="fin-day-item fin-day-item-${finClasseItem(item)}">
    <button class="fin-day-item-main" type="button" ${finAcaoItem(item)}>
      <div class="fin-day-item-top">
        <span class="fin-day-item-status">${finStatusItem(item, 'calendario')}</span>
        <strong>${valor}</strong>
      </div>
      <div class="fin-day-item-name">${zUiText(finNomeItem(item))}</div>
      <div class="fin-day-item-meta">${finMetaItem(item, { includeStatus: false })}</div>
      ${item.observacao ? `<div class="fin-day-item-note">${zUiText(item.observacao)}</div>` : ''}
    </button>
    ${finAcoesSecundariasItem(item)}
  </div>`;
}

function finBuildSideCards(atual, dataInicioRecorte, dataFim7) {
  if (finVisao === 'saidas') {
    const proximas = atual.saidas.previstas
      .filter(item => item.dataRef >= dataInicioRecorte && item.dataRef <= dataFim7)
      .sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto)
      .slice(0, 5);
    const maiores = atual.saidas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto).slice(0, 5);
    const vencidas = finColetarSaidasVencidasHistorico(finMesAtual, finAnoAtual);
    return [
      finSideList('Proximos pagamentos', 'Saidas previstas para os proximos 7 dias dentro do recorte.', proximas, 'Nenhum pagamento previsto nos proximos 7 dias.'),
      finSideList('Maiores saidas do mes', 'Leitura rapida das maiores saidas previstas ou pagas.', maiores, 'Nenhuma saida no recorte.'),
      finSideList('Saidas vencidas', 'As contas mais vencidas ate este mes, incluindo pendencias de meses anteriores.', vencidas, 'Nenhuma saida vencida ate este periodo.')
    ].join('');
  }

  if (finVisao === 'entradas') {
    const proximas = atual.entradas.previstas
      .filter(item => item.dataRef >= dataInicioRecorte && item.dataRef <= dataFim7)
      .sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto)
      .slice(0, 5);
    const maiores = atual.entradas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto).slice(0, 5);
    const manuais = atual.manuais.entradas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto).slice(0, 5);
    return [
      finSideList('Proximos 7 dias', 'O que tende a entrar no curtissimo prazo dentro do recorte.', proximas, 'Nenhuma entrada prevista para os proximos 7 dias.'),
      finSideList('Maiores entradas do mes', 'Os maiores valores, recebidos ou previstos, para leitura executiva.', maiores, 'Nenhuma entrada no recorte.'),
      finSideList('Entradas manuais', 'Recebimentos e previsoes cadastrados diretamente no financeiro.', manuais, 'Nenhuma entrada manual neste mes.')
    ].join('');
  }

  const proximos = atual.todos
    .filter(item => item.status !== 'realizado' && item.dataRef >= dataInicioRecorte && item.dataRef <= dataFim7)
    .sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto)
    .slice(0, 5);
  const maioresEntradas = atual.entradas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto).slice(0, 5);
  const maioresSaidas = atual.saidas.todos.slice().sort((a, b) => b.valorBruto - a.valorBruto).slice(0, 5);
  return [
    finSideList('Curtissimo prazo', 'Entradas e saidas previstas para os proximos 7 dias.', proximos, 'Nenhuma movimentacao prevista nos proximos 7 dias.'),
    finSideList('Maiores entradas', 'Leitura rapida dos maiores recebimentos previstos ou realizados.', maioresEntradas, 'Nenhuma entrada no recorte.'),
    finSideList('Maiores saidas', 'Leitura rapida dos maiores pagamentos e compromissos do periodo.', maioresSaidas, 'Nenhuma saida no recorte.')
  ].join('');
}

function finBuildCalendario(atual, ano, mes, hoje, primeiroDia, diasNoMes) {
  let cells = '';
  const limiteEventosPorDia = (typeof window !== 'undefined' && window.innerHeight <= 820) ? 1 : 2;
  for (let i = 0; i < primeiroDia; i++) cells += '<div class="fcal-cell fcal-empty"></div>';

  for (let d = 1; d <= diasNoMes; d++) {
    const isHoje = d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
    const itens = finItensDoDia(atual, d);
    const visiveis = itens.slice(0, limiteEventosPorDia);
    const extra = itens.length - visiveis.length;
    const totalDia = finValorTotalDia(itens);
    const classeTotalDia = totalDia < 0 ? ' neg' : totalDia > 0 ? ' pos' : '';
    const podeAbrirDetalhe = itens.length > 0;

    cells += `<div class="fcal-cell${isHoje ? ' fcal-hoje' : ''}${podeAbrirDetalhe ? ' fcal-cell-clickable' : ''}" ${podeAbrirDetalhe ? `onclick="finAbrirDetalheDia(${d})"` : ''}>
      <div class="fcal-headline">
        <div class="fcal-num${isHoje ? ' fcal-num-hoje' : ''}">${d}</div>
        ${itens.length ? `<div class="fcal-day-total${classeTotalDia}">${finVisao === 'geral' ? finFmtKAssinado(totalDia) : finFmtMoeda(totalDia)}</div>` : ''}
      </div>
      <div class="fcal-events">
        ${visiveis.map(item => `<button class="fcal-ev fcal-ev-${finClasseItem(item)}" ${finAcaoItemComOpcao(item, true)} title="${finEscapeAttr(finNomeItem(item))}">
          <div class="fcal-ev-top">
            <span class="fcal-ev-status">${finStatusItem(item, 'calendario')}</span>
            <strong>${item.natureza === 'saida' ? `-${finFmtMoeda(item.valorBruto)}` : finFmtMoeda(item.valorBruto)}</strong>
          </div>
          <div class="fcal-ev-name">${zUiText(finNomeItem(item))}</div>
          <div class="fcal-ev-meta">${finMetaItem(item, { includeStatus: false, includeProof: false })}</div>
        </button>`).join('')}
        ${extra > 0 ? `<button class="fcal-more" type="button" onclick="event.stopPropagation();finAbrirDetalheDia(${d})">+${extra} ${zUiText('movimentacoes')}</button>` : ''}
      </div>
    </div>`;
  }

  return cells;
}

