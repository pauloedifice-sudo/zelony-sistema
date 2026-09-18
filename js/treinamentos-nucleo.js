// TREINAMENTOS - parte 1/4: constantes, categorias, progresso (localStorage), banco de videos e busca/filtro
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
const TREIN_CAT_ALL = 'Todos';
const TREIN_CATS_CATALOGO = [TREIN_CAT_ALL, 'Corretor', 'CapitÃ£o', 'Gerente'];
const TREIN_STATUS_META = {
  todos: { label: 'Todos' },
  nao_iniciado: { label: 'Não iniciados', badge: 'Não iniciado', cls: 'idle' },
  em_andamento: { label: 'Em andamento', badge: 'Em andamento', cls: 'progress' },
  concluido: { label: 'Concluído', badge: 'Concluído', cls: 'done' }
};

TREIN_STATUS_META.aprovado = { label: 'Aprovados', badge: 'Certificado', cls: 'approved' };

let tcatAtivo = TREIN_CAT_ALL;
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
  return true;
}

function getCategoriasTreinHierarquia(roleAtual = role){
  if(['dir','dono','fin','rh'].includes(roleAtual)) return ['Corretor','Capitão','Gerente'];
  if(roleAtual === 'ger') return ['Corretor','Capitão','Gerente'];
  if(roleAtual === 'cap') return ['Corretor','Capitão'];
  return [categoriaTreinPorRole()];
}

function getTreinCompatStatus(){
  return typeof getTreinamentosCompatStatus === 'function'
    ? getTreinamentosCompatStatus()
    : { origem:'desconhecida', videosCompartilhados:true, regrasCompartilhadas:true };
}

function treinVideosCompartilhadosNoBanco(){
  return getTreinCompatStatus().videosCompartilhados !== false;
}

function getCategoriasTreinVisiveis(){
  return getCategoriasTreinHierarquia();
}

function getListaTreinPorCategorias(categorias){
  const listaCategorias = Array.isArray(categorias) ? categorias : [categorias];
  const permitidas = new Set(listaCategorias.map(item => normalizarCatTrein(item)));
  return TREIN.filter(t => permitidas.has(normalizarCatTrein(t && t.cat)));
}

function getCategoriaTreinComConteudo(cats = getCategoriasTreinVisiveis()){
  return cats.find(cat => getListaTreinPorCategorias(cat).length) || cats[0] || 'Corretor';
}

function garantirCategoriaTreinAtiva(){
  const cats = getCategoriasTreinVisiveis();
  const atual = normalizarCatTrein(tcatAtivo);
  const temCategoriaAtual = cats.includes(atual);
  const autoPriorizarCategoriaComConteudo = !podeAlternarCategoriaTrein() && cats.length > 1;
  const existeConteudoEmOutraCategoria = cats.some(cat => getListaTreinPorCategorias(cat).length);
  const categoriaVazia = !getListaTreinPorCategorias(atual).length;

  if(!temCategoriaAtual || (autoPriorizarCategoriaComConteudo && categoriaVazia && existeConteudoEmOutraCategoria)){
    const proxima = getCategoriaTreinComConteudo(cats);
    if(proxima && proxima !== tcatAtivo){
      tcatAtivo = proxima;
      zSetState('state.ui.tcatAtivo', tcatAtivo);
    }
  }

  return cats;
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
        <strong>${zUiHtml(video.nome)}</strong>
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
  return getListaTreinPorCategorias(tcatAtivo);
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

