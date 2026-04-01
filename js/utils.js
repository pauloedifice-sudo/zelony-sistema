// UTILS
// Funcoes utilitarias partilhadas por todos os modulos

window.notifs = window.notifs || [];

function zUiText(texto) {
  if (typeof texto !== 'string') return texto;

  let normalizado = texto;
  for (let i = 0; i < 3; i++) {
    try {
      const convertido = decodeURIComponent(escape(normalizado));
      if (!convertido || convertido === normalizado) break;
      normalizado = convertido;
    } catch (e) {
      break;
    }
  }

  const pares = [
    ['Ass. formulÃ¡rios', 'Ass. formulários'],
    ['Ass. formulÃƒÂ¡rios', 'Ass. formulários'],
    ['Ass. formulÃƒÆ’Ã‚Â¡rios', 'Ass. formulários'],
    ['Ass. formulÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rios', 'Ass. formulários'],
    ['ComissÃ£o recebida', 'Comissão recebida'],
    ['ComissÃƒÂ£o recebida', 'Comissão recebida'],
    ['ComissÃƒÆ’Ã‚Â£o recebida', 'Comissão recebida'],
    ['ComissÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o recebida', 'Comissão recebida'],
    ['ComissÃ£o', 'Comissão'],
    ['ComissÃƒÂ£o', 'Comissão'],
    ['ComissÃƒÆ’Ã‚Â£o', 'Comissão'],
    ['ComissÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o', 'Comissão'],
    ['Comissao', 'Comissão'],
    ['comissÃ£o', 'comissão'],
    ['comissÃƒÂ£o', 'comissão'],
    ['DistribuiÃ§Ã£o', 'Distribuição'],
    ['DistribuiÃƒÂ§ÃƒÂ£o', 'Distribuição'],
    ['PrevisÃ£o', 'Previsão'],
    ['PrevisÃƒÂ£o', 'Previsão'],
    ['LÃ­quida', 'Líquida'],
    ['LÃƒÂ­quida', 'Líquida'],
    ['LÃ­quido', 'Líquido'],
    ['LÃƒÂ­quido', 'Líquido'],
    ['ConcluÃ­das', 'Concluídas'],
    ['ConcluÃƒÂ­das', 'Concluídas'],
    ['ConcluÃ­da', 'Concluída'],
    ['ConcluÃƒÂ­da', 'Concluída'],
    ['JÃ¡', 'Já'],
    ['JÃƒÂ¡', 'Já'],
    ['MarÃ§o', 'Março'],
    ['MarÃƒÂ§o', 'Março'],
    ['ImÃ³veis', 'Imóveis'],
    ['ImÃƒÂ³veis', 'Imóveis'],
    ['ImobiliÃ¡ria', 'Imobiliária'],
    ['ImobiliÃƒÂ¡ria', 'Imobiliária'],
    ['UsuÃ¡rios', 'Usuários'],
    ['UsuÃƒÂ¡rios', 'Usuários'],
    ['Usuarios', 'Usuários'],
    ['mÃ³dulo', 'módulo'],
    ['mÃƒÂ³dulo', 'módulo'],
    ['sessÃ£o', 'sessão'],
    ['sessÃƒÂ£o', 'sessão'],
    ['navegaÃ§Ã£o', 'navegação'],
    ['navegaÃƒÂ§ÃƒÂ£o', 'navegação'],
    ['PermissÃµes', 'Permissões'],
    ['permissÃµes', 'permissões'],
    ['tÃªm', 'têm'],
    ['histÃ³rico', 'histórico'],
    ['conexÃ£o', 'conexão'],
    ['CapitÃ£o', 'Capitão'],
    ['CapitÃƒÂ£o', 'Capitão'],
    ['NotificaÃ§Ãµes', 'Notificações'],
    ['usuÃ¡rio', 'usuário'],
    ['usuÃ¡rios', 'usuários'],
    ['UsuÃ¡rio', 'Usuário'],
    ['MÃªs', 'Mês'],
    ['BÃ´nus', 'Bônus'],
    ['EdiÃ§Ã£o', 'Edição'],
    ['AvanÃ§ar', 'Avançar'],
    ['AtenÃ§Ã£o', 'Atenção'],
    ['sem dados bancÃ¡rios cadastrados', 'sem dados bancários cadastrados'],
    ['Sem dados bancÃ¡rios cadastrados', 'Sem dados bancários cadastrados'],
    ['Buscar por nome, e-mail ou equipe...', 'Buscar por nome, e-mail ou equipe...'],
    ['\u00c2·', '·'],
    ['Â·', '·'],
    ['â€”', '—'],
    ['â€“', '–'],
    ['â€¢', '•'],
    ['â†’', '→'],
    ['â†©', '↩'],
    ['â†', '←'],
    ['âˆ’', '−'],
    ['â—ˆ', '◈'],
    ['âœ•', '✕'],
    ['âœ…', '✅'],
    ['âœ“', '✓'],
    ['âœ‰ï¸', '✉️'],
    ['âŒ', '❌'],
    ['âš ï¸', '⚠️'],
    ['ðŸ“‹', '📋'],
    ['ðŸ“…', '📅'],
    ['ðŸ“Œ', '📌'],
    ['ðŸ’¾', '💾'],
    ['ðŸ‘‹', '👋'],
    ['ðŸ‘', '👁'],
    ['ðŸ™ˆ', '🙈'],
    ['ðŸ—‘', '🗑'],
    ['ðŸ“', '📍'],
    ['ðŸ‘¥', '👥'],
    ['ðŸŽ', '🎁'],
    ['ðŸ“„', '📄'],
    ['ðŸ§¾', '🧾'],
    ['ðŸ“­', '📭'],
    ['ðŸ ', '🏠'],
    ['ðŸ“Š', '📊'],
    ['ðŸ’¬', '💬'],
    ['ðŸŽ¯', '🎯'],
    ['ðŸ“ˆ', '📈'],
    ['âš–ï¸', '⚖️'],
    ['ðŸ’¡', '💡'],
    ['ðŸ“š', '📚'],
    ['ðŸŽ“', '🎓'],
    ['ðŸ“', '📝'],
    ['ðŸ”Ž', '🔎'],
    ['ðŸ’°', '💰'],
    ['ðŸ“£', '📣'],
    ['ðŸŒŸ', '🌟'],
    ['ðŸ”', '🔍'],
    ['ðŸ”‘', '🔑'],
    ['ðŸ”’', '🔒'],
    ['ðŸ””', '🔔'],
    ['ðŸ¦', '🏦'],
    ['ðŸ§‘â€ðŸ’¼', '🧑‍💼'],
    ['âœï¸', '✏️'],
    ['ðŸ¤', '🤝'],
    ['ðŸ“¤', '📤'],
    ['ðŸ—ï¸', '🏗️'],
    ['ðŸ“Ž', '📎'],
    ['ðŸ–¼ï¸', '🖼️'],
    ['ðŸ“•', '📕'],
    ['ðŸš€', '🚀'],
    ['â¬‡', '⬇'],
    ['ðŸŸ¢', '🟢'],
    ['ðŸŸ¡', '🟡'],
    ['ðŸ”´', '🔴'],
    ['ðŸ‘¤', '👤'],
    ['â­', '⭐'],
    ['ðŸ†', '🏆'],
    ['ðŸ‘‘', '👑'],
    ['ðŸ’¼', '💼'],
    ['ðŸŸ ', '🟠']
  ];

  for (const [de, para] of pares) {
    normalizado = normalizado.split(de).join(para);
  }

  const paresProc = [
    ['JurÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­dico', '\u004a\u0075\u0072\u00ed\u0064\u0069\u0063\u006f'],
    ['CaptaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de imÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³veis', '\u0043\u0061\u0070\u0074\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0069\u006d\u00f3\u0076\u0065\u0069\u0073'],
    ['LocaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de imÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³veis', '\u004c\u006f\u0063\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0069\u006d\u00f3\u0076\u0065\u0069\u0073'],
    ['Repasse de comissÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes', '\u0052\u0065\u0070\u0061\u0073\u0073\u0065\u0020\u0064\u0065\u0020\u0063\u006f\u006d\u0069\u0073\u0073\u00f5\u0065\u0073'],
    ['AvaliaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de desempenho', '\u0041\u0076\u0061\u006c\u0069\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0064\u0065\u0073\u0065\u006d\u0070\u0065\u006e\u0068\u006f'],
    ['RevisÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o', '\u0052\u0065\u0076\u0069\u0073\u00e3\u006f']
  ];

  for (const [de, para] of paresProc) {
    normalizado = normalizado.split(de).join(para.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }

  return normalizado
    .replace(/\s+·/g, ' ·')
    .replace(/·\s+/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

window.zUiText = zUiText;

function ini(n) { return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function fmt(v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
function fmtK(v) { return v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1)+'M' : v >= 1000 ? 'R$ '+Math.round(v/1000)+'k' : fmt(v); }
function fmtTamanho(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function hoje() {
  const d = new Date();
  return d.getDate().toString().padStart(2,'0') + '/'
       + (d.getMonth()+1).toString().padStart(2,'0') + '/'
       + d.getFullYear();
}

function nomeCalendario(cliente) {
  return cliente.split('/')[0].trim().split(' ').filter(p=>p.length>0).slice(0,2).join(' ');
}

async function copiarTexto(texto, rotulo = 'Texto') {
  const valor = String(texto || '').trim();
  if (!valor) {
    showToast('⚠️', `${zUiText(rotulo)} ${zUiText('indisponível para cópia')}`);
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(valor);
    } else {
      const area = document.createElement('textarea');
      area.value = valor;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      area.style.pointerEvents = 'none';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      if (!ok) throw new Error('copy-fallback-failed');
    }
    showToast('✅', `${zUiText(rotulo)} ${zUiText('copiada com sucesso')}`);
    return true;
  } catch (e) {
    console.warn('Falha ao copiar texto:', e.message);
    showToast('❌', `${zUiText('Não foi possível copiar')} ${zUiText(rotulo).toLowerCase()}`);
    return false;
  }
}

function showToast(icon, msg) {
  let t = document.getElementById('toast-el');
  if (t) t.remove();
  t = document.createElement('div');
  t.id = 'toast-el';
  t.className = 'toast';
  t.innerHTML = `<span>${zUiText(icon)}</span><span>${zUiText(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400); }, 3000);
}

function toggleNotif() {
  const p = document.getElementById('npanel');
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) renderNots();
}

function renderNots() {
  const el = document.getElementById('nlist');
  if (!el) return;
  if (!notifs.length) {
    el.innerHTML = `<div style="padding:13px;font-size:11px;color:var(--tm);text-align:center;">${zUiText('Sem notificaÃ§Ãµes')}</div>`;
    return;
  }
  el.innerHTML = notifs.slice(0,8).map(n =>
    `<div class="ni">
      <div style="font-size:14px;flex-shrink:0;color:var(--gold);margin-top:1px;">${zUiText('â—ˆ')}</div>
      <div>
        <div class="ntxt"><strong>${zUiText(n.venda)}</strong> ${zUiText('â†’')} <strong>${zUiText(n.etapa)}</strong></div>
        ${n.obs ? `<div class="nobs">"${zUiText(n.obs)}"</div>` : ''}
        <div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(n.hora)} ${zUiText('Â·')} ${zUiText('Financeiro')}</div>
      </div>
    </div>`
  ).join('');
}

window.copiarTexto = copiarTexto;

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['mbackdrop','mtrein','muser','mvenda','m-trocar-senha',
   'convite-screen','m-edit-venda','m-distrato','m-convite','anexo-viewer']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.classList.contains('show')) el.classList.remove('show');
      if (el.classList.contains('hidden')) return;
      if (id === 'anexo-viewer' && el.classList.contains('show')) fecharViewer();
    });
  if (typeof fecharM === 'function') fecharM();
  if (typeof fecharMT === 'function') fecharMT();
  if (typeof fecharMU === 'function') fecharMU();
  if (typeof fecharMV === 'function') fecharMV();
  if (typeof fecharTS === 'function') fecharTS();
  if (typeof fecharConvite === 'function') fecharConvite();
  if (typeof fecharEditVenda === 'function') fecharEditVenda();
  if (typeof fecharDistrato === 'function') fecharDistrato();
});
