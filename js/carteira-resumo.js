// CARTEIRA - parte 1/4: filtros, formatacao base, resumo comparativo, ranking, resumo de distratos
// CARTEIRA
// Modulo Minha Carteira - saldo, KPIs e tabela por perfil

const carteiraFiltros = {
  mes: '',
  unidade: '',
  construtora: '',
  situacao: 'todos'
};
let carteiraMobileLimite = 24;
const CARTEIRA_MOBILE_PASSO = 24;

const CARTEIRA_MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const CARTEIRA_MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function carteiraTextoBase(valor) {
  return zUiText(String(valor || '')).replace(/\s+/g, ' ').trim();
}

function carteiraRotuloPadrao(valor, fallback = '') {
  const texto = carteiraTextoBase(valor) || carteiraTextoBase(fallback);
  const chave = String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  const mapa = {
    'NAO INFORMADO': 'Não informado',
    'NAO INFORMADA': 'Não informada',
    'INDICACAO': 'Indicação',
    'INDICACOES': 'Indicações',
    'OFERTA ATIVA': 'Oferta Ativa'
  };
  return mapa[chave] || texto;
}

function normalizarCarteiraTexto(valor) {
  return carteiraRotuloPadrao(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function ordemMesCarteira(valor) {
  const idx = CARTEIRA_MESES.indexOf(normalizarCarteiraTexto(valor));
  return idx === -1 ? 99 : idx;
}

function getCols() {
  if (role === 'cor') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'minha', 'bonus_cor', 'etapa'];
  if (role === 'cap') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'com_cap', 'minha', 'bonus_cor', 'etapa'];
  if (role === 'ger') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'com_cap', 'com_ger', 'minha', 'bonus_ger', 'etapa'];
  if (role === 'dir') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'bonus_dir', 'etapa'];
  if (role === 'dono') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'com_zel', 'bonus_total', 'etapa'];
  return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'com_zel', 'bonus_total', 'etapa'];
}

function carteiraMatchUsuarioCampo(campo) {
  if (!usuarioLogado || !campo) return false;
  const valor = String(campo || '').toLowerCase().trim();
  const nomeCompleto = String(usuarioLogado.nome || '').toLowerCase().trim();
  const primeiroNome = nomeCompleto.split(' ')[0] || '';
  return valor === nomeCompleto || (primeiroNome.length >= 3 && valor === primeiroNome);
}

function carteiraUsuarioEhCorretorVenda(v) {
  if (!usuarioLogado || !v) return false;
  if (typeof corretorVendaPertenceAoUsuario === 'function') {
    return corretorVendaPertenceAoUsuario(v, usuarioLogado);
  }
  return carteiraMatchUsuarioCampo(v.corretor);
}

const carteiraMoedaFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function fmtCarteiraValor(valor) {
  const numero = Number(valor || 0);
  return carteiraMoedaFormatter.format(Number.isFinite(numero) ? numero : 0);
}

function carteiraBonusStatusAtual(v) {
  if (!v || !v.bonus || v.bonus <= 0) return '';
  if (typeof bonusStatusVenda === 'function') return bonusStatusVenda(v);
  return String(v.bonus_status || '').trim().toLowerCase();
}

function carteiraBonusFoiPago(v) {
  return carteiraBonusStatusAtual(v) === 'pago';
}

function carteiraMinhaComissaoValor(v) {
  if (!v) return 0;
  if (role === 'fin') return comZ(v);
  if (role === 'dono') return comTotal(v);
  if (role === 'rh') return comRH(v);
  if (!usuarioLogado) {
    if (role === 'cor') return comC(v);
    if (role === 'cap') return comCap(v);
    if (role === 'ger') return comG(v);
    if (role === 'dir') return comD(v) + comD2(v);
    return 0;
  }
  let total = 0;
  if (carteiraUsuarioEhCorretorVenda(v)) total += comC(v);
  if (carteiraMatchUsuarioCampo(v.capitao)) total += comCap(v);
  if (carteiraMatchUsuarioCampo(v.gerente)) total += comG(v);
  if (carteiraMatchUsuarioCampo(v.diretor)) total += comD(v);
  if (carteiraMatchUsuarioCampo(v.diretor2)) total += comD2(v);
  if (total === 0) {
    if (role === 'cor') return comC(v);
    if (role === 'cap') return comCap(v);
    if (role === 'ger') return comG(v);
    if (role === 'dir') return comD(v) + comD2(v);
  }
  return total;
}

