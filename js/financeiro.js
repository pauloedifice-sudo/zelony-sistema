// FINANCEIRO
// Modulo Financeiro - caixa com entradas automaticas e lancamentos manuais

let finMesAtual = new Date().getMonth();
let finAnoAtual = new Date().getFullYear();
let finFiltroUnidade = '';
let finFiltroConstrutora = '';
let finFiltroGerente = '';
let finFiltroSituacao = '';
let finFiltroFaixa = '';
let finFiltroCategoria = '';
let finVisao = 'geral';
let finDreEscopo = 'mes';
let finModalAberto = false;
let finModalLancamentoId = '';
let finModalTipoPadrao = '';
let finModalBaixaRapida = false;
let finDiaDetalheAberto = false;
let finDiaDetalheAtual = 0;
let finComprovanteFile = null;
let finComprovanteDataUrl = '';
let finComprovanteNome = '';
let finComprovanteMime = '';
let finComprovanteSize = 0;
let finComprovanteLocalId = '';
let finComprovanteRemovido = false;
let finCategoriaNovaAtiva = false;
let finCategoriaNovaValor = '';

const FIN_CATEGORIAS = {
  entrada: [
    'APORTE',
    'BONIFICACAO',
    'COMISSAO',
    'EMPRESTIMO RECEBIDO',
    'RECEITA FINANCEIRA',
    'REEMBOLSO',
    'OUTRAS ENTRADAS'
  ],
  saida: [
    'ALUGUEL',
    'CRM',
    'DESPESAS BANCARIAS',
    'EMPRESTIMO',
    'EVENTOS',
    'IMPOSTOS',
    'MARKETING',
    'OUTRAS SAIDAS',
    'SALARIO',
    'SERVICOS'
  ]
};

function syncFinState() {
  zSetState('state.ui.finMesAtual', finMesAtual);
  zSetState('state.ui.finAnoAtual', finAnoAtual);
  zSetState('state.ui.finFiltroUnidade', finFiltroUnidade);
  zSetState('state.ui.finFiltroConstrutora', finFiltroConstrutora);
  zSetState('state.ui.finFiltroGerente', finFiltroGerente);
  zSetState('state.ui.finFiltroSituacao', finFiltroSituacao);
  zSetState('state.ui.finFiltroFaixa', finFiltroFaixa);
  zSetState('state.ui.finFiltroCategoria', finFiltroCategoria);
  zSetState('state.ui.finVisao', finVisao);
  zSetState('state.ui.finDreEscopo', finDreEscopo);
}

syncFinState();

function finMeses() {
  return ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
}

function finHojeRef() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0, 0);
}

function finPad2(valor) {
  return String(valor).padStart(2, '0');
}

function finForcarMaiusculo(valor) {
  return String(valor == null ? '' : valor).toUpperCase();
}

function finTextoMaiusculo(valor) {
  return String(valor == null ? '' : valor).trim().toUpperCase();
}

function finAtualizarCampoMaiusculo(elemento) {
  if (!elemento) return '';
  const normalizado = finForcarMaiusculo(elemento.value);
  if (elemento.value !== normalizado) elemento.value = normalizado;
  return normalizado;
}

function finDataValidaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '').trim());
}

