// FINANCEIRO - parte 3/4: modal de lancamento/comprovante, salvar/editar/excluir e navegacao (anterior/proximo/hoje)
function finLancamentoAtual() {
  if (!finModalLancamentoId) return null;
  return finLancamentosRegistrados().find(item => {
    const chave = String(item.refLocal || item.ref_local || item.id || '').trim();
    return String(chave) === String(finModalLancamentoId);
  }) || null;
}

function finModalTipoAtual() {
  const atual = finLancamentoAtual();
  if (atual) return tipoLancamentoFinanceiroNormalizado(atual.tipo);
  return finModalTipoPadrao || 'entrada';
}

function finResetComprovanteState() {
  finComprovanteFile = null;
  finComprovanteDataUrl = '';
  finComprovanteNome = '';
  finComprovanteMime = '';
  finComprovanteSize = 0;
  finComprovanteLocalId = '';
  finComprovanteUploadTemporario = null;
  finComprovanteRemovido = false;
}

function finPrepararComprovanteModal(item = null) {
  finResetComprovanteState();
  finModalBaixaRapida = false;
  if (!item) return;
  if (item.comprovanteNome) finComprovanteNome = item.comprovanteNome;
  if (item.comprovanteMime) finComprovanteMime = item.comprovanteMime;
  if (item.comprovanteSize) finComprovanteSize = item.comprovanteSize;
  if (item.comprovanteLocalId) finComprovanteLocalId = item.comprovanteLocalId;
}

function finChaveItem(item) {
  return String(item && (item.refLocal || item.ref_local || (item.raw && (item.raw.refLocal || item.raw.ref_local || item.raw.id)) || item.id || item.key || '') || '').trim();
}

function finLancamentoPorChave(chave) {
  const alvo = String(chave || '').trim();
  if (!alvo) return null;
  return finLancamentosRegistrados().find(item => {
    const atual = String(item && (item.refLocal || item.ref_local || item.id || '') || '').trim();
    return atual && atual === alvo;
  }) || null;
}

function finComprovanteModalAtual(item = finLancamentoAtual()) {
  if (finComprovanteRemovido) return null;
  if (finComprovanteFile || finComprovanteDataUrl) {
    return {
      nome: finComprovanteNome || (finComprovanteFile && finComprovanteFile.name) || 'Comprovante',
      mime: finComprovanteMime || (finComprovanteFile && finComprovanteFile.type) || '',
      size: finComprovanteSize || (finComprovanteFile && finComprovanteFile.size) || 0,
      dataUrl: finComprovanteDataUrl || '',
      localId: finComprovanteLocalId || '',
      storageBucket: '',
      storagePath: '',
      origem: 'local'
    };
  }
  if (!item || !finTemComprovante(item)) return null;
  return finResolverComprovanteSalvo(item);
}

function finComprovanteResumo(item = finLancamentoAtual()) {
  const atual = finComprovanteModalAtual(item);
  if (!atual) return zUiText('Nenhum comprovante anexado');
  const ext = atual.nome && atual.nome.includes('.') ? atual.nome.split('.').pop().toUpperCase() : '';
  const prefixo = ext ? `${ext} · ` : '';
  return zUiText(`${prefixo}${atual.nome}${atual.size ? ` · ${finTamanhoArquivoTexto(atual.size)}` : ''}`);
}

function finAtualizarComprovanteModalUi() {
  const atual = finComprovanteModalAtual();
  const badge = document.getElementById('fin-comprovante-badge');
  const viewBtn = document.getElementById('fin-comprovante-view-btn');
  const removeBtn = document.getElementById('fin-comprovante-remove-btn');
  if (badge) badge.textContent = finComprovanteResumo();
  if (viewBtn) viewBtn.style.display = atual ? 'inline-flex' : 'none';
  if (removeBtn) removeBtn.style.display = atual ? 'inline-flex' : 'none';
}

