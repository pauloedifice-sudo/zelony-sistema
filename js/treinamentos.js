// TREINAMENTOS

const CAT_BADGE = {
  Corretor: 'bg-b',
  Capitao: 'bg-p',
  'Capitão': 'bg-p',
  'CapitÃ£o': 'bg-p',
  'CapitÃƒÂ£o': 'bg-p',
  Gerente: 'bg-g'
};

const CAT_ICON = {
  Corretor: '👤',
  Capitao: '⭐',
  'Capitão': '⭐',
  'CapitÃ£o': '⭐',
  'CapitÃƒÂ£o': '⭐',
  Gerente: '🏆'
};

const EMOJIS_T = ['🏠','🤝','📄','📋','📊','💬','🎯','📈','⚖️','🏆','💡','🔑','📚','🎓','💼','📝','🔎','💰','👥','🌟'];

const CAT_BG_T = {
  Corretor: '#EEF4FE',
  Capitao: '#F4EEFE',
  'Capitão': '#F4EEFE',
  'CapitÃ£o': '#F4EEFE',
  'CapitÃƒÂ£o': '#F4EEFE',
  Gerente: '#E8F5EE'
};

const TREIN_PROGRESS_KEY = 'zel_trein_progresso_v1';
const TREIN_VIDEO_DB = 'zel_trein_videos_v1';
const TREIN_VIDEO_STORE = 'videos';
const TREIN_VIDEO_MAX_MB = 80;
const TREIN_STATUS_META = {
  todos: { label: 'Todos' },
  nao_iniciado: { label: 'Não iniciados', badge: 'Não iniciado', cls: 'idle' },
  em_andamento: { label: 'Em andamento', badge: 'Em andamento', cls: 'progress' },
  concluido: { label: 'Concluído', badge: 'Concluído', cls: 'done' }
};

let tcatAtivo = 'Corretor';
let emojiSel = '🏠';
let editIdx = -1;
let tBusca = '';
let tStatus = 'todos';
let treinSelKey = '';
let TREIN_PROGRESSO = {};
let TREIN_VIDEOS = {};
let TREIN_VIDEO_LOADING = {};
let TREIN_VIDEO_SELECIONADO = {};
let mtVideos = [];
let mtVideosLoading = false;
let treinVideoDBPromise = null;

zSetState('state.ui.tcatAtivo', tcatAtivo);
zSetState('state.ui.emojiSel', emojiSel);
zSetState('state.ui.editTreinIdx', editIdx);
zSetState('state.ui.treinBusca', tBusca);
zSetState('state.ui.treinStatus', tStatus);
zSetState('state.ui.treinSelecionado', treinSelKey);
zSetState('state.ui.treinProgresso', TREIN_PROGRESSO);
zSetState('state.ui.treinVideos', TREIN_VIDEOS);

function normalizarCatTrein(cat){
  const mapa = { cor:'Corretor', cap:'Capitão', ger:'Gerente' };
  const perfil = typeof getPerfil === 'function' ? getPerfil(cat) : '';
  return mapa[perfil] || 'Corretor';
}

function categoriaTreinPorRole(){
  const mapa = { cor:'Corretor', cap:'Capitão', ger:'Gerente' };
  return mapa[role] || 'Corretor';
}

function podeAlternarCategoriaTrein(){
  return ['dir','dono','fin','rh'].includes(role);
}

function getCategoriasTreinVisiveis(){
  if(podeAlternarCategoriaTrein()) return ['Corretor','Capitão','Gerente'];
  return [categoriaTreinPorRole()];
}

function carregarTreinProgressoLS(){
  try{
    const raw = localStorage.getItem(TREIN_PROGRESS_KEY);
    TREIN_PROGRESSO = raw ? JSON.parse(raw) : {};
  }catch(e){
    TREIN_PROGRESSO = {};
  }
  zSetState('state.ui.treinProgresso', TREIN_PROGRESSO);
}

function salvarTreinProgressoLS(){
  try{
    localStorage.setItem(TREIN_PROGRESS_KEY, JSON.stringify(TREIN_PROGRESSO));
  }catch(e){}
  zSetState('state.ui.treinProgresso', TREIN_PROGRESSO);
}

function getTreinUsuarioKey(){
  if(usuarioLogado && usuarioLogado.id) return `id:${usuarioLogado.id}`;
  if(usuarioLogado && usuarioLogado.email) return `mail:${String(usuarioLogado.email).toLowerCase()}`;
  return `role:${role || 'cor'}`;
}

