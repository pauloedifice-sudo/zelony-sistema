// UTILS
// Funcoes utilitarias partilhadas por todos os modulos

window.notifs = window.notifs || [];

function zNormalizarAliasSistema(texto) {
  if (typeof texto !== 'string') return texto;
  return texto.replace(/\bPERSY\b/gi, trecho => {
    if (trecho === trecho.toLowerCase()) return 'persi';
    if (trecho === trecho.toUpperCase()) return 'PERSI';
    return 'Persi';
  });
}

function zNormalizarCampoTexto(valor) {
  if (valor == null) return '';
  return zNormalizarAliasSistema(String(valor)).replace(/\s+/g, ' ').trim();
}

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
    ['MARÃ‡O', 'MARÇO'],
    ['MARÃƒÂ‡O', 'MARÇO'],
    ['MARÃƒâ€¡O', 'MARÇO'],
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

  normalizado = zNormalizarAliasSistema(normalizado);

  return normalizado
    .replace(/\s+·/g, ' ·')
    .replace(/·\s+/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

window.zUiText = zUiText;
window.zNormalizarAliasSistema = zNormalizarAliasSistema;
window.zNormalizarCampoTexto = zNormalizarCampoTexto;

function zEscapeHtml(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function zUiHtml(valor) {
  return zEscapeHtml(zUiText(valor));
}

window.zEscapeHtml = zEscapeHtml;
window.zUiHtml = zUiHtml;

function ini(n) { return n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function fmt(v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }
function fmtK(v) { return v >= 1e6 ? 'R$ '+(v/1e6).toFixed(1)+'M' : v >= 1000 ? 'R$ '+Math.round(v/1000)+'k' : fmt(v); }
function fmtTamanho(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

// Mascara de CNPJ em tempo real: usuário digita só os números
// (ex.: 12983189276391) e o campo já formata sozinho para
// "12.983.189/2763-91" a cada tecla digitada.
function mascararCnpjInput(input) {
  if (!input) return;
  const digitos = String(input.value || '').replace(/\D/g, '').slice(0, 14);
  let formatado = digitos;
  if (digitos.length > 12) formatado = digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, '$1.$2.$3/$4-$5');
  else if (digitos.length > 8) formatado = digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, '$1.$2.$3/$4');
  else if (digitos.length > 5) formatado = digitos.replace(/^(\d{2})(\d{3})(\d{0,3})$/, '$1.$2.$3');
  else if (digitos.length > 2) formatado = digitos.replace(/^(\d{2})(\d{0,3})$/, '$1.$2');
  input.value = formatado;
}
window.mascararCnpjInput = mascararCnpjInput;

// Mascara "ao vivo" de valores em R$, para usar no oninput de qualquer
// campo de valor do sistema. Só reformata visualmente o que já foi
// digitado (separador de milhar "." e decimal ",") — nunca reinterpreta
// os dígitos (digitar "248000" continua significando 248.000, nunca vira
// centavos). Suporta um "-" inicial (ex.: saldo bancário negativo no
// Financeiro). Mantém a posição do cursor com base em quantos dígitos
// existiam antes dele.
function zMascararValorMonetario(input) {
  if (!input) return;
  const cursorPos = input.selectionStart == null ? input.value.length : input.selectionStart;
  const raw = String(input.value || '');
  const digitosAntesDoCursor = (raw.slice(0, cursorPos).match(/[0-9]/g) || []).length;
  const negativo = /^\s*-/.test(raw);

  const texto = raw.replace(/[^0-9,]/g, '');
  const primeiraVirgula = texto.indexOf(',');
  let parteInteira = primeiraVirgula >= 0 ? texto.slice(0, primeiraVirgula) : texto;
  const parteDecimal = primeiraVirgula >= 0 ? texto.slice(primeiraVirgula + 1).replace(/,/g, '').slice(0, 2) : null;
  parteInteira = parteInteira.replace(/^0+(?=\d)/, '');
  const inteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let novoValor = parteDecimal !== null ? `${inteiraFormatada},${parteDecimal}` : (primeiraVirgula >= 0 ? `${inteiraFormatada},` : inteiraFormatada);
  if (negativo) novoValor = '-' + novoValor;
  input.value = novoValor;

  let contados = 0, novaPos = novoValor.length;
  for (let i = 0; i < novoValor.length; i++) {
    if (/[0-9]/.test(novoValor[i])) contados++;
    if (contados === digitosAntesDoCursor) { novaPos = i + 1; break; }
  }
  if (digitosAntesDoCursor === 0) novaPos = negativo ? 1 : 0;
  try { input.setSelectionRange(novaPos, novaPos); } catch (e) {}
}
window.zMascararValorMonetario = zMascararValorMonetario;

// Lê um texto de valor em R$ digitado pelo usuário (aceita "1234",
// "1234,56", "1.234,56", "-1.234,56"...) e devolve o número — mesma
// tolerância de formato já usada nas telas de Vendas/Financeiro.
function zLerValorMonetario(valor, padrao) {
  padrao = padrao || 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : padrao;
  let texto = String(valor == null ? '' : valor).trim();
  if (!texto) return padrao;
  texto = texto.replace(/\s+/g, '').replace(/^R\$/i, '').replace(/[^0-9,.\-]/g, '');
  if (!texto || texto === '-' || texto === ',' || texto === '.') return padrao;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) texto = texto.replace(/\./g, '');
  else if (/^-?\d{1,3}(,\d{3})+$/.test(texto)) texto = texto.replace(/,/g, '');
  else {
    const ultimoPonto = texto.lastIndexOf('.');
    const ultimaVirgula = texto.lastIndexOf(',');
    if (ultimoPonto >= 0 && ultimaVirgula >= 0) texto = ultimaVirgula > ultimoPonto ? texto.replace(/\./g, '').replace(/,/g, '.') : texto.replace(/,/g, '');
    else if (ultimaVirgula >= 0) texto = texto.replace(/\./g, '').replace(/,/g, '.');
  }
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : padrao;
}
window.zLerValorMonetario = zLerValorMonetario;

// Reformata um campo de R$ para "1.234,56" (ou "-1.234,56") ao sair do
// campo — o toque final depois do zMascararValorMonetario, que só
// formata enquanto o usuário ainda está digitando.
function zFinalizarValorMonetario(input, permitirNegativo) {
  if (!input) return;
  const texto = String(input.value || '').trim();
  if (!texto) { input.value = ''; return; }
  let numero = zLerValorMonetario(texto, 0);
  if (!permitirNegativo) numero = Math.abs(numero);
  input.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
window.zFinalizarValorMonetario = zFinalizarValorMonetario;

function hoje() {
  const d = new Date();
  return d.getDate().toString().padStart(2,'0') + '/'
       + (d.getMonth()+1).toString().padStart(2,'0') + '/'
       + d.getFullYear();
}

function pad2(valor) {
  return String(valor).padStart(2, '0');
}

function formatarDataLocal(data, opcoes = {}) {
  const ref = data instanceof Date ? new Date(data.getTime()) : new Date(data);
  if (Number.isNaN(ref.getTime())) return '';
  const comAno = opcoes.comAno !== false;
  const base = `${pad2(ref.getDate())}/${pad2(ref.getMonth() + 1)}${comAno ? '/' + ref.getFullYear() : ''}`;
  if (!opcoes.comHora) return base;
  return `${base} ${pad2(ref.getHours())}:${pad2(ref.getMinutes())}`;
}

function obterMomentoHistorico(hist, opcoes = {}) {
  if (!hist || typeof hist !== 'object') return null;
  const preferTs = opcoes.preferTs !== false;
  let infoTs = null;
  let infoData = null;

  if (typeof hist.ts === 'string' && hist.ts.trim()) {
    const dataTs = new Date(hist.ts);
    if (!Number.isNaN(dataTs.getTime())) {
      infoTs = { date: dataTs, precision: 'datetime' };
    }
  }

  const bruto = typeof hist.d === 'string' ? hist.d.trim() : '';
  if (bruto) {
    const partes = bruto.split('/');
    if (partes.length >= 2) {
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1;
      if (Number.isFinite(dia) && Number.isFinite(mes) && mes >= 0 && mes <= 11) {
        if (partes.length >= 3) {
          const ano = parseInt(partes[2], 10);
          if (Number.isFinite(ano)) {
            infoData = { date: new Date(ano, mes, dia, 12, 0, 0, 0), precision: 'date' };
          }
        } else {
          const agora = new Date();
          infoData = {
            date: new Date(agora.getFullYear(), mes, dia, 12, 0, 0, 0),
            precision: 'daymonth'
          };
        }
      }
    }
  }

  return preferTs ? (infoTs || infoData) : (infoData || infoTs);
}

function criarRegistroHistorico(base = {}, opcoes = {}) {
  const agora = opcoes.agora instanceof Date ? new Date(opcoes.agora.getTime()) : new Date();
  let dataRef = null;

  if (opcoes.data instanceof Date && !Number.isNaN(opcoes.data.getTime())) {
    dataRef = new Date(opcoes.data.getTime());
  } else if (typeof opcoes.data === 'string' && opcoes.data.trim()) {
    const bruto = opcoes.data.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
      const [ano, mes, dia] = bruto.split('-').map(Number);
      dataRef = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    } else {
      const info = obterMomentoHistorico({ d: bruto }, { preferTs: false });
      if (info && info.date) dataRef = info.date;
    }
  }

  if (!dataRef || Number.isNaN(dataRef.getTime())) {
    dataRef = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0, 0);
  }

  return {
    ...base,
    d: typeof opcoes.d === 'string' && opcoes.d.trim() ? opcoes.d.trim() : formatarDataLocal(dataRef, { comAno: true }),
    ts: typeof opcoes.ts === 'string' && opcoes.ts.trim() ? opcoes.ts.trim() : agora.toISOString()
  };
}

