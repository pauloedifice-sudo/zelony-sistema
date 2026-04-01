// CARTEIRA
// Modulo Minha Carteira - saldo, KPIs e tabela por perfil

const carteiraFiltros = {
  mes: '',
  unidade: '',
  construtora: '',
  situacao: 'todos'
};

const CARTEIRA_MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function normalizarCarteiraTexto(valor) {
  return String(valor || '')
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
  if (role === 'cap') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'com_cap', 'minha', 'etapa'];
  if (role === 'ger') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'com_cap', 'com_ger', 'minha', 'bonus_ger', 'etapa'];
  if (role === 'dir') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'bonus_dir', 'etapa'];
  if (role === 'dono') return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'com_zel', 'bonus_total', 'etapa'];
  return ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_bruta', 'com_total', 'com_cor', 'com_cap', 'com_ger', 'com_dir', 'com_zel', 'bonus_total', 'etapa'];
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

function fmtPctCarteira(valor) {
  return `${Number(valor || 0).toFixed(1).replace('.', ',')}%`;
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
  const cBruta = ativas.reduce((s, v) => s + (v.valor * v.pct), 0);
  const cLiq = ativas.reduce((s, v) => s + comTotal(v), 0);
  const imposto = cBruta - cLiq;
  const cCor = ativas.reduce((s, v) => s + comC(v), 0);
  const cCap = ativas.reduce((s, v) => s + comCap(v), 0);
  const cGer = ativas.reduce((s, v) => s + comG(v), 0);
  const cDir = ativas.reduce((s, v) => s + comD(v) + comD2(v), 0);
  const cRH = ativas.reduce((s, v) => s + comRH(v), 0);
  const zelony = ativas.reduce((s, v) => s + comZ(v), 0);
  const bonus = ativas.reduce((s, v) => s + (v.bonus || 0), 0);
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
    const constr = v.construtora || 'Não informado';
    const unid = v.unidade || 'Não informada';
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
    const chave = (v[campo] || 'Não informado').trim();
    if (!mapa[chave]) mapa[chave] = { nome: chave, valor: 0, qtd: 0, vgv: 0 };
    mapa[chave].valor += valorFn(v);
    mapa[chave].qtd++;
    mapa[chave].vgv += v.valor || 0;
  });
  return Object.values(mapa)
    .sort((a, b) => b.valor - a.valor || b.vgv - a.vgv)
    .slice(0, 5);
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

    return `<tr class="${v.distratada ? 'cart-row-distrato' : 'cart-row-normal'}" style="${v.distratada ? 'opacity:0.62;background:#FEF8F6;' : ''}">${cols.map(c => {
      if (c === 'data') return `<td>${zUiText(v.data)}</td>`;
      if (c === 'cliente') return `<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${zUiText(v.cliente.split('/')[0].trim())}</td>`;
      if (c === 'produto') return `<td>${zUiText(v.produto)}</td>`;
      if (c === 'corretor') return `<td>${zUiText(v.corretor)}</td>`;
      if (c === 'capitao') return `<td>${zUiText(v.capitao || '—')}</td>`;
      if (c === 'gerente') return `<td>${zUiText(v.gerente || '—')}</td>`;
      if (c === 'com_cor') return `<td class="pos">${fmt(comC(v))}</td>`;
      if (c === 'com_cap') return `<td class="pos">${fmt(comCap(v))}</td>`;
      if (c === 'com_ger') return `<td class="pos">${fmt(comG(v))}</td>`;
      if (c === 'com_dir') return `<td class="pos">${fmt(comD(v))}</td>`;
      if (c === 'com_zel') return `<td class="pos">${fmt(comZ(v))}</td>`;
      if (c === 'vgv') return `<td class="pos">${fmt(v.valor)}</td>`;
      if (c === 'com_bruta') return `<td class="pos">${fmt(v.valor * v.pct)}</td>`;
      if (c === 'com_total') return `<td class="pos">${fmt(comTotal(v))}</td>`;
      if (c === 'minha') return `<td class="pos">${fmt(comVis(v))}</td>`;
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
          if (mn(v.corretor)) totalBonus += bonusCor(v);
          if (mn(v.gerente)) totalBonus += bonusGer(v);
          if (mn(v.diretor)) totalBonus += bonusDir(v);
          if (mn(v.diretor2)) totalBonus += bonusDir(v);
        } else {
          if (c === 'bonus_cor') totalBonus = bonusCor(v);
          if (c === 'bonus_ger') totalBonus = bonusGer(v);
          if (c === 'bonus_dir') totalBonus = bonusDir(v);
        }
        return `<td class="pos" style="color:#2E9E6E;">${totalBonus > 0 ? fmt(totalBonus) : zUiText('—')}</td>`;
      }
      if (c === 'bonus_total') return `<td class="pos" style="color:#2E9E6E;">${v.bonus > 0 ? fmt(v.bonus) : zUiText('—')}</td>`;
      if (c === 'etapa') {
        return `<td><div class="cart-stage-cell"><span class="spill${v.etapa === ETAPAS.length - 1 ? ' f' : ''}">${zUiText(ETAPAS[v.etapa])}</span>${statusPill}</div></td>`;
      }
      return `<td>${zUiText('—')}</td>`;
    }).join('')}</tr>`;
  }).join('');
}