function treinKey(t){
  if(t && t.id != null) return `id:${t.id}`;
  return `${normalizarCatTrein(t && t.cat)}::${String((t && t.titulo) || '').trim().toUpperCase()}`;
}

function treinToken(t){
  return encodeURIComponent(treinKey(t));
}

function decodeTreinToken(token){
  try{
    return decodeURIComponent(token || '');
  }catch(e){
    return token || '';
  }
}

function getTreinPorToken(token){
  const chave = decodeTreinToken(token);
  return TREIN.find(t => treinKey(t) === chave) || null;
}

function getTreinLicoes(t){
  const total = Math.max(parseInt(t && t.aulas, 10) || 0, 1);
  const base = [
    'Visão geral do processo',
    'Fundamentos do atendimento',
    'Execução prática',
    'Simulação aplicada',
    'Checklist de qualidade',
    'Objeções e respostas',
    'Ferramentas e rotina',
    'Padrão Zelony',
    'Revisão final',
    'Validação e fechamento'
  ];
  return Array.from({length: total}, (_, idx) => ({
    idx,
    titulo: base[idx] || `Aula ${idx + 1}`,
    resumo: `Etapa ${idx + 1} de ${total}`
  }));
}

function getTreinProgressoBruto(t){
  const userKey = getTreinUsuarioKey();
  const chave = treinKey(t);
  return (((TREIN_PROGRESSO || {})[userKey] || {})[chave]) || null;
}

function getTreinProgresso(t){
  const licoes = getTreinLicoes(t);
  const bruto = getTreinProgressoBruto(t);
  const aulasFeitas = Array.isArray(bruto && bruto.aulas)
    ? bruto.aulas.filter(n => Number.isInteger(n)).sort((a,b) => a - b)
    : [];
  const concluidas = aulasFeitas.length;
  const total = licoes.length;
  const pctReal = total ? Math.round((concluidas / total) * 100) : 0;
  const pctFallback = Math.max(0, Math.min(100, parseInt(t && t.prog, 10) || 0));
  const statusReal = concluidas === 0 ? 'nao_iniciado' : (concluidas >= total ? 'concluido' : 'em_andamento');
  const status = bruto ? statusReal : (pctFallback >= 100 ? 'concluido' : (pctFallback > 0 ? 'em_andamento' : 'nao_iniciado'));
  const proxima = licoes.find(l => !aulasFeitas.includes(l.idx)) || null;

  return {
    aulas: aulasFeitas,
    concluidas,
    total,
    pctReal,
    pct: bruto ? pctReal : pctFallback,
    status,
    iniciadaEm: bruto && bruto.iniciadaEm || null,
    concluidaEm: bruto && bruto.concluidaEm || null,
    atualizadaEm: bruto && bruto.atualizadaEm || null,
    proxima
  };
}

function setTreinProgresso(t, parcial){
  const userKey = getTreinUsuarioKey();
  const chave = treinKey(t);
  TREIN_PROGRESSO[userKey] = TREIN_PROGRESSO[userKey] || {};
  const atual = TREIN_PROGRESSO[userKey][chave] || {};
  TREIN_PROGRESSO[userKey][chave] = { ...atual, ...parcial };
  salvarTreinProgressoLS();
}

function limparTreinProgresso(t){
  const userKey = getTreinUsuarioKey();
  const chave = treinKey(t);
  if(TREIN_PROGRESSO[userKey]){
    delete TREIN_PROGRESSO[userKey][chave];
    if(!Object.keys(TREIN_PROGRESSO[userKey]).length) delete TREIN_PROGRESSO[userKey];
    salvarTreinProgressoLS();
  }
}

function abrirTreinVideoDB(){
  if(!window.indexedDB) return Promise.reject(new Error('indexedDB indisponível'));
  if(treinVideoDBPromise) return treinVideoDBPromise;
  treinVideoDBPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TREIN_VIDEO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(TREIN_VIDEO_STORE)){
        const store = db.createObjectStore(TREIN_VIDEO_STORE, { keyPath: 'id' });
        store.createIndex('trainingKey', 'trainingKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir o banco local de vídeos.'));
  });
  return treinVideoDBPromise;
}