async function finSelecionarComprovanteFile(event) {
  const file = event && event.target && event.target.files && event.target.files[0];
  if (!file) return;
  const mime = String(file.type || '').toLowerCase();
  const nome = String(file.name || '').toLowerCase();
  const permitido = mime === 'application/pdf' || mime.startsWith('image/') || /\.(pdf|jpg|jpeg|png|webp)$/i.test(nome);
  if (!permitido) {
    showToast('⚠️', zUiText('Use um comprovante em PDF ou imagem.'));
    if (event && event.target) event.target.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️', zUiText('O comprovante deve ter no maximo 10MB.'));
    if (event && event.target) event.target.value = '';
    return;
  }
  try {
    finComprovanteDataUrl = await finLerArquivoComoDataUrl(file);
    finComprovanteFile = file;
    finComprovanteNome = file.name || 'comprovante';
    finComprovanteMime = file.type || '';
    finComprovanteSize = file.size || 0;
    finComprovanteUploadTemporario = null;
    finComprovanteRemovido = false;
    finAtualizarComprovanteModalUi();
  } catch (erro) {
    showToast('❌', zUiText('Nao foi possivel ler o comprovante selecionado.'));
  } finally {
    if (event && event.target) event.target.value = '';
  }
  /* if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  } */
}

function finLimparComprovanteSelecionado() {
  const atual = finComprovanteModalAtual();
  if (!atual) return;
  finComprovanteFile = null;
  finComprovanteDataUrl = '';
  finComprovanteNome = '';
  finComprovanteMime = '';
  finComprovanteSize = 0;
  finComprovanteUploadTemporario = null;
  finComprovanteRemovido = true;
  finAtualizarComprovanteModalUi();
}

function finMarcarModalComoRealizado(focoComprovante = false) {
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaEl = document.getElementById('fin-lanc-data-realizada');
  if (!statusEl) return;
  statusEl.value = 'realizado';
  // A baixa rapida representa o pagamento/recebimento feito agora. A data
  // prevista continua preservada no lancamento, enquanto a data realizada
  // determina o dia em que o movimento efetivamente entra no caixa.
  if (dataRealizadaEl) dataRealizadaEl.value = finDateParaIso(finHojeRef());
  finAtualizarCamposModalLancamento();
  if (focoComprovante) {
    const alvo = document.getElementById('fin-comprovante-trigger');
    if (alvo) alvo.focus();
  }
  /* if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  } */
}

function finHandleStatusLancamentoChange() {
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaEl = document.getElementById('fin-lanc-data-realizada');
  if (statusEl && statusEl.value === 'realizado' && dataRealizadaEl && !dataRealizadaEl.value) {
    dataRealizadaEl.value = finDateParaIso(finHojeRef());
  }
  finAtualizarCamposModalLancamento();
}

function finAbrirBaixaLancamento(chave) {
  finEditarLancamentoManual(chave);
  finModalBaixaRapida = true;
  renderFinanceiro();
  setTimeout(() => finMarcarModalComoRealizado(true), 80);
}

function finResolverComprovanteSalvo(item) {
  if (!item) return null;
  const bucketPadrao = typeof SB_DOCS_BUCKET === 'string' && SB_DOCS_BUCKET.trim() ? SB_DOCS_BUCKET.trim() : 'documentos';
  const brutoDataUrl = String(item.comprovanteDataUrl || item.comprovante_data_url || '').trim();
  let dataUrl = brutoDataUrl;
  let storageBucket = String(item.comprovanteStorageBucket || item.comprovante_storage_bucket || '').trim();
  let storagePath = String(item.comprovanteStoragePath || item.comprovante_storage_path || '').trim();
  const aplicarStorageInfo = info => {
    if (!info) return false;
    storageBucket = storageBucket || String(info.bucket || bucketPadrao).trim();
    storagePath = storagePath || String(info.path || '').trim();
    if (!storageBucket || !storagePath) return false;
    dataUrl = '';
    return true;
  };

  if ((!storageBucket || !storagePath) && brutoDataUrl && typeof parseDocumentoStorageRef === 'function') {
    aplicarStorageInfo(parseDocumentoStorageRef(brutoDataUrl));
  }

  if ((!storageBucket || !storagePath) && brutoDataUrl && brutoDataUrl.startsWith('{')) {
    try {
      const payload = JSON.parse(brutoDataUrl);
      if (payload && typeof payload === 'object') {
        if (!aplicarStorageInfo(payload)) {
          const refBruta = String(payload.storageRef || payload.storage_ref || payload.ref || '').trim();
          if (refBruta && typeof parseDocumentoStorageRef === 'function') {
            aplicarStorageInfo(parseDocumentoStorageRef(refBruta));
          }
        }
      }
    } catch (erro) {
      console.warn('Falha ao interpretar comprovante legado do financeiro:', erro);
    }
  }

  if (!storageBucket && storagePath) storageBucket = bucketPadrao;

  return {
    nome: item.comprovanteNome || item.comprovante_nome || 'Comprovante',
    mime: item.comprovanteMime || item.comprovante_mime || '',
    size: item.comprovanteSize || item.comprovante_size || 0,
    dataUrl,
    localId: item.comprovanteLocalId || item.comprovante_local_id || '',
    storageBucket,
    storagePath,
    origem: 'salvo'
  };
}

