// USUARIOS
// Gestao de usuarios, convites, onboarding e troca de senha

let USUARIOS = [...USUARIOS_PADRAO];
let editUserIdx = -1;
let pixSel = '';
let nextUserId = 3;
const PERFIL_TAG  = { Dono:'tag-dono', Corretor:'tag-cor', Capitao:'tag-cap', Capitão:'tag-cap', Gerente:'tag-ger', Diretor:'tag-dir', Financeiro:'tag-fin', RH:'tag-rh' };
const PERFIL_ICON = { Dono:'👑', Corretor:'👤', Capitao:'⭐', Capitão:'⭐', Gerente:'🏆', Diretor:'💼', Financeiro:'💰', RH:'🤝' };
let uBusca = '', uFiltroUnidade = '', uFiltroEquipe = '', uFiltroPerfil = '';
function iniUser(n) { return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
zSetState('state.data.usuarios', USUARIOS);
zSetState('state.ui.editUserIdx', editUserIdx);
zSetState('state.ui.pixSel', pixSel);
zSetState('state.ui.nextUserId', nextUserId);
zSetState('state.ui.uBusca', uBusca);
zSetState('state.ui.uFiltroUnidade', uFiltroUnidade);
zSetState('state.ui.uFiltroEquipe', uFiltroEquipe);
zSetState('state.ui.uFiltroPerfil', uFiltroPerfil);

const EJS_SERVICE  = 'service_wirqv1v';
const EJS_TEMPLATE = 'template_ylfp3ad';
const EJS_PUBKEY   = 'GEXIho24PuM7N3RTZ';
const CONVITES_PENDENTES = {};
const EXCLUSOES_PENDENTES = {};
let conviteAtivo = null;
let pixSelCV = '';
zSetState('state.ui.convitesPendentes', CONVITES_PENDENTES);
zSetState('state.ui.exclusoesPendentesUsuarios', EXCLUSOES_PENDENTES);
zSetState('state.ui.conviteAtivo', conviteAtivo);
zSetState('state.ui.pixSelCV', pixSelCV);

function gerarToken() {
  return 'ZEL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function gerarLinkConvite(nome, email, perfil, equipe, rhContratacao, unidade) {
  const dados = { nome, email, perfil, equipe, rhContratacao, unidade, ts: Date.now() };
  const b64   = btoa(unescape(encodeURIComponent(JSON.stringify(dados))));
  const base  = window.location.origin + window.location.pathname;
  return base + '?c=' + b64;
}

function lerConviteURL() {
  const params = new URLSearchParams(window.location.search);
  const c = params.get('c');
  if (!c) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(c)))); }
  catch (e) { return null; }
}

function _buildUserCard(u, idx) {
  const avatarColor = u.perfil==='Dono'?'#1A1A1A':u.perfil==='Diretor'?'var(--gold)':u.perfil==='Gerente'?'#2E7E5E':u.perfil==='CapitÃƒÂ£o'?'#6040A8':u.perfil==='Financeiro'?'#C05030':u.perfil==='RH'?'#1A56C4':'#3060B8';
  const unidBadge  = u.unidade ? `<span class="badge-unid ${u.unidade==='Centro'?'badge-centro':u.unidade==='Cristo Rei'?'badge-cristo':'badge-ambas'}" style="margin-top:4px;display:inline-flex;">${zUiText('📍')} ${zUiText(u.unidade)}</span>` : '';
  const equipeBadge = u.equipe ? `<span style="font-size:9px;background:var(--bg3);color:var(--ts);border:1px solid var(--bd);border-radius:3px;padding:1px 6px;margin-top:3px;display:inline-block;">${zUiText('👥')} ${zUiText(u.equipe)}</span>` : '';
  return `<div class="user-card">
    <div class="user-card-top">
      <div class="user-av" style="background:${avatarColor};">${iniUser(u.nome)}</div>
      <div style="flex:1;min-width:0;">
        <div class="user-name">${zUiText(u.nome)}</div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span class="user-role-tag ${PERFIL_TAG[u.perfil]||'tag-cor'}">${zUiText(PERFIL_ICON[u.perfil]||'👤')} ${zUiText(u.perfil)}</span>
          ${unidBadge}${equipeBadge}
        </div>
      </div>
    </div>
    <div class="user-card-body">
      <div class="user-info-row"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="12" height="9" rx="1"/><path d="M2 5l6 5 6-5"/></svg><span>${zUiText(u.email)}</span></div>
      <div class="user-info-row"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3a1 1 0 011-1h2l1 3-1.5 1a8 8 0 004.5 4.5L11 9l3 1v2a1 1 0 01-1 1A12 12 0 013 3z"/></svg><span>${zUiText(u.tel||'—')}</span></div>
      <div class="user-info-row"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="14" height="10" rx="1.5"/><path d="M9 9a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" stroke="none"/><path d="M4 4V3a2 2 0 014 0v1"/></svg><span>${u.banco?`${zUiText(u.banco)} ${zUiText('·')} ${zUiText(u.tipoConta||'')}`:zUiText('—')}</span></div>
      <div class="user-info-row"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v12M5 5h4.5a2.5 2.5 0 010 5H5m0-5V2m0 8v4"/></svg><span>${u.pixTipo?`${zUiText('Pix')} ${zUiText(u.pixTipo)}: ${zUiText(u.pix)}`:zUiText('—')}</span></div>
    </div>
    <div class="user-card-foot">
      <div class="user-status">
        <div class="user-status-dot ${u.status==='Ativo'?'':'inativo'}"></div>
        <span style="color:${u.status==='Ativo'?'#2E9E6E':u.status==='Pendente'?'#C08020':'#C05030'}">${zUiText(u.status)}</span>
      </div>
      <div class="user-actions">
        <button class="btn-user-edit" onclick="editarUsuario(${idx})">${zUiText('✏️ Editar')}</button>
        <button class="btn-user-del"  onclick="excluirUsuario(${idx})">${zUiText('🗑 Excluir')}</button>
      </div>
    </div>
  </div>`;
}