function revogarTreinVideoUrls(lista){
  (lista || []).forEach(video => {
    if(video && video.objectUrl){
      try{ URL.revokeObjectURL(video.objectUrl); }catch(e){}
    }
  });
}

function setTreinVideosCache(chave, videos){
  revogarTreinVideoUrls(TREIN_VIDEOS[chave]);
  TREIN_VIDEOS[chave] = videos || [];
  zSetState('state.ui.treinVideos', TREIN_VIDEOS);
}

async function listarTreinVideosDB(chave){
  const db = await abrirTreinVideoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TREIN_VIDEO_STORE, 'readonly');
    const store = tx.objectStore(TREIN_VIDEO_STORE);
    const idx = store.index('trainingKey');
    const req = idx.getAll(chave);
    req.onsuccess = () => resolve((req.result || []).sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).map(v => ({ ...v, objectUrl: null })));
    req.onerror = () => reject(req.error || new Error('Falha ao carregar os vídeos do treinamento.'));
  });
}

async function garantirTreinVideosCarregados(t){
  const chave = treinKey(t);
  if(TREIN_VIDEOS[chave] || TREIN_VIDEO_LOADING[chave]) return;
  TREIN_VIDEO_LOADING[chave] = true;
  try{
    setTreinVideosCache(chave, await listarTreinVideosDB(chave));
  }catch(e){
    console.warn('Erro ao carregar vídeos do treinamento:', e.message);
    setTreinVideosCache(chave, []);
  }finally{
    delete TREIN_VIDEO_LOADING[chave];
    if(treinSelKey === chave) renderTrein();
  }
}

function getTreinVideos(t){
  return TREIN_VIDEOS[treinKey(t)] || [];
}

function getTreinVideoSrc(video){
  if(!video) return '';
  if(video.objectUrl) return video.objectUrl;
  if(video.blob) video.objectUrl = URL.createObjectURL(video.blob);
  return video.objectUrl || '';
}

function getTreinVideoAtivoId(t, videos){
  const chave = treinKey(t);
  const atual = TREIN_VIDEO_SELECIONADO[chave];
  if(atual && videos.some(v => v.id === atual)) return atual;
  const primeiro = videos[0] ? videos[0].id : '';
  TREIN_VIDEO_SELECIONADO[chave] = primeiro;
  return primeiro;
}

function selecionarTreinVideo(token, videoId){
  const t = getTreinPorToken(token);
  if(!t) return;
  TREIN_VIDEO_SELECIONADO[treinKey(t)] = videoId;
  renderTrein();
}

async function sincronizarTreinVideos(t, videosModal){
  const chave = treinKey(t);
  const db = await abrirTreinVideoDB();
  const atuais = await listarTreinVideosDB(chave);
  const manterIds = new Set((videosModal || []).filter(v => v.id).map(v => v.id));
  const removerIds = atuais.filter(v => !manterIds.has(v.id)).map(v => v.id);

  if(removerIds.length){
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TREIN_VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(TREIN_VIDEO_STORE);
      removerIds.forEach(id => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao remover vídeos do treinamento.'));
    });
  }

  const novos = (videosModal || []).filter(v => v.blob);
  if(novos.length){
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TREIN_VIDEO_STORE, 'readwrite');
      const store = tx.objectStore(TREIN_VIDEO_STORE);
      novos.forEach((video, idx) => store.put({
        id: `${chave}::${Date.now()}::${idx}::${Math.random().toString(16).slice(2,8)}`,
        trainingKey: chave,
        nome: video.nome,
        mime: video.mime,
        size: video.size,
        ordem: (videosModal || []).findIndex(v => v === video),
        blob: video.blob
      }));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar os vídeos do treinamento.'));
    });
  }

  setTreinVideosCache(chave, await listarTreinVideosDB(chave));
}

function resetMtVideos(){
  mtVideos = [];
  mtVideosLoading = false;
}

function limparTreinProgressoGlobal(t){
  const chave = treinKey(t);
  Object.keys(TREIN_PROGRESSO || {}).forEach(userKey => {
    if(TREIN_PROGRESSO[userKey] && TREIN_PROGRESSO[userKey][chave]){
      delete TREIN_PROGRESSO[userKey][chave];
      if(!Object.keys(TREIN_PROGRESSO[userKey]).length) delete TREIN_PROGRESSO[userKey];
    }
  });
  salvarTreinProgressoLS();
}