function finAbrirJanelaComprovante() {
  const win = window.open('', '_blank');
  if (!win) {
    showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
    return null;
  }
  try {
    win.opener = null;
    if (win.document) {
      win.document.title = zUiText('Comprovante');
      win.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;padding:24px;color:#6B5B3E;">Abrindo comprovante...</div>';
    }
  } catch (erro) {
    console.warn('Falha ao preparar a janela do comprovante:', erro);
  }
  return win;
}

function finAbrirArquivoComprovante(url, winExistente = null) {
  const win = winExistente || finAbrirJanelaComprovante();
  if (!win) return false;
  try {
    win.location.href = url;
    return true;
  } catch (erro) {
    console.warn('Falha ao redirecionar a janela do comprovante:', erro);
  }
  const fallback = window.open(url, '_blank', 'noopener');
  if (!fallback) {
    showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
    return false;
  }
  return true;
}

async function finAbrirComprovante(item = null) {
  const atual = finComprovanteModalAtual(item || finLancamentoAtual());
  if (!atual) return;
  const win = finAbrirJanelaComprovante();
  if (!win) return;
  if (atual.storageBucket && atual.storagePath && typeof dbBaixarDocumentoArquivo === 'function') {
    try {
      const blob = await dbBaixarDocumentoArquivo({
        storageBucket: atual.storageBucket,
        storagePath: atual.storagePath,
        dataUrl: atual.dataUrl || ''
      });
      if (!blob) throw new Error('Blob do comprovante indisponivel.');
      const url = URL.createObjectURL(blob);
      finAbrirArquivoComprovante(url, win);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      console.warn('Falha ao abrir comprovante salvo do financeiro:', erro);
    }
  }
  if (atual.dataUrl) {
    try {
      if (typeof dbBaixarDocumentoArquivo === 'function') {
        const blob = await dbBaixarDocumentoArquivo({ dataUrl: atual.dataUrl });
        if (blob) {
          const url = URL.createObjectURL(blob);
          finAbrirArquivoComprovante(url, win);
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          return;
        }
      }
    } catch (erro) {
      console.warn('Falha ao abrir comprovante em dataUrl do financeiro:', erro);
    }
    finAbrirArquivoComprovante(atual.dataUrl, win);
    return;
  }
  if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        try { win.close(); } catch (erroClose) {}
        showToast('⚠️', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      finAbrirArquivoComprovante(url, win);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    } catch (erro) {
      console.warn('Falha ao abrir comprovante local do financeiro:', erro);
    }
  }
  try { win.close(); } catch (erroClose) {}
  showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante deste lancamento.'));
}

async function finVerComprovanteLancamento(chave) {
  const item = finLancamentoPorChave(chave);
  if (!item) {
    showToast('⚠️', zUiText('Nao encontramos este lancamento para abrir o comprovante.'));
    return;
  }
  await finAbrirComprovante(item);
}

function finAcoesSecundariasItem(item) {
  const chave = finEscapeAttr(finChaveItem(item));
  const acoes = [];
  if (finTemComprovante(item)) {
    acoes.push(`<button class="fcal-side-action-btn secondary" type="button" onclick="event.stopPropagation();finVerComprovanteLancamento('${chave}')">${zUiText('Ver comprovante')}</button>`);
  }
  if (finPodeBaixaRapida(item)) {
    acoes.push(`<button class="fcal-side-action-btn" type="button" onclick="event.stopPropagation();finAbrirBaixaLancamento('${chave}')">${zUiText(finRotuloBaixaRapida(item))}</button>`);
  }
  if (!acoes.length) return '';
  return `<div class="fcal-side-actions">${acoes.join('')}</div>`;
}

