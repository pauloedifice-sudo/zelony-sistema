// FINANCEIRO - parte 1/4: categorias, estado, formatacao/datas, DRE (demonstracao de resultado) e exportacao Excel
// FINANCEIRO
// Novas movimentacoes manuais, preservando o historico anterior a transicao.
// Data de corte confirmada pelo usuario; nao acompanha a data atual do sistema.
const FIN_INICIO_MOVIMENTACAO_MANUAL = '2026-08-26';

let finMesAtual = new Date().getMonth();
let finAnoAtual = new Date().getFullYear();
let finFiltroUnidade = '';
let finFiltroSituacao = '';
let finFiltroFaixa = '';
let finFiltroCategoria = '';
let finVisao = 'geral';
let finDreEscopo = 'mes';
let finModalAberto = false;
let finModalLancamentoId = '';
let finModalRefLocal = '';
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
let finComprovanteUploadTemporario = null;
let finComprovanteRemovido = false;
let finCategoriaNovaAtiva = false;
let finCategoriaNovaValor = '';
let finLancamentoSalvando = false;
let finSaldoModalAberto = false;
let finSaldoSalvando = false;
let finSaldoModalData = '';

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
    'REPASSE COMISSAO',
    'OUTRAS SAIDAS',
    'SALARIO',
    'SERVICOS'
  ]
};

const finMoedaFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function syncFinState() {
  zSetState('state.ui.finMesAtual', finMesAtual);
  zSetState('state.ui.finAnoAtual', finAnoAtual);
  zSetState('state.ui.finFiltroUnidade', finFiltroUnidade);
  zSetState('state.ui.finFiltroSituacao', finFiltroSituacao);
  zSetState('state.ui.finFiltroFaixa', finFiltroFaixa);
  zSetState('state.ui.finFiltroCategoria', finFiltroCategoria);
  zSetState('state.ui.finVisao', finVisao);
  zSetState('state.ui.finDreEscopo', finDreEscopo);
  zSetState('state.ui.finLancamentoSalvando', finLancamentoSalvando);
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
  finLancamentosRegistrados().forEach(item => {
    const ref = finReferenciaLancamentoManual(item);
    if (ref && !Number.isNaN(ref.getTime())) anos.add(ref.getFullYear());
  });
  finComissoesRecebidasHistoricas().forEach(item => anos.add(item.dataRef.getFullYear()));
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

function finNormalizarTextoValor(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : '0';
  let texto = String(valor == null ? '' : valor).trim();
  if (!texto) return '0';
  texto = texto
    .replace(/\s+/g, '')
    .replace(/^R\$/i, '')
    .replace(/[^0-9,.\-]/g, '');

  if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) return texto.replace(/\./g, '');
  if (/^-?\d{1,3}(,\d{3})+$/.test(texto)) return texto.replace(/,/g, '');

  const ultimoPonto = texto.lastIndexOf('.');
  const ultimaVirgula = texto.lastIndexOf(',');

  if (ultimoPonto >= 0 && ultimaVirgula >= 0) {
    if (ultimaVirgula > ultimoPonto) return texto.replace(/\./g, '').replace(/,/g, '.');
    return texto.replace(/,/g, '');
  }
  if (ultimaVirgula >= 0) return texto.replace(/\./g, '').replace(/,/g, '.');
  return texto;
}

function finValorSeguro(valor) {
  if (valor == null || String(valor).trim() === '') return 0;
  const numero = Number(finNormalizarTextoValor(valor));
  return Number.isFinite(numero) ? numero : 0;
}

function finValorParaInput(valor) {
  if (valor == null || String(valor).trim() === '') return '';
  return finValorSeguro(valor).toFixed(2).replace('.', ',');
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
  if (!valor) return finFmtMoeda(0);
  const sinal = valor > 0 ? '+' : '-';
  return `${sinal}${finFmtMoeda(Math.abs(valor))}`;
}

function finFmtKAssinado(valor) {
  return finFmtAssinado(valor);
}

function finFmtMoeda(valor) {
  return finMoedaFormatter.format(finValorSeguro(valor));
}

function finRotuloVisao(visao) {
  if (visao === 'dre') return 'DRE';
  if (visao === 'entradas') return 'Entradas';
  if (visao === 'saidas') return 'Saidas';
  return 'Entrada / Saida';
}

