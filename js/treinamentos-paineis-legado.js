// TREINAMENTOS - parte 2/4: paineis de treinamento (versoes legado e intermediaria) e modal antigo de cadastro
function renderTreinPainelLegacy(t, progresso, isDiretor, canDelete){
  const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
  const licoes = getTreinLicoes(t);
  const token = treinToken(t);
  const videos = getTreinVideos(t);
  const videosLoading = !!TREIN_VIDEO_LOADING[treinKey(t)];
  const videoAtivoId = getTreinVideoAtivoId(t, videos);
  const videoAtivo = videos.find(v => v.id === videoAtivoId) || videos[0] || null;
  const iniciou = progresso.iniciadaEm ? new Date(progresso.iniciadaEm).toLocaleDateString('pt-BR') : '—';
  const concluiu = progresso.concluidaEm ? new Date(progresso.concluidaEm).toLocaleDateString('pt-BR') : '—';
  const atualizado = progresso.atualizadaEm ? new Date(progresso.atualizadaEm).toLocaleDateString('pt-BR') : '—';
  const proxima = progresso.proxima ? `${zUiText(progresso.proxima.titulo)} ${zUiText('·')} ${zUiText(progresso.proxima.resumo)}` : zUiText('Todas as aulas concluídas');

  return `<div class="trein-detail-panel">
    <div class="trein-detail-hero">
      <div class="trein-detail-thumb" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">${zUiText(t.thumb || 'TR')}</div>
      <div class="trein-detail-main">
        <div class="trein-detail-tags">
          <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
          <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
          ${meta.obrigatorio ? `<span class="zbg bg-a">${zUiText('Obrigatório')}</span>` : ''}
        </div>
        <div class="trein-detail-title">${zUiHtml(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha prática para acelerar a execução da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiHtml(t.dur)}</span>
          <span>${progresso.concluidas}/${progresso.total} ${zUiText('concluídas')}</span>
        </div>
      </div>
      <div class="trein-detail-admin">
        ${isDiretor ? `<button class="btn-c trein-detail-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('✏️ Editar')}</button>` : ''}
        ${canDelete ? `<button class="btn-c trein-detail-delete" onclick="excluirTrein(${TREIN.indexOf(t)})">${zUiText('🗑 Excluir')}</button>` : ''}
      </div>
    </div>

    <div class="trein-detail-progressbar">
      <div class="trein-detail-progress-top">
        <strong>${progresso.pct}%</strong>
        <span>${zUiText(progresso.status==='concluido' ? 'Treinamento concluído' : `Próxima aula: ${proxima}`)}</span>
      </div>
      <div class="pb trein-progress-large"><div class="pf ${progresso.status==='concluido' ? 'done' : ''}" style="width:${progresso.pct}%"></div></div>
      <div class="trein-detail-progress-meta">
        <div><strong>${zUiText('Iniciado em')}</strong><span>${zUiText(iniciou)}</span></div>
        <div><strong>${zUiText('Atualizado em')}</strong><span>${zUiText(atualizado)}</span></div>
        <div><strong>${zUiText('Concluído em')}</strong><span>${zUiText(concluiu)}</span></div>
        ${aprovado ? `<div><strong>${zUiText('Certificado')}</strong><span>${zUiText(certificado)}</span></div>` : ''}
      </div>
    </div>

    <div class="trein-detail-actions">
      ${acaoPrincipal}
      ${acaoSecundaria}
    </div>

    ${notaBloqueio}
    ${notaCertificado}
    <div class="trein-detail-note">${zUiText('Seu progresso fica salvo neste navegador para o usuário logado.')}</div>

    <div class="trein-lessons">
      <div class="trein-lessons-head">
        <div class="trein-lessons-title">${zUiText('Roteiro de aulas')}</div>
        <div class="trein-lessons-sub">${zUiText('Marque cada etapa concluída para continuar evoluindo na trilha.')}</div>
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
            <span class="trein-lesson-state">${bloqueado ? zUiText('Bloqueado') : (done ? zUiText('Concluída') : zUiText('Marcar'))}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderTreinLegacy(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = garantirCategoriaTreinAtiva();

  document.getElementById('tcats').innerHTML = cats
    .map(c => `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}')">${zUiText(CAT_ICON[c]||'⭐')} ${zUiText(c)}</button>`)
    .join('');

  const isDiretor = role === 'dir';
  const canDelete = role === 'dir' || role === 'dono';
  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : `<div class="btn-add-lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>${zUiText('Catálogo disponível para consumo')}</div>`;

  const base = getListaTreinBase();
  const filtrada = getListaTreinFiltrada(base);
  const concluidos = base.filter(t => getTreinProgresso(t).status === 'concluido').length;
  const aprovados = base.filter(t => getTreinProgresso(t).status === 'aprovado').length;
  const emAndamento = base.filter(t => getTreinProgresso(t).status === 'em_andamento').length;
  const obrigatoriosPendentes = base.filter(t => getTreinMeta(t).obrigatorio && !isTreinAprovado(t)).length;

  document.getElementById('trein-stats').innerHTML = `
    <div class="mc a">
      <div class="mc-l">${zUiText(`Cursos ${tcatAtivo}`)}</div>
      <div class="mc-v" style="color:var(--gold);">${base.length}</div>
      <div class="mc-s">${zUiText(filtrada.length === base.length ? 'Catálogo disponível' : `${filtrada.length} exibido(s) no filtro`)}</div>
    </div>
    <div class="mc" style="border-top-color:#3060B8;">
      <div class="mc-l">${zUiText('Certificados')}</div>
      <div class="mc-v" style="color:#3060B8;">${aprovados}</div>
      <div class="mc-s">${base.length ? `${Math.round((aprovados/base.length)*100)}% ${zUiText('do catálogo')}` : zUiText('Sem cursos')}</div>
    </div>
    <div class="mc" style="border-top-color:var(--gold);">
      <div class="mc-l">${zUiText('Em andamento')}</div>
      <div class="mc-v">${emAndamento}</div>
      <div class="mc-s">${zUiText('Cursos iniciados por você')}</div>
    </div>
    <div class="mc" style="border-top-color:#C08020;">
      <div class="mc-l">${zUiText('Obrigatórios pendentes')}</div>
      <div class="mc-v">${obrigatoriosPendentes}</div>
      <div class="mc-s">${zUiText(obrigatoriosPendentes ? 'Pedem atenção imediata' : 'Tudo em dia')}</div>
    </div>`;

  if(!treinSelKey || !filtrada.some(t => treinKey(t) === treinSelKey)){
    treinSelKey = (filtrada[0] && treinKey(filtrada[0])) || '';
    zSetState('state.ui.treinSelecionado', treinSelKey);
  }

  const selecionado = filtrada.find(t => treinKey(t) === treinSelKey) || null;

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
              <div class="pb"><div class="pf ${progresso.status==='concluido'?'done':''}" style="width:${progresso.pct}%"></div></div>
              <div class="pl">${progresso.status==='concluido' ? zUiText('Concluído') : `${progresso.pct}% ${zUiText('concluído')}`}</div>
            </div>
          </div>
          <div class="trein-card-side">
            <strong>${progresso.concluidas}/${progresso.total}</strong>
            <span>${progresso.status==='nao_iniciado' ? zUiText('Iniciar') : (progresso.status==='concluido' ? zUiText('Revisar') : zUiText('Continuar'))}</span>
          </div>
        </button>`;
      }).join('')
    : `<div class="trein-empty-state">
        <div class="trein-empty-icon">${zUiText('📭')}</div>
        <div class="trein-empty-title">${zUiText('Nenhum treinamento encontrado')}</div>
        <div class="trein-empty-copy">${zUiText(tBusca || tStatus !== 'todos' ? 'Ajuste sua busca ou mude o status selecionado.' : `Nenhum treinamento cadastrado para ${tcatAtivo} ainda.`)}</div>
      </div>`;

  document.getElementById('trein-grid').innerHTML = `
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
              <div class="trein-empty-copy">${zUiText('Ao escolher um curso, você verá as aulas, o progresso e as ações para iniciar ou continuar a trilha.')}</div>
            </div>`}
      </div>
    </div>`;
}

function setTcat(c){
  const cats = getCategoriasTreinVisiveis();
  const categoria = normalizarCatTrein(c);
  if(!cats.includes(categoria)) return;
  tcatAtivo = categoria;
  treinSelKey = '';
  zSetState('state.ui.tcatAtivo', tcatAtivo);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
}

function atualizarMtRegras(tAtual = null){
  const cat = tAtual ? normalizarCatTrein(tAtual.cat) : tcatAtivo;
  const meta = tAtual ? getTreinMeta(tAtual) : { obrigatorio: false, prerequisito: '' };
  const select = document.getElementById('mt-prereq');
  const checkbox = document.getElementById('mt-required');
  if(checkbox) checkbox.checked = !!meta.obrigatorio;
  if(!select) return;

  const atualKey = tAtual ? treinKey(tAtual) : '';
  const opcoes = TREIN
    .filter(t => normalizarCatTrein(t.cat) === cat && treinKey(t) !== atualKey)
    .sort((a, b) => String(a.titulo || '').localeCompare(String(b.titulo || '')));

  select.innerHTML = `<option value="">Nenhum</option>${opcoes.map(t => `<option value="${treinKey(t)}">${zUiHtml(t.titulo)}</option>`).join('')}`;
  select.disabled = !opcoes.length;
  select.value = meta.prerequisito || '';
}

function lerMtRegras(){
  return {
    obrigatorio: !!document.getElementById('mt-required')?.checked,
    prerequisito: document.getElementById('mt-prereq')?.value || ''
  };
}

function abrirModalTreinLegacy(){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode adicionar treinamentos.')); return; }
  editIdx = -1;
  document.getElementById('mt-titulo').value = '';
  document.getElementById('mt-aulas').value = '';
  document.getElementById('mt-dur').value = '';
  document.getElementById('mt-prog').value = 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(tcatAtivo);
  document.getElementById('mt-modal-title').textContent = zUiText('Novo Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Adicionar treinamento');
  emojiSel = '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function editarTreinLegacy(idx){
  if(role!=='dir'){ showToast(zUiText('🔒'), zUiText('Apenas o Diretor pode editar treinamentos.')); return; }
  const t = TREIN[idx];
  editIdx = idx;
  document.getElementById('mt-titulo').value = t.titulo;
  document.getElementById('mt-aulas').value = t.aulas;
  document.getElementById('mt-dur').value = t.dur;
  document.getElementById('mt-prog').value = t.prog || 0;
  document.getElementById('mt-cat-lbl').textContent = zUiText(normalizarCatTrein(t.cat));
  document.getElementById('mt-modal-title').textContent = zUiText('Editar Treinamento');
  document.getElementById('mt-save-btn').textContent = zUiText('✓ Salvar alterações');
  emojiSel = t.thumb || '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  document.getElementById('mtrein').classList.add('show');
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function fecharMTLegacy(){
  document.getElementById('mtrein').classList.remove('show');
  editIdx = -1;
  zSetState('state.ui.editTreinIdx', editIdx);
}

function handleBackdropT(e){
  if(e.target===document.getElementById('mtrein')) fecharMT();
}

function selEmoji(e, el){
  emojiSel = e;
  zSetState('state.ui.emojiSel', emojiSel);
  document.querySelectorAll('.em').forEach(x => x.classList.remove('sel'));
  el.classList.add('sel');
}

function atualizarProgT(){
  const v = parseInt(document.getElementById('mt-prog').value, 10) || 0;
  document.getElementById('rfill').style.width = v + '%';
  document.getElementById('rfill').className = 'rfill' + (v===100 ? ' done' : '');
  document.getElementById('rlbl').textContent = v===100 ? zUiText('✓ 100%') : v + '%';
  document.getElementById('rlbl').style.color = v===100 ? '#2E9E6E' : 'var(--gold)';
}

function salvarTreinLegacy(){
  const titulo = document.getElementById('mt-titulo').value.trim();
  const aulas = parseInt(document.getElementById('mt-aulas').value, 10);
  const dur = document.getElementById('mt-dur').value.trim();
  const prog = parseInt(document.getElementById('mt-prog').value, 10) || 0;
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
    dbSalvarTrein(TREIN[editIdx], editIdx).catch(e => console.error(e));
    showToast(zUiText('✅'), zUiText(`"${titulo}" atualizado com sucesso!`));
  }else{
    const novo = {
      titulo,
      cat: tcatAtivo,
      aulas,
      dur,
      thumb: emojiSel,
      bg: CAT_BG_T[tcatAtivo],
      prog
    };
    TREIN.push(novo);
    dbSalvarTrein(novo, -1).catch(e => console.error(e));
    showToast(zUiText('✅'), zUiText(`"${titulo}" adicionado com sucesso!`));
  }

  zSetState('state.data.treinamentos', TREIN);
  salvarLS();
  treinSelKey = '';
  zSetState('state.ui.treinSelecionado', treinSelKey);
  fecharMT();
  renderTrein();
}

function renderProc(){
  if(['cor','cap','ger'].includes(role)){
    const cont = document.getElementById('mod-proc');
    const existing = cont.querySelector('#proc-embreve');
    if(!existing){
      document.getElementById('proc-grid').innerHTML = '';
      document.getElementById('proc-det').classList.add('hidden');
      const div = document.createElement('div');
      div.id = 'proc-embreve';
      div.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;';
      div.innerHTML = `<div style="font-size:48px;">${zUiText('📋')}</div><div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:var(--gold);">${zUiText('Em Breve')}</div><div style="font-size:12px;color:var(--tm);text-align:center;max-width:280px;line-height:1.6;">${zUiText('Os Processos Operacionais estão sendo estruturados para orientar o trabalho da equipe.')}</div><div style="background:var(--gold-bg);border:1px solid var(--gold-bd);border-radius:8px;padding:8px 20px;font-size:11px;color:var(--gold);font-weight:600;">${zUiText('🔔 Em desenvolvimento')}</div>`;
      const host = cont.querySelector('.proc-wrap') || cont;
      host.appendChild(div);
    }
    return;
  }

  const eb = document.getElementById('proc-embreve');
  if(eb) eb.remove();

  const ic = {
    'Comercial': ['🔑','🤝','🏠'],
    'Jurídico': ['⚖️'],
    'Financeiro': ['💰'],
    'RH / Pessoas': ['👤','📣']
  };

  let h = '';
  Object.entries(PROC_DATA).forEach(([s, pp]) => {
    h += `<div class="proc-sec"><div class="psec-lbl">${zUiText(s)}</div>`;
    pp.forEach((p, i) => {
      h += `<div class="pitem" onclick="showProc('${s}',${i})"><div class="picon">${zUiText(ic[s]?.[i] || '📋')}</div><div style="flex:1"><div class="pname">${zUiHtml(p.nome)}</div><div class="pdesc">${p.etapas} ${zUiText('etapas')}</div></div><span class="zbg ${p.badge}">${zUiHtml(p.status)}</span></div>`;
    });
    h += '</div>';
  });
  document.getElementById('proc-grid').innerHTML = h;
  document.getElementById('proc-det').classList.add('hidden');
}

function showProc(s, i){
  const p = PROC_DATA[s][i];
  const det = document.getElementById('proc-det');
  det.classList.remove('hidden');
  det.innerHTML = `<div class="proc-d-top"><div class="proc-d-title">${zUiHtml(p.nome)}</div><div style="display:flex;align-items:center;gap:8px;"><span class="zbg ${p.badge}">${zUiHtml(p.status)}</span><button class="proc-close" onclick="document.getElementById('proc-det').classList.add('hidden')">${zUiText('✕')}</button></div></div><div class="etapa-list">${p.steps.map((s2, i2) => `<div class="etapa-item"><div class="enum">${i2 + 1}</div><div class="etxt">${zUiHtml(s2)}</div></div>`).join('')}</div>`;
  det.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderTreinPainelIntermediario(t, progresso, isDiretor, canDelete){
  const statusMeta = TREIN_STATUS_META[progresso.status] || TREIN_STATUS_META.nao_iniciado;
  const licoes = getTreinLicoes(t);
  const token = treinToken(t);
  const videos = getTreinVideos(t);
  const videosLoading = !!TREIN_VIDEO_LOADING[treinKey(t)];
  const videoAtivoId = getTreinVideoAtivoId(t, videos);
  const videoAtivo = videos.find(v => v.id === videoAtivoId) || videos[0] || null;
  const iniciou = progresso.iniciadaEm ? new Date(progresso.iniciadaEm).toLocaleDateString('pt-BR') : '—';
  const concluiu = progresso.concluidaEm ? new Date(progresso.concluidaEm).toLocaleDateString('pt-BR') : '—';
  const atualizado = progresso.atualizadaEm ? new Date(progresso.atualizadaEm).toLocaleDateString('pt-BR') : '—';
  const proxima = progresso.proxima ? `${zUiText(progresso.proxima.titulo)} ${zUiText('·')} ${zUiText(progresso.proxima.resumo)}` : zUiText('Todas as aulas concluídas');
  const certificado = progresso.certificadoEm ? new Date(progresso.certificadoEm).toLocaleDateString('pt-BR') : '—';
  const meta = getTreinMeta(t);
  const prerequisito = getTreinPrerequisito(t);
  const bloqueado = isTreinBloqueado(t);
  const aprovado = progresso.status === 'aprovado';
  const concluidoVisual = progresso.status === 'concluido' || aprovado;
  const resumoStatus = bloqueado
    ? zUiText(`Conclua o pre-requisito "${prerequisito?.titulo || ''}" para liberar esta trilha.`)
    : aprovado
      ? zUiText(`Certificado registrado em ${certificado}.`)
      : progresso.status === 'concluido'
        ? zUiText('Todas as aulas foram concluidas. Emita o certificado para finalizar a trilha.')
        : zUiText(`PrÃ³xima aula: ${proxima}`);
  const acaoPrincipal = bloqueado
    ? `<button class="btn-s" onclick="irParaTreinamento('${prerequisito ? treinKey(prerequisito) : ''}')">${zUiText('Abrir pre-requisito')}</button>`
    : progresso.status === 'nao_iniciado'
      ? `<button class="btn-s" onclick="iniciarTreinamento('${token}')">${zUiText('â–¶ï¸ Iniciar treinamento')}</button>`
      : progresso.status === 'em_andamento'
        ? `<button class="btn-s" onclick="marcarProximaAulaTrein('${token}')">${zUiText('âœ“ Marcar prÃ³xima aula')}</button>`
        : progresso.status === 'concluido'
          ? `<button class="btn-s" onclick="emitirCertificadoTrein('${token}')">${zUiText('Emitir certificado')}</button>`
          : `<button class="btn-s" onclick="reiniciarTreinamento('${token}')">${zUiText('Refazer trilha')}</button>`;
  const acaoSecundaria = (!bloqueado && !aprovado)
    ? `<button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('â†º Reiniciar')}</button>`
    : '';
  const notaBloqueio = bloqueado
    ? `<div class="trein-lock-note"><strong>${zUiText('Trilha bloqueada')}</strong>${zUiText(`Este treinamento depende da conclusao de "${prerequisito?.titulo || ''}".`)}</div>`
    : '';
  const notaCertificado = aprovado
    ? `<div class="trein-cert-note"><strong>${zUiText('Certificacao registrada')}</strong>${zUiText(`Voce concluiu esta trilha e o certificado foi emitido em ${certificado}.`)}</div>`
    : (progresso.status === 'concluido'
      ? `<div class="trein-cert-note"><strong>${zUiText('Ultimo passo')}</strong>${zUiText('Todas as aulas foram concluidas. Agora emita o certificado para marcar a trilha como finalizada.')}</div>`
      : '');
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
        <div class="trein-detail-copy">${zUiText('Trilha prática para acelerar a execução da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiHtml(t.dur)}</span>
          <span>${progresso.concluidas}/${progresso.total} ${zUiText('concluídas')}</span>
          <span>${videos.length} ${zUiText(videos.length === 1 ? 'vídeo' : 'vídeos')}</span>
        </div>
        <div class="trein-rule-chips">
          ${meta.obrigatorio ? `<span class="trein-rule-chip">${zUiText('⭐ Obrigatório')}</span>` : ''}
          ${prerequisito ? `<span class="trein-rule-chip">${zUiText('🔓 Pré-requisito')}: ${zUiText(prerequisito.titulo)}</span>` : ''}
        </div>
      </div>
      <div class="trein-detail-admin">
        ${isDiretor ? `<button class="btn-c trein-detail-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('✏️ Editar')}</button>` : ''}
        ${canDelete ? `<button class="btn-c trein-detail-delete" onclick="excluirTrein(${TREIN.indexOf(t)})">${zUiText('🗑 Excluir')}</button>` : ''}
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
        <div><strong>${zUiText('Concluído em')}</strong><span>${zUiText(concluiu)}</span></div>
        ${aprovado ? `<div><strong>${zUiText('Certificado')}</strong><span>${zUiText(certificado)}</span></div>` : ''}
      </div>
    </div>

    <div class="trein-detail-actions">
      ${acaoPrincipal}
      ${acaoSecundaria}
    </div>

    ${notaBloqueio}
    ${notaCertificado}
    <div class="trein-detail-note">${zUiText('Seu progresso fica salvo neste navegador para o usuário logado.')}</div>

    <div class="trein-videos-panel">
      <div class="trein-videos-head">
        <div>
          <div class="trein-lessons-title">${zUiText('Vídeos do treinamento')}</div>
          <div class="trein-lessons-sub">${zUiText('Assista aos materiais gravados para acompanhar o conteúdo da trilha.')}</div>
        </div>
        ${isDiretor ? `<button class="btn-c trein-videos-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('Gerenciar vídeos')}</button>` : ''}
      </div>
      ${videosLoading ? `<div class="trein-video-empty">${zUiText('Carregando vídeos...')}</div>` : videos.length ? `
        <div class="trein-video-player-wrap">
          <video class="trein-video-player" controls preload="metadata" src="${getTreinVideoSrc(videoAtivo)}"></video>
          <div class="trein-video-player-meta">
            <strong>${zUiText(videoAtivo.nome)}</strong>
            <span>${zUiText(videoAtivo.mime || 'Vídeo')} ${zUiText('·')} ${fmtTamanho(videoAtivo.size || 0)}</span>
          </div>
        </div>
        <div class="trein-video-playlist">
          ${videos.map(video => `<button class="trein-video-row ${video.id === videoAtivoId ? 'active' : ''}" onclick="selecionarTreinVideo('${token}', '${video.id}')">
            <span class="trein-video-row-icon">${zUiText('▶')}</span>
            <span class="trein-video-row-main">
              <strong>${zUiHtml(video.nome)}</strong>
              <small>${fmtTamanho(video.size || 0)}</small>
            </span>
          </button>`).join('')}
        </div>` : `
        <div class="trein-video-empty">${zUiText('Nenhum vídeo foi enviado para este treinamento ainda.')}</div>
      `}
    </div>

    <div class="trein-lessons">
      <div class="trein-lessons-head">
        <div class="trein-lessons-title">${zUiText('Roteiro de aulas')}</div>
        <div class="trein-lessons-sub">${zUiText('Marque cada etapa concluída para continuar evoluindo na trilha.')}</div>
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
            <span class="trein-lesson-state">${bloqueado ? zUiText('Bloqueado') : (done ? zUiText('Concluída') : zUiText('Marcar'))}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderTreinIntermediario(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = garantirCategoriaTreinAtiva();

  document.getElementById('tcats').innerHTML = cats
    .map(c => `<button class="cat ${tcatAtivo===c?'active':''}" onclick="setTcat('${c}')">${zUiText(CAT_ICON[c]||'⭐')} ${zUiText(c)}</button>`)
    .join('');

  const isDiretor = role === 'dir';
  const canDelete = role === 'dir' || role === 'dono';
  document.getElementById('btn-add-wrap').innerHTML = isDiretor
    ? `<button class="btn-add-trein" onclick="abrirModalTrein()"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>${zUiText('Novo treinamento')}</button>`
    : `<div class="btn-add-lock"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>${zUiText('Catálogo disponível para consumo')}</div>`;

  const base = getListaTreinBase();
  const filtrada = getListaTreinFiltrada(base);
  const concluidos = base.filter(t => getTreinProgresso(t).status === 'concluido').length;
  const emAndamento = base.filter(t => getTreinProgresso(t).status === 'em_andamento').length;
  const naoIniciados = base.filter(t => getTreinProgresso(t).status === 'nao_iniciado').length;

  document.getElementById('trein-stats').innerHTML = `
    <div class="mc a">
      <div class="mc-l">${zUiText(`Cursos ${tcatAtivo}`)}</div>
      <div class="mc-v" style="color:var(--gold);">${base.length}</div>
      <div class="mc-s">${zUiText(filtrada.length === base.length ? 'Catálogo disponível' : `${filtrada.length} exibido(s) no filtro`)}</div>
    </div>
    <div class="mc" style="border-top-color:#2E9E6E;">
      <div class="mc-l">${zUiText('Concluídos')}</div>
      <div class="mc-v" style="color:#2E9E6E;">${concluidos}</div>
      <div class="mc-s">${base.length ? `${Math.round((concluidos/base.length)*100)}% ${zUiText('do catálogo')}` : zUiText('Sem cursos')}</div>
    </div>
    <div class="mc" style="border-top-color:var(--gold);">
      <div class="mc-l">${zUiText('Em andamento')}</div>
      <div class="mc-v">${emAndamento}</div>
      <div class="mc-s">${zUiText('Cursos iniciados por você')}</div>
    </div>
    <div class="mc">
      <div class="mc-l">${zUiText('Não iniciados')}</div>
      <div class="mc-v">${naoIniciados}</div>
      <div class="mc-s">${zUiText('Ainda não começados')}</div>
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
        const editBtn = isDiretor
          ? `<button class="trein-card-edit" onclick="event.stopPropagation();editarTrein(${idx})" title="${zUiText('Editar treinamento')}">${zUiText('✏️')}</button>`
          : '';
        return `<button class="trein-card ${treinKey(t)===treinSelKey?'active':''}" onclick="selecionarTrein('${token}')">
          <div class="trein-card-icon" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">
            ${editBtn}
            <span>${zUiText(t.thumb || '📚')}</span>
          </div>
          <div class="trein-card-main">
            <div class="trein-card-tags">
              <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
              <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
            </div>
            <div class="trein-card-title">${zUiHtml(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiHtml(t.dur)}</div>
            <div class="trein-card-progress">
              <div class="pb"><div class="pf ${progresso.status==='concluido'?'done':''}" style="width:${progresso.pct}%"></div></div>
              <div class="pl">${progresso.status==='concluido' ? zUiText('Concluído') : `${progresso.pct}% ${zUiText('concluído')}`}</div>
            </div>
          </div>
          <div class="trein-card-side">
            <strong>${progresso.concluidas}/${progresso.total}</strong>
            <span>${progresso.status==='nao_iniciado' ? zUiText('Iniciar') : (progresso.status==='concluido' ? zUiText('Revisar') : zUiText('Continuar'))}</span>
          </div>
        </button>`;
      }).join('')
    : `<div class="trein-empty-state">
        <div class="trein-empty-icon">${zUiText('📭')}</div>
        <div class="trein-empty-title">${zUiText('Nenhum treinamento encontrado')}</div>
        <div class="trein-empty-copy">${zUiText(tBusca || tStatus !== 'todos' ? 'Ajuste sua busca ou mude o status selecionado.' : `Nenhum treinamento cadastrado para ${tcatAtivo} ainda.`)}</div>
      </div>`;

  document.getElementById('trein-grid').innerHTML = `
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
              <div class="trein-empty-copy">${zUiText('Ao escolher um curso, você verá as aulas, os vídeos, o progresso e as ações para iniciar ou continuar a trilha.')}</div>
            </div>`}
      </div>
    </div>`;
}