async function finVerComprovanteAtual() {
  await finAbrirComprovante();
  return;
  const atual = finComprovanteModalAtual();
  if (!atual) return;
  if (atual.dataUrl) {
    const win = window.open(atual.dataUrl, '_blank', 'noopener');
    if (!win) showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
    return;
  }
  if ((atual.storageBucket || atual.storagePath) && typeof dbBaixarDocumentoArquivo === 'function') {
    try {
      const blob = await dbBaixarDocumentoArquivo({
        storageBucket: atual.storageBucket,
        storagePath: atual.storagePath,
        dataUrl: atual.dataUrl || ''
      });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('⚠️', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('❌', zUiText('Falha ao abrir o comprovante salvo.'));
    }
  }
  if (atual.localId && typeof obterFinanceiroComprovanteLocal === 'function') {
    try {
      const registro = await obterFinanceiroComprovanteLocal(atual.localId);
      if (!registro || !registro.file) {
        showToast('âš ï¸', zUiText('O comprovante local ainda nao esta disponivel neste navegador.'));
        return;
      }
      const url = URL.createObjectURL(registro.file);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) showToast('âš ï¸', zUiText('Nao foi possivel abrir o comprovante em nova aba.'));
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      showToast('âŒ', zUiText('Falha ao abrir o comprovante local pendente.'));
    }
  }
}

function finSetLancamentoLoading(loading, label = '') {
  finLancamentoSalvando = !!loading;
  syncFinState();
  document.querySelectorAll('#m-fin-lanc input, #m-fin-lanc select, #m-fin-lanc textarea, #m-fin-lanc button').forEach(el => {
    if (el.id === 'fin-lanc-save-btn') {
      el.disabled = finLancamentoSalvando;
      el.textContent = zUiText(label || (finLancamentoSalvando ? 'Salvando...' : (finModalLancamentoId ? 'Salvar alteracoes' : 'Salvar lancamento')));
      return;
    }
    el.disabled = finLancamentoSalvando;
  });
}

function finAbrirModalLancamento(tipo = '') {
  finResetDetalheDiaState();
  finModalAberto = true;
  finModalLancamentoId = '';
  finModalRefLocal = typeof gerarRefLocalFinanceiro === 'function' ? gerarRefLocalFinanceiro() : `fin-${Date.now()}`;
  finModalTipoPadrao = tipo || finTipoPadraoNovaAcao() || 'entrada';
  finResetCategoriaNovaState();
  finPrepararComprovanteModal(null);
  finSetLancamentoLoading(false);
  renderFinanceiro();
  setTimeout(() => {
    const foco = document.getElementById('fin-lanc-descricao');
    if (foco) foco.focus();
    finAtualizarCamposModalLancamento();
  }, 50);
}

function finEditarLancamentoManual(chave) {
  const item = finLancamentoPorChave(chave);
  if (!item) {
    showToast('!', zUiText('Lancamento nao encontrado. Atualize o financeiro e tente novamente.'));
    return;
  }
  finResetDetalheDiaState();
  finModalAberto = true;
  finModalLancamentoId = String(chave || '');
  finModalRefLocal = String(item.refLocal || item.ref_local || '');
  finModalTipoPadrao = '';
  finResetCategoriaNovaState();
  finPrepararComprovanteModal(item);
  finSetLancamentoLoading(false);
  renderFinanceiro();
  setTimeout(() => {
    const foco = document.getElementById('fin-lanc-descricao');
    if (foco) foco.focus();
    finAtualizarCamposModalLancamento();
  }, 50);
}

function finFecharModalLancamento(forcar = false) {
  if (finLancamentoSalvando && !forcar) return;
  finModalAberto = false;
  finModalLancamentoId = '';
  finModalRefLocal = '';
  finModalTipoPadrao = '';
  finResetCategoriaNovaState();
  finResetComprovanteState();
  finModalBaixaRapida = false;
  if (!forcar) finSetLancamentoLoading(false);
  renderFinanceiro();
}

function finHandleBackdropModal(event) {
  if (event.target === document.getElementById('m-fin-lanc')) finFecharModalLancamento();
}

