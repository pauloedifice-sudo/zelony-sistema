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
const TREIN_META_KEY = 'zel_trein_meta_v1';
const TREIN_STATUS_META = {
  todos: { label: 'Todos' },
  nao_iniciado: { label: 'Não iniciados', badge: 'Não iniciado', cls: 'idle' },
  em_andamento: { label: 'Em andamento', badge: 'Em andamento', cls: 'progress' },
  concluido: { label: 'Concluído', badge: 'Concluído', cls: 'done' }
};

TREIN_STATUS_META.aprovado = { label: 'Aprovados', badge: 'Certificado', cls: 'approved' };

let tcatAtivo = 'Corretor';
let emojiSel = '🏠';
let editIdx = -1;
let tBusca = '';
let tStatus = 'todos';
let treinSelKey = '';
let TREIN_PROGRESSO = {};
let TREIN_META = {};
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
zSetState('state.ui.treinMeta', TREIN_META);
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

function carregarTreinMetaLS(){
  try{
    const raw = localStorage.getItem(TREIN_META_KEY);
    TREIN_META = raw ? JSON.parse(raw) : {};
  }catch(e){
    TREIN_META = {};
  }
  zSetState('state.ui.treinMeta', TREIN_META);
}

function salvarTreinMetaLS(){
  try{
    localStorage.setItem(TREIN_META_KEY, JSON.stringify(TREIN_META));
  }catch(e){}
  zSetState('state.ui.treinMeta', TREIN_META);
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

function getTreinMetaKey(t){
  return treinKey(t);
}

function getTreinMeta(t){
  if(!t) return { obrigatorio: false, prerequisito: '' };
  const chave = getTreinMetaKey(t);
  return {
    obrigatorio: !!t.obrigatorio,
    prerequisito: t.prerequisito || '',
    ...((TREIN_META || {})[chave] || {})
  };
}

function setTreinMeta(t, parcial){
  const chave = getTreinMetaKey(t);
  TREIN_META[chave] = { ...getTreinMeta(t), ...parcial };
  if(t){
    t.obrigatorio = !!TREIN_META[chave].obrigatorio;
    t.prerequisito = TREIN_META[chave].prerequisito || '';
  }
  if(!TREIN_META[chave].obrigatorio && !TREIN_META[chave].prerequisito){
    delete TREIN_META[chave];
  }
  salvarTreinMetaLS();
}

function limparTreinMeta(t){
  const chave = getTreinMetaKey(t);
  if(t){
    delete t.obrigatorio;
    delete t.prerequisito;
  }
  if(TREIN_META[chave]){
    delete TREIN_META[chave];
    salvarTreinMetaLS();
  }
}

function limparDependenciasTrein(chaveTrein){
  let alterou = false;
  Object.keys(TREIN_META || {}).forEach(chave => {
    const meta = TREIN_META[chave];
    if(meta && meta.prerequisito === chaveTrein){
      const treinamento = TREIN.find(item => treinKey(item) === chave);
      if(treinamento) treinamento.prerequisito = '';
      TREIN_META[chave] = { ...meta, prerequisito: '' };
      if(!TREIN_META[chave].obrigatorio) delete TREIN_META[chave];
      alterou = true;
    }
  });
  if(alterou) salvarTreinMetaLS();
}

function getTreinPrerequisito(t){
  const meta = getTreinMeta(t);
  return meta.prerequisito ? TREIN.find(item => treinKey(item) === meta.prerequisito) || null : null;
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

function getTreinAulasFallback(t, total){
  const totalAulas = Number.isInteger(total) ? total : getTreinLicoes(t).length;
  const pctFallback = Math.max(0, Math.min(100, parseInt(t && t.prog, 10) || 0));
  const concluidas = !totalAulas
    ? 0
    : (pctFallback >= 100 ? totalAulas : Math.max(0, Math.floor((pctFallback / 100) * totalAulas)));
  return Array.from({ length: concluidas }, (_, idx) => idx);
}

function criarTreinProgressoInicial(t){
  const agora = new Date().toISOString();
  const total = getTreinLicoes(t).length;
  const aulas = getTreinAulasFallback(t, total);
  return {
    aulas,
    iniciadaEm: agora,
    atualizadaEm: agora,
    concluidaEm: total && aulas.length >= total ? agora : null
  };
}

function getTreinProgresso(t){
  const licoes = getTreinLicoes(t);
  const bruto = getTreinProgressoBruto(t);
  const aulasFeitas = Array.isArray(bruto && bruto.aulas)
    ? bruto.aulas.filter(n => Number.isInteger(n)).sort((a,b) => a - b)
    : getTreinAulasFallback(t, licoes.length);
  const concluidas = aulasFeitas.length;
  const total = licoes.length;
  const pctReal = total ? Math.round((concluidas / total) * 100) : 0;
  const pctFallback = Math.max(0, Math.min(100, parseInt(t && t.prog, 10) || 0));
  const statusReal = concluidas === 0 ? 'nao_iniciado' : (concluidas >= total ? 'concluido' : 'em_andamento');
  const certificadoEm = bruto && bruto.certificadoEm || null;
  const statusBase = bruto ? statusReal : (pctFallback >= 100 ? 'concluido' : (pctFallback > 0 ? 'em_andamento' : 'nao_iniciado'));
  const status = certificadoEm && concluidas >= total ? 'aprovado' : statusBase;
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
    certificadoEm,
    proxima,
    temProgressoBruto: !!bruto
  };
}

function isTreinAprovado(t){
  const status = getTreinProgresso(t).status;
  return status === 'aprovado' || status === 'concluido';
}

function isTreinBloqueado(t){
  const prereq = getTreinPrerequisito(t);
  return !!(prereq && !isTreinAprovado(prereq));
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
    const videosLocais = await listarTreinVideosDB(chave);
    const videosPersistidos = Array.isArray(t && t.videos) ? t.videos.map(v => ({ ...v, provider: getTreinVideoProvider(v) })) : [];
    const locaisPorId = new Map(videosLocais.map(video => [video.id, { ...video, provider: 'local' }]));
    const combinados = videosPersistidos.map(video => locaisPorId.get(video.id) ? { ...video, ...locaisPorId.get(video.id) } : { ...video });

    videosLocais.forEach(video => {
      if(!combinados.some(item => item.id === video.id)){
        combinados.push({ ...video, provider: 'local' });
      }
    });

    setTreinVideosCache(chave, combinados.sort((a,b) => (a.ordem || 0) - (b.ordem || 0)));
  }catch(e){
    console.warn('Erro ao carregar vídeos do treinamento:', e.message);
    setTreinVideosCache(chave, Array.isArray(t && t.videos) ? t.videos.map(v => ({ ...v, provider: getTreinVideoProvider(v) })) : []);
  }finally{
    delete TREIN_VIDEO_LOADING[chave];
    if(treinSelKey === chave) renderTrein();
  }
}

