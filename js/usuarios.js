// USUARIOS
// Gestao de usuarios, convites, onboarding e troca de senha

let USUARIOS = [...USUARIOS_PADRAO];
let editUserIdx = -1;
let pixSel = '';
let nextUserId = 3;
let modalUsuarioModo = 'admin';
const USUARIO_ATIVACAO_LEGADO_BASE_ISO = '2026-07-01';
const PERFIL_TAG  = { Dono:'tag-dono', Corretor:'tag-cor', Capitao:'tag-cap', Capitão:'tag-cap', Gerente:'tag-ger', Diretor:'tag-dir', Financeiro:'tag-fin', RH:'tag-rh' };
const PERFIL_ICON = { Dono:'👑', Corretor:'👤', Capitao:'⭐', Capitão:'⭐', Gerente:'🏆', Diretor:'💼', Financeiro:'💰', RH:'🤝' };
let uBusca = '', uFiltroUnidade = '', uFiltroEquipe = '', uFiltroPerfil = '', uFiltroStatus = '';
function iniUser(n) { return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function perfilRoleUsuario(u) { return typeof getPerfil==='function' ? getPerfil(u && u.perfil) : String((u && u.perfil) || '').toLowerCase(); }
const PERFIL_META = {
  dono: { tag:'tag-dono', icon:'👑', label:'Dono', color:'#1A1A1A' },
  dir:  { tag:'tag-dir',  icon:'💼', label:'Diretor', color:'var(--gold)' },
  ger:  { tag:'tag-ger',  icon:'🏆', label:'Gerente', color:'#2E7E5E' },
  cap:  { tag:'tag-cap',  icon:'⭐', label:'Capitão', color:'#6040A8' },
  cor:  { tag:'tag-cor',  icon:'👤', label:'Corretor', color:'#3060B8' },
  fin:  { tag:'tag-fin',  icon:'💰', label:'Financeiro', color:'#C05030' },
  rh:   { tag:'tag-rh',   icon:'🤝', label:'RH', color:'#1A56C4' }
};
zSetState('state.data.usuarios', USUARIOS);
zSetState('state.ui.editUserIdx', editUserIdx);
zSetState('state.ui.pixSel', pixSel);
zSetState('state.ui.nextUserId', nextUserId);
zSetState('state.ui.modalUsuarioModo', modalUsuarioModo);
zSetState('state.ui.uBusca', uBusca);
zSetState('state.ui.uFiltroUnidade', uFiltroUnidade);
zSetState('state.ui.uFiltroEquipe', uFiltroEquipe);
zSetState('state.ui.uFiltroPerfil', uFiltroPerfil);
zSetState('state.ui.uFiltroStatus', uFiltroStatus);

const EJS_SERVICE  = 'service_wirqv1v';
const EJS_TEMPLATE = 'template_ylfp3ad';
const EJS_PUBKEY   = 'GEXIho24PuM7N3RTZ';
const CONVITES_PENDENTES = {};
const EXCLUSOES_PENDENTES = {};
const STATUS_PENDENTES_USUARIOS = {};
let conviteAtivo = null;
let pixSelCV = '';
zSetState('state.ui.convitesPendentes', CONVITES_PENDENTES);
zSetState('state.ui.exclusoesPendentesUsuarios', EXCLUSOES_PENDENTES);
zSetState('state.ui.statusPendentesUsuarios', STATUS_PENDENTES_USUARIOS);
zSetState('state.ui.conviteAtivo', conviteAtivo);
zSetState('state.ui.pixSelCV', pixSelCV);

function gerarToken() {
  return 'ZEL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function conviteEncodePayload(dados) {
  const bruto = btoa(unescape(encodeURIComponent(JSON.stringify(dados))));
  return bruto.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function conviteDecodePayload(token) {
  const bruto = String(token || '').trim();
  if (!bruto) return null;
  const normalizado = bruto.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizado.length % 4 ? '='.repeat(4 - (normalizado.length % 4)) : '';
  try {
    return JSON.parse(decodeURIComponent(escape(atob(normalizado + padding))));
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(bruto))));
    } catch (erroLegado) {
      return null;
    }
  }
}

function gerarLinkConvite(nome, email, perfil, equipe, rhContratacao, unidade) {
  const dados = { nome, email, perfil, equipe, rhContratacao, unidade, ts: Date.now() };
  const token = conviteEncodePayload(dados);
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('c', token);
  return url.toString();
}

function lerConviteURL() {
  const params = new URLSearchParams(window.location.search);
  const c = params.get('c');
  if (!c) return null;
  return conviteDecodePayload(c);
}

function montarPayloadEmailConvite({ nome, email, perfil, equipe, rhContratacao, unidade, link, diretor }) {
  const primeiroNome = String(nome || '').trim().split(' ')[0] || '';
  const remetente = usuarioLogado ? String(usuarioLogado.email || '').trim().toLowerCase() : '';
  const mensagem = [
    `Olá, ${primeiroNome || nome}!`,
    'Seu acesso ao sistema Zelony foi liberado.',
    `Perfil: ${perfil}`,
    unidade ? `Unidade: ${unidade}` : '',
    equipe ? `Equipe: ${equipe}` : '',
    rhContratacao ? 'Origem: RH' : '',
    '',
    'Use o link abaixo para concluir seu cadastro:',
    link
  ].filter(Boolean).join('\n');

  return {
    nome,
    name: nome,
    nome_completo: nome,
    to_name: primeiroNome || nome,
    primeiro_nome: primeiroNome || nome,
    email,
    email_para: email,
    to_email: email,
    user_email: email,
    destinatario_email: email,
    cargo: perfil,
    perfil,
    equipe,
    unidade,
    rh: rhContratacao ? 'Sim' : 'Nao',
    diretor,
    from_name: 'Zelony Imóveis',
    reply_to: remetente,
    link,
    invite_link: link,
    convite_link: link,
    onboarding_link: link,
    assunto: 'Convite para acesso ao sistema Zelony',
    subject: 'Convite para acesso ao sistema Zelony',
    mensagem
  };
}

function _buildUserCard(u, idx) {
  const perfilMeta = PERFIL_META[perfilRoleUsuario(u)] || PERFIL_META.cor;
  const avatarColor = perfilMeta.color;
  const statusAtual = typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u)
    : zUiText(u.status || 'Ativo');
  const emailKey = zUiText(u.email).toLowerCase();
  const statusPendente = STATUS_PENDENTES_USUARIOS[emailKey] || '';
  const podeAlternarStatus = statusAtual === 'Ativo' || statusAtual === 'Inativo';
  const rotuloStatus = statusAtual === 'Ativo' ? 'Inativar' : 'Reativar';
  const rotuloStatusLoading = statusPendente === 'Inativo'
    ? 'Inativando...'
    : statusPendente === 'Ativo'
      ? 'Reativando...'
      : rotuloStatus;
  const unidBadge  = u.unidade ? `<span class="badge-unid ${u.unidade==='Centro'?'badge-centro':u.unidade==='Cristo Rei'?'badge-cristo':'badge-ambas'}">${zUiText('📍')} ${zUiText(u.unidade)}</span>` : '';
  const equipeBadge = u.equipe ? `<span class="user-team-badge">${zUiText('👥')} ${zUiText(u.equipe)}</span>` : '';
  const pixCopyArg = encodeURIComponent(String(u.pix || ''));
  const bancoLabel = u.banco
    ? `${zUiText(u.banco)} ${zUiText('·')} ${zUiText(u.tipoConta || 'Conta não informada')}`
    : zUiText('Dados bancários não informados');
  const pixLabel = u.pixTipo
    ? `${zUiText('Pix')} ${zUiText(u.pixTipo)}: ${zUiText(u.pix)}`
    : zUiText('Chave Pix não informada');
  return `<div class="user-card">
    <div class="user-card-top">
      <div class="user-card-top-main">
        <div class="user-av" style="background:${avatarColor};">${iniUser(u.nome)}</div>
        <div class="user-head-copy">
          <div class="user-name">${zUiText(u.nome)}</div>
          <div class="user-chip-row">
            <span class="user-role-tag ${perfilMeta.tag}">${zUiText(perfilMeta.icon)} ${zUiText(perfilMeta.label)}</span>
            ${unidBadge}
            ${equipeBadge}
          </div>
        </div>
      </div>
    </div>
    <div class="user-card-body">
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="12" height="9" rx="1"/><path d="M2 5l6 5 6-5"/></svg><span>${zUiText('E-mail')}</span></div>
        <div class="user-info-value">${zUiText(u.email)}</div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3a1 1 0 011-1h2l1 3-1.5 1a8 8 0 004.5 4.5L11 9l3 1v2a1 1 0 01-1 1A12 12 0 013 3z"/></svg><span>${zUiText('Telefone')}</span></div>
        <div class="user-info-value">${zUiText(u.tel||'Não informado')}</div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="14" height="10" rx="1.5"/><path d="M9 9a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" stroke="none"/><path d="M4 4V3a2 2 0 014 0v1"/></svg><span>${zUiText('Conta')}</span></div>
        <div class="user-info-value">${bancoLabel}</div>
      </div>
      <div class="user-info-item user-info-item--pix">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v12M5 5h4.5a2.5 2.5 0 010 5H5m0-5V2m0 8v4"/></svg><span>${zUiText('Pix')}</span></div>
        <div class="user-info-value-wrap">
          <div class="user-info-value">${pixLabel}</div>
          ${u.pix?`<button class="copy-chip-btn" type="button" onmousedown="event.preventDefault()" onclick="event.preventDefault();event.stopPropagation();copiarTexto(decodeURIComponent('${pixCopyArg}'),'Chave Pix');return false;">${zUiText('📋')} ${zUiText('Copiar')}</button>`:''}
        </div>
      </div>
    </div>
    <div class="user-card-foot">
      <div class="user-status">
        <div class="user-status-dot ${statusAtual==='Ativo'?'':statusAtual==='Pendente'?'pendente':'inativo'}"></div>
        <span style="color:${statusAtual==='Ativo'?'#2E9E6E':statusAtual==='Pendente'?'#C08020':'#C05030'}">${zUiText(statusAtual)}</span>
      </div>
      <div class="user-actions">
        ${podeAlternarStatus ? `<button class="btn-user-status ${statusAtual === 'Inativo' ? 'reactivate' : ''}" onclick="alternarStatusUsuario(${idx})" ${statusPendente ? 'disabled' : ''}>${zUiText(rotuloStatusLoading)}</button>` : ''}
        <button class="btn-user-edit" onclick="editarUsuario(${idx})">${zUiText('✏️ Editar')}</button>
        <button class="btn-user-del"  onclick="excluirUsuario(${idx})">${zUiText('🗑 Excluir')}</button>
      </div>
    </div>
  </div>`;
}