function finAtualizarCamposModalLancamento() {
  const tipoEl = document.getElementById('fin-lanc-tipo');
  const categoriaEl = document.getElementById('fin-lanc-categoria');
  const categoriaNovaEl = document.getElementById('fin-lanc-categoria-nova');
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaWrap = document.getElementById('fin-lanc-realizada-wrap');
  const helpEl = document.getElementById('fin-lanc-status-help');
  const descricaoEl = document.getElementById('fin-lanc-descricao');
  const observacaoEl = document.getElementById('fin-lanc-observacao');
  const realizarBtn = document.getElementById('fin-lanc-realizar-btn');
  const comprovanteHelpEl = document.getElementById('fin-comprovante-help');
  if (!tipoEl || !categoriaEl || !statusEl) return;

  if (categoriaNovaEl) finAtualizarCategoriaNovaValor(categoriaNovaEl.value || '', categoriaNovaEl);
  const tipo = tipoLancamentoFinanceiroNormalizado(tipoEl.value);
  const categoriaAtual = finTextoMaiusculo(categoriaEl.value);
  const categorias = finCategoriasPorTipo(tipo, categoriaAtual ? [categoriaAtual] : []);
  categoriaEl.innerHTML = categorias.map(item => `<option value="${finEscapeAttr(item)}">${zUiText(item)}</option>`).join('');
  categoriaEl.value = categorias.includes(categoriaAtual) ? categoriaAtual : (categorias[0] || '');

  if (dataRealizadaWrap) dataRealizadaWrap.style.display = statusEl.value === 'realizado' ? 'block' : 'none';
  if (helpEl) {
    helpEl.textContent = zUiText(
      statusEl.value === 'realizado'
        ? (tipo === 'saida' ? 'Esta saida entra no caixa como paga.' : 'Esta entrada entra no caixa como recebida.')
        : (tipo === 'saida' ? 'Esta saida entra no caixa como compromisso futuro.' : 'Esta entrada entra no caixa como previsao futura.')
    );
  }
  if (descricaoEl) {
    finAtualizarCampoMaiusculo(descricaoEl);
    descricaoEl.placeholder = zUiText(tipo === 'saida'
      ? 'EX: ALUGUEL DA UNIDADE CENTRO, IMPOSTO, CRM...'
      : 'EX: APORTE DOS SOCIOS, REEMBOLSO, BONIFICACAO...');
  }
  if (observacaoEl) finAtualizarCampoMaiusculo(observacaoEl);
  if (realizarBtn) {
    const atual = finLancamentoAtual();
    const podeMostrar = !!(atual && atual.origem !== 'venda' && statusEl.value !== 'realizado');
    realizarBtn.style.display = podeMostrar ? 'inline-flex' : 'none';
    realizarBtn.textContent = zUiText(tipo === 'saida' ? 'Dar como pago' : 'Dar como recebido');
  }
  if (comprovanteHelpEl) {
    comprovanteHelpEl.textContent = zUiText(
      statusEl.value === 'realizado'
        ? (tipo === 'saida'
          ? 'Anexe o comprovante do pagamento em foto ou PDF.'
          : 'Se existir, anexe o comprovante do recebimento em foto ou PDF.')
        : 'Opcional. Quando a movimentacao for realizada, voce pode anexar foto ou PDF do comprovante.'
    );
  }
  finAtualizarCategoriaNovaUi();
  finAtualizarComprovanteModalUi();
}

function finOrdenarLancamentosLocais(a, b) {
  const dataA = String(a && a.dataRealizada || a && a.dataPrevista || '');
  const dataB = String(b && b.dataRealizada || b && b.dataPrevista || '');
  if (dataA !== dataB) return dataA.localeCompare(dataB);
  return finValorSeguro(b && b.valor) - finValorSeguro(a && a.valor);
}

