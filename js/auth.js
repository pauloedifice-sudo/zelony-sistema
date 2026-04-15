// AUTH
// Login, sessao, permissoes, troca de role e navegacao entre modulos

let role = 'cor';
let usuarioLogado = null;
const SENHAS_INDIVIDUAIS = { ...SENHAS_PADRAO_MAP };
const SENHA_PADRAO = 'Mudar@123';
zSetState('state.auth.role', role);
zSetState('state.auth.usuarioLogado', usuarioLogado);
zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
zSetState('config.senhaPadrao', SENHA_PADRAO);

const RD = {
  dono: { av:'DO',  nome:'Dono',       role:'Dono'           },
  fin:  { av:'FI',  nome:'Financeiro', role:'Master / Admin' },
  cor:  { av:'COR', nome:'Corretor',   role:'Corretor'       },
  cap:  { av:'CAP', nome:'Capitao',    role:'Capitao'        },
  ger:  { av:'GER', nome:'Gerente',    role:'Gerente'        },
  dir:  { av:'PE',  nome:'Paulo',      role:'Diretor'        },
  rh:   { av:'GI',  nome:'Giovana',    role:'RH'             }
};

function getPerfil(p) {
  if (!p) return 'cor';
  const bruto = zUiText(String(p)).trim();
  const normalizado = bruto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const MAP = {
    dono:'dono',
    corretor:'cor',
    capitao:'cap',
    gerente:'ger',
    diretor:'dir',
    financeiro:'fin',
    rh:'rh'
  };
  return MAP[normalizado] || 'cor';
}

// LOGIN
function fazerLogin() {
  const email = document.getElementById('lg-email').value.trim().toLowerCase();
  const senha = document.getElementById('lg-senha').value;
  const btn   = document.getElementById('lg-btn');
  const errEl = document.getElementById('lg-error');
  errEl.classList.remove('show');

  if (!email || !senha) {
    document.getElementById('lg-error-msg').textContent = zUiText('Preencha e-mail e senha.');
    errEl.classList.add('show'); return;
  }

  btn.classList.add('loading'); btn.textContent = zUiText('Verificando...');

  setTimeout(() => {
    const usuario = USUARIOS.find(u => u.email.toLowerCase() === email);
    const resetBtn = () => { btn.classList.remove('loading'); btn.textContent = zUiText('Entrar no sistema'); };
    const showErr = (msg) => { document.getElementById('lg-error-msg').textContent = zUiText(msg); errEl.classList.add('show'); resetBtn(); };

    if (!usuario) return showErr('E-mail nao cadastrado no sistema.');

    const st = (usuario.status || '').toUpperCase();
    if (st === 'PENDENTE') return showErr('Cadastro pendente. Verifique o e-mail de convite para completar.');
    if (st === 'INATIVO')  return showErr('Conta inativa. Entre em contato com o administrador.');

    const senhaEsperada = SENHAS_INDIVIDUAIS[email] || SENHA_PADRAO;
    if (senha !== senhaEsperada) {
      document.getElementById('lg-senha').value = '';
      document.getElementById('lg-senha').focus();
      return showErr('Senha incorreta. Tente novamente.');
    }

    usuarioLogado = usuario;
    const rv = getPerfil(usuario.perfil);
    localStorage.setItem('zel_sessao', email);
    RD[rv] = {
      av: ini(usuario.nome),
      nome: usuario.nome.split(' ')[0],
      role: usuario.perfil + (usuario.unidade && usuario.unidade !== 'Ambas' ? ' · ' + usuario.unidade : '')
    };
    role = rv;
    zSetState('state.auth.role', role);
    zSetState('state.auth.usuarioLogado', usuarioLogado);
    atualizarTopbar(usuario, rv);
    document.getElementById('login-screen').classList.add('hidden');
    renderFiltros(); renderVList(); renderTrein(); renderProc(); atualizarBadgeNotificacoes();
    if (typeof iniciarMonitorTratativaAgendamento === 'function') iniciarMonitorTratativaAgendamento();
    resetBtn();
    showToast(zUiText('👋'), zUiText(`Bem-vindo(a), ${usuario.nome.split(' ')[0]}!`));
  }, 800);
}

function fazerLogout() {
  usuarioLogado = null;
  role = 'cor';
  curVId = null;
  zSetState('state.auth.role', role);
  zSetState('state.ui.curVId', curVId);
  zSetState('state.auth.usuarioLogado', usuarioLogado);
  localStorage.removeItem('zel_sessao');
  atualizarBadgeNotificacoes();
  if (typeof encerrarMonitorTratativaAgendamento === 'function') encerrarMonitorTratativaAgendamento();
  if (typeof limparDetalheVenda === 'function') limparDetalheVenda();
  const ls = document.getElementById('login-screen');
  ls.style.display = 'flex'; ls.classList.remove('hidden');
  document.getElementById('lg-email').value = '';
  document.getElementById('lg-senha').value = '';
  document.getElementById('lg-error').classList.remove('show');
  setTimeout(() => document.getElementById('lg-email').focus(), 100);
}