function getTreinVideos(t){
  return TREIN_VIDEOS[treinKey(t)] || (Array.isArray(t && t.videos) ? t.videos : []);
}

function getTreinVideoProvider(video){
  if(!video) return 'local';
  if(video.provider) return video.provider;
  if(video.youtubeVideoId || video.youtubeUrl || video.embedUrl) return 'youtube';
  return 'local';
}

function isTreinVideoYoutube(video){
  return getTreinVideoProvider(video) === 'youtube';
}

function extrairTreinYoutubeVideoId(url){
  const bruto = String(url || '').trim();
  if(!bruto) return '';

  try{
    const parsed = new URL(bruto);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if(host === 'youtu.be'){
      return (parsed.pathname.split('/').filter(Boolean)[0] || '').trim();
    }

    if(host.endsWith('youtube.com')){
      if(parsed.pathname === '/watch') return String(parsed.searchParams.get('v') || '').trim();
      const partes = parsed.pathname.split('/').filter(Boolean);
      const marcador = partes.findIndex(parte => ['embed', 'shorts', 'live'].includes(parte));
      if(marcador >= 0 && partes[marcador + 1]) return String(partes[marcador + 1]).trim();
    }
  }catch(e){}

  const fallback = bruto.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return fallback ? String(fallback[1] || '').trim() : '';
}

function getTreinVideoYoutubeId(video){
  if(!video) return '';
  return String(
    video.youtubeVideoId ||
    extrairTreinYoutubeVideoId(video.youtubeUrl) ||
    extrairTreinYoutubeVideoId(video.embedUrl)
  ).trim();
}