function formatarMomentoHistorico(hist) {
  const info = obterMomentoHistorico(hist);
  if (!info) return hist && hist.d ? String(hist.d) : '—';
  if (info.precision === 'datetime') {
    return `${formatarDataLocal(info.date, { comAno: true })} ${zUiText('às')} ${pad2(info.date.getHours())}:${pad2(info.date.getMinutes())}`;
  }
  if (info.precision === 'date') {
    return formatarDataLocal(info.date, { comAno: true });
  }
  return hist && hist.d ? String(hist.d) : formatarDataLocal(info.date, { comAno: false });
}

function formatarTempoNotificacao(hist) {
  const info = obterMomentoHistorico(hist);
  if (!info) return zUiText('sem data');

  const agora = new Date();
  const diffMs = agora.getTime() - info.date.getTime();
  const minutoMs = 60 * 1000;
  const horaMs = 60 * minutoMs;
  const diaMs = 24 * horaMs;

  if (info.precision === 'datetime') {
    if (Math.abs(diffMs) < minutoMs) return zUiText('agora há pouco');

    const diffMin = Math.floor(Math.abs(diffMs) / minutoMs);
    if (diffMin < 60) {
      return diffMs >= 0
        ? zUiText(`há ${diffMin} min`)
        : zUiText(`em ${diffMin} min`);
    }

    const diffHoras = Math.floor(Math.abs(diffMs) / horaMs);
    if (diffHoras < 24) {
      return diffMs >= 0
        ? zUiText(`há ${diffHoras} h`)
        : zUiText(`em ${diffHoras} h`);
    }
  }

  if (info.precision !== 'daymonth') {
    const hojeRef = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dataRef = new Date(info.date.getFullYear(), info.date.getMonth(), info.date.getDate());
    const diffDias = Math.round((hojeRef.getTime() - dataRef.getTime()) / diaMs);

    if (diffDias === 0) return zUiText('hoje');
    if (diffDias === 1) return zUiText('ontem');
    if (diffDias > 1 && diffDias < 7) return zUiText(`há ${diffDias} dias`);
    if (diffDias < 0 && Math.abs(diffDias) < 7) return zUiText(`em ${Math.abs(diffDias)} dias`);
    return `${zUiText('em')} ${formatarDataLocal(info.date, { comAno: true })}`;
  }

  const bruto = hist && hist.d ? String(hist.d).trim() : '';
  const hojeTxt = formatarDataLocal(agora, { comAno: false });
  const ontem = new Date(agora.getTime());
  ontem.setDate(ontem.getDate() - 1);
  const ontemTxt = formatarDataLocal(ontem, { comAno: false });

  if (bruto === hojeTxt) return zUiText('hoje');
  if (bruto === ontemTxt) return zUiText('ontem');
  return bruto ? `${zUiText('em')} ${bruto}` : zUiText('sem data');
}

