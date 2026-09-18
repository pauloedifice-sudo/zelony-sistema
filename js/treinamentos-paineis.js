// TREINAMENTOS - parte 3/4: modal atual de cadastro/edicao e paineis/render de treinamento
async function abrirModalTrein(){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode adicionar treinamentos.')); return; }
  editIdx = -1;
  resetMtVideos();
  document.getElementById('mt-titulo').value = '';
  document.getElementById('mt-aulas').value = '';
  document.getElementById('mt-dur').value = '';
  document.getElementById('mt-prog').value = 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(tcatAtivo);
  document.getElementById('mt-modal-title').textContent = zUiText('Novo Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Adicionar treinamento');
  document.getElementById('mt-videos-input').value = '';
  limparCamposMtVideoYoutube();
  document.getElementById('mt-required').checked = false;
  emojiSel = '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  atualizarMtRegras();
  renderMtVideos();
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

async function editarTrein(idx){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode editar treinamentos.')); return; }
  const t = TREIN[idx];
  editIdx = idx;
  resetMtVideos();
  document.getElementById('mt-titulo').value = t.titulo;
  document.getElementById('mt-aulas').value = t.aulas;
  document.getElementById('mt-dur').value = t.dur;
  document.getElementById('mt-prog').value = t.prog || 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(normalizarCatTrein(t.cat));
  document.getElementById('mt-modal-title').textContent = zUiText('Editar Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Salvar alterações');
  document.getElementById('mt-videos-input').value = '';
  limparCamposMtVideoYoutube();
  emojiSel = t.thumb || '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  atualizarMtRegras(t);
  document.getElementById('mtrein').classList.add('show');
  renderMtVideos();
  carregarMtVideosTrein(t);
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function fecharMT(){
  document.getElementById('mtrein').classList.remove('show');
  editIdx = -1;
  document.getElementById('mt-videos-input').value = '';
  limparCamposMtVideoYoutube();
  resetMtVideos();
  renderMtVideos();
  zSetState('state.ui.editTreinIdx', editIdx);
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
    showToast(zUiText('⚠️'), zUiText('Informe o título do treinamento.'));
    return;
  }
  if(!aulas || aulas < 1){
    document.getElementById('mt-aulas').focus();
    showToast(zUiText('⚠️'), zUiText('Informe o número de aulas.'));
    return;
  }
  if(!dur){
    document.getElementById('mt-dur').focus();
    showToast(zUiText('⚠️'), zUiText('Informe a duração.'));
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
      showToast(zUiText('✅'), zUiText(`"${titulo}" atualizado com sucesso!`));
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
      showToast(zUiText('✅'), zUiText(`"${titulo}" adicionado com sucesso!`));
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
      console.error('Erro ao salvar vídeos do treinamento:', e);
      showToast(zUiText('⚠️'), zUiText('Treinamento salvo, mas os vídeos não puderam ser gravados neste navegador.'));
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
    showToast(zUiText('❌'), zUiText('Não foi possível salvar o treinamento.'));
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

async function excluirTrein(idx){
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os treinamentos estão em modo consulta.'})) return;
  if(role!=='dir' && role!=='dono'){
    showToast(zUiText('🔒'), zUiText('Apenas Dono ou Diretor podem excluir treinamentos.'));
    return;
  }
  const t = TREIN[idx];
  if(!t) return;
  const confirmar = window.confirm(zUiText(`Excluir o treinamento "${t.titulo}"? Essa ação não pode ser desfeita.`));
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
    showToast(zUiText('🗑'), zUiText('Treinamento excluído com sucesso.'));
  }catch(e){
    console.error('Erro ao excluir treinamento:', e);
    showToast(zUiText('❌'), zUiText('Não foi possível excluir o treinamento.'));
  }
}

// Override the active training rendering with the consolidated rules flow.
function renderTreinPainel(t, progresso, isDiretor, canDelete){
  const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
  const licoes = getTreinLicoes(t);
  const token = treinToken(t);
  const videos = getTreinVideos(t);
  const videosLoading = !!TREIN_VIDEO_LOADING[treinKey(t)];
  const videoAtivoId = getTreinVideoAtivoId(t, videos);
  const videoAtivo = videos.find(v => v.id === videoAtivoId) || videos[0] || null;
  const iniciou = progresso.iniciadaEm ? new Date(progresso.iniciadaEm).toLocaleDateString('pt-BR') : '-';
  const concluiu = progresso.concluidaEm ? new Date(progresso.concluidaEm).toLocaleDateString('pt-BR') : '-';
  const atualizado = progresso.atualizadaEm ? new Date(progresso.atualizadaEm).toLocaleDateString('pt-BR') : '-';
  const certificado = progresso.certificadoEm ? new Date(progresso.certificadoEm).toLocaleDateString('pt-BR') : '-';
  const proxima = progresso.proxima ? `${zUiText(progresso.proxima.titulo)} - ${zUiText(progresso.proxima.resumo)}` : zUiText('Todas as aulas concluidas');
  const meta = getTreinMeta(t);
  const prerequisito = getTreinPrerequisito(t);
  const bloqueado = isTreinBloqueado(t);
  const aprovado = progresso.status === 'aprovado';
  const concluidoVisual = progresso.status === 'concluido' || aprovado;
  const rotuloConcluirAula = progresso.proxima
    ? zUiText(progresso.total > 1 ? `Concluir aula ${progresso.proxima.idx + 1}` : 'Concluir aula')
    : zUiText('Concluir aula');
  const resumoStatus = bloqueado
    ? zUiText(`Conclua o pre-requisito "${prerequisito?.titulo || ''}" para liberar esta trilha.`)
    : aprovado
      ? zUiText(`Certificado registrado em ${certificado}.`)
      : progresso.status === 'concluido'
        ? zUiText('Todas as aulas foram marcadas. Clique em "Concluir treinamento" para finalizar a trilha.')
        : zUiText(`Proxima aula para concluir: ${proxima}`);
  const acaoPrincipal = bloqueado
    ? `<button class="btn-s" onclick="irParaTreinamento('${prerequisito ? treinKey(prerequisito) : ''}')">${zUiText('Abrir pre-requisito')}</button>`
    : aprovado
      ? ''
      : progresso.status === 'concluido'
        ? `<button class="btn-s" onclick="emitirCertificadoTrein('${token}')">${zUiText('Concluir treinamento')}</button>`
        : `<button class="btn-s" onclick="marcarProximaAulaTrein('${token}')">${rotuloConcluirAula}</button>`;
  const acaoSecundaria = bloqueado
    ? ''
    : aprovado
      ? `<button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('Refazer trilha')}</button>`
      : progresso.concluidas > 0
        ? `<button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('Reiniciar')}</button>`
        : '';
  const notaBloqueio = bloqueado
    ? `<div class="trein-lock-note"><strong>${zUiText('Trilha bloqueada')}</strong>${zUiText(`Conclua primeiro "${prerequisito?.titulo || ''}" para liberar este treinamento e os proximos passos da trilha.`)}</div>`
    : '';
  const notaCertificado = aprovado
    ? `<div class="trein-cert-note"><strong>${zUiText('Certificacao registrada')}</strong>${zUiText(`Voce concluiu esta trilha e o certificado foi emitido em ${certificado}.`)}</div>`
    : (progresso.status === 'concluido'
      ? `<div class="trein-cert-note"><strong>${zUiText('Ultimo passo')}</strong>${zUiText('Todas as aulas foram concluidas. Agora clique em "Concluir treinamento" para finalizar a trilha.')}</div>`
      : '');
  const destaquePrerequisito = prerequisito
    ? `<div class="trein-prereq-banner ${bloqueado ? 'locked' : 'done'}">
        <strong>${zUiText(bloqueado ? 'Liberacao por pre-requisito' : 'Pre-requisito concluido')}</strong>
        <span>${zUiText(bloqueado ? `Finalize "${prerequisito.titulo}" para liberar este treinamento.` : `Este treinamento foi liberado apos a conclusao de "${prerequisito.titulo}".`)}</span>
      </div>`
    : '';
  const videosCompartilhados = treinVideosCompartilhadosNoBanco();
  const avisoCompatVideos = !videosCompartilhados && (isDiretor || !videos.length)
    ? `<div class="trein-lock-note"><strong>${zUiText(isDiretor ? 'Videos ainda nao compartilhados' : 'Videos indisponiveis neste acesso')}</strong>${zUiText(isDiretor ? 'A tabela de treinamentos ainda nao suporta videos compartilhados no banco. Hoje eles ficam apenas no navegador onde foram cadastrados.' : 'Este treinamento pode ter sido salvo apenas no navegador original. Por isso os videos nao apareceram neste acesso.')}</div>`
    : '';
  const videoAtivoEmbed = videoAtivo && isTreinVideoYoutube(videoAtivo) ? getTreinVideoEmbedUrl(videoAtivo) : '';
  const playerPrincipal = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? `<iframe class="trein-video-player is-embed" src="${videoAtivoEmbed}" title="${String(videoAtivo.nome || 'Video do treinamento').replace(/"/g,'&quot;')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    : `<video class="trein-video-player" controls preload="metadata" src="${getTreinVideoSrc(videoAtivo)}"></video>`;
  const metaVideoAtivo = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? zUiText('YouTube - video incorporado')
    : `${zUiText(videoAtivo?.mime || 'Video')} ${zUiText('·')} ${fmtTamanho(videoAtivo?.size || 0)}`;
  const acaoVideoAtivo = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? `<a class="btn-c trein-video-watch-link" href="${getTreinVideoYoutubeUrl(videoAtivo)}" target="_blank" rel="noopener noreferrer">${zUiText('Abrir no YouTube')}</a>`
    : '';

  return `<div class="trein-detail-panel">
    <div class="trein-detail-hero">
      <div class="trein-detail-thumb" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">${zUiText(t.thumb || 'TR')}</div>
      <div class="trein-detail-main">
        <div class="trein-detail-tags">
          <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
          <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
          ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
        </div>
        <div class="trein-detail-title">${zUiHtml(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha pratica para acelerar a execucao da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiHtml(t.dur)}</span>
          <span>${progresso.concluidas}/${progresso.total} ${zUiText('concluidas')}</span>
          <span>${videos.length} ${zUiText(videos.length === 1 ? 'video' : 'videos')}</span>
        </div>
        <div class="trein-rule-chips">
          ${meta.obrigatorio ? `<span class="trein-rule-chip">${zUiText('Obrigatorio')}</span>` : ''}
          ${prerequisito ? `<span class="trein-rule-chip ${bloqueado ? 'locked' : 'done'}">${zUiText('Pre-requisito')}: ${zUiText(prerequisito.titulo)}</span>` : ''}
        </div>
        ${destaquePrerequisito}
      </div>
      <div class="trein-detail-admin">
        ${isDiretor ? `<button class="btn-c trein-detail-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('Editar')}</button>` : ''}
        ${canDelete ? `<button class="btn-c trein-detail-delete" onclick="excluirTrein(${TREIN.indexOf(t)})">${zUiText('Excluir')}</button>` : ''}
      </div>
    </div>

    <div class="trein-detail-progressbar">
      <div class="trein-detail-progress-top">
        <strong>${progresso.pct}%</strong>
        <span>${resumoStatus}</span>
      </div>
      <div class="pb trein-progress-large"><div class="pf ${concluidoVisual ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
      <div class="trein-detail-progress-meta">
        <div><strong>${zUiText('Iniciado em')}</strong><span>${zUiText(iniciou)}</span></div>
        <div><strong>${zUiText('Atualizado em')}</strong><span>${zUiText(atualizado)}</span></div>
        <div><strong>${zUiText('Concluido em')}</strong><span>${zUiText(concluiu)}</span></div>
        ${aprovado ? `<div><strong>${zUiText('Certificado')}</strong><span>${zUiText(certificado)}</span></div>` : ''}
      </div>
    </div>

    <div class="trein-detail-actions">
      ${acaoPrincipal}
      ${acaoSecundaria}
    </div>

    ${notaBloqueio}
    ${notaCertificado}
    ${avisoCompatVideos}
    <div class="trein-detail-note">${zUiText('O video fica livre para assistir. Quando terminar, use "Concluir aula" para avancar na trilha deste usuario.')}</div>

    <div class="trein-videos-panel">
      <div class="trein-videos-head">
        <div>
          <div class="trein-lessons-title">${zUiText('Videos do treinamento')}</div>
          <div class="trein-lessons-sub">${zUiText('Assista aos materiais gravados para acompanhar o conteudo da trilha.')}</div>
        </div>
        ${isDiretor ? `<button class="btn-c trein-videos-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('Gerenciar videos')}</button>` : ''}
      </div>
      ${videosLoading ? `<div class="trein-video-empty">${zUiText('Carregando videos...')}</div>` : videos.length ? `
        <div class="trein-video-player-wrap">
          ${playerPrincipal}
          <div class="trein-video-player-meta">
            <strong>${zUiText(videoAtivo.nome)}</strong>
            <span>${metaVideoAtivo}</span>
            ${acaoVideoAtivo}
          </div>
        </div>
        <div class="trein-video-playlist">
          ${videos.map(video => `<button class="trein-video-row ${video.id === videoAtivoId ? 'active' : ''}" onclick="selecionarTreinVideo('${token}', '${video.id}')">
            <span class="trein-video-row-icon">${zUiText('▶')}</span>
            <span class="trein-video-row-main">
              <strong>${zUiHtml(video.nome)}</strong>
              <small>${isTreinVideoYoutube(video) ? zUiText('YouTube') : fmtTamanho(video.size || 0)}</small>
            </span>
          </button>`).join('')}
        </div>` : `
        <div class="trein-video-empty">${zUiText(videosCompartilhados ? 'Nenhum video foi enviado para este treinamento ainda.' : (isDiretor ? 'Os videos deste treinamento ficaram apenas no navegador onde foram cadastrados.' : 'Os videos deste treinamento nao estao disponiveis neste acesso.'))}</div>
      `}
    </div>

    <div class="trein-lessons">
      <div class="trein-lessons-head">
        <div class="trein-lessons-title">${zUiText('Roteiro de aulas')}</div>
        <div class="trein-lessons-sub">${zUiText('Marque cada etapa concluida para continuar evoluindo na trilha.')}</div>
      </div>
      <div class="trein-lessons-list">
        ${licoes.map(licao => {
          const done = progresso.aulas.includes(licao.idx);
          return `<button class="trein-lesson ${done ? 'done' : ''}" ${bloqueado ? 'disabled' : ''} ${bloqueado ? '' : `onclick="toggleAulaTrein('${token}', ${licao.idx})"`}>
            <span class="trein-lesson-check">${done ? zUiText('✓') : licao.idx + 1}</span>
            <span class="trein-lesson-main">
              <strong>${zUiHtml(licao.titulo)}</strong>
              <small>${zUiHtml(licao.resumo)}</small>
            </span>
            <span class="trein-lesson-state">${bloqueado ? zUiText('Bloqueado') : (done ? zUiText('Concluida') : zUiText('Concluir'))}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderTreinPainel(t, progresso, isDiretor, canDelete){
  const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
  const licoes = getTreinLicoes(t);
  const token = treinToken(t);
  const videos = getTreinVideos(t);
  const videosLoading = !!TREIN_VIDEO_LOADING[treinKey(t)];
  const videoAtivoId = getTreinVideoAtivoId(t, videos);
  const videoAtivo = videos.find(v => v.id === videoAtivoId) || videos[0] || null;
  const iniciou = progresso.iniciadaEm ? new Date(progresso.iniciadaEm).toLocaleDateString('pt-BR') : '-';
  const concluiu = progresso.concluidaEm ? new Date(progresso.concluidaEm).toLocaleDateString('pt-BR') : '-';
  const atualizado = progresso.atualizadaEm ? new Date(progresso.atualizadaEm).toLocaleDateString('pt-BR') : '-';
  const certificado = progresso.certificadoEm ? new Date(progresso.certificadoEm).toLocaleDateString('pt-BR') : '-';
  const proxima = progresso.proxima ? `${zUiText(progresso.proxima.titulo)} - ${zUiText(progresso.proxima.resumo)}` : zUiText('Todas as aulas concluidas');
  const meta = getTreinMeta(t);
  const prerequisito = getTreinPrerequisito(t);
  const bloqueado = isTreinBloqueado(t);
  const aprovado = progresso.status === 'aprovado';
  const concluidoVisual = progresso.status === 'concluido' || aprovado;
  const rotuloConcluirAula = progresso.proxima
    ? zUiText(progresso.total > 1 ? `Concluir aula ${progresso.proxima.idx + 1}` : 'Concluir aula')
    : zUiText('Concluir aula');
  const resumoStatus = bloqueado
    ? zUiText(`Conclua o pre-requisito "${prerequisito?.titulo || ''}" para liberar esta trilha.`)
    : aprovado
      ? zUiText(`Certificado registrado em ${certificado}.`)
      : progresso.status === 'concluido'
        ? zUiText('Todas as aulas foram marcadas. Clique em "Concluir treinamento" para finalizar a trilha.')
        : zUiText(`Proxima aula para concluir: ${proxima}`);
  const acaoPrincipal = bloqueado
    ? `<button class="btn-s" onclick="irParaTreinamento('${prerequisito ? treinKey(prerequisito) : ''}')">${zUiText('Abrir pre-requisito')}</button>`
    : aprovado
      ? ''
      : progresso.status === 'concluido'
        ? `<button class="btn-s" onclick="emitirCertificadoTrein('${token}')">${zUiText('Concluir treinamento')}</button>`
        : `<button class="btn-s" onclick="marcarProximaAulaTrein('${token}')">${rotuloConcluirAula}</button>`;
  const acaoSecundaria = bloqueado
    ? ''
    : aprovado
      ? `<button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('Refazer trilha')}</button>`
      : progresso.concluidas > 0
        ? `<button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('Reiniciar')}</button>`
        : '';
  const notaBloqueio = bloqueado
    ? `<div class="trein-lock-note"><strong>${zUiText('Trilha bloqueada')}</strong>${zUiText(`Conclua primeiro "${prerequisito?.titulo || ''}" para liberar este treinamento e os proximos passos da trilha.`)}</div>`
    : '';
  const notaCertificado = aprovado
    ? `<div class="trein-cert-note"><strong>${zUiText('Certificacao registrada')}</strong>${zUiText(`Voce concluiu esta trilha e o certificado foi emitido em ${certificado}.`)}</div>`
    : (progresso.status === 'concluido'
      ? `<div class="trein-cert-note"><strong>${zUiText('Ultimo passo')}</strong>${zUiText('Todas as aulas foram concluidas. Agora clique em "Concluir treinamento" para finalizar a trilha.')}</div>`
      : '');
  const destaquePrerequisito = prerequisito
    ? `<div class="trein-prereq-banner ${bloqueado ? 'locked' : 'done'}">
        <strong>${zUiText(bloqueado ? 'Liberacao por pre-requisito' : 'Pre-requisito concluido')}</strong>
        <span>${zUiText(bloqueado ? `Finalize "${prerequisito.titulo}" para liberar este treinamento.` : `Este treinamento foi liberado apos a conclusao de "${prerequisito.titulo}".`)}</span>
      </div>`
    : '';
  const videosCompartilhados = treinVideosCompartilhadosNoBanco();
  const avisoCompatVideos = !videosCompartilhados && (isDiretor || !videos.length)
    ? `<div class="trein-lock-note"><strong>${zUiText(isDiretor ? 'Videos ainda nao compartilhados' : 'Videos indisponiveis neste acesso')}</strong>${zUiText(isDiretor ? 'A tabela de treinamentos ainda nao suporta videos compartilhados no banco. Hoje eles ficam apenas no navegador onde foram cadastrados.' : 'Este treinamento pode ter sido salvo apenas no navegador original. Por isso os videos nao apareceram neste acesso.')}</div>`
    : '';
  const videoAtivoEmbed = videoAtivo && isTreinVideoYoutube(videoAtivo) ? getTreinVideoEmbedUrl(videoAtivo) : '';
  const playerPrincipal = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? `<iframe class="trein-video-player is-embed" src="${videoAtivoEmbed}" title="${String(videoAtivo.nome || 'Video do treinamento').replace(/"/g,'&quot;')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    : `<video class="trein-video-player" controls preload="metadata" src="${getTreinVideoSrc(videoAtivo)}"></video>`;
  const metaVideoAtivo = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? zUiText('YouTube - video incorporado')
    : `${zUiText(videoAtivo?.mime || 'Video')} ${zUiText('·')} ${fmtTamanho(videoAtivo?.size || 0)}`;
  const acaoVideoAtivo = videoAtivo && isTreinVideoYoutube(videoAtivo)
    ? `<a class="btn-c trein-video-watch-link" href="${getTreinVideoYoutubeUrl(videoAtivo)}" target="_blank" rel="noopener noreferrer">${zUiText('Abrir no YouTube')}</a>`
    : '';
  const avisos = [notaBloqueio, notaCertificado, avisoCompatVideos].filter(Boolean).join('');
  const playlistHtml = videos.length
    ? videos.map((video, idx) => {
        const thumbUrl = isTreinVideoYoutube(video) ? getTreinVideoThumb(video) : '';
        const metaLinha = [
          zUiText(`Video ${idx + 1}`),
          isTreinVideoYoutube(video) ? zUiText('YouTube') : fmtTamanho(video.size || 0)
        ].filter(Boolean).join(` ${zUiText('·')} `);
        return `<button class="trein-video-row ${video.id === videoAtivoId ? 'active' : ''}" onclick="selecionarTreinVideo('${token}', '${video.id}')">
          <span class="trein-video-row-thumb ${thumbUrl ? 'has-image' : ''}">
            ${thumbUrl
              ? `<img src="${thumbUrl}" alt="${String(video.nome || `Video ${idx + 1}`).replace(/"/g,'&quot;')}">`
              : `<span class="trein-video-row-fallback">${zUiText('▶')}</span>`}
          </span>
          <span class="trein-video-row-main">
            <strong>${zUiHtml(video.nome)}</strong>
            <small>${metaLinha}</small>
          </span>
          <span class="trein-video-row-status">${video.id === videoAtivoId ? zUiText('Assistindo') : `#${idx + 1}`}</span>
        </button>`;
      }).join('')
    : `<div class="trein-video-empty">${zUiText(videosCompartilhados ? 'Nenhum video foi enviado para este treinamento ainda.' : (isDiretor ? 'Os videos deste treinamento ficaram apenas no navegador onde foram cadastrados.' : 'Os videos deste treinamento nao estao disponiveis neste acesso.'))}</div>`;
  const licoesHtml = licoes.map(licao => {
    const done = progresso.aulas.includes(licao.idx);
    const atual = !done && progresso.proxima && progresso.proxima.idx === licao.idx;
    return `<button class="trein-lesson ${done ? 'done' : ''} ${atual ? 'current' : ''}" ${bloqueado ? 'disabled' : ''} ${bloqueado ? '' : `onclick="toggleAulaTrein('${token}', ${licao.idx})"`}>
      <span class="trein-lesson-check">${done ? zUiText('✓') : licao.idx + 1}</span>
      <span class="trein-lesson-main">
        <strong>${zUiHtml(licao.titulo)}</strong>
        <small>${zUiHtml(licao.resumo)}</small>
      </span>
      <span class="trein-lesson-state">${bloqueado ? zUiText('Bloqueado') : (done ? zUiText('Concluida') : (atual ? zUiText('Proxima') : zUiText('Concluir')))}</span>
    </button>`;
  }).join('');

  return `<div class="trein-detail-panel trein-detail-panel-watch">
    <div class="trein-detail-hero">
      <div class="trein-detail-thumb" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">${zUiText(t.thumb || 'TR')}</div>
      <div class="trein-detail-main">
        <div class="trein-detail-tags">
          <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
          <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
          ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
        </div>
        <div class="trein-detail-title">${zUiHtml(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha pratica para acelerar a execucao da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiHtml(t.dur)}</span>
          <span>${progresso.concluidas}/${progresso.total} ${zUiText('concluidas')}</span>
          <span>${videos.length} ${zUiText(videos.length === 1 ? 'video' : 'videos')}</span>
        </div>
        <div class="trein-rule-chips">
          ${meta.obrigatorio ? `<span class="trein-rule-chip">${zUiText('Obrigatorio')}</span>` : ''}
          ${prerequisito ? `<span class="trein-rule-chip ${bloqueado ? 'locked' : 'done'}">${zUiText('Pre-requisito')}: ${zUiText(prerequisito.titulo)}</span>` : ''}
        </div>
        ${destaquePrerequisito}
      </div>
      <div class="trein-detail-admin">
        ${isDiretor ? `<button class="btn-c trein-detail-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('Editar')}</button>` : ''}
        ${canDelete ? `<button class="btn-c trein-detail-delete" onclick="excluirTrein(${TREIN.indexOf(t)})">${zUiText('Excluir')}</button>` : ''}
      </div>
    </div>

    <div class="trein-detail-progressbar">
      <div class="trein-detail-progress-top">
        <strong>${progresso.pct}%</strong>
        <span>${resumoStatus}</span>
      </div>
      <div class="pb trein-progress-large"><div class="pf ${concluidoVisual ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
      <div class="trein-detail-progress-meta">
        <div><strong>${zUiText('Iniciado em')}</strong><span>${zUiText(iniciou)}</span></div>
        <div><strong>${zUiText('Atualizado em')}</strong><span>${zUiText(atualizado)}</span></div>
        <div><strong>${zUiText('Concluido em')}</strong><span>${zUiText(concluiu)}</span></div>
        ${aprovado ? `<div><strong>${zUiText('Certificado')}</strong><span>${zUiText(certificado)}</span></div>` : ''}
      </div>
    </div>

    <div class="trein-detail-actions">
      ${acaoPrincipal}
      ${acaoSecundaria}
    </div>

    ${avisos ? `<div class="trein-detail-alerts">${avisos}</div>` : ''}

    <div class="trein-watch-layout">
      <section class="trein-watch-main">
        <div class="trein-video-stage">
          <div class="trein-video-stage-head">
            <div class="trein-video-stage-copy">
              <div class="trein-video-stage-kicker">${zUiText('Modo de estudo')}</div>
              <h3>${zUiText(videoAtivo ? videoAtivo.nome : 'Video principal do treinamento')}</h3>
              <p>${zUiText(videos.length ? 'Player central para assistir sem distracao e avancar a trilha logo em seguida.' : 'Assim que houver video publicado, ele aparece aqui em destaque para toda a equipe.')}</p>
            </div>
            <div class="trein-video-stage-tools">
              ${acaoVideoAtivo}
              ${isDiretor ? `<button class="btn-c trein-videos-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('Gerenciar videos')}</button>` : ''}
            </div>
          </div>
          ${videosLoading ? `<div class="trein-video-empty">${zUiText('Carregando videos...')}</div>` : videos.length ? `
            <div class="trein-video-stage-frame">
              ${playerPrincipal}
            </div>
            <div class="trein-video-stage-footer">
              <div class="trein-video-stage-meta">
                <strong>${zUiText(videoAtivo.nome)}</strong>
                <span>${metaVideoAtivo}</span>
              </div>
              <div class="trein-video-stage-hint">${zUiText('Assista e depois clique em "Concluir aula" para registrar o avanço desta trilha.')}</div>
            </div>
          ` : `
            <div class="trein-video-empty">${zUiText(videosCompartilhados ? 'Nenhum video foi enviado para este treinamento ainda.' : (isDiretor ? 'Os videos deste treinamento ficaram apenas no navegador onde foram cadastrados.' : 'Os videos deste treinamento nao estao disponiveis neste acesso.'))}</div>
          `}
        </div>
      </section>

      <aside class="trein-watch-side">
        <section class="trein-side-card">
          <div class="trein-side-card-head">
            <div>
              <div class="trein-side-card-kicker">${zUiText('Playlist')}</div>
              <h4>${zUiText('Sequencia de videos')}</h4>
            </div>
            <span class="trein-side-count">${videos.length}</span>
          </div>
          <div class="trein-video-playlist">${playlistHtml}</div>
        </section>

        <section class="trein-side-card">
          <div class="trein-side-card-head">
            <div>
              <div class="trein-side-card-kicker">${zUiText('Trilha')}</div>
              <h4>${zUiText('Aulas na sequencia')}</h4>
            </div>
            <span class="trein-side-count">${progresso.concluidas}/${progresso.total}</span>
          </div>
          <div class="trein-lessons-list">${licoesHtml}</div>
        </section>
      </aside>
    </div>
  </div>`;
}

function renderTrein(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = garantirCategoriaTreinAtiva();

  document.getElementById('tcats').innerHTML = cats
    .map(c => `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}')">${zUiText(CAT_ICON[c]||'⭐')} ${zUiText(c)}</button>`)
    .join('');

  const isDiretor = role === 'dir';
  const canDelete = role === 'dir' || role === 'dono';
  const compatTrein = getTreinCompatStatus();
  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : `<div class="btn-add-lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>${zUiText('Catalogo disponivel para consumo')}</div>`;

  const base = getListaTreinBase();
  const filtrada = getListaTreinFiltrada(base);
  const aprovados = base.filter(t => getTreinProgresso(t).status === 'aprovado').length;
  const emAndamento = base.filter(t => getTreinProgresso(t).status === 'em_andamento').length;
  const obrigatoriosPendentes = base.filter(t => getTreinMeta(t).obrigatorio && !isTreinAprovado(t)).length;

  document.getElementById('trein-stats').innerHTML = `
    <div class="mc a">
      <div class="mc-l">${zUiText(`Cursos ${tcatAtivo}`)}</div>
      <div class="mc-v" style="color:var(--gold);">${base.length}</div>
      <div class="mc-s">${zUiText(filtrada.length === base.length ? 'Catalogo disponivel' : `${filtrada.length} exibido(s) no filtro`)}</div>
    </div>
    <div class="mc" style="border-top-color:#3060B8;">
      <div class="mc-l">${zUiText('Certificados')}</div>
      <div class="mc-v" style="color:#3060B8;">${aprovados}</div>
      <div class="mc-s">${base.length ? `${Math.round((aprovados/base.length)*100)}% ${zUiText('do catalogo')}` : zUiText('Sem cursos')}</div>
    </div>
    <div class="mc" style="border-top-color:var(--gold);">
      <div class="mc-l">${zUiText('Em andamento')}</div>
      <div class="mc-v">${emAndamento}</div>
      <div class="mc-s">${zUiText('Cursos iniciados por voce')}</div>
    </div>
    <div class="mc" style="border-top-color:#C08020;">
      <div class="mc-l">${zUiText('Obrigatorios pendentes')}</div>
      <div class="mc-v">${obrigatoriosPendentes}</div>
      <div class="mc-s">${zUiText(obrigatoriosPendentes ? 'Pedem atencao imediata' : 'Tudo em dia')}</div>
    </div>`;

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
        const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
        const meta = getTreinMeta(t);
        const prerequisito = getTreinPrerequisito(t);
        const bloqueado = isTreinBloqueado(t);
        const aprovado = progresso.status === 'aprovado';
        const concluidoVisual = progresso.status === 'concluido' || aprovado;
        const editBtn = isDiretor
          ? `<button class="trein-card-edit" onclick="event.stopPropagation();editarTrein(${idx})" title="${zUiText('Editar treinamento')}">${zUiText('✏️')}</button>`
          : '';
        const sideLabel = bloqueado
          ? zUiText('Pre-requisito')
          : progresso.status === 'nao_iniciado'
            ? zUiText('Concluir aula')
            : progresso.status === 'concluido'
              ? zUiText('Concluir treino')
              : aprovado
                ? zUiText('Concluido')
                : zUiText('Concluir aula');
        const notaDependenciaCard = prerequisito
          ? `<div class="trein-prereq-card ${bloqueado ? 'locked' : 'done'}">
              <strong>${zUiText(bloqueado ? 'Liberado apos' : 'Pre-requisito')}</strong>
              <span>${zUiText(prerequisito.titulo)}</span>
            </div>`
          : '';
        return `<button class="trein-card ${treinKey(t)===treinSelKey?'active':''} ${bloqueado ? 'locked' : ''}" onclick="selecionarTrein('${token}')">
          <div class="trein-card-icon" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">
            ${editBtn}
            <span>${zUiText(t.thumb || '📚')}</span>
          </div>
          <div class="trein-card-main">
            <div class="trein-card-tags">
              <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
              <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
              ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatorio')}</span>` : ''}
              ${bloqueado ? `<span class="zbg bg-r">${zUiText('Bloqueado')}</span>` : ''}
            </div>
            <div class="trein-card-title">${zUiHtml(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiHtml(t.dur)}</div>
            <div class="trein-card-progress">
              <div class="pb"><div class="pf ${concluidoVisual ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
              <div class="pl">${concluidoVisual ? zUiText(aprovado ? 'Certificado' : 'Concluido') : `${progresso.pct}% ${zUiText('concluido')}`}</div>
            </div>
            ${bloqueado ? `<div class="trein-lock-note"><strong>${zUiText('Dependencia')}</strong>${zUiText(`Conclua "${prerequisito?.titulo || ''}" para liberar.`)}</div>` : ''}
            ${notaDependenciaCard}
          </div>
          <div class="trein-card-side">
            <strong>${progresso.concluidas}/${progresso.total}</strong>
            <span>${sideLabel}</span>
          </div>
        </button>`;
      }).join('')
    : `<div class="trein-empty-state">
        <div class="trein-empty-icon">${zUiText('📭')}</div>
        <div class="trein-empty-title">${zUiText('Nenhum treinamento encontrado')}</div>
        <div class="trein-empty-copy">${zUiText(tBusca || tStatus !== 'todos' ? 'Ajuste sua busca ou mude o status selecionado.' : `Nenhum treinamento cadastrado para ${tcatAtivo} ainda.`)}</div>
      </div>`;

  document.getElementById('trein-grid').innerHTML = `
    ${isDiretor && compatTrein.videosCompartilhados === false ? `<div class="trein-lock-note" style="margin-bottom:12px;"><strong>${zUiText('Atencao com os videos')}</strong>${zUiText('O banco de treinamentos ainda nao possui o campo de videos. Enquanto isso, os materiais ficam presos ao navegador onde foram cadastrados e podem sumir para outros usuarios.')}</div>` : ''}
    <div class="trein-shell">
      <div class="trein-list-col">
        <div class="trein-toolbar">
          <div class="trein-search">
            <span>${zUiText('🔎')}</span>
            <input type="text" value="${String(tBusca).replace(/"/g,'&quot;')}" placeholder="${zUiText('Buscar treinamento...')}" oninput="setTBusca(this.value)">
          </div>
          <div class="trein-statuses">
            ${Object.entries(TREIN_STATUS_META).map(([status, meta]) => `<button class="trein-status-btn ${tStatus===status?'active':''}" onclick="setTStatus('${status}')">${zUiText(meta.label)}</button>`).join('')}
          </div>
        </div>
        <div class="trein-list-count">${zUiText(`${filtrada.length} treinamento(s) exibido(s)`)}</div>
        <div class="trein-list-grid">${cards}</div>
      </div>
      <div class="trein-detail-col">
        ${selecionado
          ? renderTreinPainel(selecionado, getTreinProgresso(selecionado), isDiretor, canDelete)
          : `<div class="trein-detail-empty">
              <div class="trein-empty-icon">${zUiText('🎓')}</div>
              <div class="trein-empty-title">${zUiText('Selecione um treinamento')}</div>
              <div class="trein-empty-copy">${zUiText('Ao escolher um curso, voce vera as aulas, os videos, o progresso e as acoes para iniciar ou continuar a trilha.')}</div>
            </div>`}
      </div>
    </div>`;
}