function renderUsuarios() {
  const isAdmin = ['dir','dono','fin','rh'].includes(role);
  const cont = document.getElementById('usuarios-content');
  if (!isAdmin) {
    cont.innerHTML = `<div class="usuarios-locked"><div class="locked-icon">${zUiText('🔒')}</div><div class="locked-title">${zUiText('Acesso restrito')}</div><div class="locked-sub">${zUiText('Apenas o')} <strong>${zUiText('Diretor')}</strong> ${zUiText('tem acesso ao módulo de usuários para proteger os dados pessoais e bancários da equipe.')}</div></div>`;
    return;
  }
  const equipes = [...new Set(USUARIOS.map(u => u.equipe||'').filter(Boolean))].sort();
  const lista   = _filtrarUsuarios();
  const total   = USUARIOS.length;
  const ativos  = USUARIOS.filter(u => u.status === 'Ativo').length;
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
        <option value="Dono"       ${uFiltroPerfil==='Dono'?'selected':''}>${zUiText('👑 Dono')}</option>
        <option value="Diretor"    ${uFiltroPerfil==='Diretor'?'selected':''}>${zUiText('💼 Diretor')}</option>
        <option value="Gerente"    ${uFiltroPerfil==='Gerente'?'selected':''}>${zUiText('🏆 Gerente')}</option>
        <option value="CapitÃƒÂ£o"    ${uFiltroPerfil==='CapitÃƒÂ£o'?'selected':''}>${zUiText('⭐ Capitão')}</option>
        <option value="Corretor"   ${uFiltroPerfil==='Corretor'?'selected':''}>${zUiText('👤 Corretor')}</option>
        <option value="Financeiro" ${uFiltroPerfil==='Financeiro'?'selected':''}>${zUiText('💰 Financeiro')}</option>
        <option value="RH"         ${uFiltroPerfil==='RH'?'selected':''}>${zUiText('🤝 RH')}</option>
      </select>
      <select class="u-filter-sel" onchange="uFiltroUnidade=this.value;renderUsuarios()">
        <option value="">${zUiText('Todas as unidades')}</option>
        <option value="Centro"    ${uFiltroUnidade==='Centro'?'selected':''}>${zUiText('🟠 Centro')}</option>
        <option value="Cristo Rei"${uFiltroUnidade==='Cristo Rei'?'selected':''}>${zUiText('🟢 Cristo Rei')}</option>
      </select>
      ${equipes.length ? `<select class="u-filter-sel" onchange="uFiltroEquipe=this.value;renderUsuarios()">
        <option value="">${zUiText('Todas as equipes')}</option>
        ${equipes.map(e=>`<option value="${e}" ${uFiltroEquipe===e?'selected':''}>${zUiText(e)}</option>`).join('')}
      </select>` : ''}
      <span class="u-count">${lista.length} ${zUiText('de')} ${total} ${zUiText(`usuÃ¡rio${total!==1?'s':''}`)}</span>
      ${(uBusca||uFiltroUnidade||uFiltroEquipe||uFiltroPerfil) ?
        `<button onclick="uBusca='';uFiltroUnidade='';uFiltroEquipe='';uFiltroPerfil='';renderUsuarios();"
          style="font-size:10px;background:none;border:1px solid var(--bd);border-radius:5px;padding:4px 8px;cursor:pointer;color:var(--tm);font-family:'Inter',sans-serif;">${zUiText('✕ Limpar')}</button>` : ''}
    </div>
    <div class="usuarios-stats">
      <div class="mc a"><div class="mc-l">${zUiText('Total cadastrados')}</div><div class="mc-v" style="color:var(--gold);">${total}</div></div>
      <div class="mc" style="border-top-color:#2E9E6E;"><div class="mc-l">${zUiText('Ativos')}</div><div class="mc-v" style="color:#2E9E6E;">${ativos}</div></div>
      <div class="mc" style="border-top-color:#C06030;"><div class="mc-l">${zUiText('Inativos')}</div><div class="mc-v" style="color:#C06030;">${total-ativos}</div></div>
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
    return (!q || (u.nome||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.equipe||'').toLowerCase().includes(q))
      && (!uFiltroUnidade || u.unidade===uFiltroUnidade || u.unidade==='Ambas')
      && (!uFiltroEquipe  || (u.equipe||'')===uFiltroEquipe)
      && (!uFiltroPerfil  || u.perfil===uFiltroPerfil);
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
  field.style.display = perfil === 'Corretor' ? 'block' : 'none';
  if (perfil !== 'Corretor') document.getElementById('mu-rh').checked = false;
}