async function limparTreinVideosTreinamento(t){
  const chave = treinKey(t);
  const atuais = TREIN_VIDEOS[chave] || [];
  atuais.forEach(v => { if(v && v.objectUrl) URL.revokeObjectURL(v.objectUrl); });
  delete TREIN_VIDEOS[chave];
  delete TREIN_VIDEO_LOADING[chave];
  delete TREIN_VIDEO_SELECIONADO[chave];
  zSetState('state.ui.treinVideos', TREIN_VIDEOS);

  try{
    const db = await abrirTreinVideoDB();
    const ids = (await listarTreinVideosDB(chave)).map(v => v.id);
    if(ids.length){
      await new Promise((resolve, reject) => {
        const tx = db.transaction(TREIN_VIDEO_STORE, 'readwrite');
        const store = tx.objectStore(TREIN_VIDEO_STORE);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Falha ao limpar os vídeos do treinamento.'));
      });
    }
  }catch(e){
    console.warn('Falha ao limpar vídeos do treinamento:', e.message);
  }
}

function renderMtVideos(){
  const el = document.getElementById('mt-videos-list');
  if(!el) return;
  if(mtVideosLoading){
    el.innerHTML = `<div class="trein-video-empty">${zUiText('Carregando vídeos do treinamento...')}</div>`;
    return;
  }
  if(!mtVideos.length){
    el.innerHTML = `<div class="trein-video-empty">${zUiText('Nenhum vídeo anexado ainda.')}</div>`;
    return;
  }
  el.innerHTML = mtVideos.map((video, idx) => {
    const detalhe = [zUiText(video.mime || 'vídeo'), fmtTamanho(video.size || 0)].filter(Boolean).join(` ${zUiText('·')} `);
    return `<div class="trein-video-item">
      <div class="trein-video-item-icon">${zUiText('🎬')}</div>
      <div class="trein-video-item-main">
        <strong>${zUiText(video.nome)}</strong>
        <small>${detalhe}</small>
      </div>
      <span class="trein-video-item-badge ${video.id ? 'saved' : 'new'}">${zUiText(video.id ? 'Salvo' : 'Novo')}</span>
      <button type="button" class="btn-c trein-video-remove" onclick="removerMtVideo(${idx}, event)">${zUiText('Remover')}</button>
    </div>`;
  }).join('');
}

async function carregarMtVideosTrein(t){
  mtVideosLoading = true;
  renderMtVideos();
  await garantirTreinVideosCarregados(t);
  mtVideos = getTreinVideos(t).map(v => ({ ...v }));
  mtVideosLoading = false;
  renderMtVideos();
}

function handleTreinVideoUpload(input){
  const arquivos = Array.from(input.files || []);
  if(!arquivos.length) return;
  const validos = [];
  arquivos.forEach(file => {
    if(!(file.type || '').startsWith('video/')){
      showToast(zUiText('⚠️'), zUiText(`"${file.name}" não é um arquivo de vídeo válido.`));
      return;
    }
    if(file.size > TREIN_VIDEO_MAX_MB * 1024 * 1024){
      showToast(zUiText('⚠️'), zUiText(`"${file.name}" ultrapassa ${TREIN_VIDEO_MAX_MB}MB.`));
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
    showToast(zUiText('🎬'), zUiText(`${validos.length} vídeo${validos.length>1?'s':''} adicionado${validos.length>1?'s':''} ao treinamento.`));
  }
  input.value = '';
}

function removerMtVideo(idx, e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
  const video = mtVideos[idx];
  if(!video) return;
  if(video.objectUrl){
    try{ URL.revokeObjectURL(video.objectUrl); }catch(err){}
  }
  mtVideos.splice(idx, 1);
  renderMtVideos();
}

function setTBusca(valor){
  tBusca = valor || '';
  zSetState('state.ui.treinBusca', tBusca);
  renderTrein();
}

function setTStatus(status){
  tStatus = status || 'todos';
  zSetState('state.ui.treinStatus', tStatus);
  renderTrein();
}

function selecionarTrein(token){
  treinSelKey = decodeTreinToken(token);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
}

function iniciarTreinamento(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  const bruto = getTreinProgressoBruto(t);
  if(!bruto){
    setTreinProgresso(t, {
      aulas: [],
      iniciadaEm: new Date().toISOString(),
      atualizadaEm: new Date().toISOString(),
      concluidaEm: null
    });
  }
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('▶️'), zUiText('Treinamento iniciado. Você já pode avançar pelas aulas.'));
}

function toggleAulaTrein(token, idx){
  const t = getTreinPorToken(token);
  if(!t) return;
  const bruto = getTreinProgressoBruto(t) || {
    aulas: [],
    iniciadaEm: new Date().toISOString(),
    concluidaEm: null
  };
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
    atualizadaEm: new Date().toISOString()
  });

  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();

  if(concluido){
    showToast(zUiText('🎓'), zUiText('Treinamento concluído com sucesso!'));
  }
}

