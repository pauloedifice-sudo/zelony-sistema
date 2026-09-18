// TREINAMENTOS - parte 4/4: sincronizacao de videos, vitrine/catalogo, render final e registro do modulo
async function sincronizarTreinVideos(t, videosModal){
  const chave = treinKey(t);
  const finais = await Promise.all((videosModal || []).map((video, idx) => normalizarTreinVideoCompartilhado(video, idx, chave)));
  const compartilhados = finais.map(video => ({
    id: video.id,
    provider: video.provider || 'local',
    nome: video.nome,
    mime: video.mime,
    size: video.size,
    ordem: video.ordem || 0,
    dataUrl: video.dataUrl || '',
    youtubeUrl: video.youtubeUrl || '',
    youtubeVideoId: video.youtubeVideoId || '',
    embedUrl: video.embedUrl || '',
    thumbnail: video.thumbnail || ''
  }));

  t.videos = compartilhados;

  try{
    const db = await abrirTreinVideoDB();
    const atuais = await listarTreinVideosDB(chave);
    const finaisLocais = finais.filter(video => !isTreinVideoYoutube(video));
    const manterIds = new Set(finaisLocais.map(v => v.id));
    const removerIds = atuais.filter(v => !manterIds.has(v.id)).map(v => v.id);

    await new Promise((resolve, reject) => {
      const tx = db.transaction(TREIN_VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(TREIN_VIDEO_STORE);
      removerIds.forEach(id => store.delete(id));
      finaisLocais.forEach(video => store.put({
        id: video.id,
        trainingKey: chave,
        nome: video.nome,
        mime: video.mime,
        size: video.size,
        ordem: video.ordem || 0,
        blob: video.blob
      }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar os videos do treinamento.'));
    });
  }catch(e){
    console.warn('Falha ao sincronizar os videos localmente:', e.message);
  }

  setTreinVideosCache(chave, compartilhados.map(v => ({ ...v })));
  return compartilhados;
}

function renderMtVideos(){
  const el = document.getElementById('mt-videos-list');
  if(!el) return;
  if(mtVideosLoading){
    el.innerHTML = `<div class="trein-video-empty">${zUiText('Carregando videos do treinamento...')}</div>`;
    return;
  }
  if(!mtVideos.length){
    el.innerHTML = `<div class="trein-video-empty">${zUiText('Nenhum video anexado ainda.')}</div>`;
    return;
  }
  el.innerHTML = mtVideos.map((video, idx) => {
    const detalhe = isTreinVideoYoutube(video)
      ? zUiText('YouTube - link incorporado')
      : [zUiText(video.mime || 'video'), fmtTamanho(video.size || 0)].filter(Boolean).join(' - ');
    return `<div class="trein-video-item">
      <div class="trein-video-item-icon">${zUiText(isTreinVideoYoutube(video) ? 'YT' : 'TV')}</div>
      <div class="trein-video-item-main">
        <strong>${zUiHtml(video.nome)}</strong>
        <small>${detalhe}</small>
      </div>
      <span class="trein-video-item-badge ${video.id ? 'saved' : 'new'}">${zUiText(video.id ? 'Salvo' : 'Novo')}</span>
      <button type="button" class="btn-c trein-video-remove" onclick="removerMtVideo(${idx}, event)">${zUiText('Remover')}</button>
    </div>`;
  }).join('');
}

function handleTreinVideoUpload(input){
  const arquivos = Array.from(input.files || []);
  if(!arquivos.length) return;
  const validos = [];
  arquivos.forEach(file => {
    if(!(file.type || '').startsWith('video/')){
      showToast(zUiText('!'), zUiText(`"${file.name}" nao e um arquivo de video valido.`));
      return;
    }
    if(file.size > TREIN_VIDEO_MAX_MB * 1024 * 1024){
      showToast(zUiText('!'), zUiText(`"${file.name}" ultrapassa ${TREIN_VIDEO_MAX_MB}MB.`));
      return;
    }
    validos.push({
      nome: file.name,
      mime: file.type,
      size: file.size,
      blob: file
    });
  });
  if(validos.length){
    mtVideos = [...mtVideos, ...validos];
    renderMtVideos();
    showToast(zUiText('OK'), zUiText(`${validos.length} video${validos.length>1?'s':''} adicionado${validos.length>1?'s':''} ao treinamento.`));
  }
  input.value = '';
}

function adicionarMtVideoYoutube(){
  const nomeInput = document.getElementById('mt-video-nome');
  const urlInput = document.getElementById('mt-video-youtube-url');
  const nome = String(nomeInput && nomeInput.value || '').trim();
  const url = String(urlInput && urlInput.value || '').trim();

  if(!url){
    if(urlInput) urlInput.focus();
    showToast(zUiText('!'), zUiText('Cole o link do video no YouTube.'));
    return;
  }

  const youtubeVideoId = extrairTreinYoutubeVideoId(url);
  if(!youtubeVideoId){
    if(urlInput) urlInput.focus();
    showToast(zUiText('!'), zUiText('Informe um link valido do YouTube.'));
    return;
  }

  const jaExiste = mtVideos.some(video => getTreinVideoYoutubeId(video) === youtubeVideoId);
  if(jaExiste){
    showToast(zUiText('!'), zUiText('Esse video do YouTube ja foi adicionado ao treinamento.'));
    return;
  }

  mtVideos = [...mtVideos, {
    nome: nome || `Video ${mtVideos.length + 1}`,
    provider: 'youtube',
    mime: 'video/youtube',
    size: 0,
    youtubeUrl: `https://youtu.be/${youtubeVideoId}`,
    youtubeVideoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeVideoId}`,
    thumbnail: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
  }];

  limparCamposMtVideoYoutube();
  renderMtVideos();
  showToast(zUiText('OK'), zUiText('Video do YouTube adicionado ao treinamento.'));
}

function iniciarTreinamento(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(isTreinBloqueado(t)){
    showToast(zUiText('!'), zUiText('Conclua o pre-requisito antes de iniciar esta trilha.'));
    return;
  }
  const bruto = getTreinProgressoBruto(t);
  if(!bruto) setTreinProgresso(t, criarTreinProgressoInicial(t));
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('OK'), zUiText('Treinamento iniciado. Voce ja pode avancar pelas aulas.'));
}

function toggleAulaTrein(token, idx){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(isTreinBloqueado(t)){
    showToast(zUiText('!'), zUiText('Conclua o pre-requisito antes de marcar aulas nesta trilha.'));
    return;
  }
  const bruto = getTreinProgressoBruto(t) || criarTreinProgressoInicial(t);
  const aulas = Array.isArray(bruto.aulas) ? [...bruto.aulas] : [];
  const pos = aulas.indexOf(idx);
  if(pos >= 0) aulas.splice(pos, 1);
  else aulas.push(idx);
  aulas.sort((a,b) => a - b);
  const total = getTreinLicoes(t).length;
  const concluido = aulas.length >= total;

  setTreinProgresso(t, {
    aulas,
    iniciadaEm: bruto.iniciadaEm || new Date().toISOString(),
    concluidaEm: concluido ? new Date().toISOString() : null,
    atualizadaEm: new Date().toISOString(),
    certificadoEm: concluido ? (bruto.certificadoEm || null) : null
  });

  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();

  if(concluido){
    showToast(zUiText('OK'), zUiText('Treinamento concluido com sucesso!'));
  }
}

function marcarProximaAulaTrein(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(isTreinBloqueado(t)){
    showToast(zUiText('!'), zUiText('Conclua o pre-requisito antes de continuar esta trilha.'));
    return;
  }
  const progresso = getTreinProgresso(t);
  if(!progresso.proxima){
    showToast(zUiText('OK'), zUiText('Este treinamento ja esta concluido.'));
    return;
  }
  toggleAulaTrein(token, progresso.proxima.idx);
}

function emitirCertificadoTrein(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  const progresso = getTreinProgresso(t);
  if(progresso.certificadoEm){
    showToast(zUiText('OK'), zUiText('Este certificado ja foi registrado.'));
    return;
  }
  if(progresso.concluidas < progresso.total){
    showToast(zUiText('!'), zUiText('Conclua todas as aulas antes de emitir o certificado.'));
    return;
  }
  setTreinProgresso(t, {
    certificadoEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString()
  });
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('OK'), zUiText('Certificado registrado com sucesso.'));
}

async function salvarTrein(){
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os treinamentos estão em modo consulta.'})) return;
  const titulo = document.getElementById('mt-titulo').value.trim();
  const aulas = parseInt(document.getElementById('mt-aulas').value, 10);
  const dur = document.getElementById('mt-dur').value.trim();
  const prog = parseInt(document.getElementById('mt-prog').value, 10) || 0;
  const btn = document.getElementById('mt-save-btn');
  const textoOriginal = btn.textContent;

  if(!titulo){
    document.getElementById('mt-titulo').focus();
    showToast(zUiText('!'), zUiText('Informe o titulo do treinamento.'));
    return;
  }
  if(!aulas || aulas < 1){
    document.getElementById('mt-aulas').focus();
    showToast(zUiText('!'), zUiText('Informe o numero de aulas.'));
    return;
  }
  if(!dur){
    document.getElementById('mt-dur').focus();
    showToast(zUiText('!'), zUiText('Informe a duracao.'));
    return;
  }

  btn.disabled = true;
  btn.textContent = zUiText('Salvando treinamento...');

  const prevEdit = editIdx >= 0 ? { ...TREIN[editIdx] } : null;
  const metaPayload = lerMtRegras();
  let novoRef = null;

  try{
    if(editIdx >= 0){
      TREIN[editIdx] = {
        ...TREIN[editIdx],
        titulo,
        aulas,
        dur,
        thumb: emojiSel,
        bg: TREIN[editIdx].bg || CAT_BG_T[normalizarCatTrein(TREIN[editIdx].cat)],
        prog
      };
      await dbSalvarTrein(TREIN[editIdx], editIdx);
      novoRef = TREIN[editIdx];
      showToast(zUiText('OK'), zUiText(`"${titulo}" atualizado com sucesso!`));
    }else{
      novoRef = {
        titulo,
        cat: tcatAtivo,
        aulas,
        dur,
        thumb: emojiSel,
        bg: CAT_BG_T[tcatAtivo],
        prog
      };
      TREIN.push(novoRef);
      try{
        await dbSalvarTrein(novoRef, -1);
      }catch(e){
        TREIN = TREIN.filter(t => t !== novoRef);
        throw e;
      }
      showToast(zUiText('OK'), zUiText(`"${titulo}" adicionado com sucesso!`));
    }

    const chaveAnterior = prevEdit ? getTreinMetaKey(prevEdit) : '';
    const chaveAtual = getTreinMetaKey(novoRef);
    if(chaveAnterior && chaveAnterior !== chaveAtual) limparTreinMeta(prevEdit);
    setTreinMeta(novoRef, metaPayload);
    await dbSalvarTrein(novoRef, editIdx >= 0 ? editIdx : TREIN.indexOf(novoRef));

    try{
      await sincronizarTreinVideos(novoRef, mtVideos);
      await dbSalvarTrein(novoRef, editIdx >= 0 ? editIdx : TREIN.indexOf(novoRef));
    }catch(e){
      console.error('Erro ao salvar videos do treinamento:', e);
      showToast(
        zUiText('!'),
        zUiText(
          treinVideosCompartilhadosNoBanco()
            ? 'Treinamento salvo, mas os videos nao puderam ser gravados neste navegador.'
            : 'Treinamento salvo, mas os videos ficaram apenas neste navegador porque o banco ainda nao suporta videos compartilhados.'
        )
      );
    }

    zSetState('state.data.treinamentos', TREIN);
    salvarLS();
    treinSelKey = treinKey(novoRef);
    zSetState('state.ui.treinSelecionado', treinSelKey);
    fecharMT();
    renderTrein();
  }catch(e){
    console.error('Erro ao salvar treinamento:', e);
    if(editIdx >= 0 && prevEdit) TREIN[editIdx] = prevEdit;
    showToast(zUiText('ERRO'), zUiText('Nao foi possivel salvar o treinamento.'));
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

async function excluirTrein(idx){
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os treinamentos estão em modo consulta.'})) return;
  if(role!=='dir' && role!=='dono'){
    showToast(zUiText('!'), zUiText('Apenas Dono ou Diretor podem excluir treinamentos.'));
    return;
  }
  const t = TREIN[idx];
  if(!t) return;
  const confirmar = window.confirm(zUiText(`Excluir o treinamento "${t.titulo}"? Essa acao nao pode ser desfeita.`));
  if(!confirmar) return;

  try{
    await dbExcluirTrein(t);
    await limparTreinVideosTreinamento(t);
    limparTreinProgressoGlobal(t);

    const chaveRemovida = treinKey(t);
    limparTreinMeta(t);
    limparDependenciasTrein(chaveRemovida);
    TREIN.splice(idx, 1);
    zSetState('state.data.treinamentos', TREIN);
    salvarLS();

    if(treinSelKey === chaveRemovida){
      treinSelKey = TREIN[0] ? treinKey(TREIN[0]) : '';
      zSetState('state.ui.treinSelecionado', treinSelKey);
    }

    renderTrein();
    showToast(zUiText('OK'), zUiText('Treinamento excluido com sucesso.'));
  }catch(e){
    console.error('Erro ao excluir treinamento:', e);
    showToast(zUiText('ERRO'), zUiText('Nao foi possivel excluir o treinamento.'));
  }
}

function getCategoriasTreinHierarquia(roleAtual = role){
  return TREIN_CATS_CATALOGO.filter(cat => cat !== TREIN_CAT_ALL);
}

function getCategoriasTreinVisiveis(){
  return [...TREIN_CATS_CATALOGO];
}

function garantirCategoriaTreinAtiva(){
  const cats = getCategoriasTreinVisiveis();
  const atual = tcatAtivo === TREIN_CAT_ALL ? TREIN_CAT_ALL : normalizarCatTrein(tcatAtivo);
  if(!cats.includes(atual)){
    tcatAtivo = TREIN_CAT_ALL;
    zSetState('state.ui.tcatAtivo', tcatAtivo);
  }
  return cats;
}

function getListaTreinBase(){
  if(tcatAtivo === TREIN_CAT_ALL) return [...TREIN];
  return getListaTreinPorCategorias(tcatAtivo);
}

function focarTreinVideoAtual(){
  const alvo =
    document.querySelector('#trein-detalhe .trein-video-stage-frame') ||
    document.querySelector('#trein-detalhe .trein-video-stage') ||
    document.querySelector('#trein-detalhe .trein-detail-panel-watch') ||
    document.getElementById('trein-detalhe');
  if(!alvo) return;
  alvo.scrollIntoView({ behavior:'smooth', block:'start' });
}

function iniciarTreinamentoNoVideo(token){
  iniciarTreinamento(token);
  setTimeout(() => {
    focarTreinVideoAtual();
  }, 140);
}

function getTreinAcaoCatalogo(t, progresso, prerequisito = null){
  const token = treinToken(t);
  if(isTreinBloqueado(t) && prerequisito){
    return {
      label: zUiText('Ver pre-requisito'),
      action: `selecionarTrein('${treinToken(prerequisito)}')`
    };
  }
  if(progresso.status === 'nao_iniciado'){
    return {
      label: zUiText('Assistir agora'),
      action: `iniciarTreinamentoNoVideo('${token}')`
    };
  }
  if(progresso.status === 'concluido'){
    return {
      label: zUiText('Concluir treino'),
      action: `emitirCertificadoTrein('${token}')`
    };
  }
  if(progresso.status === 'aprovado'){
    return {
      label: zUiText('Revisar conteudo'),
      action: `selecionarTrein('${token}')`
    };
  }
  return {
    label: zUiText('Continuar treino'),
    action: `marcarProximaAulaTrein('${token}')`
  };
}

function getTreinResumoCatalogo(t, progresso, prerequisito = null){
  if(isTreinBloqueado(t) && prerequisito){
    return zUiText(`Libera apos concluir "${prerequisito.titulo}".`);
  }
  if(progresso.status === 'aprovado'){
    return zUiText('Treinamento concluido e certificado no seu historico.');
  }
  if(progresso.status === 'concluido'){
    return zUiText('Todas as aulas concluidas. Falta apenas finalizar a trilha.');
  }
  if(progresso.status === 'em_andamento'){
    return zUiText(`Voce ja concluiu ${progresso.concluidas} de ${progresso.total} aulas.`);
  }
  return zUiText('Treinamento liberado para toda a equipe assistir.');
}

async function abrirModalTrein(){
  if(role!=='dir'){
    showToast(zUiText('!'), zUiText('Apenas o Diretor pode adicionar treinamentos.'));
    return;
  }
  if(tcatAtivo === TREIN_CAT_ALL){
    showToast(zUiText('!'), zUiText('Escolha Corretor, Capitao ou Gerente antes de cadastrar um treinamento.'));
    return;
  }
  editIdx = -1;
  resetMtVideos();
  document.getElementById('mt-titulo').value = '';
  document.getElementById('mt-aulas').value = '';
  document.getElementById('mt-dur').value = '';
  document.getElementById('mt-prog').value = 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(tcatAtivo);
  document.getElementById('mt-modal-title').textContent = zUiText('Novo Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('Adicionar treinamento');
  document.getElementById('mt-videos-input').value = '';
  limparCamposMtVideoYoutube();
  document.getElementById('mt-required').checked = false;
  emojiSel = 'ðŸ ';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  atualizarMtRegras();
  renderMtVideos();
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function setTcat(c){
  const cats = getCategoriasTreinVisiveis();
  const categoria = c === TREIN_CAT_ALL ? TREIN_CAT_ALL : normalizarCatTrein(c);
  if(!cats.includes(categoria)) return;
  tcatAtivo = categoria;
  treinSelKey = '';
  zSetState('state.ui.tcatAtivo', tcatAtivo);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
}

function renderTrein(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = garantirCategoriaTreinAtiva();
  const isDiretor = role === 'dir';
  const canDelete = role === 'dir' || role === 'dono';
  const compatTrein = getTreinCompatStatus();
  const categoriasCatalogo = cats.filter(cat => cat !== TREIN_CAT_ALL);
  const catalogo = getListaTreinPorCategorias(categoriasCatalogo);
  const base = getListaTreinBase();
  const filtrada = getListaTreinFiltrada(base);
  const aprovados = catalogo.filter(t => getTreinProgresso(t).status === 'aprovado').length;
  const emAndamento = catalogo.filter(t => getTreinProgresso(t).status === 'em_andamento').length;
  const obrigatoriosPendentes = catalogo.filter(t => getTreinMeta(t).obrigatorio && !isTreinAprovado(t)).length;
  const exibidosAgora = filtrada.length;
  const categoriaAtivaRotulo = tcatAtivo === TREIN_CAT_ALL ? zUiText('Todas as categorias') : zUiText(tcatAtivo);

  document.getElementById('tcats').innerHTML = cats
    .map(c => {
      const icone = c === TREIN_CAT_ALL ? zUiText('TV') : zUiText(CAT_ICON[c] || '*');
      return `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}')">${icone} ${zUiText(c)}</button>`;
    })
    .join('');

  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : `<div class="btn-add-lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>${zUiText('Catalogo aberto para toda a equipe')}</div>`;

  document.getElementById('trein-stats').innerHTML = `
    <div class="mc a">
      <div class="mc-l">${zUiText(tcatAtivo === TREIN_CAT_ALL ? 'Catalogo aberto' : `Trilhas ${tcatAtivo}`)}</div>
      <div class="mc-v" style="color:var(--gold);">${base.length}</div>
      <div class="mc-s">${zUiText(tcatAtivo === TREIN_CAT_ALL ? 'Todos os usuarios podem assistir' : 'Categoria filtrada na vitrine')}</div>
    </div>
    <div class="mc" style="border-top-color:#2E8E5E;">
      <div class="mc-l">${zUiText('Exibidos agora')}</div>
      <div class="mc-v" style="color:#2E8E5E;">${exibidosAgora}</div>
      <div class="mc-s">${zUiText(tBusca || tStatus !== 'todos' ? 'Busca ou status aplicados' : 'Sem filtro adicional')}</div>
    </div>
    <div class="mc" style="border-top-color:var(--gold);">
      <div class="mc-l">${zUiText('Em andamento')}</div>
      <div class="mc-v">${emAndamento}</div>
      <div class="mc-s">${zUiText('Treinamentos iniciados por voce')}</div>
    </div>
    <div class="mc" style="border-top-color:#3060B8;">
      <div class="mc-l">${zUiText('Certificados')}</div>
      <div class="mc-v" style="color:#3060B8;">${aprovados}</div>
      <div class="mc-s">${zUiText(obrigatoriosPendentes ? `${obrigatoriosPendentes} obrigatorio(s) pendente(s)` : 'Nenhum obrigatorio pendente')}</div>
    </div>`;

  if(!treinSelKey || !filtrada.some(t => treinKey(t) === treinSelKey)){
    treinSelKey = (filtrada[0] && treinKey(filtrada[0])) || '';
    zSetState('state.ui.treinSelecionado', treinSelKey);
  }

  const selecionado = filtrada.find(t => treinKey(t) === treinSelKey) || null;
  if(selecionado) garantirTreinVideosCarregados(selecionado);

  const progressoSelecionado = selecionado ? getTreinProgresso(selecionado) : null;
  const metaSelecionado = selecionado ? getTreinMeta(selecionado) : null;
  const prerequisitoSelecionado = selecionado ? getTreinPrerequisito(selecionado) : null;
  const bloqueadoSelecionado = selecionado ? isTreinBloqueado(selecionado) : false;
  const acaoSelecionado = selecionado ? getTreinAcaoCatalogo(selecionado, progressoSelecionado, prerequisitoSelecionado) : null;
  const resumoSelecionado = selecionado ? getTreinResumoCatalogo(selecionado, progressoSelecionado, prerequisitoSelecionado) : zUiText('Escolha qualquer treinamento da vitrine para assistir.');
  const videosSelecionado = selecionado ? getTreinVideos(selecionado) : [];

  const cards = filtrada.length
    ? filtrada.map(t => {
        const idx = TREIN.indexOf(t);
        const progresso = getTreinProgresso(t);
        const token = treinToken(t);
        const categoria = normalizarCatTrein(t.cat);
        const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
        const meta = getTreinMeta(t);
        const prerequisito = getTreinPrerequisito(t);
        const bloqueado = isTreinBloqueado(t);
        const aprovado = progresso.status === 'aprovado';
        const concluidoVisual = progresso.status === 'concluido' || aprovado;
        const acao = getTreinAcaoCatalogo(t, progresso, prerequisito);
        const resumo = getTreinResumoCatalogo(t, progresso, prerequisito);
        const editBtn = isDiretor
          ? `<button type="button" class="trein-card-edit" onclick="event.stopPropagation();editarTrein(${idx})" title="${zUiText('Editar treinamento')}">${zUiText('Ed')}</button>`
          : '';
        return `<article class="trein-gallery-card ${treinKey(t)===treinSelKey?'selected':''} ${bloqueado ? 'locked' : ''}" role="button" tabindex="0" onclick="selecionarTrein('${token}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarTrein('${token}');}">
          <div class="trein-gallery-visual" style="background:${t.bg || CAT_BG_T[categoria] || '#EEF4FE'};">
            ${editBtn}
            <span class="trein-gallery-pill">${zUiText(categoria)}</span>
            <span class="trein-gallery-emoji">${zUiText(t.thumb || 'TR')}</span>
            <span class="trein-gallery-duration">${zUiText(t.dur || 'Sem duracao')}</span>
          </div>
          <div class="trein-gallery-body">
            <div class="trein-card-tags">
              <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
              ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
              ${bloqueado ? `<span class="zbg bg-r">${zUiText('Bloqueado')}</span>` : ''}
            </div>
            <div class="trein-gallery-title">${zUiHtml(t.titulo)}</div>
            <div class="trein-gallery-copy">${resumo}</div>
            <div class="trein-gallery-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${Array.isArray(t.videos) ? t.videos.length : 0} ${zUiText('video(s)')}</div>
            <div class="trein-gallery-progress">
              <div class="pb"><div class="pf ${concluidoVisual ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
              <div class="pl">${concluidoVisual ? zUiText(aprovado ? 'Certificado registrado' : 'Treinamento concluido') : `${progresso.pct}% ${zUiText('concluido')}`}</div>
            </div>
          </div>
          <div class="trein-gallery-footer">
            <div class="trein-gallery-counter">
              <strong>${progresso.concluidas}/${progresso.total}</strong>
              <span>${bloqueado ? zUiText('Aguardando liberacao') : zUiText(progresso.status === 'nao_iniciado' ? 'Pronto para assistir' : 'Progresso individual')}</span>
            </div>
            <button type="button" class="trein-gallery-action" onclick="event.stopPropagation();${acao.action}">${acao.label}</button>
          </div>
        </article>`;
      }).join('')
    : `<div class="trein-empty-state">
        <div class="trein-empty-icon">${zUiText('TR')}</div>
        <div class="trein-empty-title">${zUiText('Nenhum treinamento encontrado')}</div>
        <div class="trein-empty-copy">${zUiText(tBusca || tStatus !== 'todos' ? 'Ajuste sua busca ou mude o status selecionado.' : `Nenhum treinamento cadastrado em ${categoriaAtivaRotulo} ainda.`)}</div>
      </div>`;

  const destaqueSelecionado = selecionado
    ? `<section class="trein-showcase-feature">
        <div class="trein-showcase-card">
          <div class="trein-showcase-card-top">
            <div class="trein-card-tags">
              <span class="zbg ${CAT_BADGE[normalizarCatTrein(selecionado.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(selecionado.cat))}</span>
              <span class="trein-status-chip ${(TREIN_STATUS_META[progressoSelecionado.status] || TREIN_STATUS_META.nao_iniciado).cls}">${zUiText((TREIN_STATUS_META[progressoSelecionado.status] || TREIN_STATUS_META.nao_iniciado).badge)}</span>
              ${metaSelecionado && metaSelecionado.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
              ${bloqueadoSelecionado ? `<span class="zbg bg-r">${zUiText('Bloqueado')}</span>` : ''}
            </div>
            <button type="button" class="btn-c trein-showcase-jump" onclick="document.getElementById('trein-detalhe').scrollIntoView({behavior:'smooth',block:'start'})">${zUiText('Abrir detalhes')}</button>
          </div>
          <div class="trein-showcase-title">${zUiText(selecionado.titulo)}</div>
          <div class="trein-showcase-copy">${resumoSelecionado}</div>
          <div class="trein-showcase-metrics">
            <div><strong>${progressoSelecionado.total}</strong><span>${zUiText('Aulas')}</span></div>
            <div><strong>${progressoSelecionado.pct}%</strong><span>${zUiText('Concluido')}</span></div>
            <div><strong>${videosSelecionado.length}</strong><span>${zUiText('Videos')}</span></div>
          </div>
          <div class="trein-showcase-actions">
            ${acaoSelecionado ? `<button type="button" class="btn-s" onclick="${acaoSelecionado.action}">${acaoSelecionado.label}</button>` : ''}
            ${isDiretor ? `<button type="button" class="btn-c" onclick="editarTrein(${TREIN.indexOf(selecionado)})">${zUiText('Editar')}</button>` : ''}
            ${canDelete ? `<button type="button" class="btn-c" onclick="excluirTrein(${TREIN.indexOf(selecionado)})">${zUiText('Excluir')}</button>` : ''}
          </div>
        </div>
      </section>`
    : `<section class="trein-showcase-feature">
        <div class="trein-showcase-card trein-showcase-card-empty">
          <div class="trein-showcase-title">${zUiText('Sua biblioteca de treinamentos')}</div>
          <div class="trein-showcase-copy">${zUiText('Assim que houver treinamentos cadastrados, eles vao aparecer aqui lado a lado para toda a equipe.')}</div>
        </div>
      </section>`;

  document.getElementById('trein-grid').innerHTML = `
    ${isDiretor && compatTrein.videosCompartilhados === false ? `<div class="trein-lock-note" style="margin-bottom:12px;"><strong>${zUiText('Atencao com os videos')}</strong>${zUiText('O banco de treinamentos ainda nao possui o campo de videos. Enquanto isso, os materiais ficam presos ao navegador onde foram cadastrados e podem sumir para outros usuarios.')}</div>` : ''}
    <div class="trein-vitrine">
      <section class="trein-showcase">
        <div class="trein-showcase-copy">
          <div class="trein-showcase-kicker">${zUiText('Universidade Zelony')}</div>
          <h2>${zUiText('Treinamentos lado a lado, livres para toda a equipe')}</h2>
          <p>${zUiText('A navegacao agora funciona como uma vitrine simples: escolha um card, assista sem trocar de perfil e retome o progresso no mesmo lugar.')}</p>
          <div class="trein-showcase-points">
            <div class="trein-showcase-point">
              <strong>${catalogo.length}</strong>
              <span>${zUiText('trilha(s) liberada(s) no catalogo')}</span>
            </div>
            <div class="trein-showcase-point">
              <strong>${exibidosAgora}</strong>
              <span>${zUiText(`exibido(s) agora em ${categoriaAtivaRotulo}`)}</span>
            </div>
            <div class="trein-showcase-point">
              <strong>${obrigatoriosPendentes}</strong>
              <span>${zUiText('obrigatorio(s) ainda pendente(s)')}</span>
            </div>
          </div>
        </div>
        ${destaqueSelecionado}
      </section>

      <section class="trein-catalog-shell">
        <div class="trein-toolbar">
          <div class="trein-search">
            <span>${zUiText('BUSCA')}</span>
            <input type="text" value="${String(tBusca).replace(/"/g,'&quot;')}" placeholder="${zUiText('Buscar treinamento...')}" oninput="setTBusca(this.value)">
          </div>
          <div class="trein-statuses">
            ${Object.entries(TREIN_STATUS_META).map(([status, meta]) => `<button class="trein-status-btn ${tStatus===status?'active':''}" onclick="setTStatus('${status}')">${zUiText(meta.label)}</button>`).join('')}
          </div>
        </div>
        <div class="trein-catalog-head">
          <div>
            <div class="trein-list-count">${zUiText(`${filtrada.length} treinamento(s) exibido(s)`)}</div>
            <div class="trein-catalog-note">${zUiText('Clique em qualquer card para abrir a trilha completa logo abaixo.')}</div>
          </div>
        </div>
        <div class="trein-gallery-grid">${cards}</div>
      </section>

      <section class="trein-selected-shell" id="trein-detalhe">
        <div class="trein-selected-head">
          <div>
            <div class="trein-showcase-kicker">${zUiText('Area de estudo')}</div>
            <h3>${zUiText('Player, videos e progresso da trilha selecionada')}</h3>
          </div>
          <div class="trein-selected-note">${selecionado ? zUiText(`${videosSelecionado.length} video(s) e ${progressoSelecionado.total} aula(s) disponiveis para este treinamento.`) : zUiText('Escolha um treinamento da vitrine para assistir.')}</div>
        </div>
        ${selecionado
          ? renderTreinPainel(selecionado, progressoSelecionado, isDiretor, canDelete)
          : `<div class="trein-detail-empty">
              <div class="trein-empty-icon">${zUiText('TR')}</div>
              <div class="trein-empty-title">${zUiText('Selecione um treinamento')}</div>
              <div class="trein-empty-copy">${zUiText('Ao escolher um card, voce vera aqui o player, as aulas, o progresso e as acoes da trilha.')}</div>
            </div>`}
      </section>
    </div>`;
}

function renderTrein(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = garantirCategoriaTreinAtiva();
  const isDiretor = role === 'dir';
  const canDelete = role === 'dir' || role === 'dono';
  const compatTrein = getTreinCompatStatus();
  const base = getListaTreinBase();
  const filtrada = getListaTreinFiltrada(base);

  document.getElementById('tcats').innerHTML = cats
    .map(c => {
      const icone = c === TREIN_CAT_ALL ? zUiText('TV') : zUiText(CAT_ICON[c] || '*');
      return `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}')">${icone} ${zUiText(c)}</button>`;
    })
    .join('');

  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : '';

  document.getElementById('trein-stats').innerHTML = '';

  if(!treinSelKey || !filtrada.some(t => treinKey(t) === treinSelKey)){
    treinSelKey = (filtrada[0] && treinKey(filtrada[0])) || '';
    zSetState('state.ui.treinSelecionado', treinSelKey);
  }

  const selecionado = filtrada.find(t => treinKey(t) === treinSelKey) || null;
  if(selecionado) garantirTreinVideosCarregados(selecionado);

  const cards = filtrada.length
    ? filtrada.map(t => {
        const idx = TREIN.indexOf(t);
        const progresso = getTreinProgresso(t);
        const token = treinToken(t);
        const categoria = normalizarCatTrein(t.cat);
        const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
        const meta = getTreinMeta(t);
        const prerequisito = getTreinPrerequisito(t);
        const bloqueado = isTreinBloqueado(t);
        const aprovado = progresso.status === 'aprovado';
        const concluidoVisual = progresso.status === 'concluido' || aprovado;
        const acao = getTreinAcaoCatalogo(t, progresso, prerequisito);
        const resumo = getTreinResumoCatalogo(t, progresso, prerequisito);
        const editBtn = isDiretor
          ? `<button type="button" class="trein-card-edit" onclick="event.stopPropagation();editarTrein(${idx})" title="${zUiText('Editar treinamento')}">${zUiText('Ed')}</button>`
          : '';
        return `<article class="trein-gallery-card ${treinKey(t)===treinSelKey?'selected':''} ${bloqueado ? 'locked' : ''}" role="button" tabindex="0" onclick="selecionarTrein('${token}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarTrein('${token}');}">
          <div class="trein-gallery-visual" style="background:${t.bg || CAT_BG_T[categoria] || '#EEF4FE'};">
            ${editBtn}
            <span class="trein-gallery-pill">${zUiText(categoria)}</span>
            <span class="trein-gallery-emoji">${zUiText(t.thumb || 'TR')}</span>
            <span class="trein-gallery-duration">${zUiText(t.dur || 'Sem duracao')}</span>
          </div>
          <div class="trein-gallery-body">
            <div class="trein-card-tags">
              <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
              ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
              ${bloqueado ? `<span class="zbg bg-r">${zUiText('Bloqueado')}</span>` : ''}
            </div>
            <div class="trein-gallery-title">${zUiHtml(t.titulo)}</div>
            <div class="trein-gallery-copy">${resumo}</div>
            <div class="trein-gallery-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${Array.isArray(t.videos) ? t.videos.length : 0} ${zUiText('video(s)')}</div>
            <div class="trein-gallery-progress">
              <div class="pb"><div class="pf ${concluidoVisual ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
              <div class="pl">${concluidoVisual ? zUiText(aprovado ? 'Certificado registrado' : 'Treinamento concluido') : `${progresso.pct}% ${zUiText('concluido')}`}</div>
            </div>
          </div>
          <div class="trein-gallery-footer">
            <div class="trein-gallery-counter">
              <strong>${progresso.concluidas}/${progresso.total}</strong>
              <span>${bloqueado ? zUiText('Aguardando liberacao') : zUiText(progresso.status === 'nao_iniciado' ? 'Pronto para assistir' : 'Progresso individual')}</span>
            </div>
            <button type="button" class="trein-gallery-action" onclick="event.stopPropagation();${acao.action}">${acao.label}</button>
          </div>
        </article>`;
      }).join('')
    : `<div class="trein-empty-state">
        <div class="trein-empty-icon">${zUiText('TR')}</div>
        <div class="trein-empty-title">${zUiText('Nenhum treinamento encontrado')}</div>
        <div class="trein-empty-copy">${zUiText(tBusca || tStatus !== 'todos' ? 'Ajuste sua busca ou mude o status selecionado.' : 'Nenhum treinamento cadastrado ainda.')}</div>
      </div>`;

  document.getElementById('trein-grid').innerHTML = `
    ${isDiretor && compatTrein.videosCompartilhados === false ? `<div class="trein-lock-note" style="margin-bottom:12px;"><strong>${zUiText('Atencao com os videos')}</strong>${zUiText('O banco de treinamentos ainda nao possui o campo de videos. Enquanto isso, os materiais ficam presos ao navegador onde foram cadastrados e podem sumir para outros usuarios.')}</div>` : ''}
    <div class="trein-vitrine trein-vitrine-minimal">
      <section class="trein-catalog-shell trein-catalog-shell-minimal">
        <div class="trein-toolbar trein-toolbar-inline">
          <div class="trein-search trein-search-inline">
            <input type="text" value="${String(tBusca).replace(/"/g,'&quot;')}" placeholder="${zUiText('Buscar treinamento...')}" oninput="setTBusca(this.value)">
          </div>
          <div class="trein-statuses">
            ${Object.entries(TREIN_STATUS_META).map(([status, meta]) => `<button class="trein-status-btn ${tStatus===status?'active':''}" onclick="setTStatus('${status}')">${zUiText(meta.label)}</button>`).join('')}
          </div>
        </div>
        <div class="trein-catalog-head trein-catalog-head-minimal">
          <div class="trein-list-count">${zUiText(`${filtrada.length} treinamento(s) exibido(s)`)}</div>
          <div class="trein-catalog-note">${zUiText('Clique em qualquer card para abrir a trilha completa logo abaixo.')}</div>
        </div>
        <div class="trein-gallery-grid">${cards}</div>
      </section>
      ${selecionado
        ? `<section class="trein-selected-shell trein-selected-shell-minimal" id="trein-detalhe">
            ${renderTreinPainel(selecionado, getTreinProgresso(selecionado), isDiretor, canDelete)}
          </section>`
        : ''}
    </div>`;
}

carregarTreinProgressoLS();
carregarTreinMetaLS();

zRegisterModule('treinamentos', {
  renderTrein,
  setTcat,
  setTBusca,
  setTStatus,
  selecionarTrein,
  selecionarTreinVideo,
  iniciarTreinamento,
  marcarProximaAulaTrein,
  toggleAulaTrein,
  reiniciarTreinamento,
  emitirCertificadoTrein,
  irParaTreinamento,
  abrirModalTrein,
  editarTrein,
  excluirTrein,
  fecharMT,
  handleTreinVideoUpload,
  adicionarMtVideoYoutube,
  removerMtVideo,
  salvarTrein,
  renderProc,
  showProc
});