function getTreinVideoYoutubeUrl(video){
  const id = getTreinVideoYoutubeId(video);
  return id ? `https://youtu.be/${id}` : '';
}

function getTreinVideoEmbedUrl(video){
  const id = getTreinVideoYoutubeId(video);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
}

function getTreinVideoThumb(video){
  const id = getTreinVideoYoutubeId(video);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

function getTreinVideoSrc(video){
  if(!video) return '';
  if(isTreinVideoYoutube(video)) return getTreinVideoEmbedUrl(video);
  if(video.dataUrl) return video.dataUrl;
  if(video.objectUrl) return video.objectUrl;
  if(video.blob) video.objectUrl = URL.createObjectURL(video.blob);
  return video.objectUrl || '';
}

function gerarTreinVideoId(chave, idx){
  return `${chave}::${Date.now()}::${idx}::${Math.random().toString(16).slice(2,8)}`;
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    if(!blob) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao converter o video para compartilhamento.'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl, mimeFallback='video/mp4'){
  if(!dataUrl || typeof dataUrl !== 'string') return null;
  const partes = dataUrl.split(',');
  if(partes.length < 2) return null;
  const meta = partes[0] || '';
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : mimeFallback;
  const bin = atob(partes[1]);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function normalizarTreinVideoCompartilhado(video, idx, chave){
  const id = video.id || gerarTreinVideoId(chave, idx);
  if(isTreinVideoYoutube(video)){
    const youtubeVideoId = getTreinVideoYoutubeId(video);
    if(!youtubeVideoId) throw new Error('Link do YouTube invalido.');
    return {
      id,
      trainingKey: chave,
      provider: 'youtube',
      nome: String(video.nome || `Video ${idx + 1}`).trim() || `Video ${idx + 1}`,
      mime: 'video/youtube',
      size: 0,
      ordem: idx,
      youtubeUrl: getTreinVideoYoutubeUrl({ youtubeVideoId }),
      youtubeVideoId,
      embedUrl: getTreinVideoEmbedUrl({ youtubeVideoId }),
      thumbnail: getTreinVideoThumb({ youtubeVideoId }),
      dataUrl: '',
      blob: null
    };
  }
  const blob = video.blob || dataUrlToBlob(video.dataUrl, video.mime || 'video/mp4');
  const dataUrl = video.dataUrl || await blobToDataUrl(blob);
  return {
    id,
    trainingKey: chave,
    provider: 'local',
    nome: video.nome,
    mime: video.mime || (blob && blob.type) || 'video/mp4',
    size: video.size || (blob && blob.size) || 0,
    ordem: idx,
    dataUrl,
    blob: blob || null
  };
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

async function sincronizarTreinVideosLocal(t, videosModal){
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

function limparCamposMtVideoYoutube(){
  const nomeInput = document.getElementById('mt-video-nome');
  const urlInput = document.getElementById('mt-video-youtube-url');
  if(nomeInput) nomeInput.value = '';
  if(urlInput) urlInput.value = '';
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
  if(isTreinBloqueado(t)){
    showToast(zUiText('ðŸ”’'), zUiText('Conclua o prÃ©-requisito antes de iniciar esta trilha.'));
    return;
  }
  const bruto = getTreinProgressoBruto(t);
  if(!bruto) setTreinProgresso(t, criarTreinProgressoInicial(t));
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('▶️'), zUiText('Treinamento iniciado. Você já pode avançar pelas aulas.'));
}

function toggleAulaTrein(token, idx){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(isTreinBloqueado(t)){
    showToast(zUiText('ðŸ”’'), zUiText('Conclua o prÃ©-requisito antes de marcar aulas nesta trilha.'));
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
    showToast(zUiText('🎓'), zUiText('Treinamento concluído com sucesso!'));
  }
}

function marcarProximaAulaTrein(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  if(isTreinBloqueado(t)){
    showToast(zUiText('ðŸ”’'), zUiText('Conclua o prÃ©-requisito antes de continuar esta trilha.'));
    return;
  }
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

function emitirCertificadoTrein(token){
  const t = getTreinPorToken(token);
  if(!t) return;
  const progresso = getTreinProgresso(t);
  if(progresso.certificadoEm){
    showToast(zUiText('OK'), zUiText('Este certificado ja foi registrado.'));
    return;
  }
  if(progresso.concluidas < progresso.total){
    showToast(zUiText('âš ï¸'), zUiText('Conclua todas as aulas antes de emitir o certificado.'));
    return;
  }
  setTreinProgresso(t, {
    certificadoEm: new Date().toISOString(),
    atualizadaEm: new Date().toISOString()
  });
  treinSelKey = treinKey(t);
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
  showToast(zUiText('ðŸŽ“'), zUiText('Certificado registrado com sucesso.'));
}

function irParaTreinamento(chave){
  if(!chave) return;
  treinSelKey = chave;
  zSetState('state.ui.treinSelecionado', treinSelKey);
  renderTrein();
}

function getListaTreinBase(){
  return TREIN.filter(t => normalizarCatTrein(t.cat) === tcatAtivo);
}

function getListaTreinFiltrada(lista){
  return lista
    .filter(t => !tBusca || `${t.titulo} ${normalizarCatTrein(t.cat)} ${t.dur}`.toLowerCase().includes(tBusca.toLowerCase()))
    .filter(t => tStatus === 'todos' || getTreinProgresso(t).status === tStatus)
    .sort((a,b) => {
      const ordem = { em_andamento: 0, nao_iniciado: 1, concluido: 2, aprovado: 3 };
      const pa = getTreinProgresso(a);
      const pb = getTreinProgresso(b);
      return ((ordem[pa.status] ?? 99) - (ordem[pb.status] ?? 99)) || a.titulo.localeCompare(b.titulo);
    });
}

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
              <strong>${zUiText(licao.titulo)}</strong>
              <small>${zUiText(licao.resumo)}</small>
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
            <div class="trein-card-title">${zUiText(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div>
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
  tcatAtivo = c;
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

  select.innerHTML = `<option value="">Nenhum</option>${opcoes.map(t => `<option value="${treinKey(t)}">${zUiText(t.titulo)}</option>`).join('')}`;
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
        <div class="trein-detail-title">${zUiText(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha prática para acelerar a execução da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiText(t.dur)}</span>
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
          return `<button class="trein-lesson ${done ? 'done' : ''}" ${bloqueado ? 'disabled' : ''} ${bloqueado ? '' : `onclick="toggleAulaTrein('${token}', ${licao.idx})"`}>
            <span class="trein-lesson-check">${done ? zUiText('✓') : licao.idx + 1}</span>
            <span class="trein-lesson-main">
              <strong>${zUiText(licao.titulo)}</strong>
              <small>${zUiText(licao.resumo)}</small>
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
            <div class="trein-card-title">${zUiText(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div>
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
        <div class="trein-detail-title">${zUiText(t.titulo)}</div>
        <div class="trein-detail-copy">${zUiText('Trilha pratica para acelerar a execucao da equipe com etapas simples, progresso individual e continuidade clara.')}</div>
        <div class="trein-detail-meta">
          <span>${t.aulas} ${zUiText('aulas')}</span>
          <span>${zUiText(t.dur)}</span>
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
              <strong>${zUiText(video.nome)}</strong>
              <small>${isTreinVideoYoutube(video) ? zUiText('YouTube') : fmtTamanho(video.size || 0)}</small>
            </span>
          </button>`).join('')}
        </div>` : `
        <div class="trein-video-empty">${zUiText('Nenhum video foi enviado para este treinamento ainda.')}</div>
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
              <strong>${zUiText(licao.titulo)}</strong>
              <small>${zUiText(licao.resumo)}</small>
            </span>
            <span class="trein-lesson-state">${bloqueado ? zUiText('Bloqueado') : (done ? zUiText('Concluida') : zUiText('Concluir'))}</span>
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
            <div class="trein-card-title">${zUiText(t.titulo)}</div>
            <div class="trein-card-meta">${t.aulas} ${zUiText('aulas')} ${zUiText('·')} ${zUiText(t.dur)}</div>
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
        <strong>${zUiText(video.nome)}</strong>
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
      showToast(zUiText('!'), zUiText('Treinamento salvo, mas os videos nao puderam ser gravados neste navegador.'));
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
