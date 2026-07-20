// CARTEIRA
// Modulo Minha Carteira - saldo, KPIs e tabela por perfil

const carteiraFiltros = {
  mes: '',
  unidade: '',
  construtora: '',
  situacao: 'todos'
};

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
  renderCarteira();
}

function setCarteiraSituacao(valor) {
  carteiraFiltros.situacao = valor;
  renderCarteira();
}

function resetCarteiraFiltros() {
  carteiraFiltros.mes = '';
  carteiraFiltros.unidade = '';
  carteiraFiltros.construtora = '';
  carteiraFiltros.situacao = 'todos';
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

function renderCarteiraDistratoRows(lista, config = {}) {
  if (!lista.length) {
    return `<div class="cart-distrato-empty">${carteiraUiHtml(config.vazio || 'Sem base para este recorte.')}</div>`;
  }
  const valores = lista.map(item => Number(config.widthFn ? config.widthFn(item) : 0)).filter(valor => isFinite(valor) && valor > 0);
  const max = valores.length ? Math.max(...valores) : 0;
  return `<div class="cart-distrato-list">${lista.map(item => {
    const baseWidth = Number(config.widthFn ? config.widthFn(item) : 0);
    const width = max > 0 ? Math.max(8, Math.min(100, (baseWidth / max) * 100)) : 8;
    const tone = config.tone ? ` ${config.tone}` : '';
    const label = config.labelFn ? config.labelFn(item) : item.nome;
    const meta = config.metaFn ? config.metaFn(item) : '';
    const value = config.valueFn ? config.valueFn(item) : '';
    const extra = config.extraFn ? config.extraFn(item) : '';
    return `
      <div class="cart-distrato-row">
        <div class="cart-distrato-row-head">
          <div class="cart-distrato-row-label">${carteiraUiHtml(label)}</div>
          <div class="cart-distrato-row-value">${carteiraUiHtml(value)}</div>
        </div>
        <div class="cart-distrato-row-meta">
          <span>${carteiraUiHtml(meta)}</span>
          ${extra ? `<strong>${carteiraUiHtml(extra)}</strong>` : ''}
        </div>
        <div class="cart-distrato-bar"><div class="cart-distrato-bar-fill${tone}" style="width:${width}%;"></div></div>
      </div>`;
  }).join('')}</div>`;
}

function renderCarteiraDistratoRanking(lista, titulo, subtitulo, legenda) {
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
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} • ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.perdido))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de distratos neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraDistratoBoard(analise, opts = {}) {
  const chips = [
    analise.piorCoorte ? `Pior coorte: ${analise.piorCoorte.nome} (${fmtPctCarteira(analise.piorCoorte.taxa)})` : '',
    analise.principalEtapa ? `Etapa crítica: ${analise.principalEtapa.nome}` : '',
    analise.principalMotivo ? `Motivo líder: ${analise.principalMotivo.nome}` : '',
    analise.principalCCA ? `CCA com mais distratos: ${analise.principalCCA.nome} (${analise.principalCCA.distratos})` : '',
    analise.principalConstrutora ? `Construtora com mais distratos: ${analise.principalConstrutora.nome} (${analise.principalConstrutora.distratos})` : '',
    analise.principalUnidade ? `Unidade com mais distratos: ${analise.principalUnidade.nome}` : ''
  ].filter(Boolean);
  const tempoMedio = carteiraFmtDias(analise.tempoMedioDias);

  return `
    <div class="cart-distrato-board">
      <div class="cart-distrato-hero">
        <div class="cart-distrato-hero-main">
          <div class="cart-distrato-kicker">${carteiraUiHtml('Inteligência de distratos')}</div>
          <div class="cart-distrato-title">${carteiraUiHtml('Consolidado de vendas lançadas x distratos')}</div>
          <div class="cart-distrato-big">${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</div>
          <div class="cart-distrato-copy">${carteiraUiHtml(`${analise.totalDistratos} distrato${analise.totalDistratos !== 1 ? 's' : ''} em ${analise.totalLancadas} venda${analise.totalLancadas !== 1 ? 's' : ''} do recorte • ${fmtK(analise.comissaoPerdida)} de comissão líquida perdida`)}</div>
          ${chips.length ? `<div class="cart-distrato-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Distratos realizados')}</span>
            <strong>${analise.totalDistratos}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaDistrato)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Taxa de retenção')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaRetencao))}</strong>
            <small>${carteiraUiHtml('vendas que permanecem ativas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Tempo médio até o distrato')}</span>
            <strong>${carteiraUiHtml(tempoMedio)}</strong>
            <small>${carteiraUiHtml('média entre lançamento e cancelamento')}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Lucro Zelony perdido')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroPerdido))}</strong>
            <small>${carteiraUiHtml('impacto direto no resultado')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Vendas lançadas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na conciliação')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Distratos')}</span>
          <strong>${analise.totalDistratos}</strong>
          <small>${carteiraUiHtml('casos efetivamente registrados')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Taxa de distrato')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</strong>
          <small>${carteiraUiHtml('distratos / vendas lançadas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvDistratado))}</strong>
          <small>${carteiraUiHtml('valor bruto que saiu do pipeline')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Comissão perdida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoPerdida))}</strong>
          <small>${carteiraUiHtml('receita líquida não realizada')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketDistrato))}</strong>
          <small>${carteiraUiHtml('valor médio por venda distratada')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de venda')}</div>
              <h3>${carteiraUiHtml('Lançadas x distratadas')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Leitura por mês de lançamento. A barra acompanha a taxa de distrato da coorte.')}</div>
          ${renderCarteiraDistratoRows(analise.cohorts, {
            vazio: 'Sem histórico suficiente para comparar meses.',
            tone: 'gold',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.total} lançadas • ${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês do evento')}</div>
              <h3>${carteiraUiHtml('Ritmo de distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data de distrato registrada no histórico. Ajuda a ver aceleração ou alívio nas perdas.')}</div>
          ${renderCarteiraDistratoRows(analise.eventos, {
            vazio: 'Sem datas de distrato suficientes para montar a serie.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtK(item.perdido)} de comissão perdida`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas críticas')}</div>
              <h3>${carteiraUiHtml('Onde os distratos estão acontecendo')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Etapa em que a venda estava no momento do distrato. A barra mostra o peso dentro do total de distratos.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Nenhum distrato no recorte para distribuir por etapa.',
            tone: 'danger',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Categorias de motivo')}</div>
              <h3>${carteiraUiHtml('Por que estamos perdendo venda')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Agrupa os distratos pela categoria escolhida e usa a observação para destacar os principais sinais dentro de cada motivo.')}</div>
          ${renderCarteiraDistratoRows(analise.motivos, {
            vazio: 'Os distratos ainda não possuem categorias ou observações registradas neste recorte.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • ${item.insight}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por unidade')}</div>
              <h3>${carteiraUiHtml('Unidades com mais pressão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Concilia volume, taxa e perda financeira para apontar onde a atenção deve entrar primeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem distratos suficientes para ranquear unidades.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por construtora')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior incidência')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em quais construtoras a taxa de distrato e a perda financeira estão mais presentes.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem distratos suficientes para ranquear construtoras.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por CCA')}</div>
              <h3>${carteiraUiHtml('Quem mais concentra distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais CCAs concentram mais distratos, qual a taxa dentro da própria base e o impacto financeiro desse recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.ccas, {
            vazio: 'Sem distratos suficientes para ranquear CCAs.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

      </div>

      <div class="cart-ranking">
        ${renderCarteiraDistratoRanking(analise.corretores, 'Corretores com mais distratos', 'Radar comercial', 'perda líquida')}
        ${renderCarteiraDistratoRanking(analise.gerentes, 'Gerentes com mais distratos', 'Gestão de carteira', 'perda líquida')}
      </div>
    </div>`;
}

function renderCarteiraDistratoRankingRefinado(lista, titulo, subtitulo, legenda) {
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
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} • ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.perdido))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de distratos neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraDistratoBoardRefinado(analise, opts = {}) {
  const chips = [
    analise.piorCoorte ? `Coorte mais exposta: ${analise.piorCoorte.nome} (${fmtPctCarteira(analise.piorCoorte.taxa)})` : '',
    analise.principalEtapa ? `Etapa mais crítica: ${analise.principalEtapa.nome}` : '',
    analise.principalMotivo ? `Categoria mais recorrente: ${analise.principalMotivo.nome}` : '',
    analise.principalCCA ? `CCA com mais distratos: ${analise.principalCCA.nome} (${analise.principalCCA.distratos})` : '',
    analise.principalConstrutora ? `Construtora com mais distratos: ${analise.principalConstrutora.nome} (${analise.principalConstrutora.distratos})` : '',
    analise.principalUnidade ? `Unidade com mais distratos: ${analise.principalUnidade.nome}` : ''
  ].filter(Boolean);
  const tempoMedio = carteiraFmtDias(analise.tempoMedioDias);

  return `
    <div class="cart-distrato-board">
      <div class="cart-distrato-hero">
        <div class="cart-distrato-hero-main">
          <div class="cart-distrato-kicker">${carteiraUiHtml('Inteligência de distratos')}</div>
          <div class="cart-distrato-title">${carteiraUiHtml('Conciliação entre vendas lançadas e distratos')}</div>
          <div class="cart-distrato-big">${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</div>
          <div class="cart-distrato-copy">${carteiraUiHtml(`${analise.totalDistratos} distrato${analise.totalDistratos !== 1 ? 's' : ''} em ${analise.totalLancadas} venda${analise.totalLancadas !== 1 ? 's' : ''} do recorte • ${fmtK(analise.comissaoPerdida)} em comissão líquida perdida`)}</div>
          ${chips.length ? `<div class="cart-distrato-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Distratos realizados')}</span>
            <strong>${analise.totalDistratos}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaDistrato)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Taxa de retenção')}</span>
            <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaRetencao))}</strong>
            <small>${carteiraUiHtml('vendas que permanecem ativas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Tempo médio até o distrato')}</span>
            <strong>${carteiraUiHtml(tempoMedio)}</strong>
            <small>${carteiraUiHtml('média entre lançamento e cancelamento')}</small>
          </div>
          <div class="cart-distrato-mini danger">
            <span>${carteiraUiHtml('Lucro Zelony perdido')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroPerdido))}</strong>
            <small>${carteiraUiHtml('impacto direto no resultado')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Vendas lançadas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na conciliação')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Distratos')}</span>
          <strong>${analise.totalDistratos}</strong>
          <small>${carteiraUiHtml('casos efetivamente registrados')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Taxa de distrato')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaDistrato))}</strong>
          <small>${carteiraUiHtml('distratos / vendas lançadas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvDistratado))}</strong>
          <small>${carteiraUiHtml('valor bruto que saiu do pipeline')}</small>
        </div>
        <div class="cart-distrato-kpi danger">
          <span>${carteiraUiHtml('Comissão perdida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoPerdida))}</strong>
          <small>${carteiraUiHtml('receita líquida não realizada')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Ticket médio distratado')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.ticketDistrato))}</strong>
          <small>${carteiraUiHtml('valor médio por venda distratada')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de venda')}</div>
              <h3>${carteiraUiHtml('Lançadas x distratadas')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Leitura por mês de lançamento. A barra acompanha a taxa de distrato de cada coorte.')}</div>
          ${renderCarteiraDistratoRows(analise.cohorts, {
            vazio: 'Sem histórico suficiente para comparar os meses.',
            tone: 'gold',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.total} lançadas • ${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês do evento')}</div>
              <h3>${carteiraUiHtml('Ritmo de distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data de distrato registrada no histórico. Ajuda a identificar aceleração ou alívio nas perdas.')}</div>
          ${renderCarteiraDistratoRows(analise.eventos, {
            vazio: 'Sem datas de distrato suficientes para montar a série.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtK(item.perdido)} de comissão perdida`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Etapas críticas')}</div>
              <h3>${carteiraUiHtml('Onde os distratos estão acontecendo')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em qual etapa a venda estava no momento do distrato e qual o peso desse ponto no total do recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.etapas, {
            vazio: 'Nenhum distrato no recorte para distribuir por etapa.',
            tone: 'danger',
            widthFn: item => item.taxa,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Categorias de motivo')}</div>
              <h3>${carteiraUiHtml('Por que as vendas se perdem')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Agrupa os distratos pela categoria escolhida e usa a observação para destacar os principais sinais dentro de cada motivo.')}</div>
          ${renderCarteiraDistratoRows(analise.motivos, {
            vazio: 'Os distratos ainda não possuem categorias ou observações registradas neste recorte.',
            tone: 'danger',
            widthFn: item => item.distratos,
            valueFn: item => `${item.distratos} caso${item.distratos !== 1 ? 's' : ''}`,
            metaFn: item => `${fmtPctCarteira(item.taxa)} • ${item.insight}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por unidade')}</div>
              <h3>${carteiraUiHtml('Unidades com mais pressão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Concilia volume, taxa e perda financeira para apontar onde a atenção deve entrar primeiro.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem distratos suficientes para ranquear unidades.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por construtora')}</div>
              <h3>${carteiraUiHtml('Parceiros com maior incidência')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra em quais construtoras a taxa de distrato e a perda financeira estão mais presentes.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem distratos suficientes para ranquear construtoras.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Concentração por CCA')}</div>
              <h3>${carteiraUiHtml('Quem mais concentra distratos')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais CCAs concentram mais distratos, qual a taxa dentro da própria base e o impacto financeiro desse recorte.')}</div>
          ${renderCarteiraDistratoRows(analise.ccas, {
            vazio: 'Sem distratos suficientes para ranquear CCAs.',
            tone: 'gold',
            widthFn: item => item.distratos,
            valueFn: item => fmtPctCarteira(item.taxa),
            metaFn: item => `${item.distratos} distrato${item.distratos !== 1 ? 's' : ''} em ${item.total} venda${item.total !== 1 ? 's' : ''} • taxa ${fmtPctCarteira(item.taxa)}`,
            extraFn: item => fmtK(item.perdido)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraDistratoRankingRefinado(analise.corretores, 'Corretores com mais distratos', 'Radar comercial', 'perda líquida')}
        ${renderCarteiraDistratoRankingRefinado(analise.gerentes, 'Gerentes com mais distratos', 'Gestão de carteira', 'perda líquida')}
      </div>
    </div>`;
}

function carteiraHistoricoFluxo(v) {
  if (!v || !Array.isArray(v.hist)) return [];
  return v.hist
    .filter(item => item && (typeof histAfetaFluxo !== 'function' || histAfetaFluxo(item)))
    .map(item => {
      const info = obterMomentoHistorico(item, { preferTs: false }) || obterMomentoHistorico(item);
      if (!info || !info.date) return null;
      return { ...item, __date: new Date(info.date.getTime()) };
    })
    .filter(Boolean)
    .sort((a, b) => a.__date.getTime() - b.__date.getTime());
}

function carteiraDiffDias(inicio, fim) {
  if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return null;
  if (!(fim instanceof Date) || Number.isNaN(fim.getTime())) return null;
  const refInicio = new Date(inicio.getTime());
  const refFim = new Date(fim.getTime());
  refInicio.setHours(0, 0, 0, 0);
  refFim.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((refFim.getTime() - refInicio.getTime()) / (1000 * 60 * 60 * 24)));
}

function carteiraFmtDias(valor, vazio = 'Sem base') {
  if (!Number.isFinite(valor)) return vazio;
  return `${valor} ${valor === 1 ? 'dia' : 'dias'}`;
}

function carteiraDataConclusao(v) {
  const finalIdx = ETAPAS.length - 1;
  const hist = carteiraHistoricoFluxo(v);
  const registro = [...hist].reverse().find(item => Number(item.e) === finalIdx);
  return registro ? new Date(registro.__date.getTime()) : null;
}

function carteiraMetricaConclusao(v) {
  if (!v || v.distratada || v.etapa !== ETAPAS.length - 1) return null;
  const cadastro = carteiraDataVenda(v);
  const conclusao = carteiraDataConclusao(v);
  const dias = carteiraDiffDias(cadastro, conclusao);
  if (dias === null) return null;
  return { cadastro, conclusao, dias };
}

function carteiraMediana(valores) {
  if (!Array.isArray(valores) || !valores.length) return null;
  const lista = [...valores].filter(valor => Number.isFinite(valor)).sort((a, b) => a - b);
  if (!lista.length) return null;
  const meio = Math.floor(lista.length / 2);
  if (lista.length % 2) return lista[meio];
  return Math.round((lista[meio - 1] + lista[meio]) / 2);
}

function carteiraSerieMensalConcluidas(lista) {
  const concluidas = lista.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
  const mapa = {};
  concluidas.forEach(v => {
    const conclusao = carteiraDataConclusao(v);
    if (!(conclusao instanceof Date) || Number.isNaN(conclusao.getTime())) return;
    const chave = `${conclusao.getFullYear()}-${pad2(conclusao.getMonth() + 1)}`;
    if (!mapa[chave]) {
      mapa[chave] = {
        nome: carteiraMesAnoLabel(conclusao),
        ordem: (conclusao.getFullYear() * 100) + (conclusao.getMonth() + 1),
        concluidas: 0,
        vgv: 0,
        liq: 0,
        zelony: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    const ciclo = carteiraMetricaConclusao(v);
    mapa[chave].concluidas++;
    mapa[chave].vgv += v.valor || 0;
    mapa[chave].liq += comTotal(v);
    mapa[chave].zelony += comZ(v);
    if (ciclo) {
      mapa[chave].totalDias += ciclo.dias;
      mapa[chave].comDias++;
    }
  });
  return Object.values(mapa)
    .map(item => ({
      ...item,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraCoortesCadastroConclusao(lista) {
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
        concluidas: 0,
        vgv: 0,
        liq: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    mapa[chave].total++;
    if (!v.distratada && v.etapa === ETAPAS.length - 1) {
      const ciclo = carteiraMetricaConclusao(v);
      mapa[chave].concluidas++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      if (ciclo) {
        mapa[chave].totalDias += ciclo.dias;
        mapa[chave].comDias++;
      }
    }
  });
  return Object.values(mapa)
    .filter(item => item.concluidas > 0)
    .map(item => ({
      ...item,
      taxaConclusao: item.total ? (item.concluidas / item.total) * 100 : 0,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => a.ordem - b.ordem)
    .slice(-6);
}

function carteiraGruposConclusao(lista, valorFn, opts = {}) {
  const mapa = {};
  lista.forEach(v => {
    const nomeBruto = valorFn(v);
    const nome = carteiraRotuloPadrao(nomeBruto, opts.fallback || 'Não informado');
    const chave = normalizarCarteiraTexto(nome);
    if (!mapa[chave]) {
      mapa[chave] = {
        nome,
        total: 0,
        concluidas: 0,
        vgv: 0,
        liq: 0,
        zelony: 0,
        totalDias: 0,
        comDias: 0
      };
    }
    mapa[chave].total++;
    if (!v.distratada && v.etapa === ETAPAS.length - 1) {
      const ciclo = carteiraMetricaConclusao(v);
      mapa[chave].concluidas++;
      mapa[chave].vgv += v.valor || 0;
      mapa[chave].liq += comTotal(v);
      mapa[chave].zelony += comZ(v);
      if (ciclo) {
        mapa[chave].totalDias += ciclo.dias;
        mapa[chave].comDias++;
      }
    }
  });
  return Object.values(mapa)
    .filter(item => item.concluidas > 0)
    .map(item => ({
      ...item,
      taxaConclusao: item.total ? (item.concluidas / item.total) * 100 : 0,
      diasMedios: item.comDias ? Math.round(item.totalDias / item.comDias) : null
    }))
    .sort((a, b) => b.concluidas - a.concluidas || b.zelony - a.zelony || b.vgv - a.vgv)
    .slice(0, opts.limite || 5);
}

function carteiraGargalosConclusao(lista) {
  const mapa = {};
  lista
    .filter(v => !v.distratada && v.etapa === ETAPAS.length - 1)
    .forEach(v => {
      const hist = carteiraHistoricoFluxo(v);
      for (let i = 0; i < hist.length - 1; i++) {
        const atual = hist[i];
        const proximo = hist[i + 1];
        const etapaIdx = Number(atual.e);
        if (!Number.isInteger(etapaIdx) || etapaIdx < 0 || etapaIdx >= ETAPAS.length - 1) continue;
        const dias = carteiraDiffDias(atual.__date, proximo.__date);
        if (dias === null) continue;
        if (!mapa[etapaIdx]) {
          mapa[etapaIdx] = {
            nome: ETAPAS[etapaIdx] || 'Etapa',
            totalDias: 0,
            trechos: 0,
            pico: 0,
            vendas: new Set()
          };
        }
        mapa[etapaIdx].totalDias += dias;
        mapa[etapaIdx].trechos++;
        mapa[etapaIdx].pico = Math.max(mapa[etapaIdx].pico, dias);
        mapa[etapaIdx].vendas.add(v.id);
      }
    });
  return Object.values(mapa)
    .map(item => ({
      nome: item.nome,
      diasMedios: item.trechos ? Math.round(item.totalDias / item.trechos) : 0,
      trechos: item.trechos,
      pico: item.pico,
      vendas: item.vendas.size
    }))
    .sort((a, b) => b.diasMedios - a.diasMedios || b.pico - a.pico || b.vendas - a.vendas)
    .slice(0, 5);
}

function resumoConclusoesCarteira(listaRecorte, listaComparativa) {
  const base = Array.isArray(listaRecorte) ? [...listaRecorte] : [];
  const comparativa = Array.isArray(listaComparativa) ? [...listaComparativa] : [...base];
  const concluidas = base.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1);
  const ciclos = concluidas
    .map(v => carteiraMetricaConclusao(v))
    .filter(Boolean)
    .map(item => item.dias);
  const totalLancadas = base.length;
  const totalConcluidas = concluidas.length;
  const taxaConclusao = totalLancadas ? (totalConcluidas / totalLancadas) * 100 : 0;
  const vgvConcluido = concluidas.reduce((s, v) => s + (v.valor || 0), 0);
  const comissaoLiquida = concluidas.reduce((s, v) => s + comTotal(v), 0);
  const lucroZelony = concluidas.reduce((s, v) => s + comZ(v), 0);
  const ticketMedio = totalConcluidas ? vgvConcluido / totalConcluidas : 0;
  const diasMedios = ciclos.length ? Math.round(ciclos.reduce((s, valor) => s + valor, 0) / ciclos.length) : null;
  const diasMediana = carteiraMediana(ciclos);
  const diasMenor = ciclos.length ? Math.min(...ciclos) : null;
  const diasMaior = ciclos.length ? Math.max(...ciclos) : null;
  const serieMensal = carteiraSerieMensalConcluidas(comparativa);
  const coortesCadastro = carteiraCoortesCadastroConclusao(comparativa);
  const gargalos = carteiraGargalosConclusao(concluidas);
  const unidades = carteiraGruposConclusao(base, v => v.unidade, { fallback: 'Não informada' });
  const construtoras = carteiraGruposConclusao(base, v => v.construtora, { fallback: 'Não informada' });
  const origens = carteiraGruposConclusao(base, v => v.origem, { fallback: 'Não informada' });
  const gerentes = carteiraGruposConclusao(base, v => v.gerente, { fallback: 'Não informado' });
  const corretores = carteiraGruposConclusao(base, v => v.corretor, { fallback: 'Não informado' });
  const melhorCoorte = [...coortesCadastro]
    .filter(item => item.diasMedios !== null)
    .sort((a, b) => a.diasMedios - b.diasMedios || b.taxaConclusao - a.taxaConclusao || b.concluidas - a.concluidas)[0] || null;
  const principalGargalo = gargalos[0] || null;
  const melhorOrigem = [...origens]
    .filter(item => item.diasMedios !== null)
    .sort((a, b) => a.diasMedios - b.diasMedios || b.taxaConclusao - a.taxaConclusao)[0] || null;

  return {
    totalLancadas,
    totalConcluidas,
    taxaConclusao,
    vgvConcluido,
    comissaoLiquida,
    lucroZelony,
    ticketMedio,
    diasMedios,
    diasMediana,
    diasMenor,
    diasMaior,
    serieMensal,
    coortesCadastro,
    gargalos,
    unidades,
    construtoras,
    origens,
    gerentes,
    corretores,
    melhorCoorte,
    principalGargalo,
    melhorOrigem
  };
}

function renderCarteiraConclusaoRanking(lista, titulo, subtitulo, legenda) {
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
              <div class="cart-ranking-meta">${carteiraUiHtml(`${item.concluidas} concluídas • taxa ${fmtPctCarteira(item.taxaConclusao)} • ciclo ${carteiraFmtDias(item.diasMedios)}`)}</div>
            </div>
            <div class="cart-ranking-value">${carteiraUiHtml(fmtK(item.zelony))}</div>
          </div>
        `).join('') : `<div class="cart-ranking-empty">${carteiraUiHtml('Sem base de concluídas neste recorte.')}</div>`}
      </div>
    </div>`;
}

function renderCarteiraConclusaoBoard(analise, opts = {}) {
  const diasMedios = carteiraFmtDias(analise.diasMedios);
  const diasMediana = carteiraFmtDias(analise.diasMediana);
  const diasMenor = carteiraFmtDias(analise.diasMenor);
  const diasMaior = carteiraFmtDias(analise.diasMaior);
  const chips = [
    analise.melhorCoorte ? `Coorte mais rápida: ${analise.melhorCoorte.nome} (${carteiraFmtDias(analise.melhorCoorte.diasMedios)})` : '',
    analise.principalGargalo ? `Maior gargalo: ${analise.principalGargalo.nome} (${carteiraFmtDias(analise.principalGargalo.diasMedios)})` : '',
    analise.melhorOrigem ? `Origem mais ágil: ${analise.melhorOrigem.nome}` : ''
  ].filter(Boolean);

  return `
    <div class="cart-conclusao-board">
      <div class="cart-conclusao-hero">
        <div class="cart-conclusao-hero-main">
          <div class="cart-conclusao-kicker">${carteiraUiHtml('Inteligência de concluídas')}</div>
          <div class="cart-conclusao-title">${carteiraUiHtml('Ciclo médio do cadastro até a conclusão')}</div>
          <div class="cart-conclusao-big">${carteiraUiHtml(diasMedios)}</div>
          <div class="cart-conclusao-copy">${carteiraUiHtml(`${analise.totalConcluidas} venda${analise.totalConcluidas !== 1 ? 's' : ''} concluída${analise.totalConcluidas !== 1 ? 's' : ''} entre ${analise.totalLancadas} cadastradas no recorte • ${fmtK(analise.comissaoLiquida)} de comissão líquida convertida`)}</div>
          ${chips.length ? `<div class="cart-conclusao-chips">${chips.map(texto => `<span>${carteiraUiHtml(texto)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="cart-distrato-hero-side">
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Concluídas')}</span>
            <strong>${analise.totalConcluidas}</strong>
            <small>${carteiraUiHtml(`${fmtPctCarteira(analise.taxaConclusao)} do recorte atual`)}</small>
          </div>
          <div class="cart-distrato-mini success">
            <span>${carteiraUiHtml('Ticket médio')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.ticketMedio))}</strong>
            <small>${carteiraUiHtml('VGV médio das vendas concluídas')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Mediana de ciclo')}</span>
            <strong>${carteiraUiHtml(diasMediana)}</strong>
            <small>${carteiraUiHtml('tempo central para fechar uma venda')}</small>
          </div>
          <div class="cart-distrato-mini">
            <span>${carteiraUiHtml('Lucro Zelony')}</span>
            <strong>${carteiraUiHtml(fmtK(analise.lucroZelony))}</strong>
            <small>${carteiraUiHtml('resultado das vendas concluídas')}</small>
          </div>
        </div>
      </div>

      <div class="cart-distrato-kpis">
        <div class="cart-distrato-kpi success">
          <span>${carteiraUiHtml('Vendas cadastradas')}</span>
          <strong>${analise.totalLancadas}</strong>
          <small>${carteiraUiHtml('base usada na taxa de conclusão')}</small>
        </div>
        <div class="cart-distrato-kpi success">
          <span>${carteiraUiHtml('Taxa de conclusão')}</span>
          <strong>${carteiraUiHtml(fmtPctCarteira(analise.taxaConclusao))}</strong>
          <small>${carteiraUiHtml('concluídas / cadastradas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('VGV concluído')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.vgvConcluido))}</strong>
          <small>${carteiraUiHtml('volume total que virou receita')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Comissão líquida')}</span>
          <strong>${carteiraUiHtml(fmtK(analise.comissaoLiquida))}</strong>
          <small>${carteiraUiHtml('comissão convertida nas concluídas')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Menor ciclo')}</span>
          <strong>${carteiraUiHtml(diasMenor)}</strong>
          <small>${carteiraUiHtml('venda mais rápida do recorte')}</small>
        </div>
        <div class="cart-distrato-kpi">
          <span>${carteiraUiHtml('Maior ciclo')}</span>
          <strong>${carteiraUiHtml(diasMaior)}</strong>
          <small>${carteiraUiHtml('venda mais longa do recorte')}</small>
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Mês da conclusão')}</div>
              <h3>${carteiraUiHtml('Ritmo de fechamento')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Leitura por data em que a venda entrou em Comissão recebida.')}</div>
          ${renderCarteiraDistratoRows(analise.serieMensal, {
            vazio: 'Sem histórico suficiente para comparar meses de conclusão.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => `${item.concluidas} concluídas`,
            metaFn: item => item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`,
            extraFn: item => fmtK(item.zelony)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Coorte de cadastro')}</div>
              <h3>${carteiraUiHtml('Velocidade por mês de entrada')}</h3>
            </div>
            <span>${carteiraUiHtml('6m')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml(opts.cohortCopy || 'Mostra se as vendas cadastradas em cada mês estão fechando mais rápido ou mais devagar.')}</div>
          ${renderCarteiraDistratoRows(analise.coortesCadastro, {
            vazio: 'Sem base suficiente para montar as coortes de cadastro.',
            tone: 'gold',
            widthFn: item => item.taxaConclusao,
            valueFn: item => item.diasMedios === null ? 'Sem base' : `${item.diasMedios} dias`,
            metaFn: item => `${item.concluidas} concluídas de ${item.total} cadastradas • taxa ${fmtPctCarteira(item.taxaConclusao)}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Gargalos do processo')}</div>
              <h3>${carteiraUiHtml('Etapas que mais seguram a venda')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Tempo médio gasto em cada etapa entre uma movimentação e a próxima.')}</div>
          ${renderCarteiraDistratoRows(analise.gargalos, {
            vazio: 'Sem base suficiente para medir duração por etapa.',
            tone: 'danger',
            widthFn: item => item.diasMedios,
            valueFn: item => `${item.diasMedios} dias`,
            metaFn: item => `${item.vendas} venda${item.vendas !== 1 ? 's' : ''} • pico de ${carteiraFmtDias(item.pico)}`,
            extraFn: item => `${item.trechos} passagens`
          })}
        </div>
      </div>

      <div class="cart-distrato-grid">
        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Unidades')}</div>
              <h3>${carteiraUiHtml('Onde mais se conclui')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Cruza volume concluído, taxa de conclusão e velocidade média do ciclo.')}</div>
          ${renderCarteiraDistratoRows(analise.unidades, {
            vazio: 'Sem concluídas suficientes para ranquear unidades.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Construtoras')}</div>
              <h3>${carteiraUiHtml('Parceiros com mais fechamento')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Ajuda a ver quais parcerias estão convertendo melhor e mais rápido.')}</div>
          ${renderCarteiraDistratoRows(analise.construtoras, {
            vazio: 'Sem concluídas suficientes para ranquear construtoras.',
            tone: 'success',
            widthFn: item => item.concluidas,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.vgv)
          })}
        </div>

        <div class="cart-distrato-card">
          <div class="cart-distrato-card-head">
            <div>
              <div class="cart-distrato-card-kicker">${carteiraUiHtml('Origens')}</div>
              <h3>${carteiraUiHtml('Origens com melhor conversão')}</h3>
            </div>
            <span>${carteiraUiHtml('Top 5')}</span>
          </div>
          <div class="cart-distrato-card-copy">${carteiraUiHtml('Mostra quais origens entregam mais vendas concluídas e ciclos mais curtos.')}</div>
          ${renderCarteiraDistratoRows(analise.origens, {
            vazio: 'Sem concluídas suficientes para ranquear origens.',
            tone: 'gold',
            widthFn: item => item.taxaConclusao,
            valueFn: item => fmtPctCarteira(item.taxaConclusao),
            metaFn: item => `${item.concluidas} concluídas em ${item.total} cadastradas • ${item.diasMedios === null ? 'ciclo sem base' : `ciclo médio de ${carteiraFmtDias(item.diasMedios)}`}`,
            extraFn: item => fmtK(item.liq)
          })}
        </div>
      </div>

      <div class="cart-ranking">
        ${renderCarteiraConclusaoRanking(analise.corretores, 'Corretores com mais concluídas', 'Radar comercial', 'lucro Zelony')}
        ${renderCarteiraConclusaoRanking(analise.gerentes, 'Gerentes com mais concluídas', 'Liderança', 'lucro Zelony')}
      </div>
    </div>`;
}

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

function renderCarteiraTabelaRows(lista, cols) {
  if (!lista.length) {
    return `<tr><td colspan="${cols.length}" style="padding:28px 12px;text-align:center;color:var(--tm);">${zUiText('Nenhuma venda encontrada para este recorte.')}</td></tr>`;
  }

  return lista.map(v => {
    const statusPill = v.distratada
      ? `<span class="cart-status-pill danger">${zUiText('Distrato')}</span>`
      : v.etapa === ETAPAS.length - 1
        ? `<span class="cart-status-pill success">${zUiText('Concluída')}</span>`
        : `<span class="cart-status-pill warn">${zUiText('Pipeline')}</span>`;

    return `<tr class="${v.distratada ? 'cart-row-distrato' : 'cart-row-normal'}">${cols.map(c => {
      if (c === 'data') return `<td>${zUiText(v.data)}</td>`;
      if (c === 'cliente') return `<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${zUiText(clienteVendaTexto(v.cliente) || '—')}</td>`;
      if (c === 'produto') return `<td>${zUiText(v.produto)}</td>`;
      if (c === 'corretor') return `<td>${zUiText(v.corretor)}</td>`;
      if (c === 'capitao') return `<td>${zUiText(v.capitao || '—')}</td>`;
      if (c === 'gerente') return `<td>${zUiText(v.gerente || '—')}</td>`;
      if (c === 'com_cor') return `<td class="pos">${fmtCarteiraValor(comC(v))}</td>`;
      if (c === 'com_cap') return `<td class="pos">${fmtCarteiraValor(comCap(v))}</td>`;
      if (c === 'com_ger') return `<td class="pos">${fmtCarteiraValor(comG(v))}</td>`;
      if (c === 'com_dir') {
        const valorDiretor = role === 'dir' ? carteiraMinhaComissaoValor(v) : (comD(v) + comD2(v));
        return `<td class="pos">${fmtCarteiraValor(valorDiretor)}</td>`;
      }
      if (c === 'com_zel') return `<td class="pos">${fmtCarteiraValor(comZ(v))}</td>`;
      if (c === 'vgv') return `<td class="pos">${fmtCarteiraValor(v.valor)}</td>`;
      if (c === 'com_bruta') return `<td class="pos">${fmtCarteiraValor(comBruta(v))}</td>`;
      if (c === 'com_total') return `<td class="pos">${fmtCarteiraValor(comTotal(v))}</td>`;
      if (c === 'minha') return `<td class="pos">${fmtCarteiraValor(comVis(v))}</td>`;
      if (c === 'bonus_cor' || c === 'bonus_ger' || c === 'bonus_dir') {
        if (!v.bonus || v.bonus <= 0) return `<td class="pos" style="color:#2E9E6E;">${zUiText('—')}</td>`;
        let totalBonus = 0;
        if (usuarioLogado) {
          const mn = campo => {
            if (!campo) return false;
            const c2 = campo.toLowerCase().trim();
            const nc = usuarioLogado.nome.toLowerCase().trim();
            const pn = nc.split(' ')[0];
            return c2 === nc || (pn.length >= 3 && c2 === pn);
          };
          if (carteiraUsuarioEhCorretorVenda(v)) totalBonus += bonusCor(v);
          if (mn(v.gerente)) totalBonus += bonusGer(v);
          if (mn(v.diretor)) totalBonus += bonusDir(v);
          if (mn(v.diretor2)) totalBonus += bonusDir2(v);
        } else {
          if (c === 'bonus_cor') totalBonus = bonusCor(v);
          if (c === 'bonus_ger') totalBonus = bonusGer(v);
          if (c === 'bonus_dir') totalBonus = bonusDir(v) + bonusDir2(v);
        }
        return `<td class="pos" style="color:#2E9E6E;">${totalBonus > 0 ? fmtCarteiraValor(totalBonus) : zUiText('—')}</td>`;
      }
      if (c === 'bonus_total') return `<td class="pos" style="color:#2E9E6E;">${v.bonus > 0 ? fmtCarteiraValor(bonusLiquidoTotal(v)) : zUiText('—')}</td>`;
      if (c === 'etapa') {
        return `<td><div class="cart-stage-cell"><span class="spill${v.etapa === ETAPAS.length - 1 ? ' f' : ''}">${zUiText(ETAPAS[v.etapa])}</span>${statusPill}</div></td>`;
      }
      return `<td>${zUiText('—')}</td>`;
    }).join('')}</tr>`;
  }).join('');
}

function renderCarteira() {
  const lMinhas = vendasU(VENDAS, true);
  const etapaFinal = ETAPAS.length - 1;
  const calcComissao = v => carteiraMinhaComissaoValor(v);

  const pend = lMinhas.filter(v => !v.distratada).reduce((s, v) => {
    const comissaoPendente = v.etapa < etapaFinal ? calcComissao(v) : 0;
    return s + comissaoPendente + carteiraMeuBonusPendente(v);
  }, 0);
  const nota = lMinhas.filter(v => !v.distratada).reduce((s, v) => s + carteiraMeuBonusNotaGerada(v), 0);
  const rec = lMinhas.filter(v => !v.distratada).reduce((s, v) => {
    const comissaoRecebida = v.etapa === etapaFinal ? calcComissao(v) : 0;
    return s + comissaoRecebida + carteiraMeuBonusRecebido(v);
  }, 0);
  const saldo = rec + nota + pend;
  const distratas = lMinhas.filter(v => v.distratada);
  const perdido = distratas.reduce((s, v) => {
    const comissaoPerdida = v.etapa < etapaFinal ? calcComissao(v) : 0;
    return s + comissaoPerdida + carteiraMeuBonusNaoPago(v);
  }, 0);
  const rd = RD[role];
  const saldoLabel = 'Total líquido da carteira ativa';
  const saldoSub = zUiText(`${nota > 0 ? 'já recebido + nota gerada + em aberto' : 'já recebido + em aberto'} · ${rd.nome} · ${rd.role}`);
  const cols = getCols();
  const headerMap = carteiraHeaderMap();

  if (role === 'dono' || role === 'fin') {
    const visiveis = aplicarFiltrosCarteira(lMinhas);
    const baseSemSituacao = aplicarFiltrosCarteira(lMinhas, { ignorarSituacao: true });
    const dados = resumoCarteira(visiveis);
    const chips = resumoCarteira(baseSemSituacao);
    const comparativo = resumoComparativoCarteira(lMinhas);
    const meses = carteiraOpcoes(lMinhas, 'mes');
    const unidades = carteiraOpcoes(lMinhas, 'unidade');
    const construtoras = carteiraOpcoes(lMinhas, 'construtora');
    const rows = renderCarteiraTabelaRows(visiveis, cols);
    const filtrosAtivos = Object.values(carteiraFiltros).filter(v => v && v !== 'todos').length;
    const rankingBase = carteiraFiltros.situacao === 'distratos' ? visiveis.filter(v => v.distratada) : visiveis.filter(v => !v.distratada);
    const rankingGerentes = rankingCarteira(rankingBase, 'gerente', v => comZ(v));
    const rankingConstrutoras = rankingCarteira(rankingBase, 'construtora', v => comZ(v));
    const concentracaoTopConstr = dados.topConstrutora && dados.vgv ? (dados.topConstrutora[1].vgv / dados.vgv) * 100 : 0;
    const baseDistratoRecorte = aplicarFiltrosCarteira(lMinhas, { ignorarSituacao: true });
    const baseDistratoComparativa = aplicarFiltrosCarteira(lMinhas, { ignorarMes: true, ignorarSituacao: true });
    const analiseConcluidas = resumoConclusoesCarteira(baseDistratoRecorte, baseDistratoComparativa);
    const analiseAndamento = resumoAndamentoCarteira(baseDistratoRecorte, baseDistratoComparativa);
    const analiseAtivas = resumoAtivasCarteira(baseDistratoRecorte, baseDistratoComparativa);
    const andamentoBoard = role === 'dono' && carteiraFiltros.situacao === 'andamento'
      ? renderCarteiraAndamentoBoard(analiseAndamento, {
          cohortCopy: carteiraFiltros.mes
            ? 'A leitura mensal respeita unidade e construtora, mas ignora o filtro de mês para preservar a tendência do pipeline.'
            : 'Mostra quais meses de entrada ainda carregam mais carteira aberta e onde a idade média está aumentando.'
        })
      : '';
    const ativasBoard = role === 'dono' && carteiraFiltros.situacao === 'ativas'
      ? renderCarteiraAtivasBoard(analiseAtivas, {
          cohortCopy: carteiraFiltros.mes
            ? 'A leitura de retenção respeita unidade e construtora, mas ignora o filtro de mês para manter a visão da coorte.'
            : 'Mostra quanto de cada mês lançado ainda está ativo e como esse ativo se divide entre concluídas e pipeline.'
        })
      : '';
    const concluidaBoard = role === 'dono' && carteiraFiltros.situacao === 'concluidas'
      ? renderCarteiraConclusaoBoard(analiseConcluidas, {
          cohortCopy: carteiraFiltros.mes
            ? 'O comparativo de coortes respeita unidade e construtora, mas ignora o filtro de mês para preservar a leitura de tendência.'
            : 'Mostra se as vendas cadastradas em cada mês estão fechando mais rápido ou mais devagar.'
        })
      : '';
    const analiseDistratos = resumoDistratosCarteira(baseDistratoRecorte, baseDistratoComparativa);
    const distratoBoard = role === 'dono' && carteiraFiltros.situacao === 'distratos'
      ? renderCarteiraDistratoBoardRefinado(analiseDistratos, {
          cohortCopy: carteiraFiltros.mes
            ? 'O comparativo mensal respeita unidade e construtora, mas ignora o filtro de mês para preservar a leitura de tendência.'
            : 'Leitura por mês de lançamento. A barra acompanha a taxa de distrato da coorte.'
        })
      : '';
    const tabelaResumo = resumoTabelaCarteira(
      carteiraFiltros.situacao,
      visiveis,
      dados,
      analiseAtivas,
      analiseAndamento,
      analiseDistratos
    );
    const alertas = [];

    if (dados.distratadas.length) {
      alertas.push({
        tipo: 'danger',
        tag: 'Risco de distrato',
        titulo: `${fmtPctCarteira(dados.taxaDistrato)} ${zUiText('em distratos')}`,
        meta: `${dados.distratadas.length} ${zUiText(`venda${dados.distratadas.length !== 1 ? 's' : ''}`)} • ${fmtK(dados.valorPerdidoDistrato)} ${zUiText('de comissão líquida que deixou de entrar')}`
      });
    }
    if (dados.pctEmpresa < 45 && dados.cLiq > 0) {
      alertas.push({
        tipo: 'warn',
        tag: 'Retenção da empresa',
        titulo: `${fmtPctCarteira(dados.pctEmpresa)} ${zUiText('fica com a empresa')}`,
        meta: `${fmtPctCarteira(dados.pctComercial)} ${zUiText('está com a equipe comercial neste recorte')}`
      });
    }
    if (dados.topConstrutora && concentracaoTopConstr >= 35) {
      alertas.push({
        tipo: 'info',
        tag: 'Concentração',
        titulo: `${zUiText(dados.topConstrutora[0])} ${zUiText('responde por')} ${fmtPctCarteira(concentracaoTopConstr)}`,
        meta: `${fmtK(dados.topConstrutora[1].vgv)} ${zUiText('do VGV do recorte está concentrado na construtora líder')}`
      });
    }
    if (dados.emAndamento.length) {
      alertas.push({
        tipo: 'good',
        tag: 'Pipeline',
        titulo: `${dados.emAndamento.length} ${zUiText(`venda${dados.emAndamento.length !== 1 ? 's' : ''}`)} ${zUiText('em andamento')}`,
        meta: `${fmtK(dados.vgvPipeline)} ${zUiText('de VGV ainda em aberto no recorte')}`
      });
    }
    if (!alertas.length) {
      alertas.push({
        tipo: 'good',
        tag: 'Sem alertas críticos',
        titulo: zUiText('Recorte saudável'),
        meta: zUiText('Sem concentração excessiva, sem distratos e com retenção equilibrada para a empresa.')
      });
    }

    const insights = [
      dados.topConstrutora ? {
        tag: 'Top construtora',
        valor: zUiText(dados.topConstrutora[0]),
        meta: `${dados.topConstrutora[1].n} ${zUiText(`venda${dados.topConstrutora[1].n !== 1 ? 's' : ''}`)} • ${fmtK(dados.topConstrutora[1].vgv)}`
      } : null,
      dados.topUnidade ? {
        tag: 'Unidade líder',
        valor: zUiText(dados.topUnidade[0]),
        meta: `${dados.topUnidade[1].n} ${zUiText(`venda${dados.topUnidade[1].n !== 1 ? 's' : ''}`)} • ${fmtK(dados.topUnidade[1].vgv)}`
      } : null,
      {
        tag: '% médio construtoras',
        valor: fmtPctCarteira(dados.taxaConstrutoras),
        meta: zUiText('média recebida sobre o VGV')
      },
      {
        tag: 'Impacto distratos',
        valor: fmtK(dados.valorPerdidoDistrato),
        meta: dados.distratadas.length
          ? `${fmtPctCarteira(dados.taxaDistrato)} ${zUiText('do recorte')} • ${fmtK(dados.impactoDistrato)} ${zUiText('de lucro Zelony perdido')}`
          : zUiText('sem perdas por distrato no recorte')
      },
      {
        tag: 'Margem Zelony',
        valor: fmtPctCarteira(dados.margemZelony),
        meta: zUiText('fatia da Zelony sobre a comissão líquida')
      }
    ].filter(Boolean);

    const distribuicao = [
      {
        grupo: 'Equipe comercial',
        destaque: 'Quem captura a maior fatia da comissão líquida.',
        itens: [
          { label: 'Corretores', valor: dados.cCor, cor: '#B8902A' },
          { label: 'Capitães', valor: dados.cCap, cor: '#D7A949' },
          { label: 'Gerentes', valor: dados.cGer, cor: '#8B6C1A' },
          { label: 'Diretoria', valor: dados.cDir, cor: '#5B4610' }
        ]
      },
      {
        grupo: 'Empresa',
        destaque: 'Parcela da operação que fica com estrutura e resultado da empresa.',
        itens: [
          { label: 'RH', valor: dados.cRH, cor: '#2E9E6E' },
          { label: 'Zelony', valor: dados.zelony, cor: '#1F7A54', forte: true }
        ]
      }
    ];

    document.getElementById('carteira-content').innerHTML = `
      <div class="cart-admin-hero">
        <div class="cart-admin-main">
          <div class="cart-admin-eyebrow">${zUiText(role === 'dono' ? 'Painel executivo' : 'Painel financeiro')}</div>
          <div class="cart-admin-title">${zUiText(role === 'dono' ? 'Lucro líquido Zelony' : 'Comissão líquida total')}</div>
          <div class="cart-admin-value">${fmtK(role === 'dono' ? dados.zelony : dados.cLiq)}</div>
          <div class="cart-admin-sub">${zUiText(`${dados.ativas.length} venda${dados.ativas.length !== 1 ? 's' : ''} ativas no recorte`)} ${zUiText('•')} ${fmtK(dados.vgv)} ${zUiText('de VGV')}</div>
          <div class="ch-badge"><div class="ch-dot"></div> ${zUiText('Atualizado agora')}</div>
          <div class="cart-admin-signals">
            <div class="cart-admin-signal">
              <span>${zUiText('Margem Zelony')}</span>
              <strong>${fmtPctCarteira(dados.margemZelony)}</strong>
              <small>${zUiText('sobre a comissão líquida do recorte')}</small>
            </div>
            <div class="cart-admin-signal">
              <span>${zUiText('Lucro x mês anterior')}</span>
              <strong class="${comparativo.deltaZelony.possuiBase && comparativo.deltaZelony.delta < 0 ? 'down' : 'up'}">${fmtDeltaCarteira(comparativo.deltaZelony)}</strong>
              <small>${comparativo.mesAtual ? `${zUiText(comparativo.mesAtual)}${comparativo.mesAnterior ? ` ${zUiText('vs')} ${zUiText(comparativo.mesAnterior)}` : ''}` : zUiText('Sem base mensal')} • ${fmtDeltaPctCarteira(comparativo.deltaZelony)}</small>
            </div>
            <div class="cart-admin-signal">
              <span>${zUiText('VGV x mês anterior')}</span>
              <strong class="${comparativo.deltaVgv.possuiBase && comparativo.deltaVgv.delta < 0 ? 'down' : 'up'}">${fmtDeltaCarteira(comparativo.deltaVgv)}</strong>
              <small>${comparativo.mesAtual ? `${zUiText(comparativo.mesAtual)}${comparativo.mesAnterior ? ` ${zUiText('vs')} ${zUiText(comparativo.mesAnterior)}` : ''}` : zUiText('Sem base mensal')} • ${fmtDeltaPctCarteira(comparativo.deltaVgv)}</small>
            </div>
          </div>
        </div>
        <div class="cart-admin-meta">
          <div class="cart-admin-meta-card">
            <span>${zUiText('VGV total')}</span>
            <strong>${fmtK(dados.vgv)}</strong>
          </div>
          <div class="cart-admin-meta-card">
            <span>${zUiText('Com. líquida')}</span>
            <strong>${fmtK(dados.cLiq)}</strong>
          </div>
          <div class="cart-admin-meta-card">
            <span>${zUiText('Imposto retido')}</span>
            <strong>${fmtK(dados.imposto)}</strong>
          </div>
          <div class="cart-admin-meta-card">
            <span>${zUiText('Ticket médio')}</span>
            <strong>${fmtK(dados.ticket)}</strong>
          </div>
          <div class="cart-admin-meta-card">
            <span>${zUiText('% médio construtoras')}</span>
            <strong>${fmtPctCarteira(dados.taxaConstrutoras)}</strong>
          </div>
          <div class="cart-admin-meta-card">
            <span>${zUiText('% médio de imposto')}</span>
            <strong>${fmtPctCarteira(dados.taxaImposto)}</strong>
          </div>
        </div>
      </div>

      <div class="cart-filterbar">
        <div class="cart-filter-group">
          <select onchange="setCarteiraFiltro('mes', this.value)">
            <option value="">${zUiText('Todos os meses')}</option>
            ${meses.map(m => `<option value="${m}" ${carteiraFiltros.mes === m ? 'selected' : ''}>${zUiText(m)}</option>`).join('')}
          </select>
          <select onchange="setCarteiraFiltro('unidade', this.value)">
            <option value="">${zUiText('Todas as unidades')}</option>
            ${unidades.map(u => `<option value="${u}" ${carteiraFiltros.unidade === u ? 'selected' : ''}>${zUiText(u)}</option>`).join('')}
          </select>
          <select onchange="setCarteiraFiltro('construtora', this.value)">
            <option value="">${zUiText('Todas as construtoras')}</option>
            ${construtoras.map(c => `<option value="${c}" ${carteiraFiltros.construtora === c ? 'selected' : ''}>${zUiText(c)}</option>`).join('')}
          </select>
        </div>
        <div class="cart-filter-actions">
          <span>${zUiText(`${visiveis.length} venda${visiveis.length !== 1 ? 's' : ''}`)}</span>
          ${role === 'dono' && typeof ownerReportButtonHtml === 'function' ? ownerReportButtonHtml() : ''}
          ${filtrosAtivos ? `<button type="button" onclick="resetCarteiraFiltros()">${zUiText('Limpar filtros')}</button>` : ''}
        </div>
      </div>

      <div class="cart-quick-shell">
        <div class="cart-quick-head">
          <div class="cart-quick-head-copy">
            <div class="cart-quick-kicker">${zUiText('Navegação da carteira')}</div>
            <div class="cart-quick-current">${zUiText('Visão atual')}: <strong>${zUiText(labelSituacaoCarteira(carteiraFiltros.situacao))}</strong></div>
            <div class="cart-quick-copy">${zUiText(descricaoSituacaoCarteira(carteiraFiltros.situacao))}</div>
          </div>
          <div class="cart-quick-badge">${zUiText(`${visiveis.length} venda${visiveis.length !== 1 ? 's' : ''}`)}</div>
        </div>
      <div class="cart-quick">
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'todos' ? 'active' : ''}" onclick="setCarteiraSituacao('todos')">${zUiText('Todas')} <span>${baseSemSituacao.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'ativas' ? 'active' : ''}" onclick="setCarteiraSituacao('ativas')">${zUiText('Ativas')} <span>${chips.ativas.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'concluidas' ? 'active' : ''}" onclick="setCarteiraSituacao('concluidas')">${zUiText('Concluídas')} <span>${chips.concluidas.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'andamento' ? 'active' : ''}" onclick="setCarteiraSituacao('andamento')">${zUiText('Em andamento')} <span>${chips.emAndamento.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'distratos' ? 'active danger' : ''}" onclick="setCarteiraSituacao('distratos')">${zUiText('Distratos')} <span>${chips.distratadas.length}</span></button>
      </div>
      </div>

      ${ativasBoard}
      ${andamentoBoard}
      ${concluidaBoard}
      ${distratoBoard}

      <div class="cart-admin-kpis">
        <button type="button" class="cmc a ${carteiraFiltros.situacao === 'concluidas' ? 'cart-card-active' : ''}" onclick="setCarteiraSituacao('concluidas')">
          <div class="cmc-l">${zUiText('Concluídas')}</div>
          <div class="cmc-v go">${dados.concluidas.length}</div>
          <div class="cmc-s">${dados.taxaConclusao.toFixed(1)}% ${zUiText('das ativas')}</div>
        </button>
        <button type="button" class="cmc g ${carteiraFiltros.situacao === 'andamento' ? 'cart-card-active' : ''}" onclick="setCarteiraSituacao('andamento')">
          <div class="cmc-l">${zUiText('Em andamento')}</div>
          <div class="cmc-v gr">${dados.emAndamento.length}</div>
          <div class="cmc-s">${zUiText('pipeline aberto')}</div>
        </button>
        <button type="button" class="cmc ${carteiraFiltros.situacao === 'distratos' ? 'cart-card-active cart-card-danger' : ''}" onclick="setCarteiraSituacao('distratos')">
          <div class="cmc-l">${zUiText('Distratos')}</div>
          <div class="cmc-v" style="color:#C06030;">${dados.distratadas.length}</div>
          <div class="cmc-s">${dados.taxaDistrato.toFixed(1)}% ${zUiText('do recorte')}</div>
          <div class="cmc-s">${fmtK(dados.valorPerdidoDistrato)} ${zUiText('não recebidos')}</div>
        </button>
        <div class="cmc">
          <div class="cmc-l">${zUiText('Bônus líquido')}</div>
          <div class="cmc-v" style="color:#2E9E6E;">${fmtK(dados.bonus)}</div>
          <div class="cmc-s">${zUiText('após imposto')}</div>
          <div class="cmc-s">${zUiText('Bruto')} ${fmtK(dados.bonusBruto)} ${zUiText('· Imposto')} ${fmtK(dados.bonusImposto)}</div>
        </div>
      </div>

      <div class="cart-share-banner">
        <div class="cart-share-card">
          <span>${zUiText('Equipe comercial')}</span>
          <strong>${fmtPctCarteira(dados.pctComercial)}</strong>
          <small>${fmtK(dados.totalComercial)} ${zUiText('da comissão líquida')}</small>
          <div class="cart-share-track"><div class="cart-share-fill" style="width:${Math.max(6, Math.min(100, Number(dados.pctComercial || 0)))}%;"></div></div>
        </div>
        <div class="cart-share-divider">${zUiText('vs')}</div>
        <div class="cart-share-card company">
          <span>${zUiText('Empresa')}</span>
          <strong>${fmtPctCarteira(dados.pctEmpresa)}</strong>
          <small>${fmtK(dados.totalEmpresa)} ${zUiText('da comissão líquida')}</small>
          <div class="cart-share-track"><div class="cart-share-fill" style="width:${Math.max(6, Math.min(100, Number(dados.pctEmpresa || 0)))}%;"></div></div>
        </div>
      </div>

      <div class="cart-alerts">
        ${alertas.slice(0, 4).map(item => `
          <div class="cart-alert ${item.tipo}">
            <div class="cart-alert-tag">${zUiText(item.tag)}</div>
            <div class="cart-alert-title">${zUiText(item.titulo)}</div>
            <div class="cart-alert-copy">${zUiText(item.meta)}</div>
          </div>
        `).join('')}
      </div>

      <div class="cart-insights">
        ${insights.map(item => `
          <div class="cart-insight">
            <div class="cart-insight-tag">${zUiText(item.tag)}</div>
            <div class="cart-insight-value">${zUiText(item.valor)}</div>
            <div class="cart-insight-meta">${zUiText(item.meta)}</div>
          </div>
        `).join('')}
      </div>

      <div class="cart-ranking">
        <div class="cart-ranking-card">
          <div class="cart-ranking-head">
            <div>
              <div class="cart-ranking-tag">${zUiText('Ranking gerentes')}</div>
              <div class="cart-ranking-title">${zUiText('Maior contribuição em lucro')}</div>
            </div>
            <span>${zUiText('lucro Zelony')}</span>
          </div>
          <div class="cart-ranking-list">
            ${rankingGerentes.length ? rankingGerentes.map((item, idx) => `
              <div class="cart-ranking-item">
                <div class="cart-ranking-pos">${idx + 1}</div>
                <div class="cart-ranking-main">
                  <div class="cart-ranking-name">${zUiText(item.nome)}</div>
                  <div class="cart-ranking-meta">${item.qtd} ${zUiText(`venda${item.qtd !== 1 ? 's' : ''}`)} • ${fmtK(item.vgv)} ${zUiText('de VGV')}</div>
                </div>
                <div class="cart-ranking-value">${fmtK(item.valor)}</div>
              </div>
            `).join('') : `<div class="cart-ranking-empty">${zUiText('Sem base para ranking de gerentes neste recorte.')}</div>`}
          </div>
        </div>

        <div class="cart-ranking-card">
          <div class="cart-ranking-head">
            <div>
              <div class="cart-ranking-tag">${zUiText('Ranking construtoras')}</div>
              <div class="cart-ranking-title">${zUiText('Maior contribuição em lucro')}</div>
            </div>
            <span>${zUiText('lucro Zelony')}</span>
          </div>
          <div class="cart-ranking-list">
            ${rankingConstrutoras.length ? rankingConstrutoras.map((item, idx) => `
              <div class="cart-ranking-item">
                <div class="cart-ranking-pos">${idx + 1}</div>
                <div class="cart-ranking-main">
                  <div class="cart-ranking-name">${zUiText(item.nome)}</div>
                  <div class="cart-ranking-meta">${item.qtd} ${zUiText(`venda${item.qtd !== 1 ? 's' : ''}`)} • ${fmtK(item.vgv)} ${zUiText('de VGV')}</div>
                </div>
                <div class="cart-ranking-value">${fmtK(item.valor)}</div>
              </div>
            `).join('') : `<div class="cart-ranking-empty">${zUiText('Sem base para ranking de construtoras neste recorte.')}</div>`}
          </div>
        </div>
      </div>

      <div class="cart-dist-wrap">
        <div class="ctbl-h">
          <span class="ctbl-t">${zUiText('Distribuição da comissão líquida')}</span>
          <span style="font-size:10px;color:var(--tm);">${zUiText('mesma lógica atual, com leitura executiva')}</span>
        </div>
        <div class="cart-dist-grid">
          ${distribuicao.map(bloco => `
            <div class="cart-dist-card">
              <div class="cart-dist-title">${zUiText(bloco.grupo)}</div>
              <div class="cart-dist-copy">${zUiText(bloco.destaque)}</div>
              ${bloco.itens.map(item => {
                const pct = dados.cLiq > 0 ? Math.round((item.valor / dados.cLiq) * 100) : 0;
                return `
                  <div class="cart-dist-row ${item.forte ? 'forte' : ''}">
                    <div class="cart-dist-line">
                      <span>${zUiText(item.label)}</span>
                      <strong>${fmt(item.valor)}</strong>
                    </div>
                    <div class="cart-dist-track">
                      <div class="cart-dist-fill" style="width:${pct}%;background:${item.cor};"></div>
                    </div>
                    <div class="cart-dist-pct">${pct}%</div>
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
        ${dados.bonus > 0 || dados.distratadas.length ? `
          <div class="cart-dist-footer">
            ${dados.bonus > 0 ? `<span class="good">${zUiText(`🎁 Bônus líquidos de construtoras: ${fmt(dados.bonus)}`)}</span>` : ''}
            ${dados.distratadas.length ? `<span class="bad">${zUiText(`⚠ ${dados.distratadas.length} distrato${dados.distratadas.length > 1 ? 's' : ''} no recorte`)}${dados.impactoDistrato > 0 ? ` ${zUiText('• impacto Zelony')} ${fmt(dados.impactoDistrato)}` : ''}</span>` : ''}
          </div>
        ` : ''}
      </div>

      <div class="ctbl cart-detail-table cart-detail-table--${carteiraFiltros.situacao}">
        <div class="ctbl-h cart-table-head">
          <div class="cart-table-context">
            <div class="cart-table-kicker">${zUiText(tabelaResumo.kicker)}</div>
            <span class="ctbl-t cart-table-title">${zUiText(tabelaResumo.title)}</span>
            <div class="cart-table-copy">${zUiText(tabelaResumo.copy)}</div>
          </div>
          <div class="cart-table-tools">
            <div class="cart-table-pills">
              ${tabelaResumo.pills.map(item => `
                <span class="cart-table-pill">
                  <small>${zUiText(item.label)}</small>
                  <strong>${zUiText(item.value)}</strong>
                </span>
              `).join('')}
            </div>
            <span>${zUiText(labelSituacaoCarteira(carteiraFiltros.situacao))}</span>
          </div>
        </div>
        <div class="tscroll">
          <table>
            <thead><tr>${cols.map(c => `<th>${zUiText(headerMap[c] || c)}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    return;
  }

  const rows = renderCarteiraTabelaRows(lMinhas, cols);
  document.getElementById('carteira-content').innerHTML = `
    <div class="ch"><div class="ch-lbl">${zUiText(saldoLabel)}</div><div class="ch-val">${fmtCarteiraValor(saldo)}</div><div class="ch-sub">${saldoSub}</div><div class="ch-badge"><div class="ch-dot"></div> ${zUiText('Atualizado agora')}</div></div>
    <div class="c3">
      <div class="cmc a"><div class="cmc-l">${zUiText('Minhas vendas')}</div><div class="cmc-v go">${lMinhas.filter(v => !v.distratada).length}</div><div class="cmc-s">${zUiText(`${lMinhas.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1).length} concluídas`)}</div></div>
      <div class="cmc g"><div class="cmc-l">${zUiText('Já recebido')}</div><div class="cmc-v gr">${fmtCarteiraValor(rec)}</div><div class="cmc-s">${zUiText('comissões recebidas + bônus pagos')}</div></div>
      <div class="cmc n"><div class="cmc-l">${zUiText('Nota gerada')}</div><div class="cmc-v nt">${fmtCarteiraValor(nota)}</div><div class="cmc-s">${zUiText(nota > 0 ? 'bônus faturados aguardando pagamento' : 'sem bônus com nota gerada')}</div></div>
      <div class="cmc r"><div class="cmc-l">${zUiText('A receber')}</div><div class="cmc-v" style="color:#C06030;">${fmtCarteiraValor(pend)}</div><div class="cmc-s">${zUiText('comissões pendentes + bônus sem nota')}</div></div>
    </div>
    ${perdido > 0 ? `<div style="background:#FEF0EC;border:1px solid #E0A090;border-radius:9px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#C05030;font-weight:700;margin-bottom:2px;">${zUiText(`⚠ Perdido com distrato${distratas.length > 1 ? 's' : ''}`)}</div><div style="font-size:11px;color:#C05030;opacity:0.8;">${zUiText(`${distratas.length} venda${distratas.length > 1 ? 's' : ''} distratada${distratas.length > 1 ? 's' : ''}`)}</div></div><div style="font-size:22px;font-weight:700;color:#C05030;font-family:'Playfair Display',serif;">- ${fmtCarteiraValor(perdido)}</div></div>` : ''}
    <div class="ctbl cart-detail-table"><div class="ctbl-h"><span class="ctbl-t">${zUiText('Detalhe por venda')}</span><span style="font-size:10px;color:var(--tm);">${zUiText(`${lMinhas.length} venda${lMinhas.length !== 1 ? 's' : ''}`)}</span></div><div class="tscroll"><table><thead><tr>${cols.map(c => `<th>${zUiText(headerMap[c] || c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

zRegisterModule('carteira', {
  renderCarteira,
  getCols,
  setCarteiraFiltro,
  setCarteiraSituacao,
  resetCarteiraFiltros
});