function nomeCalendario(cliente) {
  return clienteVendaPrincipal(cliente).split(' ').filter(p=>p.length>0).slice(0,2).join(' ');
}

function clienteVendaPartes(cliente) {
  return zUiText(String(cliente || ''))
    .split('/')
    .map(parte => parte.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function clienteVendaPrincipal(cliente) {
  return clienteVendaPartes(cliente)[0] || '';
}

function clienteVendaTexto(cliente, opcoes = {}) {
  const partes = clienteVendaPartes(cliente);
  if (!partes.length) return '';
  const separador = opcoes.separador || ' / ';
  return partes.join(separador);
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
  if (!p.classList.contains('hidden')) {
    renderNots();
    marcarNotificacoesComoLidas();
  } else {
    atualizarBadgeNotificacoes();
  }
}

function gerarNotificacoes() {
  const vendasBase = typeof VENDAS !== 'undefined' && Array.isArray(VENDAS) ? VENDAS : [];
  const vendasVisiveis = typeof vendasU === 'function' ? vendasU(vendasBase) : vendasBase;
  const etapas = typeof ETAPAS !== 'undefined' && Array.isArray(ETAPAS) ? ETAPAS : [];

  return vendasVisiveis.flatMap(v => {
    const hist = Array.isArray(v && v.hist) ? v.hist : [];
    const vendaNome = v && v.cliente ? (clienteVendaTexto(v.cliente) || 'Venda') : 'Venda';

    return hist
      .filter(h => h && !h.tipo && Number.isFinite(Number(h.e)) && Number(h.e) > 0)
      .map((h, idx) => {
        const etapaIndex = Number(h.e);
        const momento = obterMomentoHistorico(h);
        return {
          venda: vendaNome,
          etapa: etapas[etapaIndex] || `Etapa ${etapaIndex}`,
          obs: h.o || '',
          por: h.u || '',
          hora: formatarTempoNotificacao(h),
          data: formatarMomentoHistorico(h),
          momento,
          vendaId: v && v.id ? v.id : 0,
          histIndex: idx,
          ordem: momento && momento.date ? momento.date.getTime() : 0
        };
      });
  }).sort((a, b) => {
    if (b.ordem !== a.ordem) return b.ordem - a.ordem;
    if (b.vendaId !== a.vendaId) return b.vendaId - a.vendaId;
    return b.histIndex - a.histIndex;
  });
}

function atualizarListaNotificacoes() {
  window.notifs = gerarNotificacoes();
  return window.notifs;
}

function obterChaveUltimaLeituraNotificacoes() {
  if (!usuarioLogado || !usuarioLogado.email) return null;
  return `zel_notifs_lidas_${String(usuarioLogado.email).trim().toLowerCase()}`;
}

function obterUltimaLeituraNotificacoes(opcoes = {}) {
  const chave = obterChaveUltimaLeituraNotificacoes();
  if (!chave) return null;

  const raw = localStorage.getItem(chave);
  if (!raw) {
    if (!opcoes.inicializarSeAusente) return null;
    const agora = new Date();
    localStorage.setItem(chave, agora.toISOString());
    return agora;
  }

  const data = new Date(raw);
  if (!Number.isNaN(data.getTime())) return data;

  if (!opcoes.inicializarSeAusente) return null;
  const agora = new Date();
  localStorage.setItem(chave, agora.toISOString());
  return agora;
}

function marcarNotificacoesComoLidas() {
  const chave = obterChaveUltimaLeituraNotificacoes();
  if (!chave) return;

  const lista = atualizarListaNotificacoes();
  const referencia = lista.length && lista[0].momento && lista[0].momento.date
    ? lista[0].momento.date
    : new Date();

  localStorage.setItem(chave, referencia.toISOString());
  atualizarBadgeNotificacoes();
}

function atualizarBadgeNotificacoes() {
  const lista = atualizarListaNotificacoes();
  const badge = document.getElementById('nbadge');
  if (!badge) return lista;

  const painel = document.getElementById('npanel');
  if (!usuarioLogado || (painel && !painel.classList.contains('hidden'))) {
    badge.textContent = '0';
    badge.classList.add('hidden');
    return lista;
  }

  const ultimaLeitura = obterUltimaLeituraNotificacoes({ inicializarSeAusente: true });
  const unread = !ultimaLeitura
    ? 0
    : lista.filter(n => n.momento && n.momento.date && n.momento.date.getTime() > ultimaLeitura.getTime()).length;

  badge.textContent = String(unread);
  badge.classList.toggle('hidden', unread === 0);
  return lista;
}

function renderNots() {
  const el = document.getElementById('nlist');
  if (!el) return;
  const lista = atualizarBadgeNotificacoes();
  if (!lista.length) {
    el.innerHTML = `<div style="padding:13px;font-size:11px;color:var(--tm);text-align:center;">${zUiText('Sem notificaÃ§Ãµes')}</div>`;
    return;
  }
  el.innerHTML = lista.slice(0,8).map(n =>
    `<div class="ni">
      <div style="font-size:14px;flex-shrink:0;color:var(--gold);margin-top:1px;">${zUiText('â—ˆ')}</div>
      <div>
        <div class="ntxt"><strong>${zUiText(n.venda)}</strong> ${zUiText('â†’')} <strong>${zUiText(n.etapa)}</strong></div>
        ${n.obs ? `<div class="nobs">"${zUiText(n.obs)}"</div>` : ''}
        <div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(n.hora)} ${zUiText('Â·')} ${zUiText(n.data)}${n.por ? ` ${zUiText('Â·')} ${zUiText('por')} ${zUiText(n.por)}` : ''}</div>
      </div>
    </div>`
  ).join('');
}

window.copiarTexto = copiarTexto;
window.criarRegistroHistorico = criarRegistroHistorico;
window.obterMomentoHistorico = obterMomentoHistorico;
window.formatarMomentoHistorico = formatarMomentoHistorico;
window.atualizarBadgeNotificacoes = atualizarBadgeNotificacoes;

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (typeof temTratativaAgendamentoObrigatoriaAberta === 'function' && temTratativaAgendamentoObrigatoriaAberta()) {
    showToast('⚠️', 'Esse agendamento precisa de tratativa antes de continuar.');
    return;
  }
  ['mbackdrop','mtrein','muser','mvenda','m-trocar-senha',
   'convite-screen','m-edit-venda','m-distrato','m-convite','anexo-viewer','m-agendamento','m-agendamento-tratativa']
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
  if (typeof fecharAgendamentoModal === 'function') fecharAgendamentoModal();
  if (typeof fecharTratativaAgendamentoModal === 'function') fecharTratativaAgendamentoModal();
});