function abrirModalUser() {
  editUserIdx = -1; pixSel = '';
  zSetState('state.ui.editUserIdx', editUserIdx);
  zSetState('state.ui.pixSel', pixSel);
  document.getElementById('mu-title').textContent    = zUiText('Novo UsuÃ¡rio');
  document.getElementById('mu-save-btn').textContent = zUiText('✓ Cadastrar usuário');
  ['mu-nome','mu-email','mu-tel','mu-banco','mu-agencia','mu-conta','mu-pix'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('mu-perfil').value    = '';
  document.getElementById('mu-status').value    = 'Ativo';
  document.getElementById('mu-tipo-conta').value = '';
  document.getElementById('mu-rh').checked      = false;
  document.getElementById('rh-field').style.display = 'none';
  document.getElementById('mu-unidade').value   = '';
  document.getElementById('mu-equipe').value    = '';
  document.querySelectorAll('.pix-type').forEach(b => b.classList.remove('sel'));
  document.getElementById('muser').classList.add('show');
  setTimeout(() => document.getElementById('mu-nome').focus(), 100);
}

function editarUsuario(idx) {
  const u = USUARIOS[idx]; editUserIdx = idx;
  zSetState('state.ui.editUserIdx', editUserIdx);
  document.getElementById('mu-title').textContent    = zUiText('Editar UsuÃ¡rio');
  document.getElementById('mu-save-btn').textContent = zUiText('✓ Salvar alterações');
  document.getElementById('mu-nome').value       = u.nome;
  document.getElementById('mu-email').value      = u.email;
  document.getElementById('mu-tel').value        = u.tel||'';
  document.getElementById('mu-perfil').value     = u.perfil;
  document.getElementById('mu-status').value     = u.status;
  document.getElementById('mu-banco').value      = u.banco||'';
  document.getElementById('mu-agencia').value    = u.agencia||'';
  document.getElementById('mu-conta').value      = u.conta||'';
  document.getElementById('mu-tipo-conta').value = u.tipoConta||'';
  document.getElementById('mu-rh').checked       = u.rhContratacao||false;
  document.getElementById('rh-field').style.display = u.perfil === 'Corretor' ? 'block' : 'none';
  document.getElementById('mu-unidade').value    = u.unidade||'';
  document.getElementById('mu-equipe').value     = u.equipe||'';
  pixSel = u.pixTipo||'';
  document.getElementById('mu-pix').value = u.pix||'';
  document.querySelectorAll('.pix-type').forEach(b => {
    b.classList.toggle('sel', zUiText(b.textContent.trim()) === zUiText(pixSel));
  });
  document.getElementById('muser').classList.add('show');
}

async function excluirUsuario(idx) {
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

function fecharMU() { document.getElementById('muser').classList.remove('show'); editUserIdx = -1; pixSel = ''; zSetState('state.ui.editUserIdx', editUserIdx); zSetState('state.ui.pixSel', pixSel); }
function handleBackdropU(e) { if (e.target === document.getElementById('muser')) fecharMU(); }

function salvarUsuario() {
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

  if (!nome)                 { document.getElementById('mu-nome').focus();  showToast(zUiText('⚠️'),zUiText('Informe o nome completo.')); return; }
  if (!email||!email.includes('@')) { document.getElementById('mu-email').focus(); showToast(zUiText('⚠️'),zUiText('Informe um e-mail válido.')); return; }
  if (!tel)                  { document.getElementById('mu-tel').focus();   showToast(zUiText('⚠️'),zUiText('Informe o telefone.')); return; }
  if (!perfil)               { showToast(zUiText('⚠️'),zUiText('Selecione o perfil de acesso.')); return; }
  if (!unidade)              { showToast(zUiText('⚠️'),zUiText('Selecione a unidade.')); return; }
  if (!banco)                { document.getElementById('mu-banco').focus(); showToast(zUiText('⚠️'),zUiText('Informe o banco.')); return; }
  if (!conta)                { document.getElementById('mu-conta').focus(); showToast(zUiText('⚠️'),zUiText('Informe a conta bancária.')); return; }
  if (!tipoConta)            { showToast(zUiText('⚠️'),zUiText('Selecione o tipo de conta.')); return; }
  if (!pixSel)               { showToast(zUiText('⚠️'),zUiText('Selecione o tipo de chave Pix.')); return; }
  if (!pix)                  { document.getElementById('mu-pix').focus();   showToast(zUiText('⚠️'),zUiText('Informe a chave Pix.')); return; }

  const dados = { nome, email, tel, perfil, status, banco, agencia, conta, tipoConta, pixTipo:pixSel, pix, rhContratacao:rhContr, unidade, equipe };
  if (editUserIdx >= 0) {
    const uid = USUARIOS[editUserIdx].id;
    USUARIOS[editUserIdx] = { ...USUARIOS[editUserIdx], ...dados };
    showToast(zUiText('✅'), zUiText(`Usuário "${nome}" atualizado!`));
    dbSalvarUsuario(USUARIOS[editUserIdx], uid).catch(e => console.error(e));
  } else {
    const novoU = { id: nextUserId++, ...dados };
    USUARIOS.push(novoU);
    zSetState('state.ui.nextUserId', nextUserId);
    showToast(zUiText('✅'), zUiText(`Usuário "${nome}" cadastrado!`));
    dbSalvarUsuario(novoU, null).catch(e => console.error(e));
  }
  zSetState('state.data.usuarios', USUARIOS);
  salvarLS(); fecharMU(); renderUsuarios();
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
  const invRhField = document.getElementById('inv-rh-field');
  if (invRhField) invRhField.style.display = 'none';
  const invError = document.getElementById('inv-error');
  if (invError) invError.style.display = 'none';
  const invBtn = document.getElementById('inv-btn');
  if (invBtn) { invBtn.textContent = zUiText('✉️ Enviar convite'); invBtn.disabled = false; }
  document.getElementById('m-convite').classList.add('show');
  setTimeout(() => { const el = document.getElementById('inv-nome'); if (el) el.focus(); }, 100);
}

function fecharConvite() { document.getElementById('m-convite').classList.remove('show'); }
function handleBackdropConv(e) { if (e.target === document.getElementById('m-convite')) fecharConvite(); }

function toggleInvRH() {
  const p   = document.getElementById('inv-perfil').value;
  const fld = document.getElementById('inv-rh-field');
  if (fld) fld.style.display = p === 'Corretor' ? 'block' : 'none';
}

function enviarConvite() {
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
  btn.textContent = zUiText('Enviando...'); btn.disabled = true;

  emailjs.init(EJS_PUBKEY);
  emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
    nome,
    email_para: email,
    cargo:      perfil,
    diretor:    usuarioLogado ? usuarioLogado.nome : 'Diretor Zelony',
    link
  }).then(async () => {
    const novoU = {
      id: nextUserId, nome, email, tel: '', perfil, status: 'Pendente',
      banco:'', agencia:'', conta:'', tipoConta:'', pixTipo:'', pix:'',
      rhContratacao, equipe, unidade, cpf:'', nasc:'', cep:'', end:'', cidade:'', estado:''
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
  }).catch(err => {
    console.error('EmailJS:', err);
    btn.textContent = zUiText('✉️ Enviar convite'); btn.disabled = false;
    erro('Erro ao enviar e-mail. Verifique a configuraÃ§Ã£o do EmailJS.');
  });
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
    USUARIOS[idx] = { ...USUARIOS[idx], ...dados };
    dbSalvarUsuario(USUARIOS[idx], USUARIOS[idx].id).catch(e => console.error(e));
  } else {
    const novoU = { id: nextUserId++, email: conviteAtivo.email, perfil: conviteAtivo.perfil, rhContratacao: conviteAtivo.rhContratacao, ...dados };
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
  abrirModalUser,
  editarUsuario,
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