function renderCarteira() {
  const lMinhas = vendasU(VENDAS, true);
  const calcSaldo = v => {
    if (role === 'fin') return comZ(v);
    if (role === 'dono') return comTotal(v) + (v.bonus || 0);
    if (role === 'rh') return comRH(v);
    if (!usuarioLogado) return 0;
    const matchNome = campo => {
      if (!campo) return false;
      const c = campo.toLowerCase().trim();
      const nomeCompleto = usuarioLogado.nome.toLowerCase().trim();
      const primeiroNome = nomeCompleto.split(' ')[0];
      return c === nomeCompleto || (primeiroNome.length >= 3 && c === primeiroNome);
    };
    let total = 0;
    if (matchNome(v.corretor)) { total += comC(v); total += bonusCor(v); }
    if (matchNome(v.capitao)) { total += comCap(v); }
    if (matchNome(v.gerente)) { total += comG(v); total += bonusGer(v); }
    if (matchNome(v.diretor)) { total += comD(v); total += bonusDir(v); }
    if (matchNome(v.diretor2)) { total += comD2(v); }
    if (total === 0) {
      if (role === 'cor') return comC(v) + bonusCor(v);
      if (role === 'cap') return comCap(v);
      if (role === 'ger') return comG(v) + bonusGer(v);
      if (role === 'dir') return comD(v) + bonusDir(v);
    }
    return total;
  };

  const saldo = lMinhas.filter(v => !v.distratada).reduce((s, v) => s + calcSaldo(v), 0);
  const pend = lMinhas.filter(v => !v.distratada && v.etapa < ETAPAS.length - 1).reduce((s, v) => s + calcSaldo(v), 0);
  const rec = lMinhas.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1).reduce((s, v) => s + calcSaldo(v), 0);
  const distratas = lMinhas.filter(v => v.distratada);
  const perdido = distratas.reduce((s, v) => s + calcSaldo(v), 0);
  const rd = RD[role];
  const saldoLabel = 'Saldo a receber';
  const saldoSub = zUiText(`Minha comissão - ${rd.nome} · ${rd.role}`);
  const cols = getCols();

  const hdrMap = {
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
    com_dir: 'Minha comissão',
    com_zel: 'Zelony',
    minha: 'Minha comissão',
    bonus_cor: '🎁 Bônus',
    bonus_ger: '🎁 Bônus',
    bonus_dir: '🎁 Bônus',
    bonus_total: '🎁 Bônus total',
    etapa: 'Etapa'
  };

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
          ${filtrosAtivos ? `<button type="button" onclick="resetCarteiraFiltros()">${zUiText('Limpar filtros')}</button>` : ''}
        </div>
      </div>

      <div class="cart-quick">
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'todos' ? 'active' : ''}" onclick="setCarteiraSituacao('todos')">${zUiText('Todas')} <span>${baseSemSituacao.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'ativas' ? 'active' : ''}" onclick="setCarteiraSituacao('ativas')">${zUiText('Ativas')} <span>${chips.ativas.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'concluidas' ? 'active' : ''}" onclick="setCarteiraSituacao('concluidas')">${zUiText('Concluídas')} <span>${chips.concluidas.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'andamento' ? 'active' : ''}" onclick="setCarteiraSituacao('andamento')">${zUiText('Em andamento')} <span>${chips.emAndamento.length}</span></button>
        <button class="cart-quick-btn ${carteiraFiltros.situacao === 'distratos' ? 'active danger' : ''}" onclick="setCarteiraSituacao('distratos')">${zUiText('Distratos')} <span>${chips.distratadas.length}</span></button>
      </div>

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
          <div class="cmc-l">${zUiText('Bônus total')}</div>
          <div class="cmc-v" style="color:#2E9E6E;">${fmtK(dados.bonus)}</div>
          <div class="cmc-s">${zUiText('construtoras')}</div>
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
            ${dados.bonus > 0 ? `<span class="good">${zUiText(`🎁 Bônus de construtoras: ${fmt(dados.bonus)}`)}</span>` : ''}
            ${dados.distratadas.length ? `<span class="bad">${zUiText(`⚠ ${dados.distratadas.length} distrato${dados.distratadas.length > 1 ? 's' : ''} no recorte`)}${dados.impactoDistrato > 0 ? ` ${zUiText('• impacto Zelony')} ${fmt(dados.impactoDistrato)}` : ''}</span>` : ''}
          </div>
        ` : ''}
      </div>

      <div class="ctbl cart-detail-table">
        <div class="ctbl-h">
          <span class="ctbl-t">${zUiText('Detalhe por venda')}</span>
          <div class="cart-table-tools">
            <span>${zUiText(`${visiveis.length} venda${visiveis.length !== 1 ? 's' : ''}`)}</span>
            <span>${zUiText(labelSituacaoCarteira(carteiraFiltros.situacao))}</span>
          </div>
        </div>
        <div class="tscroll">
          <table>
            <thead><tr>${cols.map(c => `<th>${zUiText(hdrMap[c] || c)}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    return;
  }

  const rows = renderCarteiraTabelaRows(lMinhas, cols);
  document.getElementById('carteira-content').innerHTML = `
    <div class="ch"><div class="ch-lbl">${zUiText(saldoLabel)}</div><div class="ch-val">${fmt(saldo)}</div><div class="ch-sub">${saldoSub}</div><div class="ch-badge"><div class="ch-dot"></div> ${zUiText('Atualizado agora')}</div></div>
    <div class="c3">
      <div class="cmc a"><div class="cmc-l">${zUiText('Minhas vendas')}</div><div class="cmc-v go">${lMinhas.filter(v => !v.distratada).length}</div><div class="cmc-s">${zUiText(`${lMinhas.filter(v => !v.distratada && v.etapa === ETAPAS.length - 1).length} concluídas`)}</div></div>
      <div class="cmc g"><div class="cmc-l">${zUiText('Já recebido')}</div><div class="cmc-v gr">${fmt(rec)}</div><div class="cmc-s">${zUiText('comissão recebida')}</div></div>
      <div class="cmc r"><div class="cmc-l">${zUiText('A receber')}</div><div class="cmc-v" style="color:#C06030;">${fmt(pend)}</div><div class="cmc-s">${zUiText('em andamento')}</div></div>
    </div>
    ${perdido > 0 ? `<div style="background:#FEF0EC;border:1px solid #E0A090;border-radius:9px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#C05030;font-weight:700;margin-bottom:2px;">${zUiText(`⚠ Perdido com distrato${distratas.length > 1 ? 's' : ''}`)}</div><div style="font-size:11px;color:#C05030;opacity:0.8;">${zUiText(`${distratas.length} venda${distratas.length > 1 ? 's' : ''} distratada${distratas.length > 1 ? 's' : ''}`)}</div></div><div style="font-size:22px;font-weight:700;color:#C05030;font-family:'Playfair Display',serif;">- ${fmt(perdido)}</div></div>` : ''}
    <div class="ctbl cart-detail-table"><div class="ctbl-h"><span class="ctbl-t">${zUiText('Detalhe por venda')}</span><span style="font-size:10px;color:var(--tm);">${zUiText(`${lMinhas.length} venda${lMinhas.length !== 1 ? 's' : ''}`)}</span></div><div class="tscroll"><table><thead><tr>${cols.map(c => `<th>${zUiText(hdrMap[c] || c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

zRegisterModule('carteira', {
  renderCarteira,
  getCols,
  setCarteiraFiltro,
  setCarteiraSituacao,
  resetCarteiraFiltros
});