function usuarioPodeGerirEquipe() {
  return ['dir','dono','fin','rh'].includes(String(role || '').toLowerCase());
}

function obterIndiceUsuarioLogado() {
  const emailLogado = usuarioLogado ? zUiText(usuarioLogado.email).trim().toLowerCase() : '';
  if (!emailLogado) return -1;
  return USUARIOS.findIndex(u => zUiText(u.email).trim().toLowerCase() === emailLogado);
}

function obterUsuarioLogadoCadastro() {
  const idx = obterIndiceUsuarioLogado();
  return idx >= 0 ? USUARIOS[idx] : null;
}

function usuarioStatusPadrao(status) {
  const bruto = zUiText(String(status || 'Ativo')).trim().toLowerCase();
  if (bruto === 'inativo') return 'Inativo';
  if (bruto === 'pendente') return 'Pendente';
  return 'Ativo';
}

function usuarioHojeIso() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function usuarioDataIsoParaBr(dataIso) {
  const bruto = String(dataIso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return '';
  const [ano, mes, dia] = bruto.split('-');
  return `${dia}/${mes}/${ano}`;
}

function usuarioDataIsoValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '').trim());
}

function usuarioNormalizarDataIso(valor) {
  const bruto = String(valor || '').trim();
  if (!bruto) return '';
  if (typeof normalizarDataUsuarioCampo === 'function') return normalizarDataUsuarioCampo(bruto);
  if (usuarioDataIsoValida(bruto)) return bruto;
  if (typeof obterMomentoHistorico === 'function') {
    const info = obterMomentoHistorico({ d: bruto }, { preferTs: false });
    if (info && info.date) {
      const ano = info.date.getFullYear();
      const mes = String(info.date.getMonth() + 1).padStart(2, '0');
      const dia = String(info.date.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
  }
  return '';
}

function usuarioDataIsoParaDate(dataIso) {
  const bruto = usuarioNormalizarDataIso(dataIso);
  if (!usuarioDataIsoValida(bruto)) return null;
  const [ano, mes, dia] = bruto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function usuarioDateParaIso(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function usuarioStatusEhEventoAtivacao(tipo) {
  const valor = String(tipo || '').trim().toLowerCase();
  return valor === 'ativado' || valor === 'reativado';
}

function usuarioVendaData(venda) {
  if (!venda || typeof venda !== 'object') return null;
  const historico = Array.isArray(venda.hist) ? venda.hist : [];
  const base = historico.find(item => item && (typeof histAfetaFluxo !== 'function' || histAfetaFluxo(item))) || historico[0] || null;
  const infoHist = base && typeof obterMomentoHistorico === 'function'
    ? (obterMomentoHistorico(base, { preferTs: false }) || obterMomentoHistorico(base))
    : null;
  if (infoHist && infoHist.date) {
    return new Date(infoHist.date.getFullYear(), infoHist.date.getMonth(), infoHist.date.getDate(), 12, 0, 0, 0);
  }
  const bruto = String(venda.data || '').trim();
  if (!bruto || typeof obterMomentoHistorico !== 'function') return null;
  const infoData = obterMomentoHistorico({ d: bruto }, { preferTs: false });
  return infoData && infoData.date
    ? new Date(infoData.date.getFullYear(), infoData.date.getMonth(), infoData.date.getDate(), 12, 0, 0, 0)
    : null;
}

function usuarioHistoricoStatusLista(valor) {
  let lista = valor;
  if (typeof lista === 'string' && lista.trim()) {
    try {
      lista = JSON.parse(lista);
    } catch (_e) {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista.filter(item => item && typeof item === 'object').map(item => ({
    tipo: String(item.tipo || '').trim(),
    data: String(item.data || item.d || '').trim(),
    ts: String(item.ts || '').trim(),
    por: String(item.por || item.u || '').trim(),
    statusAnterior: String(item.statusAnterior || '').trim(),
    statusNovo: String(item.statusNovo || '').trim(),
    origem: String(item.origem || '').trim(),
    equipeAnterior: String(item.equipeAnterior || '').trim(),
    equipeNova: String(item.equipeNova || '').trim()
  }));
}

function usuarioPrimeiraAtivacaoHistoricoIso(usuario) {
  let primeiraData = null;
  usuarioHistoricoStatusLista(usuario && usuario.historicoStatus).forEach(item => {
    if (!usuarioStatusEhEventoAtivacao(item && item.tipo)) return;
    const data = item && item.ts ? new Date(item.ts) : usuarioDataIsoParaDate(item && item.data);
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return;
    const dataNormalizada = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0, 0);
    if (!primeiraData || dataNormalizada.getTime() < primeiraData.getTime()) primeiraData = dataNormalizada;
  });
  return primeiraData ? usuarioDateParaIso(primeiraData) : '';
}

function usuarioPrimeiraVendaIso(usuario) {
  if (!usuario || usuario.id == null || !Array.isArray(VENDAS)) return '';
  let primeiraData = null;
  VENDAS.forEach(venda => {
    if (!venda || venda.distratada) return;
    let usuarioVenda = null;
    if (typeof getUsuarioCorretorDaVenda === 'function') {
      usuarioVenda = getUsuarioCorretorDaVenda(venda, { permitirAproximado: true });
    }
    const mesmoUsuario = !!(
      usuarioVenda && usuarioVenda.id != null
        ? String(usuarioVenda.id) === String(usuario.id)
        : typeof campoVendaBatePessoa === 'function' && campoVendaBatePessoa(venda && venda.corretor, usuario)
    );
    if (!mesmoUsuario) return;
    const dataVenda = usuarioVendaData(venda);
    if (!(dataVenda instanceof Date) || Number.isNaN(dataVenda.getTime())) return;
    if (!primeiraData || dataVenda.getTime() < primeiraData.getTime()) primeiraData = dataVenda;
  });
  return primeiraData ? usuarioDateParaIso(primeiraData) : '';
}

function usuarioInferirDataAtivacaoLegadoIso(usuario) {
  if (!usuario) return '';
  const explicita = usuarioNormalizarDataIso(usuario.dataAtivacao || usuario.data_ativacao || '');
  if (explicita) return explicita;
  const historico = usuarioPrimeiraAtivacaoHistoricoIso(usuario);
  if (historico) return historico;
  if (usuarioStatusPadrao(usuario.status) === 'Pendente') return '';
  const primeiraVendaIso = usuarioPrimeiraVendaIso(usuario);
  const dataBase = usuarioDataIsoParaDate(USUARIO_ATIVACAO_LEGADO_BASE_ISO);
  const dataPrimeiraVenda = usuarioDataIsoParaDate(primeiraVendaIso);
  if (dataBase && dataPrimeiraVenda && dataPrimeiraVenda.getTime() < dataBase.getTime()) return primeiraVendaIso;
  return USUARIO_ATIVACAO_LEGADO_BASE_ISO;
}

function usuarioGarantirDataAtivacaoLegado(usuario) {
  if (!usuario) return '';
  const atual = usuarioNormalizarDataIso(usuario.dataAtivacao || usuario.data_ativacao || '');
  if (atual) {
    usuario.dataAtivacao = atual;
    return atual;
  }
  const inferida = usuarioInferirDataAtivacaoLegadoIso(usuario);
  if (inferida) usuario.dataAtivacao = inferida;
  return inferida;
}

function usuarioHistoricoOrigemCadastral(origem) {
  const valor = String(origem || '').trim().toLowerCase();
  return valor === 'cadastro' || valor === 'cadastro_admin' || valor === 'convite';
}

function usuarioDeveAplicarAtivacaoLegado(usuario, statusAnterior, statusAtual, historico) {
  if (!usuario || !statusAnterior || statusAtual !== 'Ativo') return false;
  if (usuarioNormalizarDataIso(usuario.dataAtivacao || usuario.data_ativacao || '')) return false;
  if (usuarioPrimeiraAtivacaoHistoricoIso(usuario)) return false;
  if (statusAnterior === 'Pendente') return false;
  const lista = Array.isArray(historico) ? historico : usuarioHistoricoStatusLista(usuario && usuario.historicoStatus);
  const possuiHistoricoCadastral = lista.some(item => usuarioHistoricoOrigemCadastral(item && item.origem));
  const possuiSomenteInativacaoInicial = !!(
    lista.length
    && possuiHistoricoCadastral
    && lista.every(item => String(item && item.tipo || '').trim().toLowerCase() === 'inativado')
  );
  return !possuiSomenteInativacaoInicial;
}

function usuarioRegistrarEventoStatus(usuario, tipo, opcoes = {}) {
  if (!usuario || !tipo) return usuario;
  const dataIso = String(opcoes.dataIso || usuarioHojeIso()).trim() || usuarioHojeIso();
  const evento = {
    tipo,
    data: usuarioDataIsoParaBr(dataIso),
    ts: typeof opcoes.ts === 'string' && opcoes.ts.trim() ? opcoes.ts.trim() : new Date().toISOString(),
    por: String(opcoes.por || 'Sistema').trim() || 'Sistema',
    statusAnterior: String(opcoes.statusAnterior || '').trim(),
    statusNovo: String(opcoes.statusNovo || '').trim(),
    origem: String(opcoes.origem || '').trim(),
    equipeAnterior: String(opcoes.equipeAnterior || '').trim(),
    equipeNova: String(opcoes.equipeNova || '').trim()
  };
  usuario.historicoStatus = usuarioHistoricoStatusLista(usuario.historicoStatus);
  const ultimo = usuario.historicoStatus[usuario.historicoStatus.length - 1];
  const repetido = ultimo
    && String(ultimo.tipo || '').trim() === evento.tipo
    && String(ultimo.data || '').trim() === evento.data
    && String(ultimo.statusNovo || '').trim() === evento.statusNovo
    && String(ultimo.equipeAnterior || '').trim() === evento.equipeAnterior
    && String(ultimo.equipeNova || '').trim() === evento.equipeNova;
  if (!repetido) usuario.historicoStatus.push(evento);
  return usuario;
}

function usuarioRegistrarMudancaEquipe(usuario, equipeAnterior, equipeNova, opcoes = {}) {
  const anterior = String(equipeAnterior || '').trim();
  const nova = String(equipeNova || '').trim();
  if (!usuario || anterior === nova) return usuario;
  return usuarioRegistrarEventoStatus(usuario, 'equipe_alterada', {
    ...opcoes,
    equipeAnterior: anterior,
    equipeNova: nova
  });
}

function usuarioAplicarMudancaStatus(usuario, statusAnteriorBruto, statusAtualBruto, opcoes = {}) {
  if (!usuario) return usuario;
  const statusAnterior = usuarioStatusPadrao(statusAnteriorBruto);
  const statusAtual = usuarioStatusPadrao(statusAtualBruto);
  const dataIso = String(opcoes.dataIso || usuarioHojeIso()).trim() || usuarioHojeIso();
  const por = String(opcoes.por || (usuarioLogado ? usuarioLogado.nome.split(' ')[0] : 'Sistema')).trim() || 'Sistema';
  const origem = String(opcoes.origem || '').trim();
  const historico = usuarioHistoricoStatusLista(usuario.historicoStatus);
  if (usuarioDeveAplicarAtivacaoLegado(usuario, statusAnterior, statusAtual, historico)) {
    usuarioGarantirDataAtivacaoLegado(usuario);
  }
  const jaTeveInativacao = historico.some(item => String(item.tipo || '').trim().toLowerCase() === 'inativado')
    || !!String(usuario.dataInativacao || '').trim()
    || statusAnterior === 'Inativo';

  usuario.status = statusAtual;
  usuario.historicoStatus = historico;

  if (!statusAnterior) {
    if (statusAtual === 'Ativo') {
      if (!usuario.dataAtivacao) usuario.dataAtivacao = dataIso;
      usuario.dataInativacao = '';
      if (opcoes.registrarEventoInicial !== false) {
        usuarioRegistrarEventoStatus(usuario, 'ativado', {
          dataIso,
          por,
          origem: origem || 'cadastro',
          statusAnterior: '',
          statusNovo: statusAtual
        });
      }
    } else if (statusAtual === 'Inativo') {
      usuario.dataInativacao = dataIso;
      if (opcoes.registrarEventoInicial !== false) {
        usuarioRegistrarEventoStatus(usuario, 'inativado', {
          dataIso,
          por,
          origem: origem || 'cadastro',
          statusAnterior: '',
          statusNovo: statusAtual
        });
      }
    }
    return usuario;
  }

  if (statusAnterior === statusAtual) return usuario;

  if (statusAtual === 'Ativo') {
    if (!usuario.dataAtivacao) usuario.dataAtivacao = dataIso;
    usuario.dataInativacao = '';
    usuarioRegistrarEventoStatus(usuario, jaTeveInativacao ? 'reativado' : 'ativado', {
      dataIso,
      por,
      origem: origem || 'status',
      statusAnterior,
      statusNovo: statusAtual
    });
    return usuario;
  }

  if (statusAtual === 'Inativo') {
    usuario.dataInativacao = dataIso;
    usuarioRegistrarEventoStatus(usuario, 'inativado', {
      dataIso,
      por,
      origem: origem || 'status',
      statusAnterior,
      statusNovo: statusAtual
    });
  }

  return usuario;
}

function definirModoModalUsuario(modo) {
  modalUsuarioModo = modo === 'self' ? 'self' : 'admin';
  zSetState('state.ui.modalUsuarioModo', modalUsuarioModo);
}

function definirCampoModalUsuarioBloqueado(id, bloqueado) {
  const campo = document.getElementById(id);
  if (!campo) return;
  if ('readOnly' in campo) campo.readOnly = !!bloqueado;
  campo.disabled = !!bloqueado;
}

function atualizarModoModalUsuario() {
  const autoAtendimento = modalUsuarioModo === 'self';
  const title = document.getElementById('mu-title');
  const subtitle = document.getElementById('mu-subtitle');
  const btnSave = document.getElementById('mu-save-btn');
  const rhField = document.getElementById('rh-field');

  if (title) {
    title.textContent = zUiText(
      autoAtendimento
        ? 'Meus dados de recebimento'
        : editUserIdx >= 0
          ? 'Editar Usuário'
          : 'Novo Usuário'
    );
  }
  if (subtitle) {
    subtitle.textContent = zUiText(
      autoAtendimento
        ? 'Atualize apenas seu telefone e seus dados de recebimento.'
        : 'Preencha todos os campos obrigatórios *'
    );
  }
  if (btnSave) {
    btnSave.textContent = zUiText(
      autoAtendimento
        ? '✓ Salvar meus dados'
        : editUserIdx >= 0
          ? '✓ Salvar alterações'
          : '✓ Cadastrar usuário'
    );
  }

  ['mu-nome','mu-email','mu-perfil','mu-status','mu-unidade','mu-equipe','mu-rh'].forEach(id => {
    definirCampoModalUsuarioBloqueado(id, autoAtendimento);
  });
  ['mu-tel','mu-banco','mu-agencia','mu-conta','mu-tipo-conta','mu-pix'].forEach(id => {
    definirCampoModalUsuarioBloqueado(id, false);
  });

  if (rhField) rhField.style.display = autoAtendimento ? 'none' : 'block';
}

function preencherFormularioUsuario(u) {
  document.getElementById('mu-nome').value       = u.nome;
  document.getElementById('mu-email').value      = u.email;
  document.getElementById('mu-tel').value        = u.tel || '';
  document.getElementById('mu-perfil').value     = u.perfil;
  document.getElementById('mu-status').value     = u.status;
  document.getElementById('mu-banco').value      = u.banco || '';
  document.getElementById('mu-agencia').value    = u.agencia || '';
  document.getElementById('mu-conta').value      = u.conta || '';
  document.getElementById('mu-tipo-conta').value = u.tipoConta || '';
  document.getElementById('mu-rh').checked       = u.rhContratacao || false;
  document.getElementById('mu-unidade').value    = u.unidade || '';
  document.getElementById('mu-equipe').value     = u.equipe || '';
  pixSel = u.pixTipo || '';
  zSetState('state.ui.pixSel', pixSel);
  document.getElementById('mu-pix').value = u.pix || '';
  document.querySelectorAll('.pix-type').forEach(b => {
    b.classList.toggle('sel', zUiText(b.textContent.trim()) === zUiText(pixSel));
  });
  toggleRHField();
}

function _buildMeuCadastroCard(u) {
  const perfilMeta = PERFIL_META[perfilRoleUsuario(u)] || PERFIL_META.cor;
  const avatarColor = perfilMeta.color;
  const statusAtual = typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u)
    : zUiText(u.status || 'Ativo');
  const unidBadge  = u.unidade ? `<span class="badge-unid ${u.unidade==='Centro'?'badge-centro':u.unidade==='Cristo Rei'?'badge-cristo':'badge-ambas'}">${zUiText('📍')} ${zUiText(u.unidade)}</span>` : '';
  const equipeBadge = u.equipe ? `<span class="user-team-badge">${zUiText('👥')} ${zUiText(u.equipe)}</span>` : '';
  const pixCopyArg = encodeURIComponent(String(u.pix || ''));
  const bancoLabel = u.banco
    ? `${zUiText(u.banco)} ${zUiText('·')} ${zUiText(u.tipoConta || 'Conta não informada')}`
    : zUiText('Dados bancários não informados');
  const pixLabel = u.pixTipo
    ? `${zUiText('Pix')} ${zUiText(u.pixTipo)}: ${zUiText(u.pix)}`
    : zUiText('Chave Pix não informada');

  return `<div class="user-card">
    <div class="user-card-top">
      <div class="user-card-top-main">
        <div class="user-av" style="background:${avatarColor};">${iniUser(u.nome)}</div>
        <div class="user-head-copy">
          <div class="user-name">${zUiText(u.nome)}</div>
          <div class="user-chip-row">
            <span class="user-role-tag ${perfilMeta.tag}">${zUiText(perfilMeta.icon)} ${zUiText(perfilMeta.label)}</span>
            ${unidBadge}
            ${equipeBadge}
          </div>
        </div>
      </div>
    </div>
    <div class="user-card-body">
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="12" height="9" rx="1"/><path d="M2 5l6 5 6-5"/></svg><span>${zUiText('E-mail')}</span></div>
        <div class="user-info-value">${zUiText(u.email)}</div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3a1 1 0 011-1h2l1 3-1.5 1a8 8 0 004.5 4.5L11 9l3 1v2a1 1 0 01-1 1A12 12 0 013 3z"/></svg><span>${zUiText('Telefone')}</span></div>
        <div class="user-info-value">${zUiText(u.tel || 'Não informado')}</div>
      </div>
      <div class="user-info-item">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="14" height="10" rx="1.5"/><path d="M9 9a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" stroke="none"/><path d="M4 4V3a2 2 0 014 0v1"/></svg><span>${zUiText('Conta')}</span></div>
        <div class="user-info-value">${bancoLabel}</div>
      </div>
      <div class="user-info-item user-info-item--pix">
        <div class="user-info-label"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v12M5 5h4.5a2.5 2.5 0 010 5H5m0-5V2m0 8v4"/></svg><span>${zUiText('Pix')}</span></div>
        <div class="user-info-value-wrap">
          <div class="user-info-value">${pixLabel}</div>
          ${u.pix ? `<button class="copy-chip-btn" type="button" onmousedown="event.preventDefault()" onclick="event.preventDefault();event.stopPropagation();copiarTexto(decodeURIComponent('${pixCopyArg}'),'Chave Pix');return false;">${zUiText('📋')} ${zUiText('Copiar')}</button>` : ''}
        </div>
      </div>
    </div>
    <div class="user-card-foot">
      <div class="user-status">
        <div class="user-status-dot ${statusAtual==='Ativo'?'':statusAtual==='Pendente'?'pendente':'inativo'}"></div>
        <span style="color:${statusAtual==='Ativo'?'#2E9E6E':statusAtual==='Pendente'?'#C08020':'#C05030'}">${zUiText(statusAtual)}</span>
      </div>
      <div class="user-actions">
        <button class="btn-user-edit" onclick="abrirMeuCadastroUsuario()">${zUiText('✏️ Atualizar meus dados')}</button>
      </div>
    </div>
  </div>`;
}

function renderMeuCadastroUsuario() {
  const cont = document.getElementById('usuarios-content');
  const usuario = obterUsuarioLogadoCadastro();
  if (!cont) return;
  if (!usuario) {
    cont.innerHTML = `<div class="usuarios-locked"><div class="locked-icon">${zUiText('⚠️')}</div><div class="locked-title">${zUiText('Cadastro não encontrado')}</div><div class="locked-sub">${zUiText('Não foi possível localizar seu cadastro de usuário para atualizar os dados de recebimento.')}</div></div>`;
    return;
  }

  cont.innerHTML = `<div class="usuarios-wrap">
    <div class="usuarios-top">
      <div style="font-family:'Playfair Display',serif;font-size:16px;font-weight:500;">${zUiText('Meus dados')}</div>
    </div>
    <div style="font-size:12px;color:var(--tm);margin:-2px 0 18px;">
      ${zUiText('Aqui você pode manter seu telefone, seus dados bancários e sua chave Pix sempre atualizados para recebimento.')}
    </div>
    <div class="users-grid" style="grid-template-columns:minmax(0,1fr);max-width:880px;">
      ${_buildMeuCadastroCard(usuario)}
    </div>
  </div>`;
}

function renderUsuarios() {
  const isAdmin = usuarioPodeGerirEquipe();
  const cont = document.getElementById('usuarios-content');
  if (!cont) return;
  if (!isAdmin) {
    renderMeuCadastroUsuario();
    return;
  }
  const equipes = [...new Set(USUARIOS.map(u => u.equipe||'').filter(Boolean))].sort();
  const lista   = _filtrarUsuarios();
  const total   = USUARIOS.length;
  const ativos = USUARIOS.filter(u => typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u) === 'Ativo'
    : zUiText(u.status || 'Ativo') === 'Ativo').length;
  const pendentes = USUARIOS.filter(u => typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u) === 'Pendente'
    : zUiText(u.status || 'Ativo') === 'Pendente').length;
  const inativos = USUARIOS.filter(u => typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u) === 'Inativo'
    : zUiText(u.status || 'Ativo') === 'Inativo').length;
  const cards   = lista.map(u => _buildUserCard(u, USUARIOS.indexOf(u))).join('');

  cont.innerHTML = `<div class="usuarios-wrap">
    <div class="usuarios-top">
      <div style="font-family:'Playfair Display',serif;font-size:16px;font-weight:500;">${zUiText('UsuÃ¡rios do Sistema')}</div>
      <div style="display:flex;gap:8px;">
        <button class="btn-add-trein" style="background:var(--bg);border:1px solid var(--gold-bd);color:var(--gold);" onclick="abrirConvite()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 8.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1h4.5"/><path d="M9 1h6v6"/><path d="M15 1L8 8"/></svg>
          ${zUiText('Convidar usuÃ¡rio')}
        </button>
        <button class="btn-add-trein" onclick="abrirModalUser()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          ${zUiText('Novo usuÃ¡rio')}
        </button>
      </div>
    </div>
    <div class="u-search-bar">
      <div class="u-search-wrap">
        <span class="u-search-icon">${zUiText('🔍')}</span>
        <input type="text" id="user-search-input" placeholder="${zUiText('Buscar por nome, e-mail ou equipe...')}"
          value="${zUiText(uBusca)}" oninput="uBusca=this.value;filtrarUsuarios()">
      </div>
      <select class="u-filter-sel" onchange="uFiltroPerfil=this.value;renderUsuarios()">
        <option value="">${zUiText('Todos os perfis')}</option>
        <option value="dono" ${uFiltroPerfil==='dono'?'selected':''}>${zUiText('👑 Dono')}</option>
        <option value="dir"  ${uFiltroPerfil==='dir'?'selected':''}>${zUiText('💼 Diretor')}</option>
        <option value="ger"  ${uFiltroPerfil==='ger'?'selected':''}>${zUiText('🏆 Gerente')}</option>
        <option value="cap"  ${uFiltroPerfil==='cap'?'selected':''}>${zUiText('⭐ Capitão')}</option>
        <option value="cor"  ${uFiltroPerfil==='cor'?'selected':''}>${zUiText('👤 Corretor')}</option>
        <option value="fin"  ${uFiltroPerfil==='fin'?'selected':''}>${zUiText('💰 Financeiro')}</option>
        <option value="rh"   ${uFiltroPerfil==='rh'?'selected':''}>${zUiText('🤝 RH')}</option>
      </select>
      <select class="u-filter-sel" onchange="uFiltroStatus=this.value;renderUsuarios()">
        <option value="">${zUiText('Todos os status')}</option>
        <option value="Ativo" ${uFiltroStatus==='Ativo'?'selected':''}>${zUiText('🟢 Ativos')}</option>
        <option value="Pendente" ${uFiltroStatus==='Pendente'?'selected':''}>${zUiText('🟡 Pendentes')}</option>
        <option value="Inativo" ${uFiltroStatus==='Inativo'?'selected':''}>${zUiText('🔴 Inativos')}</option>
      </select>
      <select class="u-filter-sel" onchange="uFiltroUnidade=this.value;renderUsuarios()">
        <option value="">${zUiText('Todas as unidades')}</option>
        <option value="Centro"    ${uFiltroUnidade==='Centro'?'selected':''}>${zUiText('🟠 Centro')}</option>
        <option value="Cristo Rei"${uFiltroUnidade==='Cristo Rei'?'selected':''}>${zUiText('🟢 Cristo Rei')}</option>
      </select>
      <select class="u-filter-sel" onchange="uFiltroEquipe=this.value;renderUsuarios()">
        <option value="">${zUiText('Todas as equipes')}</option>
        <option value="__sem_equipe__" ${uFiltroEquipe==='__sem_equipe__'?'selected':''}>${zUiText('Sem equipe')}</option>
        ${equipes.map(e=>`<option value="${e}" ${uFiltroEquipe===e?'selected':''}>${zUiText(e)}</option>`).join('')}
      </select>
      <span class="u-count">${lista.length} ${zUiText('de')} ${total} ${zUiText(`usuÃ¡rio${total!==1?'s':''}`)}</span>
      ${(uBusca||uFiltroUnidade||uFiltroEquipe||uFiltroPerfil||uFiltroStatus) ?
        `<button onclick="uBusca='';uFiltroUnidade='';uFiltroEquipe='';uFiltroPerfil='';uFiltroStatus='';renderUsuarios();"
          style="font-size:10px;background:none;border:1px solid var(--bd);border-radius:5px;padding:4px 8px;cursor:pointer;color:var(--tm);font-family:'Inter',sans-serif;">${zUiText('✕ Limpar')}</button>` : ''}
    </div>
    <div class="usuarios-stats">
      <div class="mc a"><div class="mc-l">${zUiText('Total cadastrados')}</div><div class="mc-v" style="color:var(--gold);">${total}</div></div>
      <div class="mc" style="border-top-color:#2E9E6E;"><div class="mc-l">${zUiText('Ativos')}</div><div class="mc-v" style="color:#2E9E6E;">${ativos}</div></div>
      <div class="mc" style="border-top-color:#C08020;"><div class="mc-l">${zUiText('Pendentes')}</div><div class="mc-v" style="color:#C08020;">${pendentes}</div></div>
      <div class="mc" style="border-top-color:#C06030;"><div class="mc-l">${zUiText('Inativos')}</div><div class="mc-v" style="color:#C06030;">${inativos}</div></div>
      <div class="mc"><div class="mc-l">${zUiText('Mostrando')}</div><div class="mc-v" id="u-mostrando">${lista.length}</div></div>
    </div>
    <div class="user-grid" id="u-cards-grid">
      ${cards || `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--tm);"><div style="font-size:28px;margin-bottom:8px;">${zUiText('🔍')}</div><div style="font-size:13px;">${zUiText('Nenhum usuário encontrado.')}</div></div>`}
    </div>
  </div>`;
}

function _filtrarUsuarios() {
  return USUARIOS.filter(u => {
    const q = uBusca.toLowerCase();
    const statusAtual = typeof usuarioStatusNormalizado === 'function'
      ? usuarioStatusNormalizado(u)
      : zUiText(u.status || 'Ativo');
    const equipeAtual = zUiText(u.equipe || '').trim();
    return (!q || (u.nome||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.equipe||'').toLowerCase().includes(q))
      && (!uFiltroUnidade || u.unidade===uFiltroUnidade || u.unidade==='Ambas')
      && (!uFiltroEquipe  || (uFiltroEquipe === '__sem_equipe__' ? !equipeAtual : equipeAtual===uFiltroEquipe))
      && (!uFiltroPerfil  || perfilRoleUsuario(u)===uFiltroPerfil)
      && (!uFiltroStatus  || statusAtual===uFiltroStatus);
  });
}

function filtrarUsuarios() {
  const grid      = document.getElementById('u-cards-grid');
  const mostrando = document.getElementById('u-mostrando');
  if (!grid) return;
  const lista = _filtrarUsuarios();
  if (mostrando) mostrando.textContent = lista.length;
  grid.innerHTML = lista.map(u => _buildUserCard(u, USUARIOS.indexOf(u))).join('')
    || `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--tm);">${zUiText('Nenhum usuÃ¡rio encontrado.')}</div>`;
}