function carteiraMeuBonusValor(v) {
  if (!v || !v.bonus || v.bonus <= 0) return 0;
  if (role === 'dono') return bonusLiquidoTotal(v);
  if (role === 'fin' || role === 'rh') return 0;
  if (!usuarioLogado) {
    if (role === 'cor') return bonusCor(v);
    if (role === 'ger') return bonusGer(v);
    if (role === 'dir') return bonusDir(v) + bonusDir2(v);
    return 0;
  }
  let total = 0;
  if (carteiraUsuarioEhCorretorVenda(v)) total += bonusCor(v);
  if (carteiraMatchUsuarioCampo(v.gerente)) total += bonusGer(v);
  if (carteiraMatchUsuarioCampo(v.diretor)) total += bonusDir(v);
  if (carteiraMatchUsuarioCampo(v.diretor2)) total += bonusDir2(v);
  if (total === 0) {
    if (role === 'cor') return bonusCor(v);
    if (role === 'ger') return bonusGer(v);
    if (role === 'dir') return bonusDir(v) + bonusDir2(v);
  }
  return total;
}

function carteiraMeuBonusRecebido(v) {
  return carteiraBonusFoiPago(v) ? carteiraMeuBonusValor(v) : 0;
}

function carteiraMeuBonusNotaGerada(v) {
  return carteiraBonusStatusAtual(v) === 'nota_gerada' ? carteiraMeuBonusValor(v) : 0;
}

function carteiraMeuBonusPendente(v) {
  const status = carteiraBonusStatusAtual(v);
  return (!status || status === 'pendente') ? carteiraMeuBonusValor(v) : 0;
}

function carteiraMeuBonusNaoPago(v) {
  return carteiraBonusFoiPago(v) ? 0 : carteiraMeuBonusValor(v);
}

function setCarteiraFiltro(chave, valor) {
  carteiraFiltros[chave] = valor;
  carteiraMobileLimite = CARTEIRA_MOBILE_PASSO;
  renderCarteira();
}

function setCarteiraSituacao(valor) {
  carteiraFiltros.situacao = valor;
  carteiraMobileLimite = CARTEIRA_MOBILE_PASSO;
  renderCarteira();
}

function resetCarteiraFiltros() {
  carteiraFiltros.mes = '';
  carteiraFiltros.unidade = '';
  carteiraFiltros.construtora = '';
  carteiraFiltros.situacao = 'todos';
  carteiraMobileLimite = CARTEIRA_MOBILE_PASSO;
  renderCarteira();
}

function mostrarMaisCarteiraMobile() {
  carteiraMobileLimite += CARTEIRA_MOBILE_PASSO;
  renderCarteira();
}

function labelSituacaoCarteira(valor) {
  const mapa = {
    todos: 'Visão completa',
    ativas: 'Ativas',
    concluidas: 'Concluídas',
    andamento: 'Em andamento',
    distratos: 'Distratos'
  };
  return mapa[valor] || 'Visão completa';
}

function descricaoSituacaoCarteira(valor) {
  const mapa = {
    todos: 'ReÃºne toda a carteira lanÃ§ada para leitura executiva do funil completo.',
    ativas: 'Mostra apenas as vendas vivas, preservadas e ainda relevantes para retenÃ§Ã£o.',
    concluidas: 'Foca apenas nas vendas jÃ¡ concluÃ­das dentro da carteira ativa.',
    andamento: 'Isola o pipeline que ainda depende de produÃ§Ã£o operacional e acompanhamento.',
    distratos: 'Exibe apenas as vendas perdidas para leitura de cancelamentos e impacto.'
  };
  return mapa[valor] || mapa.todos;
}