function finSubtituloVisao() {
  if (finVisao === 'dre') return 'Demonstrativo dos movimentos realizados, incluindo o historico anterior ao modo manual.';
  if (finVisao === 'entradas') return 'Comissoes recebidas ate 25/08/2026 preservadas. A partir de 26/08/2026, novas entradas sao manuais.';
  if (finVisao === 'saidas') return 'Repasses ja registrados preservados. Novas saidas de comissao devem ser cadastradas manualmente.';
  return 'Modo manual a partir de 26/08/2026. Recebimentos anteriores e repasses ja registrados continuam no caixa.';
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
  const usadas = finLancamentosRegistrados()
    .filter(item => tipoLancamentoFinanceiroNormalizado(item && item.tipo) === tipo)
    .map(item => finTextoMaiusculo(item && item.categoria))
    .filter(Boolean);
  const extras = (Array.isArray(adicionais) ? adicionais : [])
    .map(item => finTextoMaiusculo(item))
    .filter(Boolean);
  return finListaUnica([...(base || []), ...usadas, ...extras]);
}

function finUnidadesDisponiveis() {
  const registradas = finLancamentosRegistrados().map(item => item.unidade);
  const historicas = finComissoesRecebidasHistoricas().map(item => item.unidade);
  return finOpcoes(['Centro', 'Cristo Rei', ...registradas, ...historicas]);
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
  return true;
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

function finLancamentosRegistrados() {
  // Inclui repasses antigos com seus valores, datas, situacoes e comprovantes originais.
  return (Array.isArray(FINANCEIRO_LANCAMENTOS) ? FINANCEIRO_LANCAMENTOS : [])
    .filter(Boolean);
}

function finInfoRecebimentoComissaoVenda(venda) {
  const etapaFinal = ETAPAS.length - 1;
  const historico = (Array.isArray(venda.hist) ? venda.hist : []).slice().reverse();
  const afetaFluxo = item => item && histAfetaFluxo(item);
  const final = historico.find(item => afetaFluxo(item) && Number(item.e) === etapaFinal);
  const fallback = historico.find(afetaFluxo);
  const info = (final && obterMomentoHistorico(final, { preferTs: false }))
    || (fallback && obterMomentoHistorico(fallback, { preferTs: false }));
  if (!info || info.precision === 'daymonth' || Number.isNaN(info.date.getTime())) return null;
  if (info.precision === 'datetime') {
    // Timestamps antigos sem data comercial usam o dia de Sao Paulo, inclusive no servidor UTC.
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(info.date);
    const parte = tipo => partes.find(item => item.type === tipo).value;
    return finDataIsoParaDate(`${parte('year')}-${parte('month')}-${parte('day')}`);
  }
  return new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate(), 12);
}

function finComissoesRecebidasHistoricas() {
  // Apenas leitura: nao recria lancamentos nem volta a gerar previsoes de vendas.
  return (Array.isArray(VENDAS) ? VENDAS : []).flatMap(venda => {
    if (!venda || venda.distratada || Number(venda.etapa) !== ETAPAS.length - 1) return [];
    const dataRef = finInfoRecebimentoComissaoVenda(venda);
    if (!dataRef || finDateParaIso(dataRef) >= FIN_INICIO_MOVIMENTACAO_MANUAL) return [];
    const valorBruto = finValorSeguro(venda.valor) * finValorSeguro(venda.pct);
    if (valorBruto <= 0) return [];
    return [{
      key: `venda-${venda.id}`, origem: 'venda', historicoAutomatico: true,
      natureza: 'entrada', categoria: 'COMISSAO',
      descricao: finTextoMaiusculo(venda.cliente) || 'COMISSAO RECEBIDA',
      valorBruto, valorLiquido: typeof comZ === 'function' ? finValorSeguro(comZ(venda)) : valorBruto,
      dataRef, dia: dataRef.getDate(), status: 'realizado', atraso: 0,
      unidade: venda.unidade || '', construtora: venda.construtora || '', gerente: venda.gerente || '',
      v: venda
    }];
  });
}