function marcarProximaAulaTrein(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  const progresso = getTreinProgresso(t);
  if(!progresso.proxima){
    showToast(zUiText('✅'), zUiText('Este treinamento já está concluído.'));
    return;
  }
  toggleAulaTrein(token, progresso.proxima.idx);
}

function reiniciarTreinamento(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(!confirm(zUiText('Deseja reiniciar este treinamento e limpar seu progresso atual?'))) return;
  limparTreinProgresso(t);
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('↺'), zUiText('Progresso reiniciado.'));
}

function getListaTreinBase(){
  return TREIN.filter(t => normalizarCatTrein(t.cat) === tcatAtivo);
}

function getListaTreinFiltrada(lista){
  return lista
    .filter(t => !tBusca || `${t.titulo} ${normalizarCatTrein(t.cat)} ${t.dur}`.toLowerCase().includes(tBusca.toLowerCase()))
    .filter(t => tStatus === 'todos' || getTreinProgresso(t).status === tStatus)
    .sort((a,b) => {
      const ordem = { em_andamento: 0, nao_iniciado: 1, concluido: 2 };
      const pa = getTreinProgresso(a);
      const pb = getTreinProgresso(b);
      return (ordem[pa.status] - ordem[pb.status]) || a.titulo.localeCompare(b.titulo);
    });
}

