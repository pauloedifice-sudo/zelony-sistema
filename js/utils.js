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

  const mapa = {
    'Ass. formulÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rios': 'Ass. formulários',
    'Ass. formulÃƒÂ¡rios': 'Ass. formulários',
    'Ass. formulÃ¡rios': 'Ass. formulários',
    'ComissÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o recebida': 'Comissão recebida',
    'ComissÃƒÂ£o recebida': 'Comissão recebida',
    'ComissÃ£o recebida': 'Comissão recebida',
    'CapitÃƒÂ£o': 'Capitão',
    'CapitÃ£o': 'Capitão',
    'UsuÃƒÂ¡rios': 'Usuários',
    'UsuÃ¡rios': 'Usuários',
    'ComissÃƒÂ£o': 'Comissão',
    'ComissÃ£o': 'Comissão',
    'comissÃƒÂ£o': 'comissão',
    'comissÃ£o': 'comissão',
    'DistribuiÃƒÂ§ÃƒÂ£o': 'Distribuição',
    'DistribuiÃ§Ã£o': 'Distribuição',
    'PrevisÃƒÂ£o': 'Previsão',
    'PrevisÃ£o': 'Previsão',
    'LÃƒÂ­quida': 'Líquida',
    'LÃ­quida': 'Líquida',
    'LÃƒÂ­quido': 'Líquido',
    'LÃ­quido': 'Líquido',
    'ConcluÃƒÂ­das': 'Concluídas',
    'ConcluÃ­das': 'Concluídas',
    'ConcluÃƒÂ­da': 'Concluída',
    'ConcluÃ­da': 'Concluída',
    'JÃƒÂ¡': 'Já',
    'JÃ¡': 'Já',
    'MarÃƒÂ§o': 'Março',
    'MarÃ§o': 'Março',
    'ImÃƒÂ³veis': 'Imóveis',
    'ImÃ³veis': 'Imóveis',
    'mÃƒÂ³dulo': 'módulo',
    'mÃ³dulo': 'módulo',
    'sessÃƒÂ£o': 'sessão',
    'sessÃ£o': 'sessão',
    'navegaÃƒÂ§ÃƒÂ£o': 'navegação',
    'navegaÃ§Ã£o': 'navegação',
    'PermissÃƒÂµes': 'Permissões',
    'permissÃƒÂµes': 'permissões',
    'tÃƒÂªm': 'têm',
    'tÃªm': 'têm',
    'histÃƒÂ³rico': 'histórico',
    'histÃ³rico': 'histórico',
    'conexÃƒÂ£o': 'conexão',
    'conexÃ£o': 'conexão',
    'Ã¢â‚¬â€': '—',
    'â€”': '—',
    'Ã¢â‚¬â€œ': '–',
    'â€“': '–',
    'Ã¢â‚¬Â¢': '•',
    'â€¢': '•',
    'Ã¢â€ â€™': '→',
    'â†’': '→',
    'Ã¢Å“â€¢': '✕',
    'âœ•': '✕',
    'Ã¢Å“â€¦': '✅',
    'âœ…': '✅',
    'Ã¢Å“â€œ': '✓',
    'âœ“': '✓',
    'Ã¢ÂÅ’': '❌',
    'âŒ': '❌',
    'Ã¢Å¡Â Ã¯Â¸Â': '⚠️',
    'âš ï¸': '⚠️',
    'Ã°Å¸â€œâ€¦': '📅',
    'ðŸ“…': '📅',
    'Ã°Å¸â€™Â¾': '💾',
    'ðŸ’¾': '💾',
    'Ã°Å¸â€˜Â‹': '👋',
    'ðŸ‘‹': '👋',
    'Ã°Å¸â€˜Â': '👁',
    'ðŸ‘': '👁',
    'Ã°Å¸â„¢Ë†': '🙈',
    'ðŸ™ˆ': '🙈',
    'Ã°Å¸â€”‘': '🗑',
    'ðŸ—‘': '🗑',
    'Ã°Å¸â€œ': '📍',
    'ðŸ“': '📍',
    'Ã°Å¸â€˜Â¥': '👥',
    'ðŸ‘¥': '👥',
    'Ã°Å¸Å½': '🎁',
    'ðŸŽ': '🎁',
    'Ã°Å¸â€œ„': '📄',
    'ðŸ“„': '📄',
    'Ã°Å¸Â§¾': '🧾',
    'ðŸ§¾': '🧾',
    'Ã‚Â·': '·',
    'Â·': '·'
  };

  Object.keys(mapa).forEach(chave => {
    normalizado = normalizado.split(chave).join(mapa[chave]);
  });

  const paresProc = [
    ['JurÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­dico', '\u004a\u0075\u0072\u00ed\u0064\u0069\u0063\u006f'],
    ['CaptaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³veis', '\u0043\u0061\u0070\u0074\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0069\u006d\u00f3\u0076\u0065\u0069\u0073'],
    ['LocaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³veis', '\u004c\u006f\u0063\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0069\u006d\u00f3\u0076\u0065\u0069\u0073'],
    ['Repasse de comissÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes', '\u0052\u0065\u0070\u0061\u0073\u0073\u0065\u0020\u0064\u0065\u0020\u0063\u006f\u006d\u0069\u0073\u0073\u00f5\u0065\u0073'],
    ['AvaliaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de desempenho', '\u0041\u0076\u0061\u006c\u0069\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0064\u0065\u0073\u0065\u006d\u0070\u0065\u006e\u0068\u006f'],
    ['RevisÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o', '\u0052\u0065\u0076\u0069\u0073\u00e3\u006f'],
    ['ProspecÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vel', '\u0050\u0072\u006f\u0073\u0070\u0065\u0063\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0069\u006d\u00f3\u0076\u0065\u006c'],
    ['AvaliaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de mercado', '\u0041\u0076\u0061\u006c\u0069\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u006d\u0065\u0072\u0063\u0061\u0064\u006f'],
    ['Visita tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©cnica', '\u0056\u0069\u0073\u0069\u0074\u0061\u0020\u0074\u00e9\u0063\u006e\u0069\u0063\u0061'],
    ['DocumentaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do proprietÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio', '\u0044\u006f\u0063\u0075\u006d\u0065\u006e\u0074\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0070\u0072\u006f\u0070\u0072\u0069\u0065\u0074\u00e1\u0072\u0069\u006f'],
    ['PublicaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o nas plataformas', '\u0050\u0075\u0062\u006c\u0069\u0063\u0061\u00e7\u00e3\u006f\u0020\u006e\u0061\u0073\u0020\u0070\u006c\u0061\u0074\u0061\u0066\u006f\u0072\u006d\u0061\u0073'],
    ['QualificaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do cliente', '\u0051\u0075\u0061\u006c\u0069\u0066\u0069\u0063\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0063\u006c\u0069\u0065\u006e\u0074\u0065'],
    ['ApresentaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do imÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³vel', '\u0041\u0070\u0072\u0065\u0073\u0065\u006e\u0074\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0069\u006d\u00f3\u0076\u0065\u006c'],
    ['NegociaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o', '\u004e\u0065\u0067\u006f\u0063\u0069\u0061\u00e7\u00e3\u006f'],
    ['AprovaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do crÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©dito', '\u0041\u0070\u0072\u006f\u0076\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0063\u0072\u00e9\u0064\u0069\u0074\u006f'],
    ['AnÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lise jurÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­dica', '\u0041\u006e\u00e1\u006c\u0069\u0073\u0065\u0020\u006a\u0075\u0072\u00ed\u0064\u0069\u0063\u0061'],
    ['DivulgaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o', '\u0044\u0069\u0076\u0075\u006c\u0067\u0061\u00e7\u00e3\u006f'],
    ['AnÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lise cadastral', '\u0041\u006e\u00e1\u006c\u0069\u0073\u0065\u0020\u0063\u0061\u0064\u0061\u0073\u0074\u0072\u0061\u006c'],
    ['RevisÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o jurÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­dica', '\u0052\u0065\u0076\u0069\u0073\u00e3\u006f\u0020\u006a\u0075\u0072\u00ed\u0064\u0069\u0063\u0061'],
    ['Registro em cartÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³rio', '\u0052\u0065\u0067\u0069\u0073\u0074\u0072\u006f\u0020\u0065\u006d\u0020\u0063\u0061\u0072\u0074\u00f3\u0072\u0069\u006f'],
    ['ValidaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o dos valores', '\u0056\u0061\u006c\u0069\u0064\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0073\u0020\u0076\u0061\u006c\u006f\u0072\u0065\u0073'],
    ['AprovaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do gerente', '\u0041\u0070\u0072\u006f\u0076\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0067\u0065\u0072\u0065\u006e\u0074\u0065'],
    ['AprovaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o do diretor', '\u0041\u0070\u0072\u006f\u0076\u0061\u00e7\u00e3\u006f\u0020\u0064\u006f\u0020\u0064\u0069\u0072\u0065\u0074\u006f\u0072'],
    ['Processamento bancÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rio', '\u0050\u0072\u006f\u0063\u0065\u0073\u0073\u0061\u006d\u0065\u006e\u0074\u006f\u0020\u0062\u0061\u006e\u0063\u00e1\u0072\u0069\u006f'],
    ['DepÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³sito realizado', '\u0044\u0065\u0070\u00f3\u0073\u0069\u0074\u006f\u0020\u0072\u0065\u0061\u006c\u0069\u007a\u0061\u0064\u006f'],
    ['DocumentaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o admissional', '\u0044\u006f\u0063\u0075\u006d\u0065\u006e\u0074\u0061\u00e7\u00e3\u006f\u0020\u0061\u0064\u006d\u0069\u0073\u0073\u0069\u006f\u006e\u0061\u006c'],
    ['ApresentaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o da empresa', '\u0041\u0070\u0072\u0065\u0073\u0065\u006e\u0074\u0061\u00e7\u00e3\u006f\u0020\u0064\u0061\u0020\u0065\u006d\u0070\u0072\u0065\u0073\u0061'],
    ['AvaliaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de 30 dias', '\u0041\u0076\u0061\u006c\u0069\u0061\u00e7\u00e3\u006f\u0020\u0064\u0065\u0020\u0033\u0030\u0020\u0064\u0069\u0061\u0073'],
    ['Coleta de mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©tricas', '\u0043\u006f\u006c\u0065\u0074\u0061\u0020\u0064\u0065\u0020\u006d\u00e9\u0074\u0072\u0069\u0063\u0061\u0073'],
    ['ReuniÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o com gestor', '\u0052\u0065\u0075\u006e\u0069\u00e3\u006f\u0020\u0063\u006f\u006d\u0020\u0067\u0065\u0073\u0074\u006f\u0072']
  ];

  paresProc.forEach(([de, para]) => {
    normalizado = normalizado.split(de).join(para);
  });

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
    el.innerHTML = `<div style="padding:13px;font-size:11px;color:var(--tm);text-align:center;">${zUiText('Sem notificações')}</div>`;
    return;
  }
  el.innerHTML = notifs.slice(0,8).map(n =>
    `<div class="ni">
      <div style="font-size:14px;flex-shrink:0;color:var(--gold);margin-top:1px;">${zUiText('◈')}</div>
      <div>
        <div class="ntxt"><strong>${zUiText(n.venda)}</strong> ${zUiText('→')} <strong>${zUiText(n.etapa)}</strong></div>
        ${n.obs ? `<div class="nobs">"${zUiText(n.obs)}"</div>` : ''}
        <div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(n.hora)} ${zUiText('·')} ${zUiText('Financeiro')}</div>
      </div>
    </div>`
  ).join('');
}

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