function finNormalizarLancamentoManual(item) {
  if (!item) return null;
  const historicoAutomatico = lancamentoFinanceiroAutomaticoLegado(item);
  const refLocal = String(item.refLocal || item.ref_local || '').trim();
  const tipo = tipoLancamentoFinanceiroNormalizado(item.tipo);
  const dataRef = finReferenciaLancamentoManual(item);
  if (!dataRef) return null;
  const status = finStatusLoteManual(statusLancamentoFinanceiroNormalizado(item.status), item.dataPrevista);
  const atraso = status === 'atrasado' ? finDiffDias(finHojeRef(), finDataIsoParaDate(item.dataPrevista)) : 0;
  return {
    key: `registrado-${refLocal || item.id}`,
    origem: historicoAutomatico ? 'venda_comissao_saida' : 'manual',
    historicoAutomatico,
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
    refLocal,
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

function finColetarLancamentosRegistradosMes(mes, ano) {
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
  const registrados = finColetarLancamentosRegistradosMes(mes, ano);
  const historicas = finComissoesRecebidasHistoricas().filter(item =>
    item.dataRef.getMonth() === mes && item.dataRef.getFullYear() === ano && finMatchCamposItem(item));
  const entradas = finMontarResumoNatureza(registrados.entradas.previstas, [...registrados.entradas.realizadas, ...historicas]);
  const saidas = registrados.saidas;
  const apenasManuais = resumo => finMontarResumoNatureza(
    resumo.previstas.filter(item => item.origem === 'manual'),
    resumo.realizadas.filter(item => item.origem === 'manual'));
  const manuais = { entradas: apenasManuais(registrados.entradas), saidas: apenasManuais(registrados.saidas) };

  const agendaPorDia = {};
  [...entradas.todos, ...saidas.todos].forEach(item => {
    if (!agendaPorDia[item.dia]) agendaPorDia[item.dia] = [];
    agendaPorDia[item.dia].push(item);
  });
  Object.keys(agendaPorDia).forEach(chave => {
    agendaPorDia[chave].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || b.valorBruto - a.valorBruto);
  });

  return {
    manuais,
    entradas,
    saidas,
    todos: [...entradas.todos, ...saidas.todos].sort((a, b) => finPrioridadeItem(a) - finPrioridadeItem(b) || a.dataRef - b.dataRef || b.valorBruto - a.valorBruto),
    agendaPorDia
  };
}

function finSaldosBancariosRegistrados() {
  const lista = Array.isArray(FINANCEIRO_SALDOS_BANCARIOS) ? FINANCEIRO_SALDOS_BANCARIOS : [];
  return lista
    .map(item => typeof mapSaldoBancarioIn === 'function' ? mapSaldoBancarioIn(item) : {
      ...item,
      conta: finTextoMaiusculo(item && item.conta) || 'CONTA PRINCIPAL',
      dataReferencia: String(item && (item.dataReferencia || item.data_referencia) || '').slice(0, 10),
      saldo: finValorSeguro(item && (item.saldo ?? item.saldo_bancario))
    })
    .filter(item => item.dataReferencia && finDataValidaIso(item.dataReferencia))
    .sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia) || (a.id || 0) - (b.id || 0));
}

function finDataReferenciaPainel(mes, ano) {
  const hoje = finHojeRef();
  const inicio = new Date(ano, mes, 1, 12, 0, 0, 0);
  const fim = new Date(ano, mes + 1, 0, 12, 0, 0, 0);
  if (hoje.getFullYear() === ano && hoje.getMonth() === mes) return hoje;
  if (fim.getTime() < hoje.getTime()) return fim;
  return inicio;
}

function finSaldoBancarioDoMes(mes, ano, limiteData = null) {
  const limite = limiteData instanceof Date && !Number.isNaN(limiteData.getTime()) ? limiteData : null;
  return finSaldosBancariosRegistrados()
    .filter(item => {
      const data = finDataIsoParaDate(item.dataReferencia);
      return data && data.getMonth() === mes && data.getFullYear() === ano && (!limite || data.getTime() <= limite.getTime());
    })
    .at(-1) || null;
}

function finSaldoBancarioAnterior(dataReferencia) {
  if (!(dataReferencia instanceof Date) || Number.isNaN(dataReferencia.getTime())) return null;
  return finSaldosBancariosRegistrados()
    .filter(item => {
      const data = finDataIsoParaDate(item.dataReferencia);
      return data && data.getTime() < dataReferencia.getTime();
    })
    .at(-1) || null;
}

function finSaldoBancarioAte(dataReferencia) {
  if (!(dataReferencia instanceof Date) || Number.isNaN(dataReferencia.getTime())) return null;
  return finSaldosBancariosRegistrados()
    .filter(item => {
      const data = finDataIsoParaDate(item.dataReferencia);
      return data && data.getTime() <= dataReferencia.getTime();
    })
    .at(-1) || null;
}

function finMovimentosRealizadosSemFiltros() {
  const registrados = finLancamentosRegistrados()
    .map(item => finNormalizarLancamentoManual(item))
    .filter(item => item && item.status === 'realizado');
  return [...registrados, ...finComissoesRecebidasHistoricas()];
}