async function finSalvarLancamento() {
  if (finLancamentoSalvando) return;
  if (typeof appPodePersistirNoSupabase === 'function' && !appPodePersistirNoSupabase({ mensagem: 'Sem conexão com o Supabase. O financeiro está em modo consulta.' })) return;
  const tipoEl = document.getElementById('fin-lanc-tipo');
  const categoriaEl = document.getElementById('fin-lanc-categoria');
  const categoriaNovaEl = document.getElementById('fin-lanc-categoria-nova');
  const descricaoEl = document.getElementById('fin-lanc-descricao');
  const unidadeEl = document.getElementById('fin-lanc-unidade');
  const dataPrevistaEl = document.getElementById('fin-lanc-data-prevista');
  const statusEl = document.getElementById('fin-lanc-status');
  const dataRealizadaEl = document.getElementById('fin-lanc-data-realizada');
  const valorEl = document.getElementById('fin-lanc-valor');
  const observacaoEl = document.getElementById('fin-lanc-observacao');
  if (!tipoEl || !categoriaEl || !descricaoEl || !dataPrevistaEl || !statusEl || !valorEl) return;

  const tipo = tipoLancamentoFinanceiroNormalizado(tipoEl.value);
  const categoriaNova = finTextoMaiusculo(categoriaNovaEl && categoriaNovaEl.value || '');
  const categoria = finTextoMaiusculo((finCategoriaNovaAtiva && categoriaNova) ? categoriaNova : (categoriaEl.value || ''));
  const descricao = finTextoMaiusculo(descricaoEl.value || '');
  const unidade = unidadeEl ? String(unidadeEl.value || '').trim() : '';
  const dataPrevista = String(dataPrevistaEl.value || '').trim();
  const status = statusLancamentoFinanceiroNormalizado(statusEl.value);
  const dataRealizada = status === 'realizado' ? String(dataRealizadaEl && dataRealizadaEl.value || '').trim() : '';
  const valor = finValorSeguro(valorEl.value);
  const observacao = finTextoMaiusculo(observacaoEl && observacaoEl.value || '');

  if (categoriaNovaEl) categoriaNovaEl.value = categoriaNova;
  if (descricaoEl) descricaoEl.value = descricao;
  if (observacaoEl) observacaoEl.value = observacao;

  if (!categoria) { showToast('⚠️', zUiText('Selecione a categoria do lancamento.')); return; }
  if (finCategoriaNovaAtiva && !categoriaNova) { showToast('⚠️', zUiText('Digite o nome da nova categoria para continuar.')); return; }
  if (!descricao) { showToast('⚠️', zUiText('Descreva a movimentacao para facilitar a leitura do caixa.')); return; }
  if (!finDataValidaIso(dataPrevista)) { showToast('⚠️', zUiText('Informe a data prevista do lancamento.')); return; }
  if (status === 'realizado' && !finDataValidaIso(dataRealizada)) { showToast('⚠️', zUiText('Informe a data realizada do lancamento.')); return; }
  if (valor <= 0) { showToast('⚠️', zUiText('Informe um valor maior que zero.')); return; }

  finSetLancamentoLoading(true, 'Salvando...');
  const existente = finLancamentoAtual();
  const indiceExistente = existente ? FINANCEIRO_LANCAMENTOS.indexOf(existente) : -1;
  const agoraIso = new Date().toISOString();
  const comprovanteAnterior = existente ? {
    nome: existente.comprovanteNome || '',
    mime: existente.comprovanteMime || '',
    size: finValorSeguro(existente.comprovanteSize),
    dataUrl: existente.comprovanteDataUrl || '',
    localId: existente.comprovanteLocalId || '',
    storageBucket: existente.comprovanteStorageBucket || '',
    storagePath: existente.comprovanteStoragePath || ''
  } : null;
  const alvo = existente ? { ...existente } : {
    id: Date.now(),
    refLocal: finModalRefLocal || (typeof gerarRefLocalFinanceiro === 'function' ? gerarRefLocalFinanceiro() : `fin-${Date.now()}`),
    criadoPor: usuarioLogado ? (usuarioLogado.nome || '') : 'Sistema',
    criadoPorId: usuarioLogado ? (parseInt(usuarioLogado.id, 10) || 0) : 0,
    criadoPorEmail: usuarioLogado ? (usuarioLogado.email || '') : '',
    syncPendente: false,
    syncErro: ''
  };
  finModalRefLocal = String(alvo.refLocal || finModalRefLocal || '');

  alvo.tipo = tipo;
  alvo.categoria = categoria;
  alvo.descricao = descricao;
  alvo.unidade = unidade;
  alvo.dataPrevista = dataPrevista;
  alvo.status = status;
  alvo.dataRealizada = status === 'realizado' ? dataRealizada : '';
  alvo.valor = valor;
  alvo.observacao = observacao;
  alvo.atualizadoEm = agoraIso;
  // Somente uma edicao explicita permite atualizar/sincronizar um repasse antigo.
  if (existente && lancamentoFinanceiroAutomaticoLegado(existente)) alvo.edicaoManualLegado = true;
  if (finComprovanteRemovido) {
    alvo.comprovanteNome = '';
    alvo.comprovanteMime = '';
    alvo.comprovanteSize = 0;
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteLocalId = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  } else if (finComprovanteFile) {
    alvo.comprovanteNome = finComprovanteNome || finComprovanteFile.name || 'comprovante';
    alvo.comprovanteMime = finComprovanteMime || finComprovanteFile.type || '';
    alvo.comprovanteSize = finComprovanteSize || finComprovanteFile.size || 0;
    alvo.comprovanteLocalId = '';
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  } else if (comprovanteAnterior) {
    alvo.comprovanteNome = comprovanteAnterior.nome;
    alvo.comprovanteMime = comprovanteAnterior.mime;
    alvo.comprovanteSize = comprovanteAnterior.size;
    alvo.comprovanteDataUrl = comprovanteAnterior.dataUrl;
    alvo.comprovanteLocalId = comprovanteAnterior.localId;
    alvo.comprovanteStorageBucket = comprovanteAnterior.storageBucket;
    alvo.comprovanteStoragePath = comprovanteAnterior.storagePath;
  } else {
    alvo.comprovanteNome = '';
    alvo.comprovanteMime = '';
    alvo.comprovanteSize = 0;
    alvo.comprovanteDataUrl = '';
    alvo.comprovanteLocalId = '';
    alvo.comprovanteStorageBucket = '';
    alvo.comprovanteStoragePath = '';
  }

  try {
    if (typeof dbSalvarLancamentoFinanceiro !== 'function') {
      throw new Error('Persistencia do financeiro indisponivel.');
    }

    if (finComprovanteFile) {
      if (!finComprovanteUploadTemporario) {
        if (typeof dbUploadDocumentoArquivo !== 'function') {
          throw new Error('Upload de comprovante indisponivel.');
        }
        const upload = await dbUploadDocumentoArquivo(finComprovanteFile, {
          folder: 'financeiro/comprovantes'
        });
        if (!upload || !upload.bucket || !upload.path) {
          throw new Error('O Supabase nao confirmou o envio do comprovante.');
        }
        finComprovanteUploadTemporario = {
          bucket: upload.bucket,
          path: upload.path
        };
      }
      alvo.comprovanteStorageBucket = finComprovanteUploadTemporario.bucket;
      alvo.comprovanteStoragePath = finComprovanteUploadTemporario.path;
      alvo.comprovanteDataUrl = '';
      alvo.comprovanteLocalId = '';
    }

    const confirmado = await dbSalvarLancamentoFinanceiro(alvo, existente ? existente.id : 0);
    if (confirmado && confirmado !== alvo) Object.assign(alvo, confirmado);
    alvo.confirmadoSupabase = true;
    alvo.syncPendente = false;
    alvo.syncErro = '';

    if (existente && indiceExistente >= 0) {
      FINANCEIRO_LANCAMENTOS.splice(indiceExistente, 1, alvo);
    } else {
      FINANCEIRO_LANCAMENTOS.push(alvo);
    }

    FINANCEIRO_LANCAMENTOS.sort(finOrdenarLancamentosLocais);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    if (typeof salvarLS === 'function') salvarLS();

    const trocouComprovanteStorage = !!(
      comprovanteAnterior &&
      comprovanteAnterior.storageBucket &&
      comprovanteAnterior.storagePath &&
      (finComprovanteRemovido || (
        alvo.comprovanteStorageBucket &&
        alvo.comprovanteStoragePath &&
        (
          alvo.comprovanteStorageBucket !== comprovanteAnterior.storageBucket ||
          alvo.comprovanteStoragePath !== comprovanteAnterior.storagePath
        )
      ))
    );
    if (trocouComprovanteStorage && typeof dbExcluirDocumentoArquivo === 'function') {
      try {
        await dbExcluirDocumentoArquivo({
          storageBucket: comprovanteAnterior.storageBucket,
          storagePath: comprovanteAnterior.storagePath
        });
      } catch (erroExcluirComprovante) {
        console.warn('Falha ao remover comprovante antigo do financeiro:', erroExcluirComprovante);
      }
    }
    if (comprovanteAnterior && comprovanteAnterior.localId && comprovanteAnterior.localId !== (alvo.comprovanteLocalId || '') && typeof excluirFinanceiroComprovanteLocal === 'function') {
      try {
        await excluirFinanceiroComprovanteLocal(comprovanteAnterior.localId);
      } catch (erroExcluirComprovanteLocal) {
        console.warn('Falha ao remover comprovante local antigo do financeiro:', erroExcluirComprovanteLocal);
      }
    }

    finSetLancamentoLoading(false);
    finFecharModalLancamento(true);
    showToast('✅', zUiText(tipo === 'saida' ? 'Saida salva no caixa.' : 'Entrada salva no caixa.'));
  } catch (erro) {
    console.warn('O Supabase nao confirmou o lancamento financeiro:', erro && (erro.message || erro));
    showToast('⚠️', zUiText('Nao foi possivel confirmar a gravacao. O lancamento nao foi incluido no caixa. Revise a conexao e tente novamente.'));
  } finally {
    if (finLancamentoSalvando) finSetLancamentoLoading(false);
  }
}

