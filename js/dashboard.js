// DASHBOARD
// Resultado comercial em tempo real, sem vendas distratadas e sem comissoes.

let dashDataDe = '';
let dashDataAte = '';
let dashRealtimeCanal = null;
let dashRealtimeAtivo = false;
let dashPollTimer = null;
let dashAtualizando = false;
let dashUltimaAtualizacao = '';

const DASH_VENDAS_COLS = 'id,data,mes,cliente,produto,construtora,origem,unidade,corretor,capitao,gerente,diretor,diretor2,cca,valor,pct,imp,pct_cor,pct_cap,pct_ger,pct_dir,pct_dir2,pct_rh,bonus,bonus_pct_dir,bonus_pct_ger,bonus_pct_cor,etapa,hist,distratada';

function dashSyncState() {
  zSetState('state.ui.dashboard', {
    dataDe: dashDataDe,
    dataAte: dashDataAte,
    realtimeAtivo: dashRealtimeAtivo,
    ultimaAtualizacao: dashUltimaAtualizacao
  });
}

dashSyncState();

function dashModuloVisivel() {
  const el = document.getElementById('mod-dashboard');
  return !!(el && !el.classList.contains('hidden'));
}

function dashTexto(valor, fallback = '') {
  const bruto = String(valor || '').trim();
  if (!bruto) return fallback;
  return typeof zUiText === 'function' ? zUiText(bruto) : bruto;
}

function dashAttr(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function dashNorm(valor) {
  if (typeof normalizarTextoBusca === 'function') return normalizarTextoBusca(valor);
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function dashMoney(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);
}

function dashNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
}

function dashHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dashParseISO(valor) {
  const bruto = String(valor || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const [ano, mes, dia] = bruto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dashDataSomenteDia(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0, 0);
}

function dashMesAtualNome() {
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const mes = meses[new Date().getMonth()];
  return typeof normalizarMesVenda === 'function' ? normalizarMesVenda(mes) : mes;
}

function dashPeriodoLabel() {
  if (dashDataDe || dashDataAte) {
    const de = dashDataDe ? dashFormatarDataISO(dashDataDe) : 'inicio';
    const ate = dashDataAte ? dashFormatarDataISO(dashDataAte) : 'hoje';
    return `${de} ate ${ate}`;
  }
  return dashTexto(dashMesAtualNome());
}

function dashFormatarDataISO(valor) {
  const data = dashParseISO(valor);
  if (!data) return '';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

function dashDataVenda(v) {
  const hist = Array.isArray(v && v.hist) ? v.hist[0] : null;
  if (typeof obterMomentoHistorico === 'function') {
    const info = obterMomentoHistorico(hist, { preferTs: false });
    if (info && info.date && info.precision !== 'daymonth') return dashDataSomenteDia(info.date);
  }

  const bruto = String((v && v.data) || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return dashParseISO(bruto);

  const partes = bruto.split('/');
  if (partes.length >= 2) {
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const anoBase = dashDataDe ? dashParseISO(dashDataDe)?.getFullYear() : new Date().getFullYear();
    if (Number.isFinite(dia) && Number.isFinite(mes) && mes >= 0 && mes <= 11) {
      const ano = partes.length >= 3 && Number.isFinite(parseInt(partes[2], 10)) ? parseInt(partes[2], 10) : anoBase;
      const data = new Date(ano, mes, dia, 12, 0, 0, 0);
      return Number.isNaN(data.getTime()) ? null : data;
    }
  }
  return null;
}

function dashVendaNoPeriodo(v) {
  if (v && v.distratada) return false;

  if (!dashDataDe && !dashDataAte) {
    const dataAtual = dashDataVenda(v);
    if (dataAtual) {
      const agora = new Date();
      return dataAtual.getMonth() === agora.getMonth() && dataAtual.getFullYear() === agora.getFullYear();
    }
    return String(v && v.mes || '') === dashMesAtualNome();
  }

  const data = dashDataVenda(v);
  if (!data) return false;
  const de = dashDataDe ? dashParseISO(dashDataDe) : null;
  const ate = dashDataAte ? dashParseISO(dashDataAte) : dashParseISO(dashHojeISO());
  if (de && data < de) return false;
  if (ate && data > ate) return false;
  return true;
}

function dashCampoBateUsuario(campo, usuario) {
  if (!usuario) return false;
  if (typeof campoVendaBatePessoa === 'function') return campoVendaBatePessoa(campo, usuario);
  return dashNorm(campo) === dashNorm(usuario.nome);
}

function dashVendaVisivelPerfil(v) {
  const perfil = typeof role === 'string' ? role : 'cor';
  const usuario = typeof usuarioLogado !== 'undefined' ? usuarioLogado : null;
  const unidadeUsuario = usuario && usuario.unidade ? usuario.unidade : 'Ambas';

  if (unidadeUsuario && unidadeUsuario !== 'Ambas' && v.unidade && v.unidade !== unidadeUsuario) return false;
  if (perfil === 'dono' || perfil === 'fin' || perfil === 'dir') return true;
  if (perfil === 'rh') return !!(v.pct_rh && v.pct_rh > 0);
  if (!usuario) return false;

  if (perfil === 'cor') {
    return typeof corretorVendaPertenceAoUsuario === 'function'
      ? corretorVendaPertenceAoUsuario(v, usuario)
      : dashCampoBateUsuario(v.corretor, usuario);
  }
  if (perfil === 'cap') {
    return dashCampoBateUsuario(v.capitao, usuario) || dashCampoBateUsuario(v.corretor, usuario);
  }
  if (perfil === 'ger') {
    return dashCampoBateUsuario(v.gerente, usuario) || dashCampoBateUsuario(v.capitao, usuario) || dashCampoBateUsuario(v.corretor, usuario);
  }
  return true;
}

function dashUsuarioPorCampo(v, campo) {
  if (typeof getUsuarioVendaPorCampo === 'function') {
    return getUsuarioVendaPorCampo(v, campo, { permitirAproximado: true });
  }
  const nome = String(v && v[campo] || '').trim();
  if (!nome || typeof USUARIOS === 'undefined') return null;
  return USUARIOS.find(u => dashCampoBateUsuario(nome, u)) || null;
}

function dashEquipeVenda(v) {
  // No dashboard, a producao deve fechar no gerente responsavel.
  // Se o gerente nao tiver equipe cadastrada, agrupamos pelo nome dele.
  const usuarioGerente = dashUsuarioPorCampo(v, 'gerente');
  if (usuarioGerente && usuarioGerente.equipe) return usuarioGerente.equipe;
  if (v.gerente) return v.gerente;
  const usuarioCapitao = dashUsuarioPorCampo(v, 'capitao');
  if (usuarioCapitao && usuarioCapitao.equipe) return usuarioCapitao.equipe;
  if (v.capitao) return v.capitao;
  const usuarioCorretor = dashUsuarioPorCampo(v, 'corretor');
  if (usuarioCorretor && usuarioCorretor.equipe) return usuarioCorretor.equipe;
  return 'Sem equipe';
}

function dashVendasBase() {
  const lista = Array.isArray(VENDAS) ? VENDAS : [];
  return lista
    .map(v => typeof normalizarVendaNumeros === 'function' ? normalizarVendaNumeros(v) : v)
    .filter(v => dashVendaVisivelPerfil(v))
    .filter(dashVendaNoPeriodo);
}

function dashNovoGrupo(nome) {
  return {
    nome: dashTexto(nome, 'Sem identificacao'),
    qtd: 0,
    vgv: 0,
    ticket: 0
  };
}

function dashAgrupar(lista, seletorNome) {
  const mapa = new Map();
  lista.forEach(v => {
    const nome = dashTexto(seletorNome(v), 'Sem identificacao');
    const chave = dashNorm(nome) || nome;
    if (!mapa.has(chave)) mapa.set(chave, dashNovoGrupo(nome));
    const item = mapa.get(chave);
    item.qtd += 1;
    item.vgv += Number(v.valor) || 0;
  });
  return [...mapa.values()]
    .map(item => ({ ...item, ticket: item.qtd ? item.vgv / item.qtd : 0 }))
    .sort((a, b) => (b.vgv - a.vgv) || (b.qtd - a.qtd) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function dashResumo() {
  const vendas = dashVendasBase();
  const qtd = vendas.length;
  const vgv = vendas.reduce((soma, v) => soma + (Number(v.valor) || 0), 0);
  const corretores = dashAgrupar(vendas, v => v.corretor || 'Sem corretor');
  const equipes = dashAgrupar(vendas, dashEquipeVenda);
  const unidades = dashAgrupar(vendas, v => v.unidade || 'Sem unidade');
  return {
    vendas,
    qtd,
    vgv,
    ticket: qtd ? vgv / qtd : 0,
    corretores,
    equipes,
    unidades,
    topCorretor: corretores[0] || null,
    topEquipe: equipes[0] || null
  };
}

function dashCardKpi(rotulo, valor, sub, destaque = false) {
  return `
    <div class="dash-kpi${destaque ? ' main' : ''}">
      <div class="dash-kpi-label">${zUiText(rotulo)}</div>
      <div class="dash-kpi-value">${valor}</div>
      <div class="dash-kpi-sub">${sub || ''}</div>
    </div>
  `;
}

function dashRanking(titulo, subtitulo, lista, tipo) {
  const totalVgv = lista.reduce((soma, item) => soma + item.vgv, 0);
  const linhas = lista.length ? lista.map((item, idx) => {
    const pct = totalVgv ? Math.max(4, (item.vgv / totalVgv) * 100) : 0;
    return `
      <div class="dash-rank-row">
        <div class="dash-rank-pos">${idx + 1}</div>
        <div class="dash-rank-main">
          <div class="dash-rank-name">${zUiText(item.nome)}</div>
          <div class="dash-rank-bar"><span style="width:${pct.toFixed(2)}%"></span></div>
        </div>
        <div class="dash-rank-num">
          <strong>${dashNumero(item.qtd)}</strong>
          <span>${item.qtd === 1 ? 'venda' : 'vendas'}</span>
        </div>
        <div class="dash-rank-vgv">
          <strong>${dashMoney(item.vgv)}</strong>
          <span>Ticket ${dashMoney(item.ticket)}</span>
        </div>
      </div>
    `;
  }).join('') : `
    <div class="dash-empty">
      <strong>${zUiText('Sem vendas ativas neste periodo.')}</strong>
      <span>${zUiText('Quando o financeiro lancar uma venda ativa, ela aparece aqui.')}</span>
    </div>
  `;

  return `
    <section class="dash-panel dash-panel-${tipo}">
      <div class="dash-panel-head">
        <div>
          <div class="dash-panel-kicker">${zUiText(subtitulo)}</div>
          <h3>${zUiText(titulo)}</h3>
        </div>
        <span>${dashNumero(lista.length)}</span>
      </div>
      <div class="dash-rank-list">${linhas}</div>
    </section>
  `;
}

function dashSetPeriodo(campo, valor) {
  if (campo === 'de') dashDataDe = valor || '';
  if (campo === 'ate') dashDataAte = valor || '';
  dashSyncState();
  renderDashboard();
}

function dashLimparPeriodo() {
  dashDataDe = '';
  dashDataAte = '';
  dashSyncState();
  renderDashboard();
}

function dashRenderSeVisivel() {
  if (dashModuloVisivel()) renderDashboard();
}

function dashMesclarVenda(row) {
  if (!row || row.id == null || !Array.isArray(VENDAS)) return;
  const venda = typeof mapVendaIn === 'function' ? mapVendaIn(row) : { ...row, valor: parseFloat(row.valor) || 0, distratada: !!row.distratada };
  const idx = VENDAS.findIndex(v => String(v.id) === String(venda.id));
  if (idx >= 0) {
    venda.anexos = Array.isArray(VENDAS[idx].anexos) ? VENDAS[idx].anexos : [];
    venda.anexosCarregados = !!VENDAS[idx].anexosCarregados;
    VENDAS[idx] = venda;
  } else {
    VENDAS.push(venda);
  }
  zSetState('state.data.vendas', VENDAS);
}

function dashAplicarEventoVenda(payload) {
  if (!payload || !Array.isArray(VENDAS)) return;
  if (payload.eventType === 'DELETE' && payload.old && payload.old.id != null) {
    const idx = VENDAS.findIndex(v => String(v.id) === String(payload.old.id));
    if (idx >= 0) VENDAS.splice(idx, 1);
  } else if (payload.new) {
    dashMesclarVenda(payload.new);
  }
  dashUltimaAtualizacao = new Date().toISOString();
  dashSyncState();
  if (typeof salvarLS === 'function') salvarLS();
  else dashRenderSeVisivel();
}

async function dashRecarregarVendasBanco() {
  if (dashAtualizando || typeof sb === 'undefined') return;
  dashAtualizando = true;
  try {
    let pagina = 0;
    const lote = 50;
    const todas = [];
    while (true) {
      const { data, error } = await sb.from('vendas').select(DASH_VENDAS_COLS).order('id').range(pagina * lote, (pagina + 1) * lote - 1);
      if (error) throw error;
      if (!data || !data.length) break;
      todas.push(...data);
      if (data.length < lote) break;
      pagina++;
    }
    todas.forEach(dashMesclarVenda);
    dashUltimaAtualizacao = new Date().toISOString();
    dashSyncState();
    if (typeof salvarLS === 'function') salvarLS();
    else dashRenderSeVisivel();
  } catch (e) {
    console.info('Dashboard: atualizacao de vendas ficou para a proxima tentativa:', e.message || e);
  } finally {
    dashAtualizando = false;
  }
}

function iniciarDashboardLive() {
  if (!dashPollTimer) {
    dashPollTimer = setInterval(() => {
      if (dashModuloVisivel()) dashRecarregarVendasBanco();
    }, 45000);
  }

  if (dashRealtimeCanal || typeof sb === 'undefined' || typeof sb.channel !== 'function') return;
  try {
    dashRealtimeCanal = sb
      .channel('dashboard-vendas-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, dashAplicarEventoVenda)
      .subscribe(status => {
        const ativo = status === 'SUBSCRIBED';
        if (dashRealtimeAtivo !== ativo) {
          dashRealtimeAtivo = ativo;
          dashSyncState();
          dashRenderSeVisivel();
        }
      });
  } catch (e) {
    console.info('Dashboard: realtime indisponivel, usando atualizacao periodica.', e.message || e);
  }
}

function renderDashboard() {
  const cont = document.getElementById('dashboard-content');
  if (!cont) return;
  iniciarDashboardLive();

  const resumo = dashResumo();
  const liveLabel = dashRealtimeAtivo ? 'Ao vivo' : 'Atualizacao periodica';
  const ultima = dashUltimaAtualizacao
    ? `${zUiText('Atualizado')} ${new Date(dashUltimaAtualizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : zUiText('Aguardando movimento');
  const topCorretor = resumo.topCorretor ? `${zUiText(resumo.topCorretor.nome)} - ${dashMoney(resumo.topCorretor.vgv)}` : zUiText('Sem vendas');
  const topEquipe = resumo.topEquipe ? `${zUiText(resumo.topEquipe.nome)} - ${dashMoney(resumo.topEquipe.vgv)}` : zUiText('Sem vendas');

  cont.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-copy">
        <div class="dash-eyebrow">${zUiText('Dashboard comercial')}</div>
        <h2>${zUiText('Resultado de vendas em tempo real')}</h2>
        <p>${zUiText('Foco no mes atual por padrao. Use o periodo personalizado para analisar qualquer janela de datas.')}</p>
        <div class="dash-live-row">
          <span class="dash-live-dot"></span>
          <strong>${zUiText(liveLabel)}</strong>
          <span>${ultima}</span>
        </div>
      </div>
      <div class="dash-filter-card">
        <div class="dash-filter-title">${zUiText('Periodo')}</div>
        <div class="dash-filter-current">${zUiText(dashPeriodoLabel())}</div>
        <div class="dash-filter-grid">
          <label>
            <span>De</span>
            <input type="date" value="${dashAttr(dashDataDe)}" onchange="dashSetPeriodo('de', this.value)">
          </label>
          <label>
            <span>Ate</span>
            <input type="date" value="${dashAttr(dashDataAte)}" onchange="dashSetPeriodo('ate', this.value)">
          </label>
        </div>
        <div class="dash-filter-actions">
          <button type="button" onclick="dashLimparPeriodo()">${zUiText('Voltar ao mes atual')}</button>
          <button type="button" class="primary" onclick="dashRecarregarVendasBanco()">${zUiText('Atualizar agora')}</button>
        </div>
      </div>
    </div>

    <div class="dash-kpis">
      ${dashCardKpi('Numero de vendas', dashNumero(resumo.qtd), zUiText('Somente vendas ativas'), true)}
      ${dashCardKpi('VGV', dashMoney(resumo.vgv), zUiText('Valor geral de vendas'))}
      ${dashCardKpi('Ticket medio', dashMoney(resumo.ticket), zUiText('VGV dividido por vendas'))}
      ${dashCardKpi('Top corretor', topCorretor, zUiText('Maior VGV no periodo'))}
      ${dashCardKpi('Top equipe', topEquipe, zUiText('Maior VGV no periodo'))}
    </div>

    <div class="dash-grid">
      ${dashRanking('Corretores', 'Ranking por VGV', resumo.corretores, 'corretores')}
      ${dashRanking('Equipes', 'Producao agrupada', resumo.equipes, 'equipes')}
      ${dashRanking('Unidades', 'Visao por unidade', resumo.unidades, 'unidades')}
    </div>
  `;
}

zRegisterModule('dashboard', {
  renderDashboard,
  dashSetPeriodo,
  dashLimparPeriodo,
  dashRecarregarVendasBanco,
  iniciarDashboardLive
});