function toggleRHField() {
  const perfil = document.getElementById('mu-perfil').value;
  const field  = document.getElementById('rh-field');
  const help   = document.getElementById('mu-rh-help');
  if (field) field.style.display = 'block';
  if (help) {
    help.textContent = zUiText(
      perfil === 'Corretor'
        ? 'Se marcado, 0,1% de comissão será destinado ao RH nas vendas desse corretor'
        : 'Essa origem continua valendo nas vendas antigas mesmo se o colaborador mudar de perfil'
    );
  }
}

function abrirModalUser() {
  if (!usuarioPodeGerirEquipe()) {
    showToast(zUiText('🔒'), zUiText('Você pode editar apenas seus próprios dados de recebimento.'));
    return;
  }
  definirModoModalUsuario('admin');
  editUserIdx = -1; pixSel = '';
  zSetState('state.ui.editUserIdx', editUserIdx);
  zSetState('state.ui.pixSel', pixSel);
  ['mu-nome','mu-email','mu-tel','mu-banco','mu-agencia','mu-conta','mu-pix'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('mu-perfil').value    = '';
  document.getElementById('mu-status').value    = 'Ativo';
  document.getElementById('mu-tipo-conta').value = '';
  document.getElementById('mu-rh').checked      = false;
  document.getElementById('mu-unidade').value   = '';
  document.getElementById('mu-equipe').value    = '';
  document.querySelectorAll('.pix-type').forEach(b => b.classList.remove('sel'));
  toggleRHField();
  atualizarModoModalUsuario();
  document.getElementById('muser').classList.add('show');
  setTimeout(() => document.getElementById('mu-nome').focus(), 100);
}

function editarUsuario(idx) {
  if (!usuarioPodeGerirEquipe()) {
    const idxLogado = obterIndiceUsuarioLogado();
    if (idx === idxLogado) {
      abrirMeuCadastroUsuario();
    } else {
      showToast(zUiText('🔒'), zUiText('Você pode editar apenas seus próprios dados de recebimento.'));
    }
    return;
  }
  definirModoModalUsuario('admin');
  const u = USUARIOS[idx]; editUserIdx = idx;
  zSetState('state.ui.editUserIdx', editUserIdx);
  preencherFormularioUsuario(u);
  atualizarModoModalUsuario();
  document.getElementById('muser').classList.add('show');
}

function abrirMeuCadastroUsuario() {
  const idx = obterIndiceUsuarioLogado();
  if (idx < 0) {
    showToast(zUiText('⚠️'), zUiText('Não encontramos seu cadastro de usuário para edição.'));
    return;
  }
  definirModoModalUsuario('self');
  editUserIdx = idx;
  zSetState('state.ui.editUserIdx', editUserIdx);
  preencherFormularioUsuario(USUARIOS[idx]);
  atualizarModoModalUsuario();
  document.getElementById('muser').classList.add('show');
  setTimeout(() => document.getElementById('mu-tel').focus(), 100);
}

async function alternarStatusUsuario(idx) {
  if (!usuarioPodeGerirEquipe()) {
    showToast(zUiText('🔒'), zUiText('Somente perfis administrativos podem alterar status de usuários.'));
    return;
  }
  const u = USUARIOS[idx];
  if (!u) return;
  const statusAtual = typeof usuarioStatusNormalizado === 'function'
    ? usuarioStatusNormalizado(u)
    : zUiText(u.status || 'Ativo');
  if (!['Ativo', 'Inativo'].includes(statusAtual)) {
    showToast(zUiText('ℹ️'), zUiText('Este cadastro não pode ter o status alterado por esta ação rápida.'));
    return;
  }

  const proximoStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
  const emailKey = zUiText(u.email).toLowerCase();
  const mensagemConfirmacao = proximoStatus === 'Inativo'
    ? `Inativar o usuário "${u.nome}"? Ele continuará no histórico, mas sairá dos novos lançamentos e terá o acesso bloqueado.`
    : `Reativar o usuário "${u.nome}"? Ele voltará a aparecer nos novos lançamentos e poderá acessar o sistema novamente.`;

  if (!confirm(zUiText(mensagemConfirmacao))) return;
  if (STATUS_PENDENTES_USUARIOS[emailKey]) {
    showToast(zUiText('⚠️'), zUiText('Já existe uma alteração de status em processamento para este usuário.'));
    return;
  }

  const original = JSON.parse(JSON.stringify(u));
  STATUS_PENDENTES_USUARIOS[emailKey] = proximoStatus;
  zSetState('state.ui.statusPendentesUsuarios', STATUS_PENDENTES_USUARIOS);
  renderUsuarios();

  try {
    usuarioAplicarMudancaStatus(u, statusAtual, proximoStatus, {
      por: usuarioLogado ? usuarioLogado.nome.split(' ')[0] : 'Sistema',
      origem: 'acao_rapida'
    });
    await dbSalvarUsuario(u, u.id);
    zSetState('state.data.usuarios', USUARIOS);
    salvarLS();
    delete STATUS_PENDENTES_USUARIOS[emailKey];
    zSetState('state.ui.statusPendentesUsuarios', STATUS_PENDENTES_USUARIOS);
    renderUsuarios();

    const usuarioAtualInativado = !!(usuarioLogado && zUiText(usuarioLogado.email).toLowerCase() === emailKey && proximoStatus === 'Inativo');
    if (usuarioAtualInativado) {
      if (typeof fazerLogout === 'function') fazerLogout();
      showToast(zUiText('🔒'), zUiText('Usuário inativado. A sessão atual foi encerrada.'));
      return;
    }

    showToast(
      zUiText('✅'),
      zUiText(proximoStatus === 'Inativo'
        ? `Usuário "${u.nome}" inativado com sucesso.`
        : `Usuário "${u.nome}" reativado com sucesso.`)
    );
  } catch (e) {
    console.error(e);
    Object.assign(u, original);
    zSetState('state.data.usuarios', USUARIOS);
    salvarLS();
    delete STATUS_PENDENTES_USUARIOS[emailKey];
    zSetState('state.ui.statusPendentesUsuarios', STATUS_PENDENTES_USUARIOS);
    renderUsuarios();
    showToast(zUiText('❌'), zUiText('Não foi possível alterar o status do usuário no banco. Tente novamente.'));
  }
}

async function excluirUsuario(idx) {
  if (!usuarioPodeGerirEquipe()) {
    showToast(zUiText('🔒'), zUiText('Somente perfis administrativos podem excluir usuários.'));
    return;
  }
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os usuários estão em modo consulta.'})) return;
  const u = USUARIOS[idx];
  const emailKey = (u.email || '').toLowerCase();
  if (!confirm(zUiText(`Excluir o usuÃ¡rio "${u.nome}"? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`))) return;
  if (EXCLUSOES_PENDENTES[emailKey]) {
    showToast(zUiText('⚠️'), zUiText('A exclusão deste usuário ainda está em processamento.'));
    return;
  }
  EXCLUSOES_PENDENTES[emailKey] = true;
  zSetState('state.ui.exclusoesPendentesUsuarios', EXCLUSOES_PENDENTES);
  try {
    await dbExcluirUsuario(u.email);
  } catch (e) {
    console.error(e);
    delete EXCLUSOES_PENDENTES[emailKey];
    zSetState('state.ui.exclusoesPendentesUsuarios', EXCLUSOES_PENDENTES);
    showToast(zUiText('❌'), zUiText('Não foi possível concluir a exclusão. Aguarde e tente novamente.'));
    return;
  }
  USUARIOS.splice(idx, 1);
  zSetState('state.data.usuarios', USUARIOS);
  delete EXCLUSOES_PENDENTES[emailKey];
  zSetState('state.ui.exclusoesPendentesUsuarios', EXCLUSOES_PENDENTES);
  salvarLS(); renderUsuarios();
  showToast(zUiText('🗑'), zUiText('Usuário excluído.'));
}

function selPix(tipo, el) {
  pixSel = tipo;
  zSetState('state.ui.pixSel', pixSel);
  document.querySelectorAll('.pix-type').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  const phs = { CPF:'000.000.000-00', CNPJ:'00.000.000/0001-00', 'E-mail':'email@exemplo.com', Telefone:'(41) 99999-9999', 'AleatÃ³ria':'Codigo aleatorio gerado pelo banco', 'Aleatória':'Código aleatório gerado pelo banco', 'Aleatoria':'Codigo aleatorio gerado pelo banco' };
  document.getElementById('mu-pix').placeholder = zUiText(phs[tipo]||'Digite a chave pix...');
  document.getElementById('mu-pix').focus();
}

function fecharMU() {
  document.getElementById('muser').classList.remove('show');
  editUserIdx = -1;
  pixSel = '';
  definirModoModalUsuario('admin');
  zSetState('state.ui.editUserIdx', editUserIdx);
  zSetState('state.ui.pixSel', pixSel);
}
function handleBackdropU(e) { if (e.target === document.getElementById('muser')) fecharMU(); }

function sincronizarSessaoUsuarioAtualizada(usuarioAtualizado) {
  if (!usuarioLogado || !usuarioAtualizado) return;
  const emailAtual = zUiText(usuarioLogado.email).trim().toLowerCase();
  const emailSalvo = zUiText(usuarioAtualizado.email).trim().toLowerCase();
  if (!emailAtual || emailAtual !== emailSalvo) return;
  usuarioLogado = { ...usuarioLogado, ...usuarioAtualizado };
  zSetState('state.auth.usuarioLogado', usuarioLogado);
  if (typeof atualizarTopbar === 'function') {
    atualizarTopbar(usuarioLogado, getPerfil(usuarioLogado.perfil));
  }
}

async function salvarUsuario() {
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os usuários estão em modo consulta.'})) return;
  const autoAtendimento = modalUsuarioModo === 'self';
  if (!usuarioPodeGerirEquipe() && !autoAtendimento) {
    showToast(zUiText('🔒'), zUiText('Você pode editar apenas seus próprios dados de recebimento.'));
    return;
  }
  const nome      = document.getElementById('mu-nome').value.trim().toUpperCase();
  const email     = document.getElementById('mu-email').value.trim();
  const tel       = document.getElementById('mu-tel').value.trim();
  const perfil    = document.getElementById('mu-perfil').value;
  const status    = document.getElementById('mu-status').value;
  const banco     = document.getElementById('mu-banco').value.trim();
  const agencia   = document.getElementById('mu-agencia').value.trim();
  const conta     = document.getElementById('mu-conta').value.trim();
  const tipoConta = document.getElementById('mu-tipo-conta').value;
  const pix       = document.getElementById('mu-pix').value.trim();
  const rhContr   = document.getElementById('mu-rh').checked;
  const unidade   = document.getElementById('mu-unidade').value;
  const equipe    = document.getElementById('mu-equipe').value.trim();

  if (!tel)                  { document.getElementById('mu-tel').focus();   showToast(zUiText('⚠️'),zUiText('Informe o telefone.')); return; }
  if (!banco)                { document.getElementById('mu-banco').focus(); showToast(zUiText('⚠️'),zUiText('Informe o banco.')); return; }
  if (!conta)                { document.getElementById('mu-conta').focus(); showToast(zUiText('⚠️'),zUiText('Informe a conta bancária.')); return; }
  if (!tipoConta)            { showToast(zUiText('⚠️'),zUiText('Selecione o tipo de conta.')); return; }
  if (!pixSel)               { showToast(zUiText('⚠️'),zUiText('Selecione o tipo de chave Pix.')); return; }
  if (!pix)                  { document.getElementById('mu-pix').focus();   showToast(zUiText('⚠️'),zUiText('Informe a chave Pix.')); return; }
  if (!autoAtendimento && !nome)                 { document.getElementById('mu-nome').focus();  showToast(zUiText('⚠️'),zUiText('Informe o nome completo.')); return; }
  if (!autoAtendimento && (!email||!email.includes('@'))) { document.getElementById('mu-email').focus(); showToast(zUiText('⚠️'),zUiText('Informe um e-mail válido.')); return; }
  if (!autoAtendimento && !perfil)               { showToast(zUiText('⚠️'),zUiText('Selecione o perfil de acesso.')); return; }
  if (!autoAtendimento && !unidade)              { showToast(zUiText('⚠️'),zUiText('Selecione a unidade.')); return; }

  let idxAlvo = editUserIdx;
  let cadastroBase = idxAlvo >= 0 ? USUARIOS[idxAlvo] : null;
  if (autoAtendimento) {
    idxAlvo = obterIndiceUsuarioLogado();
    cadastroBase = idxAlvo >= 0 ? USUARIOS[idxAlvo] : null;
    if (idxAlvo < 0 || !cadastroBase) {
      showToast(zUiText('⚠️'), zUiText('Não foi possível localizar seu cadastro para salvar os dados.'));
      return;
    }
  }

  const emEdicao = autoAtendimento || idxAlvo >= 0;
  const btnSalvar = document.getElementById('mu-save-btn');
  const labelOriginalBtn = btnSalvar ? btnSalvar.textContent : '';
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = zUiText(
      autoAtendimento
        ? '✓ Salvando meus dados...'
        : emEdicao
          ? '✓ Salvando alterações...'
          : '✓ Cadastrando usuário...'
    );
  }

  const nomeNormalizado = typeof zNormalizarCampoTexto === 'function' ? zNormalizarCampoTexto(nome) : nome;
  const dados = autoAtendimento
    ? {
        tel,
        banco,
        agencia,
        conta,
        tipoConta,
        pixTipo: pixSel,
        pix
      }
    : {
        nome: nomeNormalizado,
        email,
        tel,
        perfil,
        status,
        banco,
        agencia,
        conta,
        tipoConta,
        pixTipo: pixSel,
        pix,
        rhContratacao: rhContr,
        unidade,
        equipe
      };
  const nextUserIdAnterior = nextUserId;
  const idxAnterior = idxAlvo;
  const usuarioAnterior = emEdicao ? JSON.parse(JSON.stringify(USUARIOS[idxAlvo])) : null;
  let usuarioSalvo = null;
  const responsavelStatus = usuarioLogado ? usuarioLogado.nome.split(' ')[0] : 'Sistema';

  try {
    if (emEdicao) {
      const uid = USUARIOS[idxAlvo].id;
      USUARIOS[idxAlvo] = { ...USUARIOS[idxAlvo], ...dados };
      usuarioSalvo = USUARIOS[idxAlvo];
      if (!autoAtendimento) {
        usuarioAplicarMudancaStatus(usuarioSalvo, usuarioAnterior && usuarioAnterior.status, usuarioSalvo.status, {
          por: responsavelStatus,
          origem: 'modal_admin',
          registrarEventoInicial: false
        });
        usuarioRegistrarMudancaEquipe(usuarioSalvo, usuarioAnterior && usuarioAnterior.equipe, usuarioSalvo.equipe, {
          por: responsavelStatus,
          origem: 'modal_admin'
        });
      }
      if (autoAtendimento) {
        const emailSessao = String(email || '').trim().toLowerCase();
        const senhaFallback = emailSessao
          ? String((typeof SENHAS_INDIVIDUAIS !== 'undefined' && SENHAS_INDIVIDUAIS[emailSessao]) || (typeof SENHA_PADRAO !== 'undefined' ? SENHA_PADRAO : '') || '')
          : '';
        if (typeof usuarioSelfServiceAtualizarMe !== 'function') {
          throw new Error('Autoatendimento protegido indisponível no momento.');
        }
        const respostaAutoatendimento = typeof usuarioSelfServiceAtualizarMe === 'function'
          ? await usuarioSelfServiceAtualizarMe(dados, { email: emailSessao, senhaFallback })
          : null;
        if (respostaAutoatendimento && respostaAutoatendimento.usuario) {
          usuarioSalvo = { ...USUARIOS[idxAlvo], ...respostaAutoatendimento.usuario };
          USUARIOS[idxAlvo] = usuarioSalvo;
        }
      } else {
        await dbSalvarUsuario(usuarioSalvo, uid);
      }
    } else {
      usuarioSalvo = { id: nextUserId++, ...dados };
      usuarioAplicarMudancaStatus(usuarioSalvo, '', usuarioSalvo.status, {
        por: responsavelStatus,
        origem: 'cadastro_admin'
      });
      USUARIOS.push(usuarioSalvo);
      zSetState('state.ui.nextUserId', nextUserId);
      await dbSalvarUsuario(usuarioSalvo, null);
    }

    const perfilAnterior = usuarioAnterior ? perfilRoleUsuario(usuarioAnterior) : '';
    const perfilAtual = perfilRoleUsuario(usuarioSalvo);
    const statusAnterior = usuarioAnterior && typeof usuarioStatusNormalizado === 'function'
      ? usuarioStatusNormalizado(usuarioAnterior)
      : zUiText(usuarioAnterior && usuarioAnterior.status || '');
    const statusAtual = typeof usuarioStatusNormalizado === 'function'
      ? usuarioStatusNormalizado(usuarioSalvo)
      : zUiText(usuarioSalvo.status || 'Ativo');
    const rhMudou = !!(usuarioAnterior && usuarioAnterior.rhContratacao) !== !!usuarioSalvo.rhContratacao;
    const podeSincronizarHistoricoRh = !!usuarioAnterior && rhMudou && perfilAnterior === 'cor' && perfilAtual === 'cor';
    const syncResumo = podeSincronizarHistoricoRh
      ? await sincronizarRhContratacaoUsuario(usuarioSalvo, usuarioAnterior, { renderizar:false })
      : {alteradas:0,persistidas:0,falhas:0};
    zSetState('state.data.usuarios', USUARIOS);
    sincronizarSessaoUsuarioAtualizada(usuarioSalvo);
    salvarLS();
    fecharMU();
    renderUsuarios();
    if (syncResumo.alteradas > 0) atualizarViewsPosSyncRh();

    if (autoAtendimento) {
      showToast(zUiText('✅'), zUiText('Seus dados de recebimento foram atualizados com sucesso!'));
      return;
    }

    const acao = emEdicao ? 'atualizado' : 'cadastrado';
    let mensagem = `Usuário "${nomeNormalizado}" ${acao}!`;
    if (emEdicao && statusAnterior && statusAnterior !== statusAtual) {
      mensagem = statusAtual === 'Inativo'
        ? `Usuário "${nomeNormalizado}" inativado com sucesso!`
        : `Usuário "${nomeNormalizado}" reativado com sucesso!`;
    }
    if (syncResumo.alteradas === 1) mensagem += ' 1 venda foi recalculada por causa da participação do RH.';
    if (syncResumo.alteradas > 1) mensagem += ` ${syncResumo.alteradas} vendas foram recalculadas por causa da participação do RH.`;
    const usuarioAtualInativado = !!(usuarioLogado && zUiText(usuarioLogado.email).toLowerCase() === zUiText(usuarioSalvo.email).toLowerCase() && statusAtual === 'Inativo');
    if (usuarioAtualInativado) {
      if (typeof fazerLogout === 'function') fazerLogout();
      showToast(zUiText('🔒'), zUiText('Seu usuário foi inativado e a sessão atual foi encerrada.'));
      return;
    }
    showToast(zUiText('✅'), zUiText(mensagem));
    if (syncResumo.falhas > 0) {
      showToast(zUiText('⚠️'), zUiText('Parte das vendas foi ajustada na tela, mas não conseguiu sincronizar no banco. Recarregue e tente salvar novamente se notar divergência.'));
    }
  } catch (e) {
    console.error(e);
    if (emEdicao) {
      USUARIOS[idxAnterior] = usuarioAnterior;
    } else {
      const idxNovo = USUARIOS.findIndex(u => u === usuarioSalvo);
      if (idxNovo >= 0) USUARIOS.splice(idxNovo, 1);
      nextUserId = nextUserIdAnterior;
      zSetState('state.ui.nextUserId', nextUserId);
    }
    zSetState('state.data.usuarios', USUARIOS);
    salvarLS();
    showToast(zUiText('❌'), zUiText('Não foi possível salvar o usuário no banco. Tente novamente.'));
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.textContent = zUiText(labelOriginalBtn || (emEdicao ? '✓ Salvar alterações' : '✓ Cadastrar usuário'));
    }
  }
}