function resumoTabelaCarteira(situacao, visiveis, dados, analiseAtivas, analiseAndamento, analiseDistratos) {
  const mapa = {
    todos: {
      kicker: 'Mapa executivo',
      title: 'Tudo que entrou na carteira neste recorte',
      copy: 'Mistura concluidas, pipeline e distratos na mesma leitura para acompanhar o que virou resultado, o que ainda depende do time e o que ja se perdeu.',
      pills: [
        { label: 'Recorte', value: `${visiveis.length} venda${visiveis.length !== 1 ? 's' : ''}` },
        { label: 'Concluidas', value: `${dados.concluidas.length}` },
        { label: 'Em andamento', value: `${dados.emAndamento.length}` },
        { label: 'Distratos', value: `${dados.distratadas.length}` }
      ]
    },
    ativas: {
      kicker: 'Carteira viva',
      title: 'Base preservada e ainda relevante para resultado',
      copy: 'A tabela abaixo mantem o foco nas vendas nao distratadas para leitura de retencao, pipeline e receita ainda viva.',
      pills: [
        { label: 'Ativas', value: `${analiseAtivas.totalAtivas}` },
        { label: 'Concluidas ativas', value: `${analiseAtivas.totalConcluidas}` },
        { label: 'Pipeline', value: `${analiseAtivas.totalEmAndamento}` },
        { label: 'Com. ativa', value: fmtK(analiseAtivas.comissaoAtiva) }
      ]
    },
    concluidas: {
      kicker: 'Base concluida',
      title: 'Vendas fechadas dentro da carteira ativa',
      copy: 'Leitura concentrada apenas nas vendas que ja chegaram em comissao recebida, preservando o historico comercial do recorte.',
      pills: [
        { label: 'Concluidas', value: `${dados.concluidas.length}` },
        { label: 'Taxa ativa', value: fmtPctCarteira(analiseAtivas.taxaConclusaoAtiva) },
        { label: 'Ciclo medio', value: carteiraFmtDias(analiseAtivas.diasMediosConclusao) },
        { label: 'Lucro Zelony', value: fmtK(dados.zelony) }
      ]
    },
    andamento: {
      kicker: 'Base operacional',
      title: 'Pipeline que ainda depende de acompanhamento',
      copy: 'Aqui ficam apenas as vendas abertas, com foco em prazo, etapa e volume financeiro que ainda precisa rodar para virar caixa.',
      pills: [
        { label: 'Abertas', value: `${analiseAndamento.totalEmAndamento}` },
        { label: 'Atrasadas', value: `${analiseAndamento.atrasadas}` },
        { label: 'Pendencias', value: `${analiseAndamento.pendenciasAbertas}` },
        { label: 'Com. potencial', value: fmtK(analiseAndamento.comissaoPotencial) }
      ]
    },
    distratos: {
      kicker: 'Base critica',
      title: 'Vendas distratadas do recorte',
      copy: 'Todas as linhas abaixo representam perdas confirmadas. A leitura agora prioriza impacto financeiro, etapa do cancelamento e sinais para correcao rapida.',
      pills: [
        { label: 'Distratos', value: `${analiseDistratos.totalDistratos}` },
        { label: 'Taxa', value: fmtPctCarteira(analiseDistratos.taxaDistrato) },
        { label: 'Com. perdida', value: fmtK(analiseDistratos.comissaoPerdida) },
        { label: 'Lucro perdido', value: fmtK(analiseDistratos.lucroPerdido) }
      ]
    }
  };
  return mapa[situacao] || mapa.todos;
}

function fmtPctCarteira(valor) {
  return `${Number(valor || 0).toFixed(1).replace('.', ',')}%`;
}

function carteiraHeaderMap() {
  return {
    data: 'Data',
    cliente: 'Cliente',
    produto: 'Produto',
    corretor: 'Corretor',
    capitao: 'Capitão',
    gerente: 'Gerente',
    vgv: 'Valor venda',
    com_bruta: 'Com. bruta',
    com_total: 'Com. líquida',
    com_cor: 'Corretor',
    com_cap: 'Capitão',
    com_ger: 'Gerente',
    com_dir: role === 'dir' ? 'Minha comissão' : 'Diretor',
    com_zel: 'Zelony',
    minha: typeof lblCom === 'function' ? lblCom() : 'Minha comissão',
    bonus_cor: '🎁 Meu bônus',
    bonus_ger: '🎁 Meu bônus',
    bonus_dir: '🎁 Meu bônus',
    bonus_total: '🎁 Bônus líq.',
    etapa: 'Etapa'
  };
}