async function finExcluirLancamentoAtual() {
  const atual = finLancamentoAtual();
  if (!atual) return;
  if (!confirm(zUiText(`Excluir o lancamento "${atual.descricao}" do caixa?`))) return;

  const indice = FINANCEIRO_LANCAMENTOS.findIndex(item => String(item.refLocal || item.id || '') === String(atual.refLocal || atual.id || ''));
  if (indice < 0) return;
  const [removido] = FINANCEIRO_LANCAMENTOS.splice(indice, 1);
  zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
  if (typeof salvarLS === 'function') salvarLS();
  finFecharModalLancamento();

  try {
    if (removido && (removido.id || removido.refLocal) && typeof dbExcluirLancamentoFinanceiro === 'function') {
      await dbExcluirLancamentoFinanceiro(removido);
    }
    if (removido && removido.comprovanteLocalId && typeof excluirFinanceiroComprovanteLocal === 'function') {
      try {
        await excluirFinanceiroComprovanteLocal(removido.comprovanteLocalId);
      } catch (erroExcluirComprovanteLocal) {
        console.warn('Falha ao excluir comprovante local do financeiro:', erroExcluirComprovanteLocal);
      }
    }
    if (removido && removido.comprovanteStorageBucket && removido.comprovanteStoragePath && typeof dbExcluirDocumentoArquivo === 'function') {
      try {
        await dbExcluirDocumentoArquivo({
          storageBucket: removido.comprovanteStorageBucket,
          storagePath: removido.comprovanteStoragePath
        });
      } catch (erroExcluirComprovante) {
        console.warn('Falha ao excluir comprovante do financeiro:', erroExcluirComprovante);
      }
    }
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    showToast('✅', zUiText('Lancamento removido do caixa.'));
  } catch (erro) {
    if (!document.getElementById('mod-financeiro')?.classList.contains('hidden')) renderFinanceiro();
    showToast('⚠️', zUiText('Lancamento removido localmente, mas o Supabase nao confirmou a exclusao.'));
  }
}