function renderTreinPainel(t, progresso, isDiretor, canDelete){
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
      <div class="trein-detail-thumb" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">${zUiText(t.thumb || '📚')}</div>
      <div class="trein-detail-main">
        <div class="trein-detail-tags">
          <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
          <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
        </div>
        <div class="trein-detail-title">${zUiText(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha prática para acelerar a execução da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiText(t.dur)}</span>
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
        <strong>${progresso.pctReal}%</strong>
        <span>${zUiText(progresso.status==='concluido' ? 'Treinamento concluído' : `Próxima aula: ${proxima}`)}</span>
      </div>
      <div class="pb trein-progress-large"><div class="pf ${progresso.status==='concluido' ? 'done' : ''}" style="width:${progresso.pctReal}%"></div></div>
      <div class="trein-detail-progress-meta">
        <div><strong>${zUiText('Iniciado em')}</strong><span>${zUiText(iniciou)}</span></div>
        <div><strong>${zUiText('Atualizado em')}</strong><span>${zUiText(atualizado)}</span></div>
        <div><strong>${zUiText('Concluído em')}</strong><span>${zUiText(concluiu)}</span></div>
      </div>
    </div>

    <div class="trein-detail-actions">
      ${progresso.status === 'nao_iniciado'
        ? `<button class="btn-s" onclick="iniciarTreinamento('${token}')">${zUiText('▶️ Iniciar treinamento')}</button>`
        : `<button class="btn-s" onclick="marcarProximaAulaTrein('${token}')">${zUiText(progresso.status === 'concluido' ? '🎓 Revisar conteúdo' : '✓ Marcar próxima aula')}</button>`}
      <button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('↺ Reiniciar')}</button>
    </div>

    <div class="trein-detail-note">${zUiText('Seu progresso fica salvo neste navegador para o usuário logado.')}</div>

    <div class="trein-lessons">
      <div class="trein-lessons-head">
        <div class="trein-lessons-title">${zUiText('Roteiro de aulas')}</div>
        <div class="trein-lessons-sub">${zUiText('Marque cada etapa concluída para continuar evoluindo na trilha.')}</div>
      </div>
      <div class="trein-lessons-list">
        ${licoes.map(licao => {
          const done = progresso.aulas.includes(licao.idx);
          return `<button class="trein-lesson ${done ? 'done' : ''}" onclick="toggleAulaTrein('${token}', ${licao.idx})">
            <span class="trein-lesson-check">${done ? zUiText('✓') : licao.idx + 1}</span>
            <span class="trein-lesson-main">
              <strong>${zUiText(licao.titulo)}</strong>
              <small>${zUiText(licao.resumo)}</small>
            </span>
            <span class="trein-lesson-state">${done ? zUiText('Concluída') : zUiText('Marcar')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderTrein(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = getCategoriasTreinVisiveis();
  if(!cats.includes(normalizarCatTrein(tcatAtivo))){
    tcatAtivo = cats[0];
    zSetState('state.ui.tcatAtivo', tcatAtivo);
  }

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

  if(!treinSelKey || !base.some(t => treinKey(t) === treinSelKey)){
    treinSelKey = (filtrada[0] && treinKey(filtrada[0])) || (base[0] && treinKey(base[0])) || '';
    zSetState('state.ui.treinSelecionado', treinSelKey);
  }

  const selecionado = filtrada.find(t => treinKey(t) === treinSelKey)
    || base.find(t => treinKey(t) === treinSelKey)
    || null;

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
            <div class="trein-card-title">${zUiText(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div>
            <div class="trein-card-progress">
              <div class="pb"><div class="pf ${progresso.status==='concluido'?'done':''}" style="width:${progresso.pctReal}%"></div></div>
              <div class="pl">${progresso.status==='concluido' ? zUiText('Concluído') : `${progresso.pctReal}% ${zUiText('concluído')}`}</div>
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
  tcatAtivo = c;
  treinSelKey = '';
  zSetState('state.ui.tcatAtivo', tcatAtivo);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
}

function abrirModalTrein(){
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

function editarTrein(idx){
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

function fecharMT(){
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

function salvarTrein(){
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
      cont.appendChild(div);
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
      h += `<div class="pitem" onclick="showProc('${s}',${i})"><div class="picon">${zUiText(ic[s]?.[i] || '📋')}</div><div style="flex:1"><div class="pname">${zUiText(p.nome)}</div><div class="pdesc">${p.etapas} ${zUiText('etapas')}</div></div><span class="zbg ${p.badge}">${zUiText(p.status)}</span></div>`;
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
  det.innerHTML = `<div class="proc-d-top"><div class="proc-d-title">${zUiText(p.nome)}</div><div style="display:flex;align-items:center;gap:8px;"><span class="zbg ${p.badge}">${zUiText(p.status)}</span><button class="proc-close" onclick="document.getElementById('proc-det').classList.add('hidden')">${zUiText('✕')}</button></div></div><div class="etapa-list">${p.steps.map((s2, i2) => `<div class="etapa-item"><div class="enum">${i2 + 1}</div><div class="etxt">${zUiText(s2)}</div></div>`).join('')}</div>`;
  det.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderTreinPainel(t, progresso, isDiretor, canDelete){
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
      <div class="trein-detail-thumb" style="background:${t.bg || CAT_BG_T[normalizarCatTrein(t.cat)] || '#EEF4FE'};">${zUiText(t.thumb || '📚')}</div>
      <div class="trein-detail-main">
        <div class="trein-detail-tags">
          <span class="zbg ${CAT_BADGE[normalizarCatTrein(t.cat)] || 'bg-gr'}">${zUiText(normalizarCatTrein(t.cat))}</span>
          <span class="trein-status-chip ${statusMeta.cls}">${zUiText(statusMeta.badge)}</span>
        </div>
        <div class="trein-detail-title">${zUiText(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha prática para acelerar a execução da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiText(t.dur)}</span>
          <span>${progresso.concluidas}/${progresso.total} ${zUiText('concluídas')}</span>
          <span>${videos.length} ${zUiText(videos.length === 1 ? 'vídeo' : 'vídeos')}</span>
        </div>
      </div>
      <div class="trein-detail-admin">
        ${isDiretor ? `<button class="btn-c trein-detail-edit" onclick="editarTrein(${TREIN.indexOf(t)})">${zUiText('✏️ Editar')}</button>` : ''}
        ${canDelete ? `<button class="btn-c trein-detail-delete" onclick="excluirTrein(${TREIN.indexOf(t)})">${zUiText('🗑 Excluir')}</button>` : ''}
      </div>
    </div>

    <div class="trein-detail-progressbar">
      <div class="trein-detail-progress-top">
        <strong>${progresso.pctReal}%</strong>
        <span>${zUiText(progresso.status === 'concluido' ? 'Treinamento concluído' : `Próxima aula: ${proxima}`)}</span>
      </div>
      <div class="pb trein-progress-large"><div class="pf ${progresso.status === 'concluido' ? 'done' : ''}" style="width:${progresso.pctReal}%"></div></div>
      <div class="trein-detail-progress-meta">
        <div><strong>${zUiText('Iniciado em')}</strong><span>${zUiText(iniciou)}</span></div>
        <div><strong>${zUiText('Atualizado em')}</strong><span>${zUiText(atualizado)}</span></div>
        <div><strong>${zUiText('Concluído em')}</strong><span>${zUiText(concluiu)}</span></div>
      </div>
    </div>

    <div class="trein-detail-actions">
      ${progresso.status === 'nao_iniciado'
        ? `<button class="btn-s" onclick="iniciarTreinamento('${token}')">${zUiText('▶️ Iniciar treinamento')}</button>`
        : `<button class="btn-s" onclick="marcarProximaAulaTrein('${token}')">${zUiText(progresso.status === 'concluido' ? '🎓 Revisar conteúdo' : '✓ Marcar próxima aula')}</button>`}
      <button class="btn-c" onclick="reiniciarTreinamento('${token}')">${zUiText('↺ Reiniciar')}</button>
    </div>

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
              <strong>${zUiText(video.nome)}</strong>
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
          return `<button class="trein-lesson ${done ? 'done' : ''}" onclick="toggleAulaTrein('${token}', ${licao.idx})">
            <span class="trein-lesson-check">${done ? zUiText('✓') : licao.idx + 1}</span>
            <span class="trein-lesson-main">
              <strong>${zUiText(licao.titulo)}</strong>
              <small>${zUiText(licao.resumo)}</small>
            </span>
            <span class="trein-lesson-state">${done ? zUiText('Concluída') : zUiText('Marcar')}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function renderTrein(){
  if(!TREIN_PROGRESSO || typeof TREIN_PROGRESSO !== 'object' || Array.isArray(TREIN_PROGRESSO)){
    carregarTreinProgressoLS();
  }

  const cats = getCategoriasTreinVisiveis();
  if(!cats.includes(normalizarCatTrein(tcatAtivo))){
    tcatAtivo = cats[0];
    zSetState('state.ui.tcatAtivo', tcatAtivo);
  }

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

  if(!treinSelKey || !base.some(t => treinKey(t) === treinSelKey)){
    treinSelKey = (filtrada[0] && treinKey(filtrada[0])) || (base[0] && treinKey(base[0])) || '';
    zSetState('state.ui.treinSelecionado', treinSelKey);
  }

  const selecionado = filtrada.find(t => treinKey(t) === treinSelKey)
    || base.find(t => treinKey(t) === treinSelKey)
    || null;

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
            <div class="trein-card-title">${zUiText(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div>
            <div class="trein-card-progress">
              <div class="pb"><div class="pf ${progresso.status==='concluido'?'done':''}" style="width:${progresso.pctReal}%"></div></div>
              <div class="pl">${progresso.status==='concluido' ? zUiText('Concluído') : `${progresso.pctReal}% ${zUiText('concluído')}`}</div>
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
  emojiSel = '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
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
  emojiSel = t.thumb || '🏠';
  atualizarProgT();
  document.getElementById('emoji-grid').innerHTML = EMOJIS_T.map(e => `<div class="em ${e===emojiSel?'sel':''}" onclick="selEmoji('${e}',this)">${zUiText(e)}</div>`).join('');
  document.getElementById('mtrein').classList.add('show');
  renderMtVideos();
  carregarMtVideosTrein(t);
  setTimeout(() => document.getElementById('mt-titulo').focus(), 100);
}

function fecharMT(){
  document.getElementById('mtrein').classList.remove('show');
  editIdx = -1;
  document.getElementById('mt-videos-input').value = '';
  resetMtVideos();
  renderMtVideos();
  zSetState('state.ui.editTreinIdx', editIdx);
}

async function salvarTrein(){
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

    try{
      await sincronizarTreinVideos(novoRef, mtVideos);
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

carregarTreinProgressoLS();

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
  abrirModalTrein,
  editarTrein,
  excluirTrein,
  fecharMT,
  handleTreinVideoUpload,
  removerMtVideo,
  salvarTrein,
  renderProc,
  showProc
});