function carteiraOpcoes(lista, campo) {
  const valores = [...new Set(lista.map(item => item[campo]).filter(Boolean))];
  if (campo === 'mes') return valores.sort((a, b) => ordemMesCarteira(a) - ordemMesCarteira(b));
  return valores.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function aplicarFiltrosCarteira(lista, opts = {}) {
  let out = [...lista];
  if (!opts.ignorarMes && carteiraFiltros.mes) out = out.filter(v => v.mes === carteiraFiltros.mes);
  if (carteiraFiltros.unidade) out = out.filter(v => v.unidade === carteiraFiltros.unidade);
  if (carteiraFiltros.construtora) out = out.filter(v => v.construtora === carteiraFiltros.construtora);
  if (!opts.ignorarSituacao) {
    if (carteiraFiltros.situacao === 'ativas') out = out.filter(v => !v.distratada);
    if (carteiraFiltros.situacao === 'concluidas') out = out.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
    if (carteiraFiltros.situacao === 'andamento') out = out.filter(v => !v.distratada && v.etapa < ETAPAS.length - 1);
    if (carteiraFiltros.situacao === 'distratos') out = out.filter(v => v.distratada);
  }
  return out;
}

function resumoCarteira(lista) {
  const ativas = lista.filter(v => !v.distratada);
  const distratadas = lista.filter(v => v.distratada);
  const concluidas = ativas.filter(v => v.etapa === ETAPAS.length - 1);
  const emAndamento = ativas.filter(v => v.etapa < ETAPAS.length - 1);
  const vgv = ativas.reduce((s, v) => s + v.valor, 0);
  const cBruta = ativas.reduce((s, v) => s + comBruta(v), 0);
  const cLiq = ativas.reduce((s, v) => s + comTotal(v), 0);
  const imposto = cBruta - cLiq;
  const cCor = ativas.reduce((s, v) => s + comC(v), 0);
  const cCap = ativas.reduce((s, v) => s + comCap(v), 0);
  const cGer = ativas.reduce((s, v) => s + comG(v), 0);
  const cDir = ativas.reduce((s, v) => s + comD(v) + comD2(v), 0);
  const cRH = ativas.reduce((s, v) => s + comRH(v), 0);
  const zelony = ativas.reduce((s, v) => s + comZ(v), 0);
  const bonusBruto = ativas.reduce((s, v) => s + bonusBrutoTotal(v), 0);
  const bonus = ativas.reduce((s, v) => s + bonusLiquidoTotal(v), 0);
  const bonusImposto = bonusBruto - bonus;
  const ticket = ativas.length ? vgv / ativas.length : 0;
  const taxaDistrato = (ativas.length + distratadas.length) ? (distratadas.length / (ativas.length + distratadas.length)) * 100 : 0;
  const taxaConclusao = ativas.length ? (concluidas.length / ativas.length) * 100 : 0;
  const valorPerdidoDistrato = distratadas.reduce((s, v) => s + comTotal(v), 0);
  const impactoDistrato = distratadas.reduce((s, v) => s + comZ(v), 0);
  const taxaConstrutoras = vgv ? (cBruta / vgv) * 100 : 0;
  const taxaImposto = cBruta ? (imposto / cBruta) * 100 : 0;
  const totalComercial = cCor + cCap + cGer + cDir;
  const totalEmpresa = cRH + zelony;
  const pctComercial = cLiq ? (totalComercial / cLiq) * 100 : 0;
  const pctEmpresa = cLiq ? (totalEmpresa / cLiq) * 100 : 0;
  const margemZelony = cLiq ? (zelony / cLiq) * 100 : 0;
  const vgvPipeline = emAndamento.reduce((s, v) => s + v.valor, 0);

  const topConstrutoraMap = {};
  const topUnidadeMap = {};
  ativas.forEach(v => {
    const constr = carteiraRotuloPadrao(v.construtora, 'Não informado');
    const unid = carteiraRotuloPadrao(v.unidade, 'Não informada');
    if (!topConstrutoraMap[constr]) topConstrutoraMap[constr] = { n: 0, vgv: 0 };
    if (!topUnidadeMap[unid]) topUnidadeMap[unid] = { n: 0, vgv: 0 };
    topConstrutoraMap[constr].n++;
    topConstrutoraMap[constr].vgv += v.valor;
    topUnidadeMap[unid].n++;
    topUnidadeMap[unid].vgv += v.valor;
  });

  const topConstrutora = Object.entries(topConstrutoraMap).sort((a, b) => b[1].vgv - a[1].vgv)[0] || null;
  const topUnidade = Object.entries(topUnidadeMap).sort((a, b) => b[1].vgv - a[1].vgv)[0] || null;

  return {
    lista,
    ativas,
    distratadas,
    concluidas,
    emAndamento,
    vgv,
    cBruta,
    cLiq,
    imposto,
    cCor,
    cCap,
    cGer,
    cDir,
    cRH,
    zelony,
    bonusBruto,
    bonusImposto,
    bonus,
    ticket,
    taxaDistrato,
    taxaConclusao,
    valorPerdidoDistrato,
    impactoDistrato,
    taxaConstrutoras,
    taxaImposto,
    totalComercial,
    totalEmpresa,
    pctComercial,
    pctEmpresa,
    margemZelony,
    vgvPipeline,
    topConstrutora,
    topUnidade
  };
}

function calcDeltaCarteira(atual, anterior, possuiBase) {
  if (!possuiBase) return { possuiBase: false, delta: 0, pct: null };
  const delta = (atual || 0) - (anterior || 0);
  return {
    possuiBase: true,
    delta,
    pct: anterior ? (delta / anterior) * 100 : null
  };
}

function fmtDeltaCarteira(info) {
  if (!info.possuiBase) return zUiText('Sem base');
  return `${info.delta >= 0 ? '+' : '-'}${fmtK(Math.abs(info.delta))}`;
}

function fmtDeltaPctCarteira(info) {
  if (!info.possuiBase || info.pct === null || !isFinite(info.pct)) return zUiText('sem base anterior');
  return `${info.pct >= 0 ? '+' : ''}${fmtPctCarteira(info.pct)}`;
}

function resumoComparativoCarteira(lista) {
  const base = aplicarFiltrosCarteira(lista, { ignorarMes: true, ignorarSituacao: true }).filter(v => !v.distratada);
  const meses = carteiraOpcoes(base, 'mes');
  const mesAtual = carteiraFiltros.mes && meses.includes(carteiraFiltros.mes)
    ? carteiraFiltros.mes
    : (meses[meses.length - 1] || '');
  const idxAtual = meses.indexOf(mesAtual);
  const mesAnterior = idxAtual > 0 ? meses[idxAtual - 1] : '';
  const atual = resumoCarteira(mesAtual ? base.filter(v => v.mes === mesAtual) : []);
  const anterior = mesAnterior ? resumoCarteira(base.filter(v => v.mes === mesAnterior)) : resumoCarteira([]);
  return {
    mesAtual,
    mesAnterior,
    atual,
    anterior,
    deltaZelony: calcDeltaCarteira(atual.zelony, anterior.zelony, !!mesAnterior),
    deltaVgv: calcDeltaCarteira(atual.vgv, anterior.vgv, !!mesAnterior),
    deltaComLiq: calcDeltaCarteira(atual.cLiq, anterior.cLiq, !!mesAnterior)
  };
}

function rankingCarteira(lista, campo, valorFn) {
  const mapa = {};
  lista.forEach(v => {
    const nome = carteiraRotuloPadrao(v[campo], 'Não informado');
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) mapa[chave] = { nome, valor: 0, qtd: 0, vgv: 0 };
    mapa[chave].valor += valorFn(v);
    mapa[chave].qtd++;
    mapa[chave].vgv += v.valor || 0;
  });
  return Object.values(mapa)
    .sort((a, b) => b.valor - a.valor || b.vgv - a.vgv)
    .slice(0, 5);
}