function finSetVisao(visao) {
  finResetDetalheDiaState();
  finVisao = ['geral', 'entradas', 'saidas', 'dre'].includes(visao) ? visao : 'geral';
  finFiltroSituacao = '';
  finFiltroCategoria = '';
  finFiltroFaixa = '';
  if (finVisao === 'dre') finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

function finSetFiltro(chave, valor) {
  finResetDetalheDiaState();
  if (chave === 'unidade') finFiltroUnidade = valor || '';
  if (chave === 'situacao') finFiltroSituacao = valor || '';
  if (chave === 'faixa') finFiltroFaixa = valor || '';
  if (chave === 'categoria') finFiltroCategoria = valor || '';
  syncFinState();
  renderFinanceiro();
}

function finAnterior() {
  finResetDetalheDiaState();
  if (finVisao === 'dre') {
    finDreMover(-1);
    syncFinState();
    renderFinanceiro();
    return;
  }
  finMesAtual--;
  if (finMesAtual < 0) {
    finMesAtual = 11;
    finAnoAtual--;
  }
  syncFinState();
  renderFinanceiro();
}

function finProximo() {
  finResetDetalheDiaState();
  if (finVisao === 'dre') {
    finDreMover(1);
    syncFinState();
    renderFinanceiro();
    return;
  }
  finMesAtual++;
  if (finMesAtual > 11) {
    finMesAtual = 0;
    finAnoAtual++;
  }
  syncFinState();
  renderFinanceiro();
}

function finHoje() {
  finResetDetalheDiaState();
  const hoje = new Date();
  finMesAtual = hoje.getMonth();
  finAnoAtual = hoje.getFullYear();
  if (finVisao === 'dre') finDreNormalizarCursor();
  syncFinState();
  renderFinanceiro();
}