function abrirTS(fromLogin) {
  document.getElementById('ts-nova').value    = '';
  document.getElementById('ts-confirma').value = '';
  const errEl    = document.getElementById('ts-error');
  const errMsg   = document.getElementById('ts-error-msg');
  if (errEl)  errEl.style.display = 'none';
  if (errMsg) errMsg.textContent  = '';

  const emailField = document.getElementById('ts-email-field');
  const emailInput = document.getElementById('ts-email');
  const subtitulo  = document.getElementById('ts-subtitulo');

  if (fromLogin) {
    emailField.style.display = 'block';
    emailInput.value         = '';
    if (subtitulo) subtitulo.textContent = zUiText('Informe seu e-mail e crie uma nova senha');
  } else {
    emailField.style.display = 'none';
    emailInput.value = usuarioLogado ? usuarioLogado.email : '';
    if (subtitulo) subtitulo.textContent = zUiText(`Alterando senha de: ${usuarioLogado ? usuarioLogado.email : ''}`);
  }
  document.getElementById('m-trocar-senha').classList.add('show');
  setTimeout(() => {
    const first = fromLogin ? emailInput : document.getElementById('ts-nova');
    if (first) first.focus();
  }, 100);
}

function fecharTS() { document.getElementById('m-trocar-senha').classList.remove('show'); }
function handleBackdropTS(e) { if (e.target === document.getElementById('m-trocar-senha')) fecharTS(); }