function finDataIsoParaDate(valor, hora = '12:00') {
  if (!finDataValidaIso(valor)) return null;
  const [ano, mes, dia] = String(valor).split('-').map(Number);
  const [hh, mm] = String(hora || '12:00').split(':').map(Number);
  const data = new Date(ano, (mes || 1) - 1, dia || 1, hh || 12, mm || 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function finDateParaIso(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return `${data.getFullYear()}-${finPad2(data.getMonth() + 1)}-${finPad2(data.getDate())}`;
}

function finDreNormalizarCursor() {
  if (finDreEscopo === 'trimestre') {
    finMesAtual = Math.floor(finMesAtual / 3) * 3;
    return;
  }
  if (finDreEscopo === 'semestre') {
    finMesAtual = finMesAtual >= 6 ? 6 : 0;
    return;
  }
  if (finDreEscopo === 'anual') {
    finMesAtual = 0;
  }
}

function finDreEscopos() {
  return [
    { id: 'mes', label: 'Mes' },
    { id: 'trimestre', label: 'Trimestre' },
    { id: 'semestre', label: 'Semestre' },
    { id: 'anual', label: 'Anual' }
  ];
}

function finDreMetaAtual() {
  finDreNormalizarCursor();
  const meses = finMeses();
  if (finDreEscopo === 'trimestre') {
    const trimestre = Math.floor(finMesAtual / 3) + 1;
    const inicioMes = (trimestre - 1) * 3;
    return {
      escopo: 'trimestre',
      ano: finAnoAtual,
      inicioMes,
      quantidadeMeses: 3,
      indice: trimestre,
      etiqueta: `${trimestre}º trimestre de ${finAnoAtual}`,
      mesesLista: Array.from({ length: 3 }, (_, idx) => ({
        mes: inicioMes + idx,
        ano: finAnoAtual,
        label: meses[inicioMes + idx]
      })),
      inicio: new Date(finAnoAtual, inicioMes, 1, 12, 0, 0, 0),
      fimExclusive: new Date(finAnoAtual, inicioMes + 3, 1, 12, 0, 0, 0)
    };
  }
  if (finDreEscopo === 'semestre') {
    const semestre = finMesAtual >= 6 ? 2 : 1;
    const inicioMes = semestre === 2 ? 6 : 0;
    return {
      escopo: 'semestre',
      ano: finAnoAtual,
      inicioMes,
      quantidadeMeses: 6,
      indice: semestre,
      etiqueta: `${semestre}º semestre de ${finAnoAtual}`,
      mesesLista: Array.from({ length: 6 }, (_, idx) => ({
        mes: inicioMes + idx,
        ano: finAnoAtual,
        label: meses[inicioMes + idx]
      })),
      inicio: new Date(finAnoAtual, inicioMes, 1, 12, 0, 0, 0),
      fimExclusive: new Date(finAnoAtual, inicioMes + 6, 1, 12, 0, 0, 0)
    };
  }
  if (finDreEscopo === 'anual') {
    return {
      escopo: 'anual',
      ano: finAnoAtual,
      inicioMes: 0,
      quantidadeMeses: 12,
      indice: 1,
      etiqueta: `Anual ${finAnoAtual}`,
      mesesLista: Array.from({ length: 12 }, (_, idx) => ({
        mes: idx,
        ano: finAnoAtual,
        label: meses[idx]
      })),
      inicio: new Date(finAnoAtual, 0, 1, 12, 0, 0, 0),
      fimExclusive: new Date(finAnoAtual + 1, 0, 1, 12, 0, 0, 0)
    };
  }
  return {
    escopo: 'mes',
    ano: finAnoAtual,
    inicioMes: finMesAtual,
    quantidadeMeses: 1,
    indice: finMesAtual + 1,
    etiqueta: `${meses[finMesAtual]} ${finAnoAtual}`,
    mesesLista: [{ mes: finMesAtual, ano: finAnoAtual, label: meses[finMesAtual] }],
    inicio: new Date(finAnoAtual, finMesAtual, 1, 12, 0, 0, 0),
    fimExclusive: new Date(finAnoAtual, finMesAtual + 1, 1, 12, 0, 0, 0)
  };
}

function finDreSetEscopo(escopo) {
  finDreEscopo = ['mes', 'trimestre', 'semestre', 'anual'].includes(escopo) ? escopo : 'mes';
  finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function finDreSetAno(valor) {
  const ano = parseInt(valor, 10);
  if (!Number.isFinite(ano)) return;
  finAnoAtual = ano;
  finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function finDreSetIndice(valor) {
  const indice = parseInt(valor, 10);
  if (!Number.isFinite(indice)) return;
  if (finDreEscopo === 'mes') finMesAtual = Math.max(0, Math.min(11, indice - 1));
  if (finDreEscopo === 'trimestre') finMesAtual = Math.max(0, Math.min(9, (indice - 1) * 3));
  if (finDreEscopo === 'semestre') finMesAtual = indice === 2 ? 6 : 0;
  if (finDreEscopo === 'anual') finMesAtual = 0;
  finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function finDreAnosDisponiveis() {
  const anos = new Set([new Date().getFullYear(), finAnoAtual]);
  (Array.isArray(VENDAS) ? VENDAS : []).forEach(v => {
    if (!v || v.distratada || v.etapa !== ETAPAS.length - 1) return;
    const ultHist = v.hist && v.hist.length ? v.hist[v.hist.length - 1] : null;
    const info = typeof obterMomentoHistorico === 'function'
      ? obterMomentoHistorico(ultHist, { preferTs: false })
      : null;
    if (info && info.date && !Number.isNaN(info.date.getTime()) && info.precision !== 'daymonth') anos.add(info.date.getFullYear());
  });
  (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).forEach(item => {
    const ref = finReferenciaLancamentoManual(item);
    if (ref && !Number.isNaN(ref.getTime())) anos.add(ref.getFullYear());
  });
  return Array.from(anos).sort((a, b) => b - a);
}

function finDreMover(offset) {
  if (finDreEscopo === 'trimestre') finMesAtual += 3 * offset;
  else if (finDreEscopo === 'semestre') finMesAtual += 6 * offset;
  else if (finDreEscopo === 'anual') finAnoAtual += offset;
  else finMesAtual += offset;

  while (finMesAtual < 0) {
    finMesAtual += 12;
    finAnoAtual--;
  }
  while (finMesAtual > 11) {
    finMesAtual -= 12;
    finAnoAtual++;
  }
  finDreNormalizarCursor();
}

function finDiffDias(maior, menor) {
  if (!(maior instanceof Date) || !(menor instanceof Date)) return 0;
  return Math.max(0, Math.floor((maior.getTime() - menor.getTime()) / 86400000));
}

function finValorSeguro(valor) {
  const numero = parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function finTamanhoArquivoTexto(bytes) {
  if (typeof fmtTamanho === 'function') return fmtTamanho(bytes || 0);
  const total = finValorSeguro(bytes);
  if (total < 1024) return `${Math.round(total)}B`;
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)}KB`;
  return `${(total / (1024 * 1024)).toFixed(1)}MB`;
}

function finLerArquivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(String(event && event.target && event.target.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o comprovante.'));
    reader.readAsDataURL(file);
  });
}

function finListaUnica(lista) {
  const vistos = new Set();
  return (lista || []).filter(Boolean).filter(item => {
    const chave = zUiText(String(item)).trim().toLowerCase();
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

function finOpcoes(lista) {
  return finListaUnica(lista).sort((a, b) => zUiText(String(a)).localeCompare(zUiText(String(b)), 'pt-BR'));
}

function finEscapeAttr(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function finFmtAssinado(valor) {
  if (!valor) return fmt(0);
  const sinal = valor > 0 ? '+' : '-';
  return `${sinal}${fmt(Math.abs(valor))}`;
}

function finFmtKAssinado(valor) {
  if (!valor) return fmtK(0);
  const sinal = valor > 0 ? '+' : '-';
  return `${sinal}${fmtK(Math.abs(valor))}`;
}

function finRotuloVisao(visao) {
  if (visao === 'dre') return 'DRE';
  if (visao === 'entradas') return 'Entradas';
  if (visao === 'saidas') return 'Saidas';
  return 'Entrada / Saida';
}

function finSubtituloVisao() {
  if (finVisao === 'dre') return 'Demonstrativo gerencial consolidado por periodo, com leitura de resultado e variacao de caixa.';
  if (finVisao === 'entradas') return 'Comissoes previstas/recebidas mais entradas manuais do financeiro.';
  if (finVisao === 'saidas') return 'Saidas previstas e pagas para leitura de caixa do mes.';
  return 'Fluxo de caixa consolidado com entradas automaticas e lancamentos manuais.';
}

function finRotuloFiltroSituacao(status) {
  if (status === 'realizado') {
    if (finVisao === 'saidas') return 'Pagas';
    if (finVisao === 'entradas') return 'Recebidas';
    return 'Realizados';
  }
  if (status === 'atrasado') {
    if (finVisao === 'saidas') return 'Vencidas';
    if (finVisao === 'entradas') return 'Com atraso';
    return 'Em atraso';
  }
  if (finVisao === 'saidas') return 'A vencer';
  if (finVisao === 'entradas') return 'Previstas no prazo';
  return 'Previstos';
}

function finTipoPadraoNovaAcao() {
  if (finVisao === 'saidas') return 'saida';
  if (finVisao === 'entradas') return 'entrada';
  return '';
}

function finCategoriasPorTipo(tipo, adicionais = []) {
  const base = tipo === 'saida' ? FIN_CATEGORIAS.saida : FIN_CATEGORIAS.entrada;
  const usadas = (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : [])
    .filter(item => tipoLancamentoFinanceiroNormalizado(item && item.tipo) === tipo)
    .map(item => finTextoMaiusculo(item && item.categoria))
    .filter(Boolean);
  const extras = (Array.isArray(adicionais) ? adicionais : [])
    .map(item => finTextoMaiusculo(item))
    .filter(Boolean);
  return finListaUnica([...(base || []), ...usadas, ...extras]);
}

function finUnidadesDisponiveis() {
  const vendas = Array.isArray(VENDAS) ? VENDAS.map(v => v.unidade) : [];
  const manuais = Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS.map(item => item.unidade) : [];
  return finOpcoes([...vendas, ...manuais]);
}

function finCategoriasDisponiveis() {
  if (finVisao === 'entradas') return finOpcoes(finCategoriasPorTipo('entrada'));
  if (finVisao === 'saidas') return finOpcoes(finCategoriasPorTipo('saida'));
  return finOpcoes([
    ...finCategoriasPorTipo('entrada'),
    ...finCategoriasPorTipo('saida')
  ]);
}

function finResetCategoriaNovaState() {
  finCategoriaNovaAtiva = false;
  finCategoriaNovaValor = '';
}

function finPlaceholderCategoriaNova(tipo) {
  return zUiText(tipo === 'saida'
    ? 'EX: CONDOMINIO, MANUTENCAO, LICENCA, VIAGENS...'
    : 'EX: CASHBACK, PARCERIA, VENDA DE ATIVO, BONUS...');
}

function finAtualizarCategoriaNovaUi() {
  const tipoEl = document.getElementById('fin-lanc-tipo');
  const wrap = document.getElementById('fin-categoria-nova-wrap');
  const input = document.getElementById('fin-lanc-categoria-nova');
  const botao = document.getElementById('fin-categoria-nova-btn');
  const tipo = tipoLancamentoFinanceiroNormalizado(tipoEl && tipoEl.value);
  if (botao) botao.textContent = zUiText(finCategoriaNovaAtiva ? 'Cancelar nova categoria' : 'Nova categoria');
  if (wrap) wrap.style.display = finCategoriaNovaAtiva ? 'flex' : 'none';
  if (input) {
    input.placeholder = finPlaceholderCategoriaNova(tipo);
    input.value = finForcarMaiusculo(finCategoriaNovaValor || '');
  }
}

function finAlternarCategoriaNova() {
  const input = document.getElementById('fin-lanc-categoria-nova');
  if (finCategoriaNovaAtiva && input) finCategoriaNovaValor = finTextoMaiusculo(input.value || '');
  finCategoriaNovaAtiva = !finCategoriaNovaAtiva;
  if (!finCategoriaNovaAtiva) finCategoriaNovaValor = '';
  finAtualizarCategoriaNovaUi();
  if (finCategoriaNovaAtiva) {
    setTimeout(() => {
      const campo = document.getElementById('fin-lanc-categoria-nova');
      if (campo) campo.focus();
    }, 0);
  }
}

function finAtualizarCategoriaNovaValor(valor, elemento = null) {
  const normalizado = finForcarMaiusculo(valor || '');
  finCategoriaNovaValor = normalizado;
  if (elemento && elemento.value !== normalizado) elemento.value = normalizado;
}

function finTemFiltrosVenda() {
  return finVisao === 'entradas';
}

function finMatchFaixa(valor, faixa) {
  const total = Math.abs(finValorSeguro(valor));
  if (!faixa) return true;
  if (faixa === 'ate5') return total <= 5000;
  if (faixa === '5a10') return total > 5000 && total <= 10000;
  if (faixa === '10a20') return total > 10000 && total <= 20000;
  if (faixa === '20mais') return total > 20000;
  return true;
}

function finMatchStatusItem(item) {
  if (!finFiltroSituacao) return true;
  return item.status === finFiltroSituacao;
}

function finMatchCamposItem(item) {
  if (finFiltroUnidade) {
    if (!item.unidade || item.unidade !== finFiltroUnidade) return false;
  }
  if (finFiltroCategoria) {
    if ((item.categoria || '') !== finFiltroCategoria) return false;
  }
  if (!finMatchFaixa(item.valorBruto, finFiltroFaixa)) return false;
  if (!finMatchStatusItem(item)) return false;
  if (finTemFiltrosVenda()) {
    if (finFiltroConstrutora && item.construtora !== finFiltroConstrutora) return false;
    if (finFiltroGerente && item.gerente !== finFiltroGerente) return false;
  }
  return true;
}

function finNomeClienteVenda(cliente) {
  if (typeof nomeCalendario === 'function') return nomeCalendario(cliente || '');
  return String(cliente || '').split('/')[0].trim();
}

function finCriarItemComissao(v, bruto, liquido, dataRef, status, atraso, manualNota) {
  return {
    key: `venda-${v.id}-${status}-${dataRef.getTime()}`,
    origem: 'venda',
    natureza: 'entrada',
    categoria: 'COMISSAO',
    descricao: finNomeClienteVenda(v.cliente),
    valorBruto: bruto,
    valorLiquido: liquido,
    dataRef,
    dia: dataRef.getDate(),
    status,
    atraso: atraso || 0,
    manualNota: !!manualNota,
    unidade: v.unidade || '',
    construtora: v.construtora || '',
    gerente: v.gerente || '',
    v
  };
}

function finColetarComissoesMes(mes, ano) {
  const previstas = [];
  const realizadas = [];

  (Array.isArray(VENDAS) ? VENDAS : []).forEach(v => {
    if (!v || v.distratada) return;
    if (finFiltroUnidade && v.unidade !== finFiltroUnidade) return;
    if (finTemFiltrosVenda() && finFiltroConstrutora && v.construtora !== finFiltroConstrutora) return;
    if (finTemFiltrosVenda() && finFiltroGerente && v.gerente !== finFiltroGerente) return;

    const bruto = finValorSeguro(v.valor) * finValorSeguro(v.pct);
    const liquido = typeof comZ === 'function' ? finValorSeguro(comZ(v)) : bruto;
    if (!finMatchFaixa(bruto, finFiltroFaixa)) return;

    const concluida = v.etapa === ETAPAS.length - 1;
    if (concluida) {
      const ultHist = v.hist && v.hist.length ? v.hist[v.hist.length - 1] : null;
      const ultInfo = typeof obterMomentoHistorico === 'function'
        ? obterMomentoHistorico(ultHist, { preferTs: false })
        : null;
      if (!ultInfo || !ultInfo.date || ultInfo.precision === 'daymonth') return;
      if (ultInfo.date.getMonth() !== mes || ultInfo.date.getFullYear() !== ano) return;
      const item = finCriarItemComissao(v, bruto, liquido, ultInfo.date, 'realizado', 0, false);
      if (finFiltroCategoria && finFiltroCategoria !== 'COMISSAO') return;
      if (!finMatchCamposItem(item)) return;
      realizadas.push(item);
      return;
    }

    if (v.etapa >= ETAPAS.length - 1) return;
    const prev = typeof calcPrevisao === 'function' ? calcPrevisao(v) : null;
    if (!prev || !prev.data) return;
    const partes = String(prev.data).split('/');
    if (partes.length < 3) return;
    const dia = parseInt(partes[0], 10);
    const mesPrev = parseInt(partes[1], 10) - 1;
    const anoPrev = parseInt(partes[2], 10);
    if (!Number.isFinite(dia) || mesPrev !== mes || anoPrev !== ano) return;
    const dataRef = new Date(anoPrev, mesPrev, dia, 12, 0, 0, 0);
    const status = prev.totalAtraso > 0 ? 'atrasado' : 'previsto';
    const item = finCriarItemComissao(v, bruto, liquido, dataRef, status, prev.totalAtraso || 0, !!prev.manual);
    if (finFiltroCategoria && finFiltroCategoria !== 'COMISSAO') return;
    if (!finMatchCamposItem(item)) return;
    previstas.push(item);
  });

  previstas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);
  realizadas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);

  return {
    previstas,
    realizadas,
    todos: [...previstas, ...realizadas].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || a.dataRef - b.dataRef || b.valorBruto - a.valorBruto),
    totalPrevistoBrut: previstas.reduce((soma, item) => soma + item.valorBruto, 0),
    totalPrevistoLiq: previstas.reduce((soma, item) => soma + item.valorLiquido, 0),
    totalRealizadoBrut: realizadas.reduce((soma, item) => soma + item.valorBruto, 0),
    totalRealizadoLiq: realizadas.reduce((soma, item) => soma + item.valorLiquido, 0)
  };
}

function finStatusLoteManual(baseStatus, dataPrevista) {
  if (baseStatus === 'realizado') return 'realizado';
  const hoje = finHojeRef();
  const prevista = finDataIsoParaDate(dataPrevista);
  if (prevista && prevista.getTime() < hoje.getTime()) return 'atrasado';
  return 'previsto';
}

function finReferenciaLancamentoManual(item) {
  if (statusLancamentoFinanceiroNormalizado(item && item.status) === 'realizado' && finDataValidaIso(item && item.dataRealizada)) {
    return finDataIsoParaDate(item.dataRealizada);
  }
  if (finDataValidaIso(item && item.dataPrevista)) return finDataIsoParaDate(item.dataPrevista);
  return null;
}

function finNormalizarLancamentoManual(item) {
  if (!item) return null;
  const tipo = tipoLancamentoFinanceiroNormalizado(item.tipo);
  const dataRef = finReferenciaLancamentoManual(item);
  if (!dataRef) return null;
  const status = finStatusLoteManual(statusLancamentoFinanceiroNormalizado(item.status), item.dataPrevista);
  const atraso = status === 'atrasado' ? finDiffDias(finHojeRef(), finDataIsoParaDate(item.dataPrevista)) : 0;
  return {
    key: `manual-${item.refLocal || item.id}`,
    origem: 'manual',
    natureza: tipo,
    categoria: finTextoMaiusculo(item.categoria) || (tipo === 'saida' ? 'OUTRAS SAIDAS' : 'OUTRAS ENTRADAS'),
    descricao: finTextoMaiusculo(item.descricao) || (tipo === 'saida' ? 'SAIDA MANUAL' : 'ENTRADA MANUAL'),
    valorBruto: Math.abs(finValorSeguro(item.valor)),
    valorLiquido: Math.abs(finValorSeguro(item.valor)),
    dataRef,
    dia: dataRef.getDate(),
    status,
    atraso,
    unidade: item.unidade || '',
    construtora: '',
    gerente: '',
    observacao: finTextoMaiusculo(item.observacao),
    comprovanteNome: item.comprovanteNome || '',
    comprovanteMime: item.comprovanteMime || '',
    comprovanteSize: finValorSeguro(item.comprovanteSize),
    comprovanteDataUrl: item.comprovanteDataUrl || '',
    comprovanteLocalId: item.comprovanteLocalId || '',
    comprovanteStorageBucket: item.comprovanteStorageBucket || '',
    comprovanteStoragePath: item.comprovanteStoragePath || '',
    refLocal: item.refLocal || '',
    raw: item
  };
}

function finMontarResumoNatureza(previstas, realizadas) {
  const todos = [...previstas, ...realizadas].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);
  return {
    previstas,
    realizadas,
    todos,
    totalPrevisto: previstas.reduce((soma, item) => soma + item.valorBruto, 0),
    totalRealizado: realizadas.reduce((soma, item) => soma + item.valorBruto, 0)
  };
}

function finColetarLancamentosManuaisMes(mes, ano) {
  const entradasPrevistas = [];
  const entradasRealizadas = [];
  const saidasPrevistas = [];
  const saidasRealizadas = [];

  (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).forEach(item => {
    const normalizado = finNormalizarLancamentoManual(item);
    if (!normalizado) return;
    if (normalizado.dataRef.getMonth() !== mes || normalizado.dataRef.getFullYear() !== ano) return;
    if (!finMatchCamposItem(normalizado)) return;

    if (normalizado.natureza === 'saida') {
      (normalizado.status === 'realizado' ? saidasRealizadas : saidasPrevistas).push(normalizado);
    } else {
      (normalizado.status === 'realizado' ? entradasRealizadas : entradasPrevistas).push(normalizado);
    }
  });

  entradasPrevistas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);
  entradasRealizadas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);
  saidasPrevistas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);
  saidasRealizadas.sort((a, b) => a.dataRef - b.dataRef || b.valorBruto - a.valorBruto);

  return {
    entradas: finMontarResumoNatureza(entradasPrevistas, entradasRealizadas),
    saidas: finMontarResumoNatureza(saidasPrevistas, saidasRealizadas)
  };
}

function finColetarMes(mes, ano) {
  const comissoes = finColetarComissoesMes(mes, ano);
  const manuais = finColetarLancamentosManuaisMes(mes, ano);

  const entradas = finMontarResumoNatureza(
    [...comissoes.previstas, ...manuais.entradas.previstas],
    [...comissoes.realizadas, ...manuais.entradas.realizadas]
  );
  const saidas = finMontarResumoNatureza(
    [...manuais.saidas.previstas],
    [...manuais.saidas.realizadas]
  );

  const agendaPorDia = {};
  [...entradas.todos, ...saidas.todos].forEach(item => {
    if (!agendaPorDia[item.dia]) agendaPorDia[item.dia] = [];
    agendaPorDia[item.dia].push(item);
  });
  Object.keys(agendaPorDia).forEach(chave => {
    agendaPorDia[chave].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || b.valorBruto - a.valorBruto);
  });

  return {
    comissoes,
    manuais,
    entradas,
    saidas,
    todos: [...entradas.todos, ...saidas.todos].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || a.dataRef - b.dataRef || b.valorBruto - a.valorBruto),
    agendaPorDia
  };
}

function finColetarSaidasVencidasHistorico(mes, ano) {
  const limiteMes = new Date(ano, mes + 1, 0, 12, 0, 0, 0);
  return (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : [])
    .map(item => finNormalizarLancamentoManual(item))
    .filter(item => {
      if (!item) return false;
      if (item.natureza !== 'saida' || item.status !== 'atrasado') return false;
      if (!(item.dataRef instanceof Date) || Number.isNaN(item.dataRef.getTime())) return false;
      if (item.dataRef.getTime() > limiteMes.getTime()) return false;
      return finMatchCamposItem(item);
    })
    .sort((a, b) => b.atraso - a.atraso || a.dataRef - b.dataRef || b.valorBruto - a.valorBruto)
    .slice(0, 5);
}

function finDreDentroPeriodo(dataRef, meta) {
  if (!(dataRef instanceof Date) || Number.isNaN(dataRef.getTime()) || !meta) return false;
  const tempo = dataRef.getTime();
  return tempo >= meta.inicio.getTime() && tempo < meta.fimExclusive.getTime();
}

function finDreBucketCategoria(tipo, categoria) {
  const cat = finTextoMaiusculo(categoria);
  if (tipo === 'entrada') {
    if (cat === 'COMISSAO') return { bucket: 'receita', grupo: 'Receita operacional', conta: 'COMISSAO' };
    if (cat === 'RECEITA FINANCEIRA') return { bucket: 'financeiro_receita', grupo: 'Receitas financeiras', conta: cat };
    if (cat === 'APORTE' || cat === 'EMPRESTIMO RECEBIDO') return { bucket: 'fora_receita', grupo: 'Movimentacoes fora do DRE', conta: cat };
    return { bucket: 'receita', grupo: 'Outras receitas', conta: cat || 'OUTRAS ENTRADAS' };
  }
  if (cat === 'IMPOSTOS') return { bucket: 'impostos', grupo: 'Impostos e taxas', conta: cat };
  if (cat === 'DESPESAS BANCARIAS') return { bucket: 'financeiro_despesa', grupo: 'Despesas financeiras', conta: cat };
  if (cat === 'EMPRESTIMO') return { bucket: 'fora_despesa', grupo: 'Movimentacoes fora do DRE', conta: cat };
  if (cat === 'MARKETING' || cat === 'CRM' || cat === 'EVENTOS') return { bucket: 'despesa', grupo: 'Despesas comerciais', conta: cat };
  if (cat === 'SALARIO') return { bucket: 'despesa', grupo: 'Despesas com pessoal', conta: cat };
  if (cat === 'ALUGUEL' || cat === 'SERVICOS') return { bucket: 'despesa', grupo: 'Despesas administrativas', conta: cat };
  return { bucket: 'despesa', grupo: 'Despesas operacionais', conta: cat || 'OUTRAS SAIDAS' };
}

function finDreCriarLinha(dataRef, natureza, categoria, descricao, valor, origem, unidade = '') {
  const tipo = natureza === 'saida' ? 'saida' : 'entrada';
  const classificacao = finDreBucketCategoria(tipo, categoria);
  return {
    dataRef,
    competencia: `${dataRef.getFullYear()}-${finPad2(dataRef.getMonth() + 1)}`,
    competenciaLabel: `${finMeses()[dataRef.getMonth()]} ${dataRef.getFullYear()}`,
    natureza,
    categoria,
    descricao: descricao || categoria || (natureza === 'saida' ? 'Saida' : 'Entrada'),
    valor: Math.abs(finValorSeguro(valor)),
    origem: origem || 'manual',
    unidade: unidade || '',
    bucket: classificacao.bucket,
    grupo: classificacao.grupo,
    conta: classificacao.conta
  };
}

function finDreColetarLinhas(meta) {
  const linhas = [];

  (Array.isArray(VENDAS) ? VENDAS : []).forEach(v => {
    if (!v || v.distratada || v.etapa !== ETAPAS.length - 1) return;
    if (finFiltroUnidade && v.unidade !== finFiltroUnidade) return;
    const ultHist = v.hist && v.hist.length ? v.hist[v.hist.length - 1] : null;
    const ultInfo = typeof obterMomentoHistorico === 'function'
      ? obterMomentoHistorico(ultHist, { preferTs: false })
      : null;
    if (!ultInfo || !ultInfo.date || ultInfo.precision === 'daymonth') return;
    if (!finDreDentroPeriodo(ultInfo.date, meta)) return;
    const bruto = finValorSeguro(v.valor) * finValorSeguro(v.pct);
    linhas.push(finDreCriarLinha(
      ultInfo.date,
      'entrada',
      'COMISSAO',
      finNomeClienteVenda(v.cliente),
      bruto,
      'venda',
      v.unidade || ''
    ));
  });

  (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).forEach(item => {
    const normalizado = finNormalizarLancamentoManual(item);
    if (!normalizado || normalizado.status !== 'realizado') return;
    if (finFiltroUnidade && normalizado.unidade !== finFiltroUnidade) return;
    if (!finDreDentroPeriodo(normalizado.dataRef, meta)) return;
    linhas.push(finDreCriarLinha(
      normalizado.dataRef,
      normalizado.natureza,
      normalizado.categoria,
      normalizado.descricao,
      normalizado.valorBruto,
      normalizado.origem,
      normalizado.unidade || ''
    ));
  });

  return linhas.sort((a, b) => a.dataRef - b.dataRef || b.valor - a.valor);
}

function finDreAgruparPorGrupo(linhas, buckets) {
  const grupos = new Map();
  (linhas || []).forEach(linha => {
    if (!buckets.includes(linha.bucket)) return;
    const chaveGrupo = linha.grupo || 'Outros';
    let grupo = grupos.get(chaveGrupo);
    if (!grupo) {
      grupo = { label: chaveGrupo, total: 0, contas: new Map() };
      grupos.set(chaveGrupo, grupo);
    }
    grupo.total += linha.valor;
    const contaAtual = grupo.contas.get(linha.conta) || { label: linha.conta, total: 0 };
    contaAtual.total += linha.valor;
    grupo.contas.set(linha.conta, contaAtual);
  });
  return Array.from(grupos.values())
    .map(grupo => ({
      label: grupo.label,
      total: grupo.total,
      contas: Array.from(grupo.contas.values()).sort((a, b) => b.total - a.total || zUiText(a.label).localeCompare(zUiText(b.label), 'pt-BR'))
    }))
    .sort((a, b) => b.total - a.total || zUiText(a.label).localeCompare(zUiText(b.label), 'pt-BR'));
}

function finDreSomarBuckets(linhas, buckets) {
  return (linhas || []).reduce((soma, linha) => buckets.includes(linha.bucket) ? soma + linha.valor : soma, 0);
}

function finDreSeriePeriodo(meta, linhas) {
  const mapa = new Map();
  (meta.mesesLista || []).forEach(item => {
    mapa.set(`${item.ano}-${finPad2(item.mes + 1)}`, {
      label: item.label,
      receita: 0,
      impostos: 0,
      despesa: 0,
      financeiroReceita: 0,
      financeiroDespesa: 0,
      foraReceita: 0,
      foraDespesa: 0
    });
  });

  (linhas || []).forEach(linha => {
    const slot = mapa.get(linha.competencia);
    if (!slot) return;
    if (linha.bucket === 'receita') slot.receita += linha.valor;
    if (linha.bucket === 'impostos') slot.impostos += linha.valor;
    if (linha.bucket === 'despesa') slot.despesa += linha.valor;
    if (linha.bucket === 'financeiro_receita') slot.financeiroReceita += linha.valor;
    if (linha.bucket === 'financeiro_despesa') slot.financeiroDespesa += linha.valor;
    if (linha.bucket === 'fora_receita') slot.foraReceita += linha.valor;
    if (linha.bucket === 'fora_despesa') slot.foraDespesa += linha.valor;
  });

  return Array.from(mapa.values()).map(item => {
    const resultadoBruto = item.receita - item.impostos;
    const resultadoOperacional = resultadoBruto - item.despesa;
    const resultadoFinanceiro = item.financeiroReceita - item.financeiroDespesa;
    const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;
    const variacaoCaixa = resultadoLiquido + item.foraReceita - item.foraDespesa;
    return {
      ...item,
      resultadoBruto,
      resultadoOperacional,
      resultadoFinanceiro,
      resultadoLiquido,
      variacaoCaixa
    };
  });
}

function finMontarDadosDre(meta) {
  const linhas = finDreColetarLinhas(meta);
  const receita = finDreSomarBuckets(linhas, ['receita']);
  const impostos = finDreSomarBuckets(linhas, ['impostos']);
  const despesa = finDreSomarBuckets(linhas, ['despesa']);
  const financeiroReceita = finDreSomarBuckets(linhas, ['financeiro_receita']);
  const financeiroDespesa = finDreSomarBuckets(linhas, ['financeiro_despesa']);
  const foraReceita = finDreSomarBuckets(linhas, ['fora_receita']);
  const foraDespesa = finDreSomarBuckets(linhas, ['fora_despesa']);
  const resultadoBruto = receita - impostos;
  const resultadoOperacional = resultadoBruto - despesa;
  const resultadoFinanceiro = financeiroReceita - financeiroDespesa;
  const resultadoLiquido = resultadoOperacional + resultadoFinanceiro;
  const variacaoCaixa = resultadoLiquido + foraReceita - foraDespesa;
  return {
    meta,
    linhas,
    gruposReceita: finDreAgruparPorGrupo(linhas, ['receita']),
    gruposImpostos: finDreAgruparPorGrupo(linhas, ['impostos']),
    gruposDespesa: finDreAgruparPorGrupo(linhas, ['despesa']),
    gruposFinanceiroReceita: finDreAgruparPorGrupo(linhas, ['financeiro_receita']),
    gruposFinanceiroDespesa: finDreAgruparPorGrupo(linhas, ['financeiro_despesa']),
    gruposForaReceita: finDreAgruparPorGrupo(linhas, ['fora_receita']),
    gruposForaDespesa: finDreAgruparPorGrupo(linhas, ['fora_despesa']),
    serie: finDreSeriePeriodo(meta, linhas),
    receita,
    impostos,
    despesa,
    financeiroReceita,
    financeiroDespesa,
    foraReceita,
    foraDespesa,
    resultadoBruto,
    resultadoOperacional,
    resultadoFinanceiro,
    resultadoLiquido,
    variacaoCaixa
  };
}

function finDreTabelaSecao(titulo, grupos, total, classe = '', sinal = 'normal') {
  const valorTotal = sinal === 'signed' ? finFmtAssinado(total) : fmt(total);
  return `
    <tr class="dre-row dre-section ${classe}">
      <td>${zUiText(titulo)}</td>
      <td>${zUiText(valorTotal)}</td>
    </tr>
    ${grupos.map(grupo => `
      <tr class="dre-row dre-group">
        <td><span class="dre-indent dre-indent-1">${zUiText(grupo.label)}</span></td>
        <td>${fmt(grupo.total)}</td>
      </tr>
      ${grupo.contas.map(conta => `
        <tr class="dre-row dre-account">
          <td><span class="dre-indent dre-indent-2">${zUiText(conta.label)}</span></td>
          <td>${fmt(conta.total)}</td>
        </tr>`).join('')}
    `).join('')}
  `;
}

function finDreTabelaResultado(titulo, valor, classe = '') {
  return `
    <tr class="dre-row dre-result ${classe}">
      <td>${zUiText(titulo)}</td>
      <td>${zUiText(finFmtAssinado(valor))}</td>
    </tr>
  `;
}

function finDreBuildTabela(dados) {
  return `
    <div class="dre-card">
      <div class="dre-card-head">
        <div>
          <div class="dre-card-kicker">${zUiText('DRE gerencial')}</div>
          <div class="dre-card-title">${zUiText(dados.meta.etiqueta)}</div>
        </div>
        <div class="dre-card-copy">${zUiText('Base realizada. Aportes e emprestimos ficam destacados fora do resultado operacional.')}</div>
      </div>
      <div class="dre-table-wrap">
        <table class="dre-table">
          <thead>
            <tr>
              <th>${zUiText('Conta')}</th>
              <th>${zUiText('Valor')}</th>
            </tr>
          </thead>
          <tbody>
            ${finDreTabelaSecao('Receitas', dados.gruposReceita, dados.receita, 'receita')}
            ${finDreTabelaSecao('Impostos e taxas', dados.gruposImpostos, dados.impostos, 'impostos')}
            ${finDreTabelaResultado('Resultado bruto', dados.resultadoBruto, 'subtotal')}
            ${finDreTabelaSecao('Despesas operacionais', dados.gruposDespesa, dados.despesa, 'despesa')}
            ${finDreTabelaResultado('Resultado operacional', dados.resultadoOperacional, 'subtotal')}
            ${finDreTabelaSecao('Receitas financeiras', dados.gruposFinanceiroReceita, dados.financeiroReceita, 'financeiro')}
            ${finDreTabelaSecao('Despesas financeiras', dados.gruposFinanceiroDespesa, dados.financeiroDespesa, 'financeiro')}
            ${finDreTabelaResultado('Resultado financeiro', dados.resultadoFinanceiro, 'subtotal')}
            ${finDreTabelaResultado('Resultado liquido gerencial', dados.resultadoLiquido, 'liquido')}
            ${(dados.foraReceita || dados.foraDespesa) ? `
              ${finDreTabelaSecao('Movimentacoes fora do DRE', dados.gruposForaReceita, dados.foraReceita, 'fora')}
              ${finDreTabelaSecao('Saidas fora do DRE', dados.gruposForaDespesa, dados.foraDespesa, 'fora')}
              ${finDreTabelaResultado('Variacao de caixa do periodo', dados.variacaoCaixa, 'caixa')}
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function finDreListaResumo(titulo, subtitulo, itens, vazio) {
  return `
    <div class="fcal-side-card">
      <div class="fcal-side-title">${zUiText(titulo)}</div>
      <div class="fcal-side-sub">${zUiText(subtitulo)}</div>
      <div class="dre-mini-list">
        ${itens.length ? itens.map(item => `
          <div class="dre-mini-item">
            <div class="dre-mini-main">
              <strong>${zUiText(item.label)}</strong>
              <span>${zUiText(item.meta || '')}</span>
            </div>
            <b class="${item.tom || ''}">${zUiText(item.valor)}</b>
          </div>`).join('') : `<div class="fcal-empty-state">${zUiText(vazio)}</div>`}
      </div>
    </div>
  `;
}

function finDreBuildSide(dados) {
  const topReceitas = dados.gruposReceita
    .slice(0, 5)
    .map(item => ({ label: item.label, meta: 'Receita do periodo', valor: fmt(item.total), tom: 'good' }));
  const topDespesas = [...dados.gruposImpostos, ...dados.gruposDespesa]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(item => ({ label: item.label, meta: 'Saida realizada', valor: fmt(item.total), tom: 'bad' }));
  const serie = dados.serie.map(item => ({
    label: item.label,
    meta: `Receita ${fmt(item.receita)} • Despesa ${fmt(item.impostos + item.despesa + item.financeiroDespesa)}`,
    valor: finFmtAssinado(item.resultadoLiquido),
    tom: item.resultadoLiquido >= 0 ? 'good' : 'bad'
  }));
  const foraDre = [
    ...dados.gruposForaReceita.map(item => ({ label: item.label, meta: 'Entrada fora do DRE', valor: fmt(item.total), tom: 'good' })),
    ...dados.gruposForaDespesa.map(item => ({ label: item.label, meta: 'Saida fora do DRE', valor: `-${fmt(item.total)}`, tom: 'bad' }))
  ];
  return [
    finDreListaResumo('Composicao da receita', 'Como o resultado do periodo se formou pelo lado das entradas.', topReceitas, 'Nenhuma receita realizada neste periodo.'),
    finDreListaResumo('Maiores despesas', 'Os grupos que mais consumiram caixa no periodo selecionado.', topDespesas, 'Nenhuma despesa realizada neste periodo.'),
    finDreListaResumo('Evolucao no periodo', 'Leitura mes a mes do resultado liquido gerencial.', serie, 'Sem meses consolidados neste recorte.'),
    finDreListaResumo('Fora do DRE', 'Aportes e emprestimos ficam aqui para nao distorcer o resultado operacional.', foraDre, 'Nao houve movimentacoes fora do DRE.')
  ].join('');
}

function finDreBuildKpis(dados) {
  return [
    finResumoCard('Receitas', fmt(dados.receita), 'Entradas que compoem o resultado do periodo', '#2E9E6E', 'good', 'realized'),
    finResumoCard('Despesas operacionais', fmt(dados.despesa + dados.impostos), 'Saidas operacionais e impostos realizados', '#C05030', 'bad', 'outflow'),
    finResumoCard('Resultado operacional', finFmtAssinado(dados.resultadoOperacional), 'Receitas - impostos - despesas operacionais', dados.resultadoOperacional >= 0 ? '#2E9E6E' : '#C05030', dados.resultadoOperacional >= 0 ? 'good' : 'bad', 'total'),
    finResumoCard('Resultado financeiro', finFmtAssinado(dados.resultadoFinanceiro), 'Receitas financeiras - despesas financeiras', dados.resultadoFinanceiro >= 0 ? '#2E9E6E' : '#C05030', dados.resultadoFinanceiro >= 0 ? 'good' : 'bad', 'compare'),
    finResumoCard('Resultado liquido', finFmtAssinado(dados.resultadoLiquido), 'Leitura gerencial final do periodo', dados.resultadoLiquido >= 0 ? '#2E9E6E' : '#C05030', dados.resultadoLiquido >= 0 ? 'good' : 'bad', 'balance'),
    finResumoCard('Variacao de caixa', finFmtAssinado(dados.variacaoCaixa), 'Resultado liquido + movimentos fora do DRE', dados.variacaoCaixa >= 0 ? '#2E9E6E' : '#C05030', dados.variacaoCaixa >= 0 ? 'good' : 'bad', 'progress')
  ].join('');
}

function finExportarDreExcel() {
  try {
    if (!window.XLSX) throw new Error('Biblioteca de Excel indisponivel.');
    const meta = finDreMetaAtual();
    const dados = finMontarDadosDre(meta);
    const wb = XLSX.utils.book_new();

    const resumo = [
      ['DRE Gerencial', meta.etiqueta],
      ['Escopo', (finDreEscopos().find(item => item.id === meta.escopo) || { label: meta.escopo }).label],
      ['Unidade', finFiltroUnidade || 'Todas as unidades'],
      [],
      ['Conta', 'Valor'],
      ['Receitas', dados.receita],
      ['Impostos e taxas', -dados.impostos],
      ['Resultado bruto', dados.resultadoBruto],
      ['Despesas operacionais', -dados.despesa],
      ['Resultado operacional', dados.resultadoOperacional],
      ['Receitas financeiras', dados.financeiroReceita],
      ['Despesas financeiras', -dados.financeiroDespesa],
      ['Resultado financeiro', dados.resultadoFinanceiro],
      ['Resultado liquido gerencial', dados.resultadoLiquido],
      ['Entradas fora do DRE', dados.foraReceita],
      ['Saidas fora do DRE', -dados.foraDespesa],
      ['Variacao de caixa do periodo', dados.variacaoCaixa]
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    wsResumo['!cols'] = [{ wch: 34 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo DRE');

    const serie = [
      ['Competencia', 'Receitas', 'Impostos', 'Despesas operacionais', 'Resultado financeiro', 'Resultado liquido', 'Variacao de caixa'],
      ...dados.serie.map(item => [
        zUiText(item.label),
        item.receita,
        item.impostos,
        item.despesa,
        item.resultadoFinanceiro,
        item.resultadoLiquido,
        item.variacaoCaixa
      ])
    ];
    const wsSerie = XLSX.utils.aoa_to_sheet(serie);
    wsSerie['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSerie, 'Serie do Periodo');

    const lancamentos = [
      ['Data', 'Competencia', 'Origem', 'Natureza', 'Categoria', 'Grupo DRE', 'Descricao', 'Unidade', 'Valor'],
      ...dados.linhas.map(item => [
        finDateParaIso(item.dataRef),
        zUiText(item.competenciaLabel),
        zUiText(item.origem),
        zUiText(item.natureza === 'saida' ? 'Saida' : 'Entrada'),
        zUiText(item.categoria),
        zUiText(item.grupo),
        zUiText(item.descricao),
        zUiText(item.unidade || ''),
        item.natureza === 'saida' ? -item.valor : item.valor
      ])
    ];
    const wsLanc = XLSX.utils.aoa_to_sheet(lancamentos);
    wsLanc['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 26 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsLanc, 'Lancamentos');

    XLSX.writeFile(wb, `DRE_${meta.etiqueta.replace(/\s+/g, '_')}_${hoje().replace(/\//g, '-')}.xlsx`);
    showToast('✅', zUiText('Excel do DRE exportado com sucesso.'));
  } catch (erro) {
    console.error('Erro ao exportar DRE em Excel:', erro);
    showToast('❌', zUiText('Nao foi possivel exportar o DRE em Excel.'));
  }
}

function finDelta(atual, anterior) {
  const delta = atual - anterior;
  const pct = anterior > 0 ? (delta / anterior) * 100 : (atual > 0 ? 100 : 0);
  return { delta, pct };
}

function finFmtDelta(info) {
  if (!info.delta) return zUiText('Estavel');
  return info.delta > 0 ? `+${fmtK(info.delta)}` : `-${fmtK(Math.abs(info.delta))}`;
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
  if (item.origem === 'venda') {
    if (item.construtora) partes.push(item.construtora);
    if (item.gerente) partes.push(item.gerente);
  } else {
    if (item.categoria) partes.push(item.categoria);
    if (item.unidade) partes.push(item.unidade);
  }
  if (includeStatus) partes.push(finStatusItem(item));
  if (includeProof && finTemComprovante(item)) partes.push(item.natureza === 'saida' ? 'comprovante anexado' : 'anexo');
  return zUiText(partes.filter(Boolean).join(' · '));
}

function finTemComprovante(item) {
  return !!(item && ((item.comprovanteStorageBucket && item.comprovanteStoragePath) || item.comprovanteDataUrl || item.comprovanteLocalId));
}

function finPodeBaixaRapida(item) {
  return !!(item && item.origem === 'manual' && item.status !== 'realizado');
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
      finResumoCard('A vencer', fmt(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} lancamentos previstos`, '#C05030', '', 'outflow'),
      finResumoCard('Ja pagas', fmt(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
      finResumoCard('Total do mes', fmt(totalAtual), 'Previsto + pago', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#C05030' : '#2E9E6E', deltaMes.delta >= 0 ? 'bad' : 'good'),
      finResumoCard('% pago', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${fmt(atual.saidas.totalRealizado)} de ${fmt(totalAtual)}`, '#7A5A00', '', 'progress'),
      finResumoCard('Maior saida', fmt(maiorSaida), 'Maior valor projetado ou pago no periodo', '#8B6C1A', '', 'neutral')
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
      finResumoCard('Previsto no mes', fmt(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)'),
      finResumoCard('Ja recebido', fmt(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas realizadas`, '#2E9E6E', 'good'),
      finResumoCard('Total do mes', fmt(totalAtual), 'Comissoes + entradas manuais', '#3060B8'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#2E9E6E' : '#C05030', deltaMes.delta >= 0 ? 'good' : 'bad'),
      finResumoCard('% realizado', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${fmt(atual.entradas.totalRealizado)} de ${fmt(totalAtual)}`, '#2E9E6E', 'good'),
      finResumoCard('Manuais do mes', fmt(totalManuais), `${qtdManuais} entradas manuais no recorte`, '#8B6C1A')
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
    finResumoCard('Entradas previstas', fmt(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)'),
    finResumoCard('Entradas realizadas', fmt(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas recebidas`, '#2E9E6E', 'good'),
    finResumoCard('Saidas previstas', fmt(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} saidas previstas`, '#C05030', 'bad'),
    finResumoCard('Saidas pagas', fmt(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00'),
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
      finResumoCard('A vencer', fmt(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} lancamentos previstos`, '#C05030', '', 'outflow'),
      finResumoCard('Ja pagas', fmt(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
      finResumoCard('Total do mes', fmt(totalAtual), 'Previsto + pago', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#C05030' : '#2E9E6E', deltaMes.delta >= 0 ? 'bad' : 'good', 'compare'),
      finResumoCard('% pago', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${fmt(atual.saidas.totalRealizado)} de ${fmt(totalAtual)}`, '#7A5A00', '', 'progress'),
      finResumoCard('Maior saida', fmt(maiorSaida), 'Maior valor projetado ou pago no periodo', '#8B6C1A', '', 'neutral')
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
      finResumoCard('Previsto no mes', fmt(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)', '', 'projected'),
      finResumoCard('Ja recebido', fmt(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas realizadas`, '#2E9E6E', 'good', 'realized'),
      finResumoCard('Total do mes', fmt(totalAtual), 'Comissoes + entradas manuais', '#3060B8', '', 'total'),
      finResumoCard('Vs mes anterior', finFmtDelta(deltaMes), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaMes)}`, deltaMes.delta >= 0 ? '#2E9E6E' : '#C05030', deltaMes.delta >= 0 ? 'good' : 'bad', 'compare'),
      finResumoCard('% realizado', `${realizadoPct.toFixed(1).replace('.', ',')}%`, `${fmt(atual.entradas.totalRealizado)} de ${fmt(totalAtual)}`, '#2E9E6E', 'good', 'progress'),
      finResumoCard('Manuais do mes', fmt(totalManuais), `${qtdManuais} entradas manuais no recorte`, '#8B6C1A', '', 'neutral')
    ].join('');
  }

  const saldoEmConta = atual.entradas.totalRealizado - atual.saidas.totalRealizado;
  const saldoAnterior = anterior.entradas.totalRealizado - anterior.saidas.totalRealizado;
  const deltaSaldo = finDelta(saldoEmConta, saldoAnterior);
  const qtdManuais = atual.manuais.entradas.todos.length + atual.manuais.saidas.todos.length;

  return [
    finResumoCard('Entradas previstas', fmt(atual.entradas.totalPrevisto), `${atual.entradas.previstas.length} entradas projetadas`, 'var(--gold)', '', 'projected'),
    finResumoCard('Entradas realizadas', fmt(atual.entradas.totalRealizado), `${atual.entradas.realizadas.length} entradas recebidas`, '#2E9E6E', 'good', 'realized'),
    finResumoCard('Saidas previstas', fmt(atual.saidas.totalPrevisto), `${atual.saidas.previstas.length} saidas previstas`, '#C05030', 'bad', 'outflow'),
    finResumoCard('Saidas pagas', fmt(atual.saidas.totalRealizado), `${atual.saidas.realizadas.length} pagamentos realizados`, '#7A5A00', '', 'paid'),
    finResumoCard('Saldo liquido', finFmtAssinado(saldoEmConta), 'Entradas realizadas - saidas pagas', saldoEmConta >= 0 ? '#2E9E6E' : '#C05030', saldoEmConta >= 0 ? 'good' : 'bad', 'balance'),
    finResumoCard('Vs mes anterior', finFmtDelta(deltaSaldo), `${meses[finMesAtual]} vs ${meses[anteriorRef.mes]} • ${finFmtDeltaPct(deltaSaldo)} • ${qtdManuais} manuais`, deltaSaldo.delta >= 0 ? '#2E9E6E' : '#C05030', deltaSaldo.delta >= 0 ? 'good' : 'bad', 'compare')
  ].join('');
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
  if (item.origem === 'venda' && item.v && item.v.id) return `onclick="${prefixo}irParaVenda(${item.v.id})"`;
  const chave = finEscapeAttr(finChaveItem(item));
  return `onclick="${prefixo}finEditarLancamentoManual('${chave}')"`; 
}

function finNomeItem(item) {
  if (item.origem === 'venda') return item.descricao || 'COMISSAO';
  return item.descricao || item.categoria || (item.natureza === 'saida' ? 'SAIDA MANUAL' : 'ENTRADA MANUAL');
}

function finSideItem(item) {
  return `<div class="fcal-side-item-wrap">
    <button class="fcal-side-item ${finClasseItem(item)}" ${finAcaoItem(item)}>
      <div class="fcal-side-item-top">
        <strong>${zUiText(finNomeItem(item))}</strong>
        <span>${item.natureza === 'saida' ? `-${fmtK(item.valorBruto)}` : fmtK(item.valorBruto)}</span>
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
  const total = finVisao === 'geral' ? finFmtAssinado(finValorTotalDia(itens)) : fmt(finValorTotalDia(itens));
  const rotulo = finVisao === 'saidas' ? 'saidas' : finVisao === 'entradas' ? 'entradas' : 'movimentacoes';
  return `${itens.length} ${rotulo} em ${dataTexto} · Total ${total}`;
}

function finDetalheDiaItem(item) {
  const valor = item.natureza === 'saida' ? `-${fmt(item.valorBruto)}` : fmt(item.valorBruto);
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
      finSideList('Entradas manuais', 'Lancamentos criados manualmente para complementar as comissoes.', manuais, 'Nenhuma entrada manual neste mes.')
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
        ${itens.length ? `<div class="fcal-day-total${classeTotalDia}">${finVisao === 'geral' ? finFmtKAssinado(totalDia) : fmtK(totalDia)}</div>` : ''}
      </div>
      <div class="fcal-events">
        ${visiveis.map(item => `<button class="fcal-ev fcal-ev-${finClasseItem(item)}" ${finAcaoItemComOpcao(item, true)} title="${finEscapeAttr(finNomeItem(item))}">
          <div class="fcal-ev-top">
            <span class="fcal-ev-status">${finStatusItem(item, 'calendario')}</span>
            <strong>${item.natureza === 'saida' ? `-${fmtK(item.valorBruto)}` : fmtK(item.valorBruto)}</strong>
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

function finLancamentoAtual() {
  if (!finModalLancamentoId) return null;
  return (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).find(item => {
    const chave = item.refLocal || item.id || '';
    return String(chave) === String(finModalLancamentoId);
  }) || null;
}

function finModalTipoAtual() {
  const atual = finLancamentoAtual();
  if (atual) return tipoLancamentoFinanceiroNormalizado(atual.tipo);
  return finModalTipoPadrao || 'entrada';
}

function finResetComprovanteState() {
  finComprovanteFile = null;
  finComprovanteDataUrl = '';
  finComprovanteNome = '';
  finComprovanteMime = '';
  finComprovanteSize = 0;
  finComprovanteLocalId = '';
  finComprovanteRemovido = false;
}

function finPrepararComprovanteModal(item = null) {
  finResetComprovanteState();
  finModalBaixaRapida = false;
  if (!item) return;
  if (item.comprovanteNome) finComprovanteNome = item.comprovanteNome;
  if (item.comprovanteMime) finComprovanteMime = item.comprovanteMime;
  if (item.comprovanteSize) finComprovanteSize = item.comprovanteSize;
  if (item.comprovanteLocalId) finComprovanteLocalId = item.comprovanteLocalId;
}

function finChaveItem(item) {
  return String(item && (item.refLocal || (item.raw && item.raw.refLocal) || item.id || item.key || '') || '');
}

function finLancamentoPorChave(chave) {
  const alvo = String(chave || '').trim();
  if (!alvo) return null;
  return (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).find(item => {
    const atual = String(item && (item.refLocal || item.id || '') || '').trim();
    return atual && atual === alvo;
  }) || null;
}

function finComprovanteModalAtual(item = finLancamentoAtual()) {
  if (finComprovanteRemovido) return null;
  if (finComprovanteFile || finComprovanteDataUrl) {
    return {
      nome: finComprovanteNome || (finComprovanteFile && finComprovanteFile.name) || 'Comprovante',
      mime: finComprovanteMime || (finComprovanteFile && finComprovanteFile.type) || '',
      size: finComprovanteSize || (finComprovanteFile && finComprovanteFile.size) || 0,
      dataUrl: finComprovanteDataUrl || '',
      localId: finComprovanteLocalId || '',
      storageBucket: '',
      storagePath: '',
      origem: 'local'
    };
  }
  if (!item || !finTemComprovante(item)) return null;
  return {
    nome: item.comprovanteNome || 'Comprovante',
    mime: item.comprovanteMime || '',
    size: item.comprovanteSize || 0,
    dataUrl: item.comprovanteDataUrl || '',
    localId: item.comprovanteLocalId || '',
    storageBucket: item.comprovanteStorageBucket || '',
    storagePath: item.comprovanteStoragePath || '',
    origem: 'salvo'
  };
}

function finComprovanteResumo(item = finLancamentoAtual()) {
  const atual = finComprovanteModalAtual(item);
  if (!atual) return zUiText('Nenhum comprovante anexado');
  const ext = atual.nome && atual.nome.includes('.') ? atual.nome.split('.').pop().toUpperCase() : '';
  const prefixo = ext ? `${ext} · ` : '';
  return zUiText(`${prefixo}${atual.nome}${atual.size ? ` · ${finTamanhoArquivoTexto(atual.size)}` : ''}`);
}

function finAtualizarComprovanteModalUi() {
  const atual = finComprovanteModalAtual();
  const badge = document.getElementById('fin-comprovante-badge');
  const viewBtn = document.getElementById('fin-comprovante-view-btn');
  const removeBtn = document.getElementById('fin-comprovante-remove-btn');
  if (badge) badge.textContent = finComprovanteResumo();
  if (viewBtn) viewBtn.style.display = atual ? 'inline-flex' : 'none';
  if (removeBtn) removeBtn.style.display = atual ? 'inline-flex' : 'none';
}

async function finSelecionarComprovanteFile(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file) return;
  const mime = String(file.type || '').toLowerCase();
  const nome = String(file.name || '').toLowerCase();
  const permitido = mime === 'application/pdf' || mime.startsWith('image/') || /\.(pdf|jpg|jpeg|png|webp)$/i.test(nome);
  if (!permitido) {
    showToast('⚠️', zUiText('Use um comprovante em PDF ou imagem.'));
    if (event && event.target) event.target.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️', zUiText('O comprovante deve ter no maximo 10MB.'));
    if (event && event.target) event.target.value = '';
    return;
  }
  try {
    finComprovanteDataUrl = await finLerArquivoComoDataUrl(file);
    finComprovanteFile = file;
    finComprovanteNome = file.name || 'comprovante';
    finComprovanteMime = file.type || '';
    finComprovanteSize = file.size || 0;
    finComprovanteRemovido = false;
    finAtualizarComprovanteModalUi();
  } catch (erro) {
    showToast('❌', zUiText('Nao foi possivel ler o comprovante selecionado.'));
  } finally {
    if (event && event.target) event.target.value = '';
  }
  /* if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  } */
}

function finLimparComprovanteSelecionado() {
  const atual = finComprovanteModalAtual();
  if (!atual) return;
  finComprovanteFile = null;
  finComprovanteDataUrl = '';
  finComprovanteNome = '';
  finComprovanteMime = '';
  finComprovanteSize = 0;
  finComprovanteRemovido = true;
  finAtualizarComprovanteModalUi();
}

function finMarcarModalComoRealizado(focoComprovante = false) {
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaEl = document.getElementById('fin-lanc-data-realizada');
  if (!statusEl) return;
  statusEl.value = 'realizado';
  if (dataRealizadaEl && !dataRealizadaEl.value) dataRealizadaEl.value = finDateParaIso(finHojeRef());
  finAtualizarCamposModalLancamento();
  if (focoComprovante) {
    const alvo = document.getElementById('fin-comprovante-trigger');
    if (alvo) alvo.focus();
  }
  /* if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  } */
}

function finAbrirBaixaLancamento(chave) {
  finEditarLancamentoManual(chave);
  finModalBaixaRapida = true;
  renderFinanceiro();
  setTimeout(() => finMarcarModalComoRealizado(true), 80);
}

function finAbrirArquivoComprovante(url) {
  const win = window.open(url, '_blank', 'noopener');
  if (!win) {
    showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
    return false;
  }
  return true;
}

async function finAbrirComprovante(item = null) {
  const atual = finComprovanteModalAtual(item || finLancamentoAtual());
  if (!atual) return;
  if (atual.dataUrl) {
    finAbrirArquivoComprovante(atual.dataUrl);
    return;
  }
  if (atual.storageBucket && atual.storagePath && typeof dbBaixarDocumentoArquivo === 'function') {
    try {
      const blob = await dbBaixarDocumentoArquivo({
        storageBucket: atual.storageBucket,
        storagePath: atual.storagePath,
        dataUrl: atual.dataUrl || ''
      });
      if (!blob) throw new Error('Blob do comprovante indisponivel.');
      const url = URL.createObjectURL(blob);
      finAbrirArquivoComprovante(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      console.warn('Falha ao abrir comprovante salvo do financeiro:', erro);
    }
  }
  if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('⚠️', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      finAbrirArquivoComprovante(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      console.warn('Falha ao abrir comprovante local do financeiro:', erro);
    }
  }
  showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante deste lancamento.'));
}

async function finVerComprovanteLancamento(chave) {
  const item = finLancamentoPorChave(chave);
  if (!item) {
    showToast('⚠️', zUiText('Nao encontramos este lancamento para abrir o comprovante.'));
    return;
  }
  await finAbrirComprovante(item);
}

function finAcoesSecundariasItem(item) {
  const chave = finEscapeAttr(finChaveItem(item));
  const acoes = [];
  if (finTemComprovante(item)) {
    acoes.push(`<button class="fcal-side-action-btn secondary" type="button" onclick="event.stopPropagation();finVerComprovanteLancamento('${chave}')">${zUiText('Ver comprovante')}</button>`);
  }
  if (finPodeBaixaRapida(item)) {
    acoes.push(`<button class="fcal-side-action-btn" type="button" onclick="event.stopPropagation();finAbrirBaixaLancamento('${chave}')">${zUiText(finRotuloBaixaRapida(item))}</button>`);
  }
  if (!acoes.length) return '';
  return `<div class="fcal-side-actions">${acoes.join('')}</div>`;
}

async function finVerComprovanteAtual() {
  await finAbrirComprovante();
  return;
  const atual = finComprovanteModalAtual();
  if (!atual) return;
  if (atual.dataUrl) {
    const win = window.open(atual.dataUrl, '_blank', 'noopener');
    if (!win) showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
    return;
  }
  if ((atual.storageBucket || atual.storagePath) && typeof dbBaixarDocumentoArquivo === 'function') {
    try {
      const blob = await dbBaixarDocumentoArquivo({
        storageBucket: atual.storageBucket,
        storagePath: atual.storagePath,
        dataUrl: atual.dataUrl || ''
      });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('❌', zUiText('Falha ao abrir o comprovante salvo.'));
    }
  }
  if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  }
}

function finAbrirModalLancamento(tipo = '') {
  finResetDetalheDiaState();
  finModalAberto = true;
  finModalLancamentoId = '';
  finModalTipoPadrao = tipo || finTipoPadraoNovaAcao() || 'entrada';
  finResetCategoriaNovaState();
  finPrepararComprovanteModal(null);
  renderFinanceiro();
  setTimeout(() => {
    const foco = document.getElementById('fin-lanc-descricao');
    if (foco) foco.focus();
    finAtualizarCamposModalLancamento();
  }, 50);
}

function finEditarLancamentoManual(chave) {
  const item = (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : []).find(entry => String(entry.refLocal || entry.id || '') === String(chave || '')) || null;
  finResetDetalheDiaState();
  finModalAberto = true;
  finModalLancamentoId = String(chave || '');
  finModalTipoPadrao = '';
  finResetCategoriaNovaState();
  finPrepararComprovanteModal(item);
  renderFinanceiro();
  setTimeout(() => {
    const foco = document.getElementById('fin-lanc-descricao');
    if (foco) foco.focus();
    finAtualizarCamposModalLancamento();
  }, 50);
}

function finFecharModalLancamento() {
  finModalAberto = false;
  finModalLancamentoId = '';
  finModalTipoPadrao = '';
  finResetCategoriaNovaState();
  finResetComprovanteState();
  finModalBaixaRapida = false;
  renderFinanceiro();
}

function finHandleBackdropModal(event) {
  if (event.target === document.getElementById('m-fin-lanc')) finFecharModalLancamento();
}

function finAtualizarCamposModalLancamento() {
  const tipoEl = document.getElementById('fin-lanc-tipo');
  const categoriaEl = document.getElementById('fin-lanc-categoria');
  const categoriaNovaEl = document.getElementById('fin-lanc-categoria-nova');
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaWrap = document.getElementById('fin-lanc-realizada-wrap');
  const helpEl = document.getElementById('fin-lanc-status-help');
  const descricaoEl = document.getElementById('fin-lanc-descricao');
  const observacaoEl = document.getElementById('fin-lanc-observacao');
  const realizarBtn = document.getElementById('fin-lanc-realizar-btn');
  const comprovanteHelpEl = document.getElementById('fin-comprovante-help');
  if (!tipoEl || !categoriaEl || !statusEl) return;

  if (categoriaNovaEl) finAtualizarCategoriaNovaValor(categoriaNovaEl.value || '', categoriaNovaEl);
  const tipo = tipoLancamentoFinanceiroNormalizado(tipoEl.value);
  const categoriaAtual = finTextoMaiusculo(categoriaEl.value);
  const categorias = finCategoriasPorTipo(tipo, categoriaAtual ? [categoriaAtual] : []);
  categoriaEl.innerHTML = categorias.map(item => `<option value="${finEscapeAttr(item)}">${zUiText(item)}</option>`).join('');
  categoriaEl.value = categorias.includes(categoriaAtual) ? categoriaAtual : (categorias[0] || '');

  if (dataRealizadaWrap) dataRealizadaWrap.style.display = statusEl.value === 'realizado' ? 'block' : 'none';
  if (helpEl) {
    helpEl.textContent = zUiText(
      statusEl.value === 'realizado'
        ? (tipo === 'saida' ? 'Esta saida entra no caixa como paga.' : 'Esta entrada entra no caixa como recebida.')
        : (tipo === 'saida' ? 'Esta saida entra no caixa como compromisso futuro.' : 'Esta entrada entra no caixa como previsao futura.')
    );
  }
  if (descricaoEl) {
    finAtualizarCampoMaiusculo(descricaoEl);
    descricaoEl.placeholder = zUiText(tipo === 'saida'
      ? 'EX: ALUGUEL DA UNIDADE CENTRO, IMPOSTO, CRM...'
      : 'EX: APORTE DOS SOCIOS, REEMBOLSO, BONIFICACAO...');
  }
  if (observacaoEl) finAtualizarCampoMaiusculo(observacaoEl);
  if (realizarBtn) {
    const atual = finLancamentoAtual();
    const podeMostrar = !!(atual && atual.origem !== 'venda' && statusEl.value !== 'realizado');
    realizarBtn.style.display = podeMostrar ? 'inline-flex' : 'none';
    realizarBtn.textContent = zUiText(tipo === 'saida' ? 'Dar como pago' : 'Dar como recebido');
  }
  if (comprovanteHelpEl) {
    comprovanteHelpEl.textContent = zUiText(
      statusEl.value === 'realizado'
        ? (tipo === 'saida'
          ? 'Anexe o comprovante do pagamento em foto ou PDF.'
          : 'Se existir, anexe o comprovante do recebimento em foto ou PDF.')
        : 'Opcional. Quando a movimentacao for realizada, voce pode anexar foto ou PDF do comprovante.'
    );
  }
  finAtualizarCategoriaNovaUi();
  finAtualizarComprovanteModalUi();
}

function finOrdenarLancamentosLocais(a, b) {
  const dataA = String(a && a.dataRealizada || a && a.dataPrevista || '');
  const dataB = String(b && b.dataRealizada || b && b.dataPrevista || '');
  if (dataA !== dataB) return dataA.localeCompare(dataB);
  return finValorSeguro(b && b.valor) - finValorSeguro(a && a.valor);
}

async function finSalvarLancamento() {
  const tipoEl = document.getElementById('fin-lanc-tipo');
  const categoriaEl = document.getElementById('fin-lanc-categoria');
  const categoriaNovaEl = document.getElementById('fin-lanc-categoria-nova');
  const descricaoEl = document.getElementById('fin-lanc-descricao');
  const unidadeEl = document.getElementById('fin-lanc-unidade');
  const dataPrevistaEl = document.getElementById('fin-lanc-data-prevista');
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaEl = document.getElementById('fin-lanc-data-realizada');
  const valorEl = document.getElementById('fin-lanc-valor');
  const observacaoEl = document.getElementById('fin-lanc-observacao');
  const btn = document.getElementById('fin-lanc-save-btn');
  if (!tipoEl || !categoriaEl || !descricaoEl || !dataPrevistaEl || !statusEl || !valorEl) return;

  const tipo = tipoLancamentoFinanceiroNormalizado(tipoEl.value);
  const categoriaNova = finTextoMaiusculo(categoriaNovaEl && categoriaNovaEl.value || '');
  const categoria = finTextoMaiusculo((finCategoriaNovaAtiva && categoriaNova) ? categoriaNova : (categoriaEl.value || ''));
  const descricao = finTextoMaiusculo(descricaoEl.value || '');
  const unidade = unidadeEl ? String(unidadeEl.value || '').trim() : '';
  const dataPrevista = String(dataPrevistaEl.value || '').trim();
  const status = statusLancamentoFinanceiroNormalizado(statusEl.value);
  const dataRealizada = status === 'realizado' ? String(dataRealizadaEl && dataRealizadaEl.value || '').trim() : '';
  const valor = finValorSeguro(valorEl.value);
  const observacao = finTextoMaiusculo(observacaoEl && observacaoEl.value || '');

  if (categoriaNovaEl) categoriaNovaEl.value = categoriaNova;
  if (descricaoEl) descricaoEl.value = descricao;
  if (observacaoEl) observacaoEl.value = observacao;

  if (!categoria) { showToast('⚠️', zUiText('Selecione a categoria do lancamento.')); return; }
  if (finCategoriaNovaAtiva && !categoriaNova) { showToast('⚠️', zUiText('Digite o nome da nova categoria para continuar.')); return; }
  if (!descricao) { showToast('⚠️', zUiText('Descreva a movimentacao para facilitar a leitura do caixa.')); return; }
  if (!finDataValidaIso(dataPrevista)) { showToast('⚠️', zUiText('Informe a data prevista do lancamento.')); return; }
  if (status === 'realizado' && !finDataValidaIso(dataRealizada)) { showToast('⚠️', zUiText('Informe a data realizada do lancamento.')); return; }
  if (valor <= 0) { showToast('⚠️', zUiText('Informe um valor maior que zero.')); return; }

  const existente = finLancamentoAtual();
  const agoraIso = new Date().toISOString();
  const comprovanteAnterior = existente ? {
    nome: existente.comprovanteNome || '',
    mime: existente.comprovanteMime || '',
    size: finValorSeguro(existente.comprovanteSize),
    dataUrl: existente.comprovanteDataUrl || '',
    localId: existente.comprovanteLocalId || '',
    storageBucket: existente.comprovanteStorageBucket || '',
    storagePath: existente.comprovanteStoragePath || ''
  } : null;
  const alvo = existente || {
    id: Date.now(),
    refLocal: typeof gerarRefLocalFinanceiro === 'function' ? gerarRefLocalFinanceiro() : `fin-${Date.now()}`,
    criadoPor: usuarioLogado ? (usuarioLogado.nome || '') : 'Sistema',
    criadoPorId: usuarioLogado ? (parseInt(usuarioLogado.id, 10) || 0) : 0,
    criadoPorEmail: usuarioLogado ? (usuarioLogado.email || '') : '',
    syncPendente: false,
    syncErro: ''
  };

  alvo.tipo = tipo;
  alvo.categoria = categoria;
  alvo.descricao = descricao;
  alvo.unidade = unidade;
  alvo.dataPrevista = dataPrevista;
  alvo.status = status;
  alvo.dataRealizada = status === 'realizado' ? dataRealizada : '';
  alvo.valor = valor;
  alvo.observacao = observacao;
  alvo.atualizadoEm = agoraIso;
  if (finComprovanteRemovido) {
    alvo.comprovanteNome = '';
    alvo.comprovanteMime = '';
    alvo.comprovanteSize = 0;
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteLocalId = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  } else if (finComprovanteFile) {
    alvo.comprovanteNome = finComprovanteNome || finComprovanteFile.name || 'comprovante';
    alvo.comprovanteMime = finComprovanteMime || finComprovanteFile.type || '';
    alvo.comprovanteSize = finComprovanteSize || finComprovanteFile.size || 0;
    alvo.comprovanteLocalId = finComprovanteLocalId || alvo.refLocal || '';
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  } else if (comprovanteAnterior) {
    alvo.comprovanteNome = comprovanteAnterior.nome;
    alvo.comprovanteMime = comprovanteAnterior.mime;
    alvo.comprovanteSize = comprovanteAnterior.size;
    alvo.comprovanteDataUrl = comprovanteAnterior.dataUrl;
    alvo.comprovanteLocalId = comprovanteAnterior.localId;
    alvo.comprovanteStorageBucket = comprovanteAnterior.storageBucket;
    alvo.comprovanteStoragePath = comprovanteAnterior.storagePath;
  } else {
    alvo.comprovanteNome = '';
    alvo.comprovanteMime = '';
    alvo.comprovanteSize = 0;
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteLocalId = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  }

  if (finComprovanteFile && alvo.comprovanteLocalId && typeof salvarFinanceiroComprovanteLocal === 'function') {
    try {
      await salvarFinanceiroComprovanteLocal(alvo.comprovanteLocalId, finComprovanteFile, {
        nome: alvo.comprovanteNome,
        mime: alvo.comprovanteMime,
        size: alvo.comprovanteSize
      });
      finComprovanteLocalId = alvo.comprovanteLocalId;
    } catch (erroComprovanteLocal) {
      console.warn('Falha ao persistir comprovante local do financeiro. Usando fallback em dataUrl.', erroComprovanteLocal);
      alvo.comprovanteDataUrl = finComprovanteDataUrl || '';
      alvo.comprovanteLocalId = '';
    }
  } else if (finComprovanteFile) {
    alvo.comprovanteDataUrl = finComprovanteDataUrl || '';
  }

  if (!existente) {
    FINANCEIRO_LANCAMENTOS.push(alvo);
  }
  FINANCEIRO_LANCAMENTOS.sort(finOrdenarLancamentosLocais);
  zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
  if (typeof salvarLS === 'function') salvarLS();

  if (btn) {
    btn.disabled = true;
    btn.textContent = zUiText('Salvando...');
  }

  finFecharModalLancamento();

  try {
    if (finComprovanteFile && typeof dbUploadDocumentoArquivo === 'function') {
      try {
        const upload = await dbUploadDocumentoArquivo(finComprovanteFile, {
          folder: 'financeiro/comprovantes'
        });
        alvo.comprovanteStorageBucket = upload.bucket || '';
        alvo.comprovanteStoragePath = upload.path || '';
        alvo.comprovanteDataUrl = '';
        if (alvo.comprovanteLocalId && typeof excluirFinanceiroComprovanteLocal === 'function') {
          await excluirFinanceiroComprovanteLocal(alvo.comprovanteLocalId).catch(() => true);
        }
        alvo.comprovanteLocalId = '';
      } catch (erroUploadComprovante) {
        if (!alvo.comprovanteLocalId) alvo.comprovanteDataUrl = finComprovanteDataUrl || alvo.comprovanteDataUrl || '';
        console.warn('Falha ao enviar comprovante do financeiro. Mantendo anexo local pendente.', erroUploadComprovante);
      }
    }
    if (typeof dbSalvarLancamentoFinanceiro === 'function') {
      await dbSalvarLancamentoFinanceiro(alvo, existente ? existente.id : 0);
    }
    const comprovantePendente = !!((alvo.comprovanteLocalId || alvo.comprovanteDataUrl) && !alvo.comprovanteStoragePath);
    if (comprovantePendente) {
      alvo.syncPendente = true;
      alvo.syncErro = alvo.syncErro || 'Comprovante pendente de sincronizacao.';
    } else {
      alvo.syncPendente = false;
      alvo.syncErro = '';
    }
    const trocouComprovanteStorage = !!(
      comprovanteAnterior &&
      comprovanteAnterior.storageBucket &&
      comprovanteAnterior.storagePath &&
      (finComprovanteRemovido || (
        alvo.comprovanteStorageBucket &&
        alvo.comprovanteStoragePath &&
        (
          alvo.comprovanteStorageBucket !== comprovanteAnterior.storageBucket ||
          alvo.comprovanteStoragePath !== comprovanteAnterior.storagePath
        )
      ))
    );
    if (trocouComprovanteStorage && typeof dbExcluirDocumentoArquivo === 'function') {
      try {
        await dbExcluirDocumentoArquivo({
          storageBucket: comprovanteAnterior.storageBucket,
          storagePath: comprovanteAnterior.storagePath
        });
      } catch (erroExcluirComprovante) {
        console.warn('Falha ao remover comprovante antigo do financeiro:', erroExcluirComprovante);
      }
    }
    if (comprovanteAnterior && comprovanteAnterior.localId && comprovanteAnterior.localId !== (alvo.comprovanteLocalId || '') && typeof excluirFinanceiroComprovanteLocal === 'function') {
      try {
        await excluirFinanceiroComprovanteLocal(comprovanteAnterior.localId);
      } catch (erroExcluirComprovanteLocal) {
        console.warn('Falha ao remover comprovante local antigo do financeiro:', erroExcluirComprovanteLocal);
      }
    }
    FINANCEIRO_LANCAMENTOS.sort(finOrdenarLancamentosLocais);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    if (typeof salvarLS === 'function') salvarLS();
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    if (comprovantePendente) {
      showToast('âš ï¸', zUiText(tipo === 'saida'
        ? 'Saida salva. O comprovante ficara pendente ate sincronizar com o storage.'
        : 'Entrada salva. O comprovante ficara pendente ate sincronizar com o storage.'));
    } else {
    showToast('✅', zUiText(tipo === 'saida' ? 'Saida salva no caixa.' : 'Entrada salva no caixa.'));
    }
  } catch (erro) {
    if (typeof salvarLS === 'function') salvarLS();
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    showToast('⚠️', zUiText('Lancamento salvo apenas neste navegador. O Supabase nao confirmou a gravacao.'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText(existente ? 'Salvar alteracoes' : 'Salvar lancamento');
    }
  }
}

async function finExcluirLancamentoAtual() {
  const atual = finLancamentoAtual();
  if (!atual) return;
  if (!confirm(zUiText(`Excluir o lancamento "${atual.descricao}" do caixa?`))) return;

  const indice = FINANCEIRO_LANCAMENTOS.findIndex(item => String(item.refLocal || item.id || '') === String(atual.refLocal || atual.id || ''));
  if (indice < 0) return;
  const [removido] = FINANCEIRO_LANCAMENTOS.splice(indice, 1);
  zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
  if (typeof salvarLS === 'function') salvarLS();
  finFecharModalLancamento();

  try {
    if (removido && (removido.id || removido.refLocal) && typeof dbExcluirLancamentoFinanceiro === 'function') {
      await dbExcluirLancamentoFinanceiro(removido);
    }
    if (removido && removido.comprovanteLocalId && typeof excluirFinanceiroComprovanteLocal === 'function') {
      try {
        await excluirFinanceiroComprovanteLocal(removido.comprovanteLocalId);
      } catch (erroExcluirComprovanteLocal) {
        console.warn('Falha ao excluir comprovante local do financeiro:', erroExcluirComprovanteLocal);
      }
    }
    if (removido && removido.comprovanteStorageBucket && removido.comprovanteStoragePath && typeof dbExcluirDocumentoArquivo === 'function') {
      try {
        await dbExcluirDocumentoArquivo({
          storageBucket: removido.comprovanteStorageBucket,
          storagePath: removido.comprovanteStoragePath
        });
      } catch (erroExcluirComprovante) {
        console.warn('Falha ao excluir comprovante do financeiro:', erroExcluirComprovante);
      }
    }
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    showToast('✅', zUiText('Lancamento removido do caixa.'));
  } catch (erro) {
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    showToast('⚠️', zUiText('Lancamento removido localmente, mas o Supabase nao confirmou a exclusao.'));
  }
}

function finSetVisao(visao) {
  finResetDetalheDiaState();
  finVisao = ['geral', 'entradas', 'saidas', 'dre'].includes(visao) ? visao : 'geral';
  finFiltroSituacao = '';
  finFiltroCategoria = '';
  finFiltroFaixa = '';
  if (!finTemFiltrosVenda()) {
    finFiltroConstrutora = '';
    finFiltroGerente = '';
  }
  if (finVisao === 'dre') finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function finSetFiltro(chave, valor) {
  finResetDetalheDiaState();
  if (chave === 'unidade') finFiltroUnidade = valor || '';
  if (chave === 'construtora') finFiltroConstrutora = valor || '';
  if (chave === 'gerente') finFiltroGerente = valor || '';
  if (chave === 'situacao') finFiltroSituacao = valor || '';
  if (chave === 'faixa') finFiltroFaixa = valor || '';
  if (chave === 'categoria') finFiltroCategoria = valor || '';
  syncFinState();
  renderFinanceiro();
}

function finAnterior() {
  finResetDetalheDiaState();
  if (finVisao === 'dre') {
    finDreMover(-1);
    syncFinState();
    renderFinanceiro();
    return;
  }
  finMesAtual--;
  if (finMesAtual < 0) {
    finMesAtual = 11;
    finAnoAtual--;
  }
  syncFinState();
  renderFinanceiro();
}

function finProximo() {
  finResetDetalheDiaState();
  if (finVisao === 'dre') {
    finDreMover(1);
    syncFinState();
    renderFinanceiro();
    return;
  }
  finMesAtual++;
  if (finMesAtual > 11) {
    finMesAtual = 0;
    finAnoAtual++;
  }
  syncFinState();
  renderFinanceiro();
}

function finHoje() {
  finResetDetalheDiaState();
  const hoje = new Date();
  finMesAtual = hoje.getMonth();
  finAnoAtual = hoje.getFullYear();
  if (finVisao === 'dre') finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function renderFinanceiro() {
  const alvo = document.getElementById('financeiro-content');
  if (!alvo) return;
  alvo.style.padding = '12px';
  alvo.style.overflowY = 'auto';
  alvo.style.overflowX = 'hidden';
  alvo.style.background = 'linear-gradient(180deg,#FCFBF7 0%,#FAF7EF 100%)';

  if (!['dono','fin','dir'].includes(role)) {
    alvo.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;">
      <div style="font-size:48px;">${zUiText('🔒')}</div>
      <div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Acesso restrito')}</div>
      <div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;">${zUiText('Apenas Dono, Diretor e Financeiro tem acesso a este modulo.')}</div>
    </div>`;
    return;
  }

  syncFinState();

  const meses = finMeses();
  const mes = finMesAtual;
  const ano = finAnoAtual;
  const hoje = new Date();
  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const unidades = finUnidadesDisponiveis();
  const categorias = finCategoriasDisponiveis();
  const construtoras = finTemFiltrosVenda() ? finOpcoes((Array.isArray(VENDAS) ? VENDAS : []).map(v => v.construtora)) : [];
  const gerentes = finTemFiltrosVenda() ? finOpcoes((Array.isArray(VENDAS) ? VENDAS : []).map(v => v.gerente)) : [];
  const dreMeta = finVisao === 'dre' ? finDreMetaAtual() : null;
  const dreDados = dreMeta ? finMontarDadosDre(dreMeta) : null;
  const anosDre = finVisao === 'dre' ? finDreAnosDisponiveis() : [];

  const atual = finColetarMes(mes, ano);
  const anteriorRef = finPeriodoComparado();
  const anterior = finColetarMes(anteriorRef.mes, anteriorRef.ano);

  const dataInicioRecorte = (mes === hoje.getMonth() && ano === hoje.getFullYear())
    ? new Date(ano, mes, hoje.getDate(), 12, 0, 0, 0)
    : new Date(ano, mes, 1, 12, 0, 0, 0);
  const dataFim7 = new Date(dataInicioRecorte.getTime());
  dataFim7.setDate(dataFim7.getDate() + 7);

  const movimentacoesVisiveis = finVisao === 'dre'
    ? (dreDados && Array.isArray(dreDados.linhas) ? dreDados.linhas : [])
    : finVisao === 'entradas'
    ? atual.entradas.todos
    : finVisao === 'saidas'
      ? atual.saidas.todos
      : atual.todos;

  const calendarioHtml = finBuildCalendario(atual, ano, mes, hoje, primeiroDia, diasNoMes);
  const kpisHtml = finBuildKpisPainel(atual, anterior, anteriorRef, meses);
  const cardsLaterais = finBuildSideCards(atual, dataInicioRecorte, dataFim7);
  const legenda = finLegendaAtual();
  const detalheDiaItens = finDiaDetalheAberto ? finItensDoDia(atual, finDiaDetalheAtual) : [];
  const detalheDiaAtivo = !!(finDiaDetalheAberto && finDiaDetalheAtual && detalheDiaItens.length);
  const itemEditando = finLancamentoAtual();
  const tipoModal = finModalTipoAtual();
  const categoriaModal = itemEditando ? (itemEditando.categoria || '') : (finCategoriasPorTipo(tipoModal)[0] || '');
  const statusModal = itemEditando ? statusLancamentoFinanceiroNormalizado(itemEditando.status) : 'previsto';
  const actionLabel = finVisao === 'saidas' ? 'Nova saida' : finVisao === 'entradas' ? 'Nova entrada' : 'Novo lancamento';
  const podeEscolherTipo = !itemEditando && finVisao === 'geral';
  const comprovanteModalAtual = finComprovanteModalAtual(itemEditando);
  const tituloModal = itemEditando
    ? (finModalBaixaRapida
      ? (tipoModal === 'saida' ? 'Registrar pagamento' : 'Registrar recebimento')
      : 'Editar lancamento do caixa')
    : actionLabel;
  const tituloPainel = finVisao === 'dre'
    ? `${zUiText('Financeiro')} · ${zUiText('DRE')} · ${zUiText(dreMeta && dreMeta.etiqueta || '')}`
    : `${zUiText('Financeiro')} · ${zUiText(meses[mes])} ${ano}`;
  const subtituloPainel = finVisao === 'dre'
    ? zUiText('Demonstrativo gerencial consolidado com base nas movimentacoes realizadas do periodo.')
    : zUiText(finSubtituloVisao());
  const filtroDrePeriodoHtml = finVisao === 'dre'
    ? (dreMeta.escopo === 'mes'
      ? `<select onchange="finDreSetIndice(this.value)">${meses.map((item, idx) => `<option value="${idx + 1}" ${dreMeta.indice === idx + 1 ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}</select>`
      : dreMeta.escopo === 'trimestre'
        ? `<select onchange="finDreSetIndice(this.value)">
            <option value="1" ${dreMeta.indice === 1 ? 'selected' : ''}>${zUiText('1º trimestre')}</option>
            <option value="2" ${dreMeta.indice === 2 ? 'selected' : ''}>${zUiText('2º trimestre')}</option>
            <option value="3" ${dreMeta.indice === 3 ? 'selected' : ''}>${zUiText('3º trimestre')}</option>
            <option value="4" ${dreMeta.indice === 4 ? 'selected' : ''}>${zUiText('4º trimestre')}</option>
          </select>`
        : dreMeta.escopo === 'semestre'
          ? `<select onchange="finDreSetIndice(this.value)">
              <option value="1" ${dreMeta.indice === 1 ? 'selected' : ''}>${zUiText('1º semestre')}</option>
              <option value="2" ${dreMeta.indice === 2 ? 'selected' : ''}>${zUiText('2º semestre')}</option>
            </select>`
          : '')
    : '';
  const filtroBarHtml = finVisao === 'dre'
    ? `
      <div class="fcal-filterbar dre-toolbar">
        <div class="fcal-filter-group">
          <div class="dre-scope-switch">
            ${finDreEscopos().map(item => `<button class="${finDreEscopo === item.id ? 'active' : ''}" type="button" onclick="finDreSetEscopo('${item.id}')">${zUiText(item.label)}</button>`).join('')}
          </div>
          <select onchange="finDreSetAno(this.value)">
            ${anosDre.map(item => `<option value="${item}" ${item === finAnoAtual ? 'selected' : ''}>${item}</option>`).join('')}
          </select>
          ${filtroDrePeriodoHtml}
          <select onchange="finSetFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas as unidades')}</option>
            ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroUnidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
        </div>
        <div class="fcal-filter-right">
          <div class="fcal-filter-meta">${zUiText(`${movimentacoesVisiveis.length} movimentos realizados no recorte`)}</div>
          <button class="fcal-add-btn" type="button" onclick="finExportarDreExcel()">${zUiText('⬇ Excel DRE')}</button>
        </div>
      </div>`
    : `
      <div class="fcal-filterbar">
        <div class="fcal-filter-group">
          <select onchange="finSetFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas as unidades')}</option>
            ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroUnidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
          ${finTemFiltrosVenda() ? `
            <select onchange="finSetFiltro('construtora', this.value)">
              <option value="">${zUiText('Todas as construtoras')}</option>
              ${construtoras.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroConstrutora === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
            </select>
            <select onchange="finSetFiltro('gerente', this.value)">
              <option value="">${zUiText('Todos os gerentes')}</option>
              ${gerentes.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroGerente === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
            </select>` : ''}
          <select onchange="finSetFiltro('situacao', this.value)">
            <option value="">${zUiText('Todas as situacoes')}</option>
            <option value="realizado" ${finFiltroSituacao === 'realizado' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('realizado'))}</option>
            <option value="previsto" ${finFiltroSituacao === 'previsto' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('previsto'))}</option>
            <option value="atrasado" ${finFiltroSituacao === 'atrasado' ? 'selected' : ''}>${zUiText(finRotuloFiltroSituacao('atrasado'))}</option>
          </select>
          <select onchange="finSetFiltro('categoria', this.value)">
            <option value="">${zUiText('Todas as categorias')}</option>
            ${categorias.map(item => `<option value="${finEscapeAttr(item)}" ${finFiltroCategoria === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
          </select>
          <select onchange="finSetFiltro('faixa', this.value)">
            <option value="">${zUiText('Todas as faixas')}</option>
            <option value="ate5" ${finFiltroFaixa === 'ate5' ? 'selected' : ''}>${zUiText('Ate R$ 5k')}</option>
            <option value="5a10" ${finFiltroFaixa === '5a10' ? 'selected' : ''}>${zUiText('R$ 5k a R$ 10k')}</option>
            <option value="10a20" ${finFiltroFaixa === '10a20' ? 'selected' : ''}>${zUiText('R$ 10k a R$ 20k')}</option>
            <option value="20mais" ${finFiltroFaixa === '20mais' ? 'selected' : ''}>${zUiText('Acima de R$ 20k')}</option>
          </select>
        </div>
        <div class="fcal-filter-right">
          <div class="fcal-filter-meta">${zUiText(`${movimentacoesVisiveis.length} movimentacoes no recorte`)}</div>
          <button class="fcal-add-btn" onclick="finAbrirModalLancamento('${finEscapeAttr(finTipoPadraoNovaAcao() || 'entrada')}')">+ ${zUiText(actionLabel)}</button>
        </div>
      </div>`;
  const conteudoPrincipalHtml = finVisao === 'dre'
    ? `
      <div class="fcal-kpis">${finDreBuildKpis(dreDados)}</div>
      <div class="fcal-board dre-board">
        <div class="dre-main-wrap">${finDreBuildTabela(dreDados)}</div>
        <div class="fcal-side-wrap dre-side-wrap">${finDreBuildSide(dreDados)}</div>
      </div>`
    : `
      <div class="fcal-kpis">${kpisHtml}</div>
      <div class="fcal-board">
        <div class="fcal-calendar-card">
          <div class="fcal-grid-header">${diasSemana.map(item => `<div class="fcal-dow">${zUiText(item)}</div>`).join('')}</div>
          <div class="fcal-grid">${calendarioHtml}</div>
          <div class="fcal-legend">
            ${legenda.map(item => `<span><span class="fcal-leg-dot" style="${finLegendaStyle(item.classe)}"></span>${zUiText(item.label)}</span>`).join('')}
          </div>
        </div>
        <div class="fcal-side-wrap">${cardsLaterais}</div>
      </div>`;

  alvo.innerHTML = `
  <style>
    .fcal-wrap{display:flex;flex-direction:column;gap:10px;min-height:100%;padding:0;background:transparent;}
    .fcal-header{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;padding:14px 16px;box-shadow:0 10px 24px rgba(184,144,42,0.06);}
    .fcal-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--gold);line-height:1.08;}
    .fcal-title-wrap{display:flex;flex-direction:column;gap:4px;min-width:0;}
    .fcal-title-sub{font-size:10px;color:var(--tm);line-height:1.4;}
    .fcal-segment{display:inline-flex;align-items:center;gap:4px;padding:5px;background:rgba(255,248,232,0.9);border:1px solid var(--gold-bd);border-radius:999px;justify-self:center;flex-wrap:wrap;max-width:100%;}
    .fcal-segment button{background:transparent;border:none;border-radius:999px;padding:7px 12px;cursor:pointer;font-size:10px;font-weight:700;color:var(--tm);font-family:'Inter',sans-serif;white-space:nowrap;}
    .fcal-segment button.active{background:#fff;border:1px solid rgba(184,144,42,0.2);color:var(--gold);box-shadow:0 6px 16px rgba(184,144,42,0.08);}
    .fcal-nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
    .fcal-nav button{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:7px 12px;cursor:pointer;font-size:11px;color:var(--ts);font-family:'Inter',sans-serif;white-space:nowrap;}
    .fcal-nav button:hover{border-color:var(--gold);color:var(--gold);}
    .fcal-nav .today{background:var(--gold-bg);border-color:var(--gold-bd);color:var(--gold);}
    .fcal-filterbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-filter-group{display:flex;gap:8px;flex-wrap:wrap;flex:1;}
    .fcal-filter-group select{flex:1 1 142px;min-width:136px;max-width:100%;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--ts);outline:none;font-family:'Inter',sans-serif;}
    .fcal-filter-group select:focus{border-color:var(--gold-l);}
    .fcal-filter-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
    .fcal-filter-meta{font-size:10px;color:var(--tm);}
    .fcal-add-btn{background:linear-gradient(180deg,#FFF9EC 0%,#FFF1CF 100%);border:1px solid var(--gold-bd);border-radius:999px;padding:9px 14px;font-size:11px;font-weight:700;color:var(--gold);cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-add-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(184,144,42,0.08);}
    .dre-toolbar .fcal-filter-group{align-items:center;}
    .dre-scope-switch{display:inline-flex;align-items:center;gap:4px;padding:4px;background:rgba(255,248,232,0.9);border:1px solid var(--gold-bd);border-radius:999px;flex-wrap:wrap;}
    .dre-scope-switch button{background:transparent;border:none;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:700;color:var(--tm);cursor:pointer;font-family:'Inter',sans-serif;}
    .dre-scope-switch button.active{background:#fff;border:1px solid rgba(184,144,42,0.2);color:var(--gold);box-shadow:0 5px 14px rgba(184,144,42,0.08);}
    .fcal-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;}
    .fcal-kpi{position:relative;overflow:hidden;background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;padding:13px 14px 12px;box-shadow:0 10px 24px rgba(184,144,42,0.05);min-height:102px;display:flex;flex-direction:column;justify-content:space-between;}
    .fcal-kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:rgba(184,144,42,0.18);}
    .fcal-kpi::after{content:'';position:absolute;right:-18px;top:-20px;width:74px;height:74px;border-radius:50%;background:rgba(184,144,42,0.05);}
    .fcal-kpi.tone-projected{background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fcal-kpi.tone-projected::before{background:#D4A840;}
    .fcal-kpi.tone-realized{background:linear-gradient(180deg,#F7FDF9 0%,#EEF8F2 100%);}
    .fcal-kpi.tone-realized::before{background:#2E9E6E;}
    .fcal-kpi.tone-outflow{background:linear-gradient(180deg,#FFF9F7 0%,#FEF1EC 100%);}
    .fcal-kpi.tone-outflow::before{background:#D65145;}
    .fcal-kpi.tone-paid{background:linear-gradient(180deg,#FFFDF7 0%,#FFF6E4 100%);}
    .fcal-kpi.tone-paid::before{background:#B8902A;}
    .fcal-kpi.tone-total{background:linear-gradient(180deg,#F8FBFF 0%,#EEF4FF 100%);}
    .fcal-kpi.tone-total::before{background:#3060B8;}
    .fcal-kpi.tone-balance{background:linear-gradient(180deg,#F9FCFF 0%,#F3F8FF 100%);}
    .fcal-kpi.tone-balance::before{background:#7C9FDD;}
    .fcal-kpi.tone-compare{background:linear-gradient(180deg,#FFFEFB 0%,#FFF8EE 100%);}
    .fcal-kpi.tone-compare::before{background:#C8A03A;}
    .fcal-kpi.tone-progress{background:linear-gradient(180deg,#FFFEFA 0%,#FFF9F0 100%);}
    .fcal-kpi.tone-progress::before{background:#B8902A;}
    .fcal-kpi.tone-neutral::before{background:rgba(184,144,42,0.28);}
    .fcal-kpi-l{position:relative;z-index:1;font-size:9px;text-transform:uppercase;letter-spacing:0.11em;color:var(--tm);font-weight:800;margin-bottom:7px;}
    .fcal-kpi-v{position:relative;z-index:1;font-size:19px;font-weight:700;font-family:'Playfair Display',serif;line-height:1.02;}
    .fcal-kpi-s{position:relative;z-index:1;font-size:10px;color:var(--tm);margin-top:6px;line-height:1.45;max-width:24ch;}
    .fcal-kpi-s.good{color:#2E9E6E;}
    .fcal-kpi-s.bad{color:#C05030;}
    .fcal-board{display:grid;grid-template-columns:minmax(0,1.58fr) minmax(240px,0.72fr);gap:10px;align-items:start;min-height:0;}
    .fcal-calendar-card,.fcal-side-wrap{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:14px;box-shadow:0 10px 24px rgba(184,144,42,0.05);}
    .fcal-calendar-card{padding:10px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden;}
    .fcal-grid-header{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:2px;}
    .fcal-dow{text-align:center;font-size:9px;font-weight:700;color:var(--tm);text-transform:uppercase;padding:4px 0;}
    .fcal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:minmax(86px,auto);gap:3px;min-height:0;}
    .fcal-cell{background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);border:1px solid rgba(184,144,42,0.18);border-radius:10px;padding:6px;min-height:86px;display:flex;flex-direction:column;gap:5px;overflow:hidden;}
    .fcal-cell.fcal-empty{background:transparent;border-color:transparent;box-shadow:none;}
    .fcal-cell.fcal-hoje{border-color:var(--gold);box-shadow:0 0 0 1px rgba(184,144,42,0.2);}
    .fcal-cell.fcal-cell-clickable{cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease;}
    .fcal-cell.fcal-cell-clickable:hover{border-color:rgba(184,144,42,0.34);box-shadow:0 10px 22px rgba(184,144,42,0.08);transform:translateY(-1px);}
    .fcal-headline{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .fcal-num{font-size:11px;font-weight:700;color:var(--tm);}
    .fcal-num-hoje{color:var(--gold);}
    .fcal-day-total{font-size:8px;font-weight:700;color:var(--gold);background:var(--gold-bg);padding:2px 5px;border-radius:999px;border:1px solid var(--gold-bd);white-space:nowrap;}
    .fcal-day-total.pos{color:#2E9E6E;background:#F1FAF4;border-color:#B8DEC8;}
    .fcal-day-total.neg{color:#C05030;background:#FEF3EE;border-color:#E7C0B4;}
    .fcal-events{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden;}
    .fcal-ev{background:#fff;border:1px solid rgba(184,144,42,0.16);border-left:3px solid transparent;border-radius:9px;padding:5px 6px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease;min-height:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);}
    .fcal-ev:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(184,144,42,0.08);}
    .fcal-ev-ok{background:#EBF8F1;border-left-color:#15803D;}
    .fcal-ev-soon{background:#EEF5FF;border-left-color:#7DB3FF;}
    .fcal-ev-invoice{background:#E7F0FF;border-left-color:#1D4ED8;}
    .fcal-ev-delay{background:#FFF4E5;border-left-color:#D97706;}
    .fcal-ev-out{background:#FFF0EE;border-left-color:#D65145;}
    .fcal-ev-paid{background:#EFF8F0;border-left-color:#2F8F5B;}
    .fcal-ev-out-delay{background:#FAD9D5;border-left-color:#B42318;}
    .fcal-ev-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
    .fcal-ev-top strong{font-size:10px;color:var(--gold);line-height:1.1;white-space:nowrap;}
    .fcal-ev-ok .fcal-ev-top strong{color:#15803D;}
    .fcal-ev-soon .fcal-ev-top strong{color:#4A86E8;}
    .fcal-ev-invoice .fcal-ev-top strong{color:#1D4ED8;}
    .fcal-ev-delay .fcal-ev-top strong{color:#D97706;}
    .fcal-ev-out .fcal-ev-top strong{color:#D65145;}
    .fcal-ev-paid .fcal-ev-top strong{color:#2F8F5B;}
    .fcal-ev-out-delay .fcal-ev-top strong{color:#B42318;}
    .fcal-ev-status{display:inline-flex;align-items:center;min-height:18px;padding:1px 5px;border-radius:999px;background:rgba(184,144,42,0.1);font-size:7px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:700;white-space:nowrap;}
    .fcal-ev-ok .fcal-ev-status{background:#DDF3E5;color:#15803D;}
    .fcal-ev-soon .fcal-ev-status{background:#DCEBFF;color:#4A86E8;}
    .fcal-ev-invoice .fcal-ev-status{background:#D9E8FF;color:#1D4ED8;}
    .fcal-ev-delay .fcal-ev-status{background:#FDE9CC;color:#D97706;}
    .fcal-ev-out .fcal-ev-status{background:#FCD9D4;color:#D65145;}
    .fcal-ev-paid .fcal-ev-status{background:#DCEFE1;color:#2F8F5B;}
    .fcal-ev-out-delay .fcal-ev-status{background:#F6C2BC;color:#B42318;}
    .fcal-ev-name{font-size:9px;font-weight:700;color:var(--tx);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-ev-meta{font-size:8px;color:var(--tm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-more{font-size:8px;color:var(--tm);padding-top:1px;background:transparent;border:none;text-align:left;cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-more:hover{color:var(--gold);}
    .fcal-side-wrap{padding:12px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;}
    .fcal-side-card{border:1px solid rgba(184,144,42,0.16);border-radius:14px;padding:12px;background:linear-gradient(180deg,#fff 0%,#FEFCF6 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);}
    .fcal-side-title{font-size:10px;text-transform:uppercase;letter-spacing:0.11em;color:var(--gold);font-weight:800;}
    .fcal-side-sub{font-size:9px;color:var(--tm);margin-top:4px;line-height:1.55;max-width:27ch;}
    .fcal-side-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .fcal-side-item-wrap{display:flex;flex-direction:column;gap:7px;}
    .fcal-side-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .fcal-side-item{background:var(--bg2);border:1px solid rgba(184,144,42,0.14);border-left:3px solid transparent;border-radius:10px;padding:10px 11px;text-align:left;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease;}
    .fcal-side-item:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(184,144,42,0.07);}
    .fcal-side-item.ok{border-left-color:#15803D;background:#EBF8F1;}
    .fcal-side-item.soon{border-left-color:#7DB3FF;background:#EEF5FF;}
    .fcal-side-item.invoice{border-left-color:#1D4ED8;background:#E7F0FF;}
    .fcal-side-item.delay{border-left-color:#D97706;background:#FFF4E5;}
    .fcal-side-item.out{border-left-color:#D65145;background:#FFF0EE;}
    .fcal-side-item.paid{border-left-color:#2F8F5B;background:#EFF8F0;}
    .fcal-side-item.out-delay{border-left-color:#B42318;background:#FAD9D5;}
    .fcal-side-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .fcal-side-item-top strong{font-size:10px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-side-item-top span{font-size:9px;font-weight:700;color:var(--gold);white-space:nowrap;}
    .fcal-side-item.ok .fcal-side-item-top span{color:#15803D;}
    .fcal-side-item.soon .fcal-side-item-top span{color:#4A86E8;}
    .fcal-side-item.invoice .fcal-side-item-top span{color:#1D4ED8;}
    .fcal-side-item.delay .fcal-side-item-top span{color:#D97706;}
    .fcal-side-item.out .fcal-side-item-top span{color:#D65145;}
    .fcal-side-item.paid .fcal-side-item-top span{color:#2F8F5B;}
    .fcal-side-item.out-delay .fcal-side-item-top span{color:#B42318;}
    .fcal-side-item-meta{font-size:8px;color:var(--tm);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fcal-side-action-btn{align-self:flex-start;background:#fff;border:1px solid var(--gold-bd);border-radius:999px;padding:6px 10px;font-size:9px;font-weight:700;color:var(--gold);cursor:pointer;font-family:'Inter',sans-serif;}
    .fcal-side-action-btn.secondary{color:var(--ts);border-color:rgba(184,144,42,0.22);}
    .fcal-side-action-btn:hover{background:var(--gold-bg);}
    .fcal-empty-state{font-size:10px;color:var(--tm);padding:6px 0 2px;}
    .fcal-legend{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;font-size:10px;color:var(--tm);padding-top:2px;}
    .fcal-leg-dot{width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:4px;}
    .dre-board{grid-template-columns:minmax(0,1.7fr) minmax(270px,0.82fr);}
    .dre-main-wrap{min-width:0;}
    .dre-card{background:rgba(255,255,255,0.96);border:1px solid var(--bd);border-radius:16px;box-shadow:0 10px 24px rgba(184,144,42,0.05);overflow:hidden;}
    .dre-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(184,144,42,0.1);background:linear-gradient(180deg,#FFFDF7 0%,#FDF8EE 100%);}
    .dre-card-kicker{font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:var(--tm);font-weight:800;margin-bottom:4px;}
    .dre-card-title{font-family:'Playfair Display',serif;font-size:24px;line-height:1;color:var(--gold);}
    .dre-card-copy{max-width:320px;font-size:10px;color:var(--tm);line-height:1.55;text-align:right;}
    .dre-table-wrap{padding:8px 10px 12px;}
    .dre-table{width:100%;border-collapse:separate;border-spacing:0 6px;}
    .dre-table th{position:static;background:transparent;border:none;padding:0 12px 4px;font-size:9px;letter-spacing:0.1em;color:var(--tm);}
    .dre-table td{padding:10px 12px;border:none;background:#fff;}
    .dre-table tbody tr td:first-child{border-top-left-radius:10px;border-bottom-left-radius:10px;}
    .dre-table tbody tr td:last-child{border-top-right-radius:10px;border-bottom-right-radius:10px;text-align:right;font-weight:700;white-space:nowrap;}
    .dre-row td{box-shadow:inset 0 0 0 1px rgba(184,144,42,0.12);}
    .dre-section td{background:linear-gradient(180deg,#FFFDF8 0%,#FEF8EC 100%);font-weight:800;color:#8B6C1A;}
    .dre-group td{background:#FCFBF7;font-weight:700;}
    .dre-account td{background:#fff;font-size:11px;}
    .dre-result td{background:linear-gradient(180deg,#FAFCFF 0%,#F3F8FF 100%);font-weight:800;}
    .dre-result.subtotal td{color:#315EAE;}
    .dre-result.liquido td{background:linear-gradient(180deg,#F7FDF9 0%,#EEF8F2 100%);}
    .dre-result.caixa td{background:linear-gradient(180deg,#FFFDF7 0%,#FFF6E4 100%);}
    .dre-indent{display:inline-block;}
    .dre-indent-1{padding-left:14px;}
    .dre-indent-2{padding-left:30px;color:var(--ts);font-weight:500;}
    .dre-mini-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .dre-mini-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:10px;background:var(--bg2);border:1px solid rgba(184,144,42,0.1);}
    .dre-mini-main{min-width:0;display:flex;flex-direction:column;gap:3px;}
    .dre-mini-main strong{font-size:10px;color:var(--tx);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .dre-mini-main span{font-size:8px;color:var(--tm);line-height:1.45;}
    .dre-mini-item b{font-size:10px;white-space:nowrap;color:var(--gold);}
    .dre-mini-item b.good{color:#2E9E6E;}
    .dre-mini-item b.bad{color:#C05030;}
    .dre-side-wrap{padding-top:0;}
    .fin-modal{max-width:620px !important;}
    .fin-modal-body{display:flex;flex-direction:column;gap:12px;padding:18px;max-height:72vh;overflow-y:auto;}
    .fin-inline-help{font-size:10px;color:var(--tm);line-height:1.5;}
    .fin-category-tools{display:flex;align-items:center;justify-content:flex-start;margin-top:8px;}
    .fin-category-new{display:none;flex-direction:column;gap:8px;margin-top:10px;padding:10px 12px;border:1px dashed rgba(184,144,42,0.28);border-radius:10px;background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fin-category-new input{background:#fff;border:1px solid rgba(184,144,42,0.18);border-radius:8px;padding:9px 10px;font-size:12px;color:var(--tx);outline:none;font-family:'Inter',sans-serif;}
    .fin-category-new input:focus{border-color:var(--gold-l);}
    .fin-modal-chip{display:inline-flex;align-items:center;min-height:42px;padding:0 12px;border-radius:10px;background:var(--bg2);border:1px solid var(--bd);font-size:12px;color:var(--ts);font-weight:600;}
    .fin-modal-note{font-size:10px;color:var(--tm);background:var(--gold-bg);border:1px solid var(--gold-bd);border-radius:10px;padding:10px 12px;line-height:1.5;}
    .fin-proof-card{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px dashed rgba(184,144,42,0.3);border-radius:12px;background:linear-gradient(180deg,#FFFDF7 0%,#FEF8EA 100%);}
    .fin-proof-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;}
    .fin-proof-title{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);font-weight:700;}
    .fin-proof-badge{display:inline-flex;align-items:center;max-width:100%;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid rgba(184,144,42,0.16);font-size:10px;color:var(--ts);line-height:1.4;}
    .fin-proof-actions{display:flex;gap:8px;flex-wrap:wrap;}
    .fin-proof-remove{border-color:#E0B6AE;color:#C05030;}
    .fin-day-modal{max-width:680px !important;width:min(680px,calc(100vw - 24px));max-height:min(78vh,720px);display:flex;flex-direction:column;}
    .fin-day-modal-body{display:flex;flex-direction:column;gap:12px;padding:18px;max-height:72vh;overflow-y:auto;}
    .fin-day-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;border:1px solid var(--bd);border-radius:12px;background:linear-gradient(180deg,#FFFEFB 0%,#FFF8ED 100%);}
    .fin-day-summary-copy{display:flex;flex-direction:column;gap:3px;}
    .fin-day-summary-kicker{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--tm);}
    .fin-day-summary-sub{font-size:11px;color:var(--tm);line-height:1.4;}
    .fin-day-summary-total{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--gold);}
    .fin-day-list{display:flex;flex-direction:column;gap:10px;}
    .fin-day-item{display:flex;flex-direction:column;gap:8px;}
    .fin-day-item-main{width:100%;text-align:left;border:1px solid var(--bd);border-left:4px solid transparent;border-radius:12px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;font-family:'Inter',sans-serif;}
    .fin-day-item-main:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(184,144,42,0.08);}
    .fin-day-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
    .fin-day-item-top strong{font-family:'Playfair Display',serif;font-size:19px;line-height:1;color:var(--gold);}
    .fin-day-item-status{display:inline-flex;align-items:center;min-height:20px;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:rgba(184,144,42,0.1);color:var(--tm);}
    .fin-day-item-name{font-size:13px;font-weight:800;color:var(--ts);line-height:1.25;}
    .fin-day-item-meta{font-size:10px;color:var(--tm);line-height:1.45;}
    .fin-day-item-note{font-size:11px;color:var(--ts);line-height:1.45;padding-top:2px;border-top:1px dashed rgba(184,144,42,0.2);}
    .fin-day-item-paid .fin-day-item-main{background:#F3FAF5;border-left-color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-main{background:#FFF6F3;border-left-color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-main{background:#FBE0DC;border-left-color:#B42318;}
    .fin-day-item-ok .fin-day-item-main{background:#F0FAF4;border-left-color:#15803D;}
    .fin-day-item-soon .fin-day-item-main{background:#F3F8FF;border-left-color:#7DB3FF;}
    .fin-day-item-invoice .fin-day-item-main{background:#EBF2FF;border-left-color:#1D4ED8;}
    .fin-day-item-delay .fin-day-item-main{background:#FFF4E5;border-left-color:#D97706;}
    .fin-day-item-paid .fin-day-item-top strong{color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-top strong{color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-top strong{color:#B42318;}
    .fin-day-item-paid .fin-day-item-status{background:#DCEFE1;color:#2F8F5B;}
    .fin-day-item-out .fin-day-item-status{background:#FCD9D4;color:#D65145;}
    .fin-day-item-out-delay .fin-day-item-status{background:#F6C2BC;color:#B42318;}
    .fin-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
    .fin-delete-btn{background:#fff;border:1px solid #E0B6AE;border-radius:999px;padding:8px 12px;font-size:10px;color:#C05030;cursor:pointer;font-family:'Inter',sans-serif;}
    @media (max-width:1260px){
      .fcal-filter-group select{flex-basis:128px;min-width:124px;}
      .fcal-board{grid-template-columns:minmax(0,1.48fr) minmax(216px,0.68fr);}
    }
    @media (max-width:1100px){
      .fcal-kpis{grid-template-columns:repeat(3,minmax(0,1fr));}
    }
    @media (max-width:1040px){
      .fcal-header{grid-template-columns:1fr;}
      .fcal-segment{justify-self:start;}
      .fcal-nav{justify-content:flex-start;}
      .fcal-filterbar{align-items:flex-start;}
      .fcal-board{grid-template-columns:minmax(0,1.42fr) minmax(204px,0.64fr);}
    }
    @media (max-width:980px){
      .fcal-board{grid-template-columns:1fr;}
      .fcal-grid{grid-template-columns:repeat(2,1fr);}
      .fcal-grid-header{display:none;}
    }
    @media (max-height:900px){
      .fcal-wrap{gap:8px;}
      .fcal-header{padding:12px 14px;}
      .fcal-filterbar{padding:9px 11px;}
      .fcal-kpi{padding:11px 12px;}
      .fcal-kpi-v{font-size:17px;}
      .fcal-grid{grid-auto-rows:minmax(74px,auto);}
      .fcal-ev-meta{display:none;}
      .fcal-side-sub{font-size:8px;}
    }
    @media (max-height:820px){
      .fcal-title-sub{display:none;}
      .fcal-grid{grid-auto-rows:minmax(68px,auto);}
      .fcal-cell{padding:5px;gap:4px;min-height:68px;}
      .fcal-ev{padding:4px 5px;}
      .fcal-side-sub{display:none;}
      .fcal-side-wrap{gap:7px;}
    }
    @media (max-width:760px){
      .fcal-filter-group select,.fcal-filter-group,.fcal-filter-right{min-width:100%;width:100%;}
      .fcal-kpis{grid-template-columns:1fr;}
      .fcal-grid{grid-template-columns:1fr;}
      .fcal-cell{min-height:88px;}
    }
  </style>
  <div class="fcal-wrap">
    <div class="fcal-header">
      <div class="fcal-title-wrap">
        <div class="fcal-title">${zUiText('Financeiro')} · ${zUiText(meses[mes])} ${ano}</div>
        <div class="fcal-title-sub">${subtituloPainel}</div>
      </div>
      <div class="fcal-segment">
        <button class="${finVisao === 'geral' ? 'active' : ''}" onclick="finSetVisao('geral')">${zUiText('Entrada / Saida')}</button>
        <button class="${finVisao === 'entradas' ? 'active' : ''}" onclick="finSetVisao('entradas')">${zUiText('Entradas')}</button>
        <button class="${finVisao === 'saidas' ? 'active' : ''}" onclick="finSetVisao('saidas')">${zUiText('Saidas')}</button>
        <button class="${finVisao === 'dre' ? 'active' : ''}" onclick="finSetVisao('dre')">${zUiText('DRE')}</button>
      </div>
      <div class="fcal-nav">
        <button onclick="finAnterior()">${zUiText('← Anterior')}</button>
        <button class="today" onclick="finHoje()">${zUiText('Hoje')}</button>
        <button onclick="finProximo()">${zUiText('Proximo →')}</button>
      </div>
    </div>

    ${filtroBarHtml}

    ${conteudoPrincipalHtml}
  </div>

  <div class="modal-backdrop${detalheDiaAtivo ? ' show' : ''}" id="m-fin-dia" onclick="finHandleBackdropDetalheDia(event)">
    <div class="modal fin-day-modal">
      <div class="modal-top">
        <div>
          <div class="modal-title">${zUiText(detalheDiaAtivo ? finTituloDetalheDia(finDiaDetalheAtual) : '')}</div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText(detalheDiaAtivo ? finSubtituloDetalheDia(finDiaDetalheAtual, mes, ano, detalheDiaItens) : '')}</div>
        </div>
        <button class="mclose" onclick="finFecharDetalheDia()">âœ•</button>
      </div>
      <div class="modal-body fin-day-modal-body">
        <div class="fin-day-summary">
          <div class="fin-day-summary-copy">
            <div class="fin-day-summary-kicker">${zUiText(finVisao === 'saidas' ? 'Saidas do calendario' : finVisao === 'entradas' ? 'Entradas do calendario' : 'Movimentacoes do calendario')}</div>
            <div class="fin-day-summary-sub">${zUiText(detalheDiaAtivo ? finSubtituloDetalheDia(finDiaDetalheAtual, mes, ano, detalheDiaItens) : '')}</div>
          </div>
          <div class="fin-day-summary-total">${detalheDiaAtivo ? (finVisao === 'geral' ? finFmtAssinado(finValorTotalDia(detalheDiaItens)) : fmt(finValorTotalDia(detalheDiaItens))) : ''}</div>
        </div>
        <div class="fin-day-list">
          ${detalheDiaAtivo ? detalheDiaItens.map(item => finDetalheDiaItem(item)).join('') : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop${finModalAberto ? ' show' : ''}" id="m-fin-lanc" onclick="finHandleBackdropModal(event)">
    <div class="modal fin-modal">
      <div class="modal-top">
        <div>
          <div class="modal-title">${zUiText(tituloModal)}</div>
          <div style="font-size:10px;color:var(--tm);margin-top:2px;">${zUiText('Use este formulario para complementar as comissoes automaticas e montar o caixa do sistema.')}</div>
        </div>
        <button class="mclose" onclick="finFecharModalLancamento()">✕</button>
      </div>
      <div class="modal-body fin-modal-body">
        <div class="f-row">
          <div class="f-field">
            <label>Tipo</label>
            ${podeEscolherTipo || itemEditando ? `
              <select id="fin-lanc-tipo" onchange="finAtualizarCamposModalLancamento()">
                <option value="entrada" ${tipoModal === 'entrada' ? 'selected' : ''}>${zUiText('Entrada')}</option>
                <option value="saida" ${tipoModal === 'saida' ? 'selected' : ''}>${zUiText('Saida')}</option>
              </select>` : `
              <div class="fin-modal-chip">${zUiText(tipoModal === 'saida' ? 'Saida' : 'Entrada')}</div>
              <input type="hidden" id="fin-lanc-tipo" value="${finEscapeAttr(tipoModal)}">`}
          </div>
          <div class="f-field">
            <label>Status</label>
            <select id="fin-lanc-status" onchange="finAtualizarCamposModalLancamento()">
              <option value="previsto" ${statusModal === 'previsto' ? 'selected' : ''}>${zUiText('Previsto')}</option>
              <option value="realizado" ${statusModal === 'realizado' ? 'selected' : ''}>${zUiText('Realizado')}</option>
            </select>
            <div class="fin-inline-help" id="fin-lanc-status-help"></div>
          </div>
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Categoria</label>
            <select id="fin-lanc-categoria">${finCategoriasPorTipo(tipoModal, categoriaModal ? [categoriaModal] : []).map(item => `<option value="${finEscapeAttr(item)}" ${categoriaModal === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}</select>
            <div class="fin-category-tools">
              <button class="btn-c" type="button" id="fin-categoria-nova-btn" onclick="finAlternarCategoriaNova()">${zUiText('Nova categoria')}</button>
            </div>
            <div class="fin-category-new" id="fin-categoria-nova-wrap">
              <input type="text" id="fin-lanc-categoria-nova" value="${finEscapeAttr(finCategoriaNovaValor)}" placeholder="${finEscapeAttr(finPlaceholderCategoriaNova(tipoModal))}" oninput="finAtualizarCategoriaNovaValor(this.value,this)" style="text-transform:uppercase;">
              <div class="fin-inline-help">${zUiText('Depois de salvar este lancamento, a nova categoria passa a ficar disponivel nesta lista.')}</div>
            </div>
          </div>
          <div class="f-field">
            <label>Unidade</label>
            <select id="fin-lanc-unidade">
              <option value="">${zUiText('Geral / nao vinculada')}</option>
              ${unidades.map(item => `<option value="${finEscapeAttr(item)}" ${itemEditando && itemEditando.unidade === item ? 'selected' : ''}>${zUiText(item)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="f-field">
          <label>Descricao</label>
          <input type="text" id="fin-lanc-descricao" value="${finEscapeAttr(itemEditando ? itemEditando.descricao || '' : '')}" oninput="finAtualizarCampoMaiusculo(this)" style="text-transform:uppercase;">
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Data prevista</label>
            <input type="date" id="fin-lanc-data-prevista" value="${finEscapeAttr(itemEditando ? itemEditando.dataPrevista || '' : finDateParaIso(new Date(ano, mes, 1, 12, 0, 0, 0)))}">
          </div>
          <div class="f-field" id="fin-lanc-realizada-wrap" style="display:${statusModal === 'realizado' ? 'block' : 'none'};">
            <label>Data realizada</label>
            <input type="date" id="fin-lanc-data-realizada" value="${finEscapeAttr(itemEditando ? itemEditando.dataRealizada || itemEditando.dataPrevista || '' : '')}">
          </div>
        </div>
        <div class="f-row">
          <div class="f-field">
            <label>Valor (R$)</label>
            <input type="number" id="fin-lanc-valor" min="0" step="0.01" value="${itemEditando ? finEscapeAttr(itemEditando.valor || '') : ''}">
          </div>
        </div>
        <div class="f-field">
          <label>Observacao</label>
          <textarea id="fin-lanc-observacao" rows="4" placeholder="${zUiText('CAMPO OPCIONAL PARA CONTEXTO INTERNO DO FINANCEIRO.')}" oninput="finAtualizarCampoMaiusculo(this)" style="background:var(--bg2);border:1px solid var(--bd);border-radius:7px;padding:10px;font-size:12px;color:var(--tx);outline:none;width:100%;font-family:'Inter',sans-serif;resize:vertical;min-height:74px;text-transform:uppercase;">${finEscapeAttr(itemEditando ? itemEditando.observacao || '' : '')}</textarea>
        </div>
        <div class="fin-proof-card">
          <div class="fin-proof-top">
            <div>
              <div class="fin-proof-title">${zUiText('Comprovante')}</div>
              <div class="fin-inline-help" id="fin-comprovante-help">${zUiText(statusModal === 'realizado' ? (tipoModal === 'saida' ? 'Anexe o comprovante do pagamento em foto ou PDF.' : 'Se existir, anexe o comprovante do recebimento em foto ou PDF.') : 'Opcional. Quando a movimentacao for realizada, voce pode anexar foto ou PDF do comprovante.')}</div>
            </div>
            <div class="fin-proof-badge" id="fin-comprovante-badge">${zUiText(finComprovanteResumo(itemEditando))}</div>
          </div>
          <input type="file" id="fin-comprovante-input" accept=".pdf,image/*" onchange="finSelecionarComprovanteFile(event)" style="display:none;">
          <div class="fin-proof-actions">
            <button class="btn-c" type="button" id="fin-comprovante-trigger" onclick="document.getElementById('fin-comprovante-input').click()">${zUiText('Selecionar comprovante')}</button>
            <button class="btn-c" type="button" id="fin-comprovante-view-btn" style="display:${comprovanteModalAtual ? 'inline-flex' : 'none'};" onclick="finVerComprovanteAtual()">${zUiText('Ver comprovante')}</button>
            <button class="btn-c fin-proof-remove" type="button" id="fin-comprovante-remove-btn" style="display:${comprovanteModalAtual ? 'inline-flex' : 'none'};" onclick="finLimparComprovanteSelecionado()">${zUiText('Remover')}</button>
          </div>
        </div>
        <div class="fin-modal-note">${zUiText('Na aba Entradas, os valores manuais entram junto com as comissoes previstas/recebidas. Na aba Entrada / Saida, esse mesmo lancamento passa a compor o caixa consolidado.')}</div>
      </div>
      <div class="modal-foot">
        <div class="fin-modal-actions" style="width:100%;">
          <div>
            ${itemEditando ? `<button class="fin-delete-btn" onclick="finExcluirLancamentoAtual()">${zUiText('Excluir lancamento')}</button>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-c" type="button" id="fin-lanc-realizar-btn" style="display:none;" onclick="finMarcarModalComoRealizado(true)">${zUiText(tipoModal === 'saida' ? 'Dar como pago' : 'Dar como recebido')}</button>
            <button class="btn-c" onclick="finFecharModalLancamento()">${zUiText('Cancelar')}</button>
            <button class="btn-s" id="fin-lanc-save-btn" onclick="finSalvarLancamento()">${zUiText(itemEditando ? 'Salvar alteracoes' : 'Salvar lancamento')}</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const tituloEl = alvo.querySelector('.fcal-title');
  if (tituloEl) tituloEl.textContent = tituloPainel;
  const exportBtnEl = alvo.querySelector('.dre-toolbar .fcal-add-btn');
  if (exportBtnEl) exportBtnEl.textContent = zUiText('Exportar Excel');

  if (finModalAberto) setTimeout(finAtualizarCamposModalLancamento, 0);
}

zRegisterModule('financeiro', {
  renderFinanceiro
});
