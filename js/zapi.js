// Integracao frontend com as Edge Functions da Z-API

const ZAPI_FUNCTIONS_BASE = `${SB_URL}/functions/v1`;
let zapiAvisoFalhaJaExibido = false;

function zapiBuildFunctionUrl(nome) {
  return `${ZAPI_FUNCTIONS_BASE}/${nome}`;
}

async function zapiInvocarFunction(nome, payload) {
  const response = await fetch(zapiBuildFunctionUrl(nome), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`
    },
    body: JSON.stringify(payload || {})
  });
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  if (!response.ok) {
    const mensagem = data && (data.error || data.message)
      ? String(data.error || data.message)
      : `HTTP ${response.status}`;
    throw new Error(mensagem);
  }
  return data;
}

function zapiAvisarFalhaPontual(mensagem) {
  if (zapiAvisoFalhaJaExibido || typeof showToast !== 'function') return;
  zapiAvisoFalhaJaExibido = true;
  showToast(
    zUiText('âš ï¸'),
    zUiText(mensagem || 'A atualização foi salva, mas a notificação do WhatsApp não conseguiu ser disparada.')
  );
}

async function dispararNotificacaoVendaZapi(payload = {}, opcoes = {}) {
  if (!payload || !payload.vendaId) return { ok: false, ignorado: true };
  try {
    return await zapiInvocarFunction('zapi-venda-etapa', payload);
  } catch (erro) {
    console.warn('Falha ao disparar notificacao Z-API:', erro);
    if (opcoes.avisar !== false) {
      zapiAvisarFalhaPontual(
        opcoes.mensagemFalha || 'A atualização foi salva, mas a notificação do WhatsApp ficou pendente. Confira a configuração da Z-API.'
      );
    }
    throw erro;
  }
}

async function dispararNotificacaoEvolucaoVendaZapi(payload = {}, opcoes = {}) {
  return dispararNotificacaoVendaZapi(payload, opcoes);
}

async function dispararNotificacaoCadastroVendaZapi(payload = {}, opcoes = {}) {
  return dispararNotificacaoVendaZapi({
    ...payload,
    tipoEvento: 'cadastro_venda'
  }, {
    ...opcoes,
    mensagemFalha: opcoes.mensagemFalha || 'A venda foi salva, mas a mensagem de WhatsApp do cadastro ficou pendente. Confira a configuração da Z-API.'
  });
}

window.dispararNotificacaoVendaZapi = dispararNotificacaoVendaZapi;
window.dispararNotificacaoEvolucaoVendaZapi = dispararNotificacaoEvolucaoVendaZapi;
window.dispararNotificacaoCadastroVendaZapi = dispararNotificacaoCadastroVendaZapi;

zRegisterModule('zapi', {
  dispararNotificacaoVendaZapi,
  dispararNotificacaoCadastroVendaZapi,
  dispararNotificacaoEvolucaoVendaZapi
});