function toggleSenhaField(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = zUiText('🙈'); }
  else { inp.type = 'password'; btn.textContent = zUiText('👁'); }
}

function salvarNovaSenha() {
  const emailInput = document.getElementById('ts-email');
  const emailField = document.getElementById('ts-email-field');
  const nova       = document.getElementById('ts-nova').value.trim();
  const confirma   = document.getElementById('ts-confirma').value.trim();
  const errEl      = document.getElementById('ts-error');
  const errMsg     = document.getElementById('ts-error-msg');

  const mostrarErro = (msg) => { if (errMsg) errMsg.textContent = zUiText(msg); if (errEl) errEl.style.display = 'flex'; };
  if (errEl) errEl.style.display = 'none';

  let emailAlvo = '';
  if (emailField.style.display !== 'none') {
    emailAlvo = emailInput.value.trim().toLowerCase();
    if (!emailAlvo) { document.getElementById('ts-email').focus(); mostrarErro('Informe o e-mail.'); return; }
    if (!USUARIOS.find(u => u.email.toLowerCase() === emailAlvo)) { mostrarErro('E-mail nÃ£o encontrado no sistema.'); return; }
  } else {
    emailAlvo = usuarioLogado ? usuarioLogado.email.toLowerCase() : '';
  }

  if (!nova) { document.getElementById('ts-nova').focus(); mostrarErro('Informe a nova senha.'); return; }
  if (nova.length < 6) { document.getElementById('ts-nova').focus(); mostrarErro('A senha deve ter pelo menos 6 caracteres.'); return; }
  if (nova !== confirma) { document.getElementById('ts-confirma').focus(); mostrarErro('As senhas nÃ£o coincidem.'); return; }

  dbSalvarSenha(emailAlvo, nova).catch(e => console.error(e));
  salvarLS();
  fecharTS();
  showToast(zUiText('✅'), zUiText('Senha alterada com sucesso!'));

  if (usuarioLogado && usuarioLogado.email.toLowerCase() === emailAlvo) {
    setTimeout(() => {
      showToast(zUiText('â„¹ï¸'), zUiText('Entre novamente com sua nova senha.'));
      fazerLogout();
    }, 1500);
  }
}