function escapeHtmlCarteira(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function carteiraUiHtml(valor) {
  return escapeHtmlCarteira(zUiText(valor));
}

function carteiraDataVenda(v) {
  if (!v) return null;
  const histBase = Array.isArray(v.hist)
    ? ((typeof histAfetaFluxo === 'function' ? v.hist.find(h => h && histAfetaFluxo(h)) : null) || v.hist[0] || null)
    : null;
  const infoHist = histBase
    ? (obterMomentoHistorico(histBase, { preferTs: false }) || obterMomentoHistorico(histBase))
    : null;
  if (infoHist && infoHist.date) return new Date(infoHist.date.getTime());
  const infoData = v.data ? obterMomentoHistorico({ d: v.data }, { preferTs: false }) : null;
  return infoData && infoData.date ? new Date(infoData.date.getTime()) : null;
}

function carteiraRegistroDistrato(v) {
  if (!v) return null;
  if (Array.isArray(v.hist)) {
    const hist = [...v.hist].reverse().find(item => item && item.tipo === 'distrato');
    if (hist) return hist;
  }
  if (v.dataDistrato) return { d: v.dataDistrato, o: '', tipo: 'distrato' };
  return null;
}

function carteiraDataDistrato(v) {
  const hist = carteiraRegistroDistrato(v);
  if (!hist) return null;
  const info = obterMomentoHistorico(hist, { preferTs: false }) || obterMomentoHistorico(hist);
  return info && info.date ? new Date(info.date.getTime()) : null;
}

function carteiraMotivoDistrato(v) {
  const hist = carteiraRegistroDistrato(v);
  const bruto = carteiraTextoBase((hist && (hist.observacaoDistrato || hist.motivoDistrato || hist.o)) || '')
    .replace(/^[^A-Za-z0-9]+(?=DISTRATO:)/i, '')
    .replace(/^DISTRATO:\s*/i, '')
    .trim();
  return bruto || 'Motivo não informado';
}

function carteiraCategoriaDistratoManual(v) {
  const hist = carteiraRegistroDistrato(v);
  return carteiraRotuloPadrao((hist && (hist.categoriaDistrato || hist.categoria)) || '', '');
}

function carteiraCategoriaDistratoInferida(texto) {
  const chave = normalizarCarteiraTexto(texto);
  if (!chave || chave === 'MOTIVO NAO INFORMADO') return 'Sem categoria';

  const regras = [
    { nome: 'Duplicidade e erro operacional', termos: ['DUPLIC', 'ERRO OPERACIONAL', 'ERRO DE CADASTRO', 'CADASTRO DUPLICADO', 'LANCAMENTO DUPLICADO'] },
    { nome: 'Capacidade de pagamento', termos: ['PARCELA', 'ENTRADA', 'RENDA', 'SEM RENDA', 'ORCAM', 'DESEMPREGO', 'NAO CONSEGUE PAGAR', 'NAO TEM CONDICAO', 'NAO TEM CONDICOES', 'PAGAR'] },
    { nome: 'Crédito e financiamento', termos: ['RESTRI', 'NOME SUJO', 'CRED', 'FINANCI', 'CAIXA', 'CEF', 'REPROV', 'SCORE', 'APROV'] },
    { nome: 'Documentação e cadastro', termos: ['DOCUMENT', 'CADASTRO', 'COMPROVANTE', 'CERTIDAO', 'RG', 'CPF', 'FORMULAR', 'ASSINATURA', 'CEHOP'] },
    { nome: 'Jurídico e contrato', termos: ['JURIDIC', 'CONTRATO', 'ESCRITURA', 'CARTORIO', 'CLAUSULA'] },
    { nome: 'Produto e enquadramento', termos: ['PRODUTO', 'ENQUADRAMENTO', 'IMOVEL', 'UNIDADE', 'TIPOLOGIA'] },
    { nome: 'Atendimento comercial', termos: ['ATENDIMENTO', 'CORRETOR', 'GERENTE', 'COMERCIAL', 'RETORNO', 'NEGOCIAC', 'DEMORA', 'COMUNICAC'] },
    { nome: 'Cliente desistiu', termos: ['DESIST', 'SEM INTERESSE', 'NAO QUIS', 'MUDOU DE IDEIA', 'VOLTOU ATRAS', 'CANCELOU', 'RECUOU', 'ABANDONOU'] }
  ];

  const regra = regras.find(item => item.termos.some(termo => chave.includes(termo)));
  return regra ? regra.nome : 'Outros';
}

function carteiraCategoriaDistrato(v) {
  const categoriaManual = carteiraCategoriaDistratoManual(v);
  if (categoriaManual) return categoriaManual;
  return carteiraCategoriaDistratoInferida(carteiraMotivoDistrato(v));
}

function carteiraResumoSinalDistrato(texto, limite = 88) {
  const limpo = carteiraTextoBase(texto);
  if (!limpo || limpo === 'Motivo não informado') return '';
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1).trimEnd()}...`;
}

function carteiraMesAnoLabel(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return 'Sem data';
  return `${CARTEIRA_MESES_CURTOS[data.getMonth()]} ${String(data.getFullYear()).slice(-2)}`;
}

function carteiraSerieMensalVendas(lista) {
  const mapa = {};
  lista.forEach(v => {
    const dataVenda = carteiraDataVenda(v);
    const labelFallback = v.mes || 'Sem data';
    const chave = dataVenda
      ? `${dataVenda.getFullYear()}-${pad2(dataVenda.getMonth() + 1)}`
      : `MES-${normalizarCarteiraTexto(labelFallback)}`;
    const ordem = dataVenda
      ? (dataVenda.getFullYear() * 100) + (dataVenda.getMonth() + 1)
      : (900000 + ordemMesCarteira(labelFallback));
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: dataVenda ? carteiraMesAnoLabel(dataVenda) : labelFallback,
        ordem,
        total: 0,
        distratos: 0,
        perdido: 0,
        zelony: 0
      };
    }
    mapa[chave].total++;
    if (v.distratada) {
      mapa[chave].distratos++;
      mapa[chave].perdido += comTotal(v);
      mapa[chave].zelony += comZ(v);
    }
  });
  return Object.values(mapa)
    .map(item => ({
      ...item,
      taxa: item.total ? (item.distratos / item.total) * 100 : 0
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraSerieMensalDistratos(lista) {
  const mapa = {};
  lista.filter(v => v.distratada).forEach(v => {
    const dataDistrato = carteiraDataDistrato(v);
    const chave = dataDistrato
      ? `${dataDistrato.getFullYear()}-${pad2(dataDistrato.getMonth() + 1)}`
      : `SEM-DATA-${normalizarCarteiraTexto(v.dataDistrato || 'SEM DATA')}`;
    const ordem = dataDistrato
      ? (dataDistrato.getFullYear() * 100) + (dataDistrato.getMonth() + 1)
      : 999999;
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: dataDistrato ? carteiraMesAnoLabel(dataDistrato) : (v.dataDistrato || 'Sem data'),
        ordem,
        distratos: 0,
        perdido: 0,
        zelony: 0,
        vgv: 0
      };
    }
    mapa[chave].distratos++;
    mapa[chave].perdido += comTotal(v);
    mapa[chave].zelony += comZ(v);
    mapa[chave].vgv += v.valor || 0;
  });
  return Object.values(mapa)
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraGruposDistrato(lista, valorFn, opts = {}) {
  const mapa = {};
  lista.forEach(v => {
    const nomeBruto = valorFn(v);
    const nome = carteiraRotuloPadrao(nomeBruto, opts.fallback || 'Não informado');
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        total: 0,
        distratos: 0,
        perdido: 0,
        zelony: 0,
        vgv: 0
      };
    }
    mapa[chave].total++;
    mapa[chave].vgv += v.valor || 0;
    if (v.distratada) {
      mapa[chave].distratos++;
      mapa[chave].perdido += comTotal(v);
      mapa[chave].zelony += comZ(v);
    }
  });
  return Object.values(mapa)
    .filter(item => item.distratos > 0)
    .map(item => ({
      ...item,
      taxa: item.total ? (item.distratos / item.total) * 100 : 0
    }))
    .sort((a, b) => b.distratos - a.distratos || b.taxa - a.taxa || b.perdido - a.perdido || b.total - a.total)
    .slice(0, opts.limite || 5);
}

function carteiraMotivosDistrato(lista) {
  const distratadas = lista.filter(v => v.distratada);
  const mapa = {};
  distratadas.forEach(v => {
    const nome = carteiraCategoriaDistrato(v);
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        distratos: 0,
        perdido: 0,
        zelony: 0,
        sinais: {}
      };
    }
    mapa[chave].distratos++;
    mapa[chave].perdido += comTotal(v);
    mapa[chave].zelony += comZ(v);
    const sinal = carteiraResumoSinalDistrato(carteiraMotivoDistrato(v));
    const chaveSinal = normalizarCarteiraTexto(sinal);
    if (sinal && chaveSinal) {
      if (!mapa[chave].sinais[chaveSinal]) mapa[chave].sinais[chaveSinal] = { texto: sinal, total: 0 };
      mapa[chave].sinais[chaveSinal].total++;
    }
  });
  return Object.values(mapa)
    .map(item => {
      const sinais = Object.values(item.sinais)
        .sort((a, b) => b.total - a.total || a.texto.localeCompare(b.texto, 'pt-BR'))
        .slice(0, 2)
        .map(sinalItem => sinalItem.texto);
      return {
        nome: item.nome,
        distratos: item.distratos,
        perdido: item.perdido,
        zelony: item.zelony,
        taxa: distratadas.length ? (item.distratos / distratadas.length) * 100 : 0,
        insight: sinais.length ? `Sinais: ${sinais.join('; ')}` : 'Sem observações detalhadas.'
      };
    })
    .sort((a, b) => b.distratos - a.distratos || b.perdido - a.perdido)
    .slice(0, 5);
}

function carteiraEtapasDistrato(lista) {
  const distratadas = lista.filter(v => v.distratada);
  const mapa = {};
  distratadas.forEach(v => {
    const nome = ETAPAS[v.etapa] || 'Etapa não informada';
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        distratos: 0,
        perdido: 0
      };
    }
    mapa[chave].distratos++;
    mapa[chave].perdido += comTotal(v);
  });
  return Object.values(mapa)
    .map(item => ({
      ...item,
      taxa: distratadas.length ? (item.distratos / distratadas.length) * 100 : 0
    }))
    .sort((a, b) => b.distratos - a.distratos || b.perdido - a.perdido)
    .slice(0, 5);
}

function resumoDistratosCarteira(listaRecorte, listaComparativa) {
  const base = Array.isArray(listaRecorte) ? [...listaRecorte] : [];
  const comparativa = Array.isArray(listaComparativa) ? [...listaComparativa] : [...base];
  const distratadas = base.filter(v => v.distratada);
  const totalLancadas = base.length;
  const totalDistratos = distratadas.length;
  const taxaDistrato = totalLancadas ? (totalDistratos / totalLancadas) * 100 : 0;
  const vgvDistratado = distratadas.reduce((s, v) => s + (v.valor || 0), 0);
  const comissaoPerdida = distratadas.reduce((s, v) => s + comTotal(v), 0);
  const lucroPerdido = distratadas.reduce((s, v) => s + comZ(v), 0);
  const ticketDistrato = totalDistratos ? vgvDistratado / totalDistratos : 0;
  const tempos = distratadas.map(v => {
    const venda = carteiraDataVenda(v);
    const distrato = carteiraDataDistrato(v);
    if (!(venda instanceof Date) || Number.isNaN(venda.getTime())) return null;
    if (!(distrato instanceof Date) || Number.isNaN(distrato.getTime())) return null;
    const diff = Math.round((distrato.getTime() - venda.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }).filter(valor => Number.isFinite(valor));
  const tempoMedioDias = tempos.length ? Math.round(tempos.reduce((s, valor) => s + valor, 0) / tempos.length) : null;
  const cohorts = carteiraSerieMensalVendas(comparativa);
  const eventos = carteiraSerieMensalDistratos(comparativa);
  const etapas = carteiraEtapasDistrato(base);
  const motivos = carteiraMotivosDistrato(base);
  const unidades = carteiraGruposDistrato(base, v => v.unidade, { fallback: 'Não informada' });
  const ccas = carteiraGruposDistrato(base, v => v.cca, { fallback: 'Não informado' });
  const construtoras = carteiraGruposDistrato(base, v => v.construtora, { fallback: 'Não informada' });
  const gerentes = carteiraGruposDistrato(base, v => v.gerente, { fallback: 'Não informado' });
  const corretores = carteiraGruposDistrato(base, v => v.corretor, { fallback: 'Não informado' });
  const piorCoorte = [...cohorts]
    .filter(item => item.total > 0 && item.distratos > 0)
    .sort((a, b) => b.taxa - a.taxa || b.distratos - a.distratos || b.total - a.total)[0] || null;
  const principalEtapa = etapas[0] || null;
  const principalMotivo = motivos[0] || null;
  const principalUnidade = unidades[0] || null;
  const principalCCA = ccas[0] || null;
  const principalConstrutora = construtoras[0] || null;

  return {
    totalLancadas,
    totalDistratos,
    taxaDistrato,
    taxaRetencao: totalLancadas ? 100 - taxaDistrato : 0,
    vgvDistratado,
    comissaoPerdida,
    lucroPerdido,
    ticketDistrato,
    tempoMedioDias,
    cohorts,
    eventos,
    etapas,
    motivos,
    unidades,
    ccas,
    construtoras,
    gerentes,
    corretores,
    piorCoorte,
    principalEtapa,
    principalMotivo,
    principalUnidade,
    principalCCA,
    principalConstrutora
  };
}