function restaurarSessao() {
  const emailSalvo = localStorage.getItem('zel_sessao');
  if (!emailSalvo) return false;
  const usuario = USUARIOS.find(u => u.email.toLowerCase() === emailSalvo.toLowerCase());
  if (!usuario || (usuario.status || '').toUpperCase() === 'PENDENTE') return false;
  usuarioLogado = usuario;
  const rv = getPerfil(usuario.perfil);
  RD[rv] = {
    av: ini(usuario.nome),
    nome: usuario.nome.split(' ')[0],
    role: usuario.perfil + (usuario.unidade && usuario.unidade !== 'Ambas' ? ' · ' + usuario.unidade : '')
  };
  role = rv;
  zSetState('state.auth.role', role);
  zSetState('state.auth.usuarioLogado', usuarioLogado);
  atualizarTopbar(usuario, rv);
  document.getElementById('login-screen').classList.add('hidden');
  atualizarBadgeNotificacoes();
  if (typeof iniciarMonitorTratativaAgendamento === 'function') iniciarMonitorTratativaAgendamento();
  return true;
}

function toggleSenha() {
  const inp = document.getElementById('lg-senha');
  const btn = document.getElementById('lg-toggle');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = zUiText('🙈'); }
  else { inp.type = 'password'; btn.textContent = zUiText('👁'); }
}

// TOPBAR
function atualizarTopbar(usuario, rv) {
  const nome = usuario.nome.split(' ')[0];
  const perfil = usuario.perfil + (usuario.unidade && usuario.unidade !== 'Ambas' ? ' · ' + usuario.unidade : '');
  document.getElementById('tb-user-avatar').textContent       = ini(usuario.nome);
  document.getElementById('tb-user-nome').textContent         = zUiText(nome);
  document.getElementById('tb-user-perfil-badge').textContent = zUiText(perfil);
  const sel = document.getElementById('role-sel');
  sel.style.display = rv === 'dono' ? 'block' : 'none';
  if (rv === 'dono') sel.value = rv;
  const sbFin = document.getElementById('sb-financeiro');
  if (sbFin) sbFin.style.display = ['dono','fin','dir'].includes(rv) ? 'flex' : 'none';
  document.getElementById('sb-av').textContent    = ini(usuario.nome);
  document.getElementById('sb-uname').textContent = zUiText(nome);
  document.getElementById('sb-urole').textContent = zUiText(perfil);
}

function trocaRole() {
  role = document.getElementById('role-sel').value;
  zSetState('state.auth.role', role);
  const d = RD[role];
  document.getElementById('sb-av').textContent    = d.av;
  document.getElementById('sb-uname').textContent = zUiText(d.nome);
  document.getElementById('sb-urole').textContent = zUiText(d.role);
  if (!document.getElementById('mod-carteira').classList.contains('hidden')) renderCarteira();
  renderFiltros(); renderVList();
  if (curVId) showVDetail(curVId);
  if (vtab === 'rel') renderRel();
  if (!document.getElementById('mod-trein').classList.contains('hidden')) renderTrein();
  if (!document.getElementById('mod-documentos').classList.contains('hidden')) renderDocumentos();
  if (!document.getElementById('mod-agendamentos').classList.contains('hidden')) renderAgendamentos();
  if (!document.getElementById('mod-usuarios').classList.contains('hidden')) renderUsuarios();
  atualizarBadgeNotificacoes();
  if (!document.getElementById('npanel').classList.contains('hidden')) renderNots();
  renderBtnNovaVenda();
}

// NAVEGACAO
const modTitles = {
  carteira:'Minha Carteira', vendas:'Vendas e Comissão',
  agendamentos:'Agendamentos', trein:'Treinamentos', documentos:'Documentos', proc:'Processos Operacionais',
  usuarios:'Usuários', financeiro:'Financeiro'
};

function setMod(m, el) {
  ['carteira','vendas','agendamentos','trein','documentos','proc','usuarios','financeiro']
    .forEach(x => document.getElementById('mod-' + x).classList.add('hidden'));
  document.getElementById('mod-' + m).classList.remove('hidden');
  document.querySelectorAll('.sb-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pg-title').textContent = zUiText(modTitles[m]);
  if (m === 'carteira')   renderCarteira();
  if (m === 'trein')      renderTrein();
  if (m === 'agendamentos') renderAgendamentos();
  if (m === 'documentos') renderDocumentos();
  if (m === 'proc')       renderProc();
  if (m === 'vendas' && vtab === 'rel') renderRel();
  if (m === 'usuarios')   renderUsuarios();
  if (m === 'financeiro') renderFinanceiro();
}

// BIND DE EVENTOS DO LOGIN
(function bindLogin() {
  function bind() {
    const btnLogin  = document.getElementById('lg-btn');
    const btnToggle = document.getElementById('lg-toggle');
    const emailInp  = document.getElementById('lg-email');
    const senhaInp  = document.getElementById('lg-senha');
    if (!btnLogin) { setTimeout(bind, 100); return; }
    btnLogin.addEventListener('click',  fazerLogin);
    btnToggle.addEventListener('click', toggleSenha);
    emailInp.addEventListener('keydown', e => { if (e.key === 'Enter') senhaInp.focus(); });
    senhaInp.addEventListener('keydown', e => { if (e.key === 'Enter') fazerLogin(); });
    const btnTS = document.getElementById('lg-trocar-senha');
    if (btnTS) btnTS.addEventListener('click', () => abrirTS(true));
    emailInp.focus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

zRegisterModule('auth', {
  fazerLogin,
  fazerLogout,
  restaurarSessao,
  toggleSenha,
  atualizarTopbar,
  trocaRole,
  getPerfil,
  RD
});