const confirmarTrocaSenha = salvarNovaSenha;

function abrirConvite() {
  if (!usuarioPodeGerirEquipe()) {
    showToast(zUiText('🔒'), zUiText('Somente perfis administrativos podem enviar convites.'));
    return;
  }
  ['inv-nome','inv-email','inv-equipe'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const invPerfil = document.getElementById('inv-perfil');
  if (invPerfil) invPerfil.value = '';
  const invUnidade = document.getElementById('inv-unidade');
  if (invUnidade) invUnidade.value = '';
  const invRh = document.getElementById('inv-rh');
  if (invRh) invRh.checked = false;
  const invError = document.getElementById('inv-error');
  if (invError) invError.style.display = 'none';
  const invBtn = document.getElementById('inv-btn');
  if (invBtn) { invBtn.textContent = zUiText('✉️ Enviar convite'); invBtn.disabled = false; }
  toggleInvRH();
  document.getElementById('m-convite').classList.add('show');
  setTimeout(() => { const el = document.getElementById('inv-nome'); if (el) el.focus(); }, 100);
}

function fecharConvite() { document.getElementById('m-convite').classList.remove('show'); }
function handleBackdropConv(e) { if (e.target === document.getElementById('m-convite')) fecharConvite(); }

function toggleInvRH() {
  const p   = document.getElementById('inv-perfil').value;
  const fld = document.getElementById('inv-rh-field');
  const chk = document.getElementById('inv-rh');
  const help = document.getElementById('inv-rh-help');
  if (chk) chk.disabled = false;
  if (fld) {
    fld.style.opacity = '1';
    fld.style.pointerEvents = 'auto';
  }
  if (help) {
    help.textContent = zUiText(
      p === 'Corretor'
        ? 'Se marcado, 0,1% de comissão será destinado ao RH nas vendas desse corretor'
        : 'Essa origem fica registrada mesmo se o colaborador mudar de perfil depois'
    );
  }
}

async function enviarConvite() {
  if (!usuarioPodeGerirEquipe()) {
    showToast(zUiText('🔒'), zUiText('Somente perfis administrativos podem enviar convites.'));
    return;
  }
  const nome          = document.getElementById('inv-nome').value.trim().toUpperCase();
  const email         = document.getElementById('inv-email').value.trim().toLowerCase();
  const perfil        = document.getElementById('inv-perfil').value;
  const equipe        = document.getElementById('inv-equipe').value.trim();
  const unidade       = document.getElementById('inv-unidade').value;
  const rhContratacao = document.getElementById('inv-rh').checked;
  const errEl         = document.getElementById('inv-error');
  const errMsg        = document.getElementById('inv-error-msg');
  const erro = (m) => { if (errMsg) errMsg.textContent = zUiText(m); if (errEl) errEl.style.display = 'flex'; };
  if (errEl) errEl.style.display = 'none';

  if (!nome)                      { document.getElementById('inv-nome').focus();  erro('Informe o nome.'); return; }
  if (!email || !email.includes('@')) { document.getElementById('inv-email').focus(); erro('Informe um e-mail vÃ¡lido.'); return; }
  if (EXCLUSOES_PENDENTES[email]) { erro('A exclusão deste usuário ainda está em processamento. Aguarde concluir para reenviar o convite.'); return; }
  if (!perfil)                    { erro('Selecione o perfil de acesso.'); return; }
  if (!unidade)                   { erro('Selecione a unidade.'); return; }
  if (USUARIOS.find(u => u.email.toLowerCase() === email)) { erro('Este e-mail jÃ¡ estÃ¡ cadastrado.'); return; }

  const btn  = document.getElementById('inv-btn');
  const link = gerarLinkConvite(nome, email, perfil, equipe, rhContratacao, unidade);
  const diretor = usuarioLogado ? usuarioLogado.nome : 'Diretor Zelony';
  btn.textContent = zUiText('Enviando...'); btn.disabled = true;

  if (!window.emailjs || typeof emailjs.init !== 'function' || typeof emailjs.send !== 'function') {
    btn.textContent = zUiText('✉️ Enviar convite');
    btn.disabled = false;
    erro('O serviço de e-mail não carregou nesta página. Recarregue o sistema e tente novamente.');
    return;
  }

  try {
    emailjs.init(EJS_PUBKEY);
    await emailjs.send(EJS_SERVICE, EJS_TEMPLATE, montarPayloadEmailConvite({
      nome, email, perfil, equipe, rhContratacao, unidade, link, diretor
    }));

    const novoU = {
      id: nextUserId, nome, email, tel: '', perfil, status: 'Pendente',
      banco:'', agencia:'', conta:'', tipoConta:'', pixTipo:'', pix:'',
      rhContratacao, equipe, unidade, cpf:'', nasc:'', cep:'', end:'', cidade:'', estado:'',
      dataAtivacao:'', dataInativacao:'', historicoStatus:[]
    };
    try {
      await dbSalvarUsuario(novoU, null);
    } catch (e) {
      console.error('Erro ao salvar convite:', e);
      btn.textContent = zUiText('✉️ Enviar convite');
      btn.disabled = false;
      erro('O e-mail foi enviado, mas o convite não foi salvo no banco. Tente novamente após alguns instantes.');
      return;
    }
    nextUserId = Math.max(nextUserId + 1, (novoU.id || 0) + 1);
    USUARIOS.push(novoU);
    zSetState('state.ui.nextUserId', nextUserId);
    zSetState('state.data.usuarios', USUARIOS);
    salvarLS();
    fecharConvite(); renderUsuarios();
    showToast(zUiText('✅'), zUiText(`Convite enviado para ${nome}!`));
  } catch (err) {
    console.error('EmailJS:', err);
    await copiarTexto(link, 'Link do convite').catch(()=>false);
    erro('Erro ao enviar e-mail. O link do convite foi copiado para envio manual enquanto o EmailJS é verificado.');
  } finally {
    btn.textContent = zUiText('✉️ Enviar convite');
    btn.disabled = false;
  }
}

function verificarConviteURL() {
  const conv = lerConviteURL();
  if (!conv || !conv.email || !conv.perfil) return;
  conviteAtivo = conv;
  zSetState('state.ui.conviteAtivo', conviteAtivo);
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('convite-screen').classList.add('show');
  document.getElementById('conv-nome-bv').textContent = zUiText(`OlÃ¡, ${conv.nome.split(' ')[0]}!`);
  document.getElementById('conv-cargo-bv').textContent = zUiText(conv.perfil);
  document.getElementById('cv-nome').value = zUiText(conv.nome);
  document.getElementById('convite-screen').scrollTo(0, 0);
}

function selPixCV(tipo, el) {
  pixSelCV = tipo;
  zSetState('state.ui.pixSelCV', pixSelCV);
  document.querySelectorAll('#cv-pix-types .pix-type').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  const phs = { CPF:'000.000.000-00', CNPJ:'00.000.000/0001-00', 'E-mail':'email@exemplo.com', Telefone:'(41) 99999-9999', 'AleatÃ³ria':'Codigo gerado pelo banco', 'Aleatória':'Código gerado pelo banco', 'Aleatoria':'Codigo gerado pelo banco' };
  const pix = document.getElementById('cv-pix');
  if (pix) pix.placeholder = zUiText(phs[tipo] || '');
}

async function buscarCEP(cep) {
  const c = cep.replace(/\D/g,'');
  if (c.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const d = await r.json();
    if (!d.erro) {
      document.getElementById('cv-end').value    = `${d.logradouro}, ${d.bairro}`;
      document.getElementById('cv-cidade').value = d.localidade;
      document.getElementById('cv-estado').value = d.uf;
    }
  } catch (e) {}
}

function concluirCadastro() {
  if (!conviteAtivo) return;
  const errEl  = document.getElementById('conv-error');
  errEl.style.display = 'none';
  const erro = (m) => { errEl.textContent = zUiText(m); errEl.style.display = 'block'; errEl.scrollIntoView({ behavior:'smooth', block:'nearest' }); };
  const g = id => document.getElementById(id).value.trim();

  const nome      = g('cv-nome').toUpperCase();
  const tel       = g('cv-tel');
  const nasc      = g('cv-nasc');
  const cpf       = g('cv-cpf');
  const end       = g('cv-end');
  const cidade    = g('cv-cidade');
  const estado    = g('cv-estado');
  const banco     = g('cv-banco');
  const agencia   = g('cv-agencia');
  const conta     = g('cv-conta');
  const tipoConta = document.getElementById('cv-tipo-conta').value;
  const pix       = g('cv-pix');
  const senha     = document.getElementById('cv-senha').value;
  const confirma  = document.getElementById('cv-confirma').value;
  const cep       = g('cv-cep');

  if (!nome)     { erro('Informe seu nome completo.'); return; }
  if (!tel)      { erro('Informe seu telefone.'); return; }
  if (!nasc)     { erro('Informe sua data de nascimento.'); return; }
  if (!cpf)      { erro('Informe seu CPF.'); return; }
  if (!end)      { erro('Informe seu endereÃ§o.'); return; }
  if (!cidade)   { erro('Informe sua cidade.'); return; }
  if (!banco)    { erro('Informe seu banco.'); return; }
  if (!conta)    { erro('Informe sua conta bancÃ¡ria.'); return; }
  if (!tipoConta){ erro('Selecione o tipo de conta.'); return; }
  if (!pixSelCV) { erro('Selecione o tipo de chave Pix.'); return; }
  if (!pix)      { erro('Informe sua chave Pix.'); return; }
  if (!senha || senha.length < 6) { erro('A senha deve ter pelo menos 6 caracteres.'); return; }
  if (senha !== confirma)         { erro('As senhas nÃ£o coincidem.'); return; }

  const dados = { nome, tel, status:'Ativo', banco, agencia, conta, tipoConta, pixTipo:pixSelCV, pix, cpf, nasc, cep, end, cidade, estado, token:null, unidade:conviteAtivo.unidade||'' };
  const idx   = USUARIOS.findIndex(u => u.email.toLowerCase() === conviteAtivo.email.toLowerCase());
  if (idx >= 0) {
    const statusAnterior = USUARIOS[idx].status;
    USUARIOS[idx] = { ...USUARIOS[idx], ...dados };
    usuarioAplicarMudancaStatus(USUARIOS[idx], statusAnterior, USUARIOS[idx].status, {
      por: 'Onboarding',
      origem: 'convite'
    });
    dbSalvarUsuario(USUARIOS[idx], USUARIOS[idx].id).catch(e => console.error(e));
  } else {
    const novoU = {
      id: nextUserId++,
      email: conviteAtivo.email,
      perfil: conviteAtivo.perfil,
      rhContratacao: conviteAtivo.rhContratacao,
      dataAtivacao: '',
      dataInativacao: '',
      historicoStatus: [],
      ...dados
    };
    usuarioAplicarMudancaStatus(novoU, '', novoU.status, {
      por: 'Onboarding',
      origem: 'convite'
    });
    USUARIOS.push(novoU);
    zSetState('state.ui.nextUserId', nextUserId);
    dbSalvarUsuario(novoU, null).catch(e => console.error(e));
  }
  zSetState('state.data.usuarios', USUARIOS);
  dbSalvarSenha(conviteAtivo.email.toLowerCase(), senha).catch(e => console.error(e));
  salvarLS();
  document.getElementById('conv-form').style.display    = 'none';
  document.getElementById('conv-success').style.display = 'block';
}

function irParaLogin() {
  document.getElementById('convite-screen').classList.remove('show');
  const ls = document.getElementById('login-screen');
  ls.style.display = 'flex'; ls.classList.remove('hidden');
  if (conviteAtivo) document.getElementById('lg-email').value = conviteAtivo.email;
  conviteAtivo = null;
  zSetState('state.ui.conviteAtivo', conviteAtivo);
  window.history.replaceState({}, '', window.location.pathname);
}

zRegisterModule('usuarios', {
  renderUsuarios,
  filtrarUsuarios,
  renderMeuCadastroUsuario,
  abrirModalUser,
  abrirMeuCadastroUsuario,
  editarUsuario,
  alternarStatusUsuario,
  excluirUsuario,
  salvarUsuario,
  abrirTS,
  salvarNovaSenha,
  abrirConvite,
  fecharConvite,
  enviarConvite,
  verificarConviteURL,
  concluirCadastro,
  irParaLogin
});