function finFluxoRealizadoEntre(inicioExclusive, fimInclusive) {
  if (!(fimInclusive instanceof Date) || Number.isNaN(fimInclusive.getTime())) return 0;
  const inicioMs = inicioExclusive instanceof Date && !Number.isNaN(inicioExclusive.getTime()) ? inicioExclusive.getTime() : -Infinity;
  const fimMs = fimInclusive.getTime();
  return finMovimentosRealizadosSemFiltros().reduce((total, item) => {
    const data = item && item.dataRef;
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return total;
    if (data.getTime() <= inicioMs || data.getTime() > fimMs) return total;
    const valor = Math.abs(finValorSeguro(item.valorBruto));
    return total + (item.natureza === 'saida' ? -valor : valor);
  }, 0);
}

function finConciliacaoMes(mes, ano) {
  const dataPainel = finDataReferenciaPainel(mes, ano);
  const saldoBancario = finSaldoBancarioDoMes(mes, ano, dataPainel);
  const inicioMes = new Date(ano, mes, 1, 12, 0, 0, 0);
  const saldoAberturaMes = finSaldoBancarioAnterior(inicioMes);
  const saldoBase = saldoAberturaMes || finSaldoBancarioAte(dataPainel);
  const dataSaldoBase = saldoBase ? finDataIsoParaDate(saldoBase.dataReferencia) : null;
  const movimentoSistema = saldoBase ? finFluxoRealizadoEntre(dataSaldoBase, dataPainel) : null;
  const saldoSistema = saldoBase ? finValorSeguro(saldoBase.saldo) + movimentoSistema : null;
  const dataConciliacao = saldoBancario ? finDataIsoParaDate(saldoBancario.dataReferencia) : null;
  const saldoBancarioAtualizado = !!(
    dataConciliacao && dataConciliacao.getTime() === dataPainel.getTime()
  );
  const diferenca = saldoBancarioAtualizado && saldoSistema != null
    ? finValorSeguro(saldoBancario.saldo) - saldoSistema
    : null;
  return {
    dataPainel,
    dataReferencia: dataPainel,
    dataConciliacao,
    saldoAnterior: saldoBase,
    saldoBase,
    saldoBancario,
    saldoBancarioAtualizado,
    movimentoSistema,
    saldoSistema,
    diferenca,
    conciliado: diferenca != null && Math.abs(diferenca) < 0.05
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
  if (cat === 'REPASSE COMISSAO') return { bucket: 'despesa', grupo: 'Comissoes e repasses', conta: cat };
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

  const movimentos = [
    ...finComissoesRecebidasHistoricas(),
    ...finLancamentosRegistrados().map(finNormalizarLancamentoManual)
  ];
  movimentos.forEach(normalizado => {
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
  const valorTotal = sinal === 'signed' ? finFmtAssinado(total) : finFmtMoeda(total);
  return `
    <tr class="dre-row dre-section ${classe}">
      <td>${zUiText(titulo)}</td>
      <td>${zUiText(valorTotal)}</td>
    </tr>
    ${grupos.map(grupo => `
      <tr class="dre-row dre-group">
        <td><span class="dre-indent dre-indent-1">${zUiText(grupo.label)}</span></td>
        <td>${finFmtMoeda(grupo.total)}</td>
      </tr>
      ${grupo.contas.map(conta => `
        <tr class="dre-row dre-account">
          <td><span class="dre-indent dre-indent-2">${zUiText(conta.label)}</span></td>
          <td>${finFmtMoeda(conta.total)}</td>
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
    .map(item => ({ label: item.label, meta: 'Receita do periodo', valor: finFmtMoeda(item.total), tom: 'good' }));
  const topDespesas = [...dados.gruposImpostos, ...dados.gruposDespesa]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(item => ({ label: item.label, meta: 'Saida realizada', valor: finFmtMoeda(item.total), tom: 'bad' }));
  const serie = dados.serie.map(item => ({
    label: item.label,
    meta: `Receita ${finFmtMoeda(item.receita)} • Despesa ${finFmtMoeda(item.impostos + item.despesa + item.financeiroDespesa)}`,
    valor: finFmtAssinado(item.resultadoLiquido),
    tom: item.resultadoLiquido >= 0 ? 'good' : 'bad'
  }));
  const foraDre = [
    ...dados.gruposForaReceita.map(item => ({ label: item.label, meta: 'Entrada fora do DRE', valor: finFmtMoeda(item.total), tom: 'good' })),
    ...dados.gruposForaDespesa.map(item => ({ label: item.label, meta: 'Saida fora do DRE', valor: `-${finFmtMoeda(item.total)}`, tom: 'bad' }))
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
    finResumoCard('Receitas', finFmtMoeda(dados.receita), 'Entradas que compoem o resultado do periodo', '#2E9E6E', 'good', 'realized'),
    finResumoCard('Despesas operacionais', finFmtMoeda(dados.despesa + dados.impostos), 'Saidas operacionais e impostos realizados', '#C05030', 'bad', 'outflow'),
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

