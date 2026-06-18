// Integracao frontend com as Edge Functions da Z-API

const ZAPI_FUNCTIONS_BASE = `${SB_URL}/functions/v1`;
const ZAPI_PENDENCIAS_KEY = 'zel_zapi_pendencias';
let zapiAvisoFalhaJaExibido = false;
let zapiPendenciasPromise = null;

function zapiBuildFunctionUrl(nome) {
  return `${ZAPI_FUNCTIONS_BASE}/${nome}`;
}

function zapiEmitPendenciasChanged() {
  window.dispatchEvent(new CustomEvent('zapi-pendencias-changed'));
}

function zapiLerPendencias() {
  try {
    const lista = JSON.parse(localStorage.getItem(ZAPI_PENDENCIAS_KEY) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch (_e) {
    return [];
  }
}

function zapiSalvarPendencias(lista) {
  try {
    localStorage.setItem(ZAPI_PENDENCIAS_KEY, JSON.stringify(Array.isArray(lista) ? lista : []));
    zapiEmitPendenciasChanged();
  } catch (erro) {
    console.warn('Falha ao salvar fila local da Z-API:', erro);
  }
}

function zapiGerarChavePendencia(nome, payload = {}) {
  return [
    String(nome || 'zapi-venda-etapa').trim().toLowerCase(),
    String(payload && payload.vendaId || '').trim(),
    String(payload && payload.tipoEvento || '').trim().toLowerCase(),
    String(payload && payload.etapaNova != null ? payload.etapaNova : '').trim(),
    String(payload && payload.responsavel || '').trim().toLowerCase()
  ].join('|');
}

function zapiRegistrarPendencia(nome, payload = {}, opcoes = {}) {
  const chave = zapiGerarChavePendencia(nome, payload);
  const agora = new Date().toISOString();
  const lista = zapiLerPendencias();
  const idx = lista.findIndex(item => String(item && item.chave || '') === chave);
  const anterior = idx >= 0 ? (lista[idx] || {}) : {};
  const item = {
    chave,
    nome: String(nome || 'zapi-venda-etapa'),
    payload: payload || {},
    vendaId: payload && payload.vendaId != null ? parseInt(payload.vendaId, 10) || 0 : 0,
    tipoEvento: String(payload && payload.tipoEvento || '').trim().toLowerCase(),
    mensagemFalha: String(opcoes && opcoes.mensagemFalha || '').trim(),
    criadaEm: anterior.criadaEm || agora,
    atualizadaEm: agora,
    tentativas: (parseInt(anterior.tentativas, 10) || 0) + 1,
    ultimoErro: String(opcoes && opcoes.erro || anterior.ultimoErro || '').trim()
  };
  if (idx >= 0) lista[idx] = item;
  else lista.unshift(item);
  zapiSalvarPendencias(lista);
  return item;
}

function zapiRemoverPendencia(nome, payload = {}) {
  const chave = zapiGerarChavePendencia(nome, payload);
  zapiSalvarPendencias(zapiLerPendencias().filter(item => String(item && item.chave || '') !== chave));
}

function zapiListarPendenciasLocal() {
  return zapiLerPendencias();
}

function zapiContarPendenciasLocal() {
  return zapiLerPendencias().length;
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
  } catch (_e) {
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
    zUiText('⚠️'),
    zUiText(mensagem || 'A atualização foi salva, mas a notificação do WhatsApp ficou pendente neste navegador.')
  );
}

async function zapiTentarReprocessarPendencias(opcoes = {}) {
  if (zapiPendenciasPromise) return zapiPendenciasPromise;
  const pendencias = zapiLerPendencias();
  if (!pendencias.length) return { ok: true, processadas: 0, falhas: 0, restantes: 0 };

  zapiPendenciasPromise = (async () => {
    let processadas = 0;
    let falhas = 0;
    const restantes = [];

    for (const item of pendencias) {
      try {
        await zapiInvocarFunction(item && item.nome || 'zapi-venda-etapa', item && item.payload || {});
        processadas++;
      } catch (erro) {
        falhas++;
        restantes.push({
          ...item,
          atualizadaEm: new Date().toISOString(),
          tentativas: (parseInt(item && item.tentativas, 10) || 0) + 1,
          ultimoErro: String(erro && (erro.message || erro) || '').trim()
        });
      }
    }

    zapiSalvarPendencias(restantes);

    if (!opcoes.silencioso && typeof showToast === 'function') {
      if (processadas && !falhas) {
        showToast(zUiText('✅'), zUiText('As notificações pendentes do WhatsApp foram reenviadas com sucesso.'));
      } else if (processadas && falhas) {
        showToast(zUiText('⚠️'), zUiText(`${processadas} notificação(ões) foram reenviadas, mas ${falhas} ainda seguem pendentes neste navegador.`));
      } else if (falhas) {
        showToast(zUiText('⚠️'), zUiText('As notificações pendentes ainda não puderam ser reenviadas.'));
      }
    }

    return { ok: falhas === 0, processadas, falhas, restantes: restantes.length };
  })().finally(() => {
    zapiPendenciasPromise = null;
  });

  return zapiPendenciasPromise;
}

async function dispararNotificacaoVendaZapi(payload = {}, opcoes = {}) {
  if (!payload || !payload.vendaId) return { ok: false, ignorado: true };
  try {
    const resposta = await zapiInvocarFunction('zapi-venda-etapa', payload);
    zapiRemoverPendencia('zapi-venda-etapa', payload);
    return resposta;
  } catch (erro) {
    console.warn('Falha ao disparar notificacao Z-API:', erro);
    zapiRegistrarPendencia('zapi-venda-etapa', payload, {
      mensagemFalha: opcoes.mensagemFalha,
      erro: erro && (erro.message || erro)
    });
    if (opcoes.avisar !== false) {
      zapiAvisarFalhaPontual(
        opcoes.mensagemFalha || 'A atualização foi salva, mas a notificação do WhatsApp ficou pendente neste navegador. O sistema vai tentar reenviar automaticamente.'
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
    mensagemFalha: opcoes.mensagemFalha || 'A venda foi salva, mas a mensagem de WhatsApp do cadastro ficou pendente neste navegador. O sistema vai tentar reenviar automaticamente.'
  });
}

async function dispararNotificacaoDistratoVendaZapi(payload = {}, opcoes = {}) {
  return dispararNotificacaoVendaZapi({
    ...payload,
    tipoEvento: 'distrato_venda'
  }, {
    ...opcoes,
    mensagemFalha: opcoes.mensagemFalha || 'O distrato foi salvo, mas a mensagem de WhatsApp do distrato ficou pendente neste navegador. O sistema vai tentar reenviar automaticamente.'
  });
}

window.dispararNotificacaoVendaZapi = dispararNotificacaoVendaZapi;
window.dispararNotificacaoEvolucaoVendaZapi = dispararNotificacaoEvolucaoVendaZapi;
window.dispararNotificacaoCadastroVendaZapi = dispararNotificacaoCadastroVendaZapi;
window.dispararNotificacaoDistratoVendaZapi = dispararNotificacaoDistratoVendaZapi;
window.zapiListarPendenciasLocal = zapiListarPendenciasLocal;
window.zapiContarPendenciasLocal = zapiContarPendenciasLocal;
window.zapiTentarReprocessarPendencias = zapiTentarReprocessarPendencias;

window.addEventListener('online', () => {
  zapiTentarReprocessarPendencias({ silencioso: true }).catch(erro => {
    console.warn('Falha ao reprocessar pendencias da Z-API ao voltar a conexão:', erro);
  });
});

setTimeout(() => {
  zapiTentarReprocessarPendencias({ silencioso: true }).catch(erro => {
    console.warn('Falha ao reprocessar pendencias locais da Z-API:', erro);
  });
}, 4000);

zRegisterModule('zapi', {
  dispararNotificacaoVendaZapi,
  dispararNotificacaoCadastroVendaZapi,
  dispararNotificacaoDistratoVendaZapi,
  dispararNotificacaoEvolucaoVendaZapi,
  zapiListarPendenciasLocal,
  zapiContarPendenciasLocal,
  zapiTentarReprocessarPendencias
});
