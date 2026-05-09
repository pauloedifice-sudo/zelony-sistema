// ── SUPABASE ──────────────────────────────────────────────────────────────────
// Conexão, mappers e funções CRUD para todas as tabelas

window.ZelonyApp = window.ZelonyApp || {};
ZelonyApp.state = ZelonyApp.state || {};
ZelonyApp.state.data = ZelonyApp.state.data || {};
ZelonyApp.state.auth = ZelonyApp.state.auth || {};
ZelonyApp.state.ui = ZelonyApp.state.ui || {};
ZelonyApp.config = ZelonyApp.config || {};
ZelonyApp.modules = ZelonyApp.modules || {};

function zSetState(path, value){
  const keys = path.split('.');
  let ref = ZelonyApp;
  for(let i = 0; i < keys.length - 1; i++){
    ref[keys[i]] = ref[keys[i]] || {};
    ref = ref[keys[i]];
  }
  ref[keys[keys.length - 1]] = value;
  return value;
}

function zRegisterModule(name, api){
  ZelonyApp.modules[name] = Object.assign(ZelonyApp.modules[name] || {}, api);
  return ZelonyApp.modules[name];
}

const SB_URL='https://szaxwkfaferrfqcmzfab.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YXh3a2ZhZmVycmZxY216ZmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTk4NjksImV4cCI6MjA4OTU5NTg2OX0.JhD9PraW5tIcR6gTP_K4olC0eka8KXITu0ajcFDsnOY';
const SB_DOCS_BUCKET='documentos';
const SB_FETCH_TIMEOUT_MS=8000;
const SB_WRITE_TIMEOUT_MS=20000;

async function sbFetchComTimeout(resource, init={}){
  if(typeof fetch!=='function') throw new Error('Fetch indisponivel no ambiente atual.');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const finalInit={...(init||{})};
  const timeoutMs=Math.max(2500,parseInt(finalInit._timeoutMs,10)||SB_FETCH_TIMEOUT_MS);
  delete finalInit._timeoutMs;
  let timeoutId=null;

  if(controller){
    const signalOriginal=finalInit.signal;
    if(signalOriginal){
      if(signalOriginal.aborted){
        controller.abort();
      }else if(typeof signalOriginal.addEventListener==='function'){
        signalOriginal.addEventListener('abort',()=>controller.abort(),{once:true});
      }
    }
    finalInit.signal=controller.signal;
  }

  try{
    if(controller){
      timeoutId=setTimeout(()=>controller.abort(),timeoutMs);
    }
    return await fetch(resource, finalInit);
  }catch(error){
    const abortado=error&&(
      error.name==='AbortError'
      || /aborted|abort/i.test(String(error.message||''))
    );
    if(abortado){
      throw new Error(`Supabase timeout apos ${timeoutMs}ms`);
    }
    throw error;
  }finally{
    if(timeoutId) clearTimeout(timeoutId);
  }
}

function sbFetchComTimeoutLong(resource, init={}){
  return sbFetchComTimeout(resource,{...(init||{}),_timeoutMs:SB_WRITE_TIMEOUT_MS});
}

const sb=supabase.createClient(SB_URL, SB_KEY, {
  global: {
    fetch: sbFetchComTimeout
  }
});
const sbLong=supabase.createClient(SB_URL, SB_KEY, {
  global: {
    fetch: sbFetchComTimeoutLong
  }
});
zSetState('config.supabase', { url: SB_URL, key: SB_KEY });
zSetState('modules.supabase', { client: sb });
const VENDAS=[];
let TREIN=[];
const DOCUMENTOS=[];
let AGENDAMENTOS=[];
const FINANCEIRO_LANCAMENTOS=[];
const FINANCEIRO_COMPROVANTE_DB='zel_financeiro_comprovantes';
const FINANCEIRO_COMPROVANTE_STORE='arquivos';
const USUARIOS_PADRAO=[
  {id:1,nome:'Paulo Edifice',email:'paulo.edifice@gmail.com',tel:'',perfil:'Diretor',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
  {id:2,nome:'Giovana',email:'giovana@zelonyimoveis.com',tel:'',perfil:'RH',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
];
const SENHAS_PADRAO_MAP={'paulo.edifice@gmail.com':'Mudar@123','giovana@zelonyimoveis.com':'Mudar@123'};
const AGENDAMENTOS_SYNC_STATUS={
  tabela:'desconhecida',
  erro:'',
  sincronizando:false,
  pendentes:0,
  ultimaTentativa:'',
  ultimaSync:''
};
const SUPABASE_BOOT_STATUS={
  etapa:'inicializando',
  ultimaAtualizacao:''
};
const TREINAMENTOS_COMPAT_STATUS={
  origem:'desconhecida',
  videosCompartilhados:true,
  regrasCompartilhadas:true,
  ultimaAtualizacao:''
};
const APP_CONECTIVIDADE_STATUS={
  somenteLeitura:false,
  origem:'supabase',
  motivo:'',
  ultimaAtualizacao:''
};
let supabasePosCargaPromise=null;
let financeiroComprovanteDBPromise=null;
function setBootStage(etapa){
  const texto=String(etapa||'').trim()||'inicializando';
  SUPABASE_BOOT_STATUS.etapa=texto;
  SUPABASE_BOOT_STATUS.ultimaAtualizacao=new Date().toISOString();
  zSetState('state.sync.supabaseBoot',{...SUPABASE_BOOT_STATUS});
  return texto;
}
function getBootStage(){
  return SUPABASE_BOOT_STATUS.etapa||'inicializando';
}
function atualizarBannerConectividadeApp(){
  if(typeof document==='undefined') return;
  const docBody=document.body;
  let banner=document.getElementById('app-readonly-banner');
  if(!APP_CONECTIVIDADE_STATUS.somenteLeitura){
    if(banner) banner.remove();
    return;
  }
  if(!docBody) return;
  if(!banner){
    banner=document.createElement('div');
    banner.id='app-readonly-banner';
    banner.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100000;max-width:min(920px,calc(100vw - 32px));background:#FFF7E8;border:1px solid #E3C98C;color:#6F5720;border-radius:14px;box-shadow:0 14px 32px rgba(111,87,32,0.16);padding:12px 16px;font:600 12px/1.45 Arial,sans-serif;';
    docBody.appendChild(banner);
  }
  const motivo=String(APP_CONECTIVIDADE_STATUS.motivo||'').trim()||'Modo consulta ativo. Cadastros e alterações estão bloqueados até a conexão com o Supabase voltar.';
  banner.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><span>${zUiText('Modo consulta')}</span><span style="font-weight:500;color:#8C7340;">${zUiText(motivo)}</span><button type="button" onclick="window.location.reload()" style="margin-left:auto;background:#C9A646;color:#fff;border:0;border-radius:999px;padding:8px 14px;font:600 12px Arial,sans-serif;cursor:pointer;">${zUiText('Recarregar')}</button></div>`;
}
function setAppConectividadeStatus(parcial={}){
  Object.assign(APP_CONECTIVIDADE_STATUS,parcial||{});
  APP_CONECTIVIDADE_STATUS.ultimaAtualizacao=new Date().toISOString();
  zSetState('state.sync.conectividadeApp',{...APP_CONECTIVIDADE_STATUS});
  atualizarBannerConectividadeApp();
  return {...APP_CONECTIVIDADE_STATUS};
}
function getAppConectividadeStatus(){
  return {...APP_CONECTIVIDADE_STATUS};
}
function appModoSomenteLeituraAtivo(){
  return !!APP_CONECTIVIDADE_STATUS.somenteLeitura;
}
function appMensagemSomenteLeitura(){
  return String(APP_CONECTIVIDADE_STATUS.motivo||'').trim()||'Sem conexão com o Supabase. O sistema está em modo consulta.';
}
function appPodePersistirNoSupabase(opcoes={}){
  if(!appModoSomenteLeituraAtivo()) return true;
  if(opcoes.avisar!==false&&typeof showToast==='function'){
    showToast('⚠️', zUiText(opcoes.mensagem||appMensagemSomenteLeitura()));
  }
  return false;
}
function appExigirModoOnline(opcoes={}){
  if(appPodePersistirNoSupabase(opcoes)) return true;
  const erro=new Error(opcoes.erro||'Modo consulta local ativo.');
  erro.code='APP_OFFLINE_READONLY';
  throw erro;
}
window.getAppConectividadeStatus=getAppConectividadeStatus;
window.appPodePersistirNoSupabase=appPodePersistirNoSupabase;
window.appModoSomenteLeituraAtivo=appModoSomenteLeituraAtivo;
window.atualizarBannerConectividadeApp=atualizarBannerConectividadeApp;
setAppConectividadeStatus();
function setTreinamentosCompatStatus(parcial={}){
  Object.assign(TREINAMENTOS_COMPAT_STATUS,parcial||{});
  TREINAMENTOS_COMPAT_STATUS.ultimaAtualizacao=new Date().toISOString();
  zSetState('state.sync.treinamentosCompat',{...TREINAMENTOS_COMPAT_STATUS});
  return {...TREINAMENTOS_COMPAT_STATUS};
}
function inferirTreinamentosCompatStatus(lista,origem='banco'){
  const amostra=Array.isArray(lista)?lista.find(item=>item&&typeof item==='object'):null;
  if(!amostra){
    return setTreinamentosCompatStatus({
      origem,
      videosCompartilhados:true,
      regrasCompartilhadas:true
    });
  }
  const hasProp=(prop)=>Object.prototype.hasOwnProperty.call(amostra,prop);
  return setTreinamentosCompatStatus({
    origem,
    videosCompartilhados:hasProp('videos'),
    regrasCompartilhadas:hasProp('obrigatorio')&&hasProp('prerequisito')
  });
}
function getTreinamentosCompatStatus(){
  return {...TREINAMENTOS_COMPAT_STATUS};
}
window.getTreinamentosCompatStatus=getTreinamentosCompatStatus;
setTreinamentosCompatStatus();
function promiseComTimeout(promise,ms,contexto='operacao'){
  return Promise.race([
    promise,
    new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${contexto}: timeout apos ${ms}ms`)),ms))
  ]);
}
function atualizarEstadoSyncAgendamentos(){
  AGENDAMENTOS_SYNC_STATUS.pendentes=(typeof AGENDAMENTOS!=='undefined'&&Array.isArray(AGENDAMENTOS))
    ? AGENDAMENTOS.filter(item=>!!(item&&item.syncPendente)).length
    : 0;
  zSetState('state.sync.agendamentos', {...AGENDAMENTOS_SYNC_STATUS});
  return {...AGENDAMENTOS_SYNC_STATUS};
}
function setStatusSyncAgendamentos(parcial={}){
  Object.assign(AGENDAMENTOS_SYNC_STATUS,parcial||{});
  return atualizarEstadoSyncAgendamentos();
}
function mensagemErroSyncAgendamentos(erro){
  return String(
    (erro&&(
      erro.message||
      erro.details||
      erro.hint||
      erro.error_description||
      erro.code
    ))||erro||''
  ).trim();
}
function erroTabelaAgendamentosAusente(erro){
  const msg=mensagemErroSyncAgendamentos(erro);
  return /PGRST205/i.test(msg)||/Could not find the table ['"]?public\.agendamentos/i.test(msg);
}
function gerarRefLocalAgendamento(){
  if(typeof crypto!=='undefined'&&crypto&&typeof crypto.randomUUID==='function'){
    return `ag-${crypto.randomUUID()}`;
  }
  return `ag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
function garantirRefLocalAgendamento(item,origem='local'){
  if(!item||typeof item!=='object') return '';
  const atual=String(item.refLocal||item.ref_local||'').trim();
  if(atual){
    item.refLocal=atual;
    return atual;
  }
  if(origem==='banco'&&item.id){
    item.refLocal=`db:${item.id}`;
    return item.refLocal;
  }
  item.refLocal=gerarRefLocalAgendamento();
  if(!item.atualizadoEm) item.atualizadoEm=new Date().toISOString();
  return item.refLocal;
}
function marcarAgendamentoSyncPendente(item,erro=''){
  if(!item||typeof item!=='object') return item;
  garantirRefLocalAgendamento(item);
  item.syncPendente=true;
  if(erro){
    item.syncErro=mensagemErroSyncAgendamentos(erro);
  }else{
    item.syncErro='';
  }
  return item;
}
function limparAgendamentoSyncPendente(item){
  if(!item||typeof item!=='object') return item;
  garantirRefLocalAgendamento(item, item.id?'banco':'local');
  item.syncPendente=false;
  item.syncErro='';
  return item;
}
function agendamentoTemSyncPendente(item){
  return !!(item&&item.syncPendente);
}
function getStatusAgendamentosSync(){
  const estado=atualizarEstadoSyncAgendamentos();
  return {
    ...estado,
    tabelaDisponivel:estado.tabela==='disponivel',
    tabelaAusente:estado.tabela==='ausente'
  };
}
atualizarEstadoSyncAgendamentos();

// ── DADOS EM MEMÓRIA ──────────────────────────────────────────────────────────
zSetState('state.data.vendas', VENDAS);
zSetState('state.data.treinamentos', TREIN);
zSetState('state.data.documentos', DOCUMENTOS);
zSetState('state.data.agendamentos', AGENDAMENTOS);
zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
zSetState('state.data.usuariosPadrao', USUARIOS_PADRAO);
zSetState('state.auth.senhasPadraoMap', SENHAS_PADRAO_MAP);

// ── CARREGAR DO BANCO ─────────────────────────────────────────────────────────
async function carregarDB(){
  setBootStage('preparando carga inicial');
  setStatusSyncAgendamentos({
    tabela:'carregando',
    erro:'',
    sincronizando:false,
    ultimaTentativa:new Date().toISOString()
  });
  const carregar=async(tabela,order='id')=>{
    try{
      const q=sb.from(tabela).select('*');
      if(order) q.order(order);
      const {data,error}=await q;
      if(error) throw error;
      return data||[];
    }catch(e){
      console.warn(`Falha ao carregar "${tabela}":`,e.message);
      return null;
    }
  };

  const VENDAS_COLS='id,data,mes,cliente,produto,construtora,origem,unidade,corretor,capitao,gerente,diretor,diretor2,cca,valor,pct,imp,pct_cor,pct_cap,pct_ger,pct_dir,pct_dir2,pct_rh,bonus,bonus_pct_dir,bonus_pct_ger,bonus_pct_cor,etapa,hist,distratada';

  setBootStage('buscando tabelas principais');
  const [us,ss,vs,ts,ds,ags,fls]=await Promise.all([
    carregar('usuarios','id'),
    carregar('senhas',null),
    (async()=>{
      let todas=[]; let pagina=0; const LOTE=20;
      while(true){
        const {data,error}=await sb.from('vendas').select(VENDAS_COLS).order('id').range(pagina*LOTE,(pagina+1)*LOTE-1);
        if(error) throw error;
        if(!data||data.length===0) break;
        todas=[...todas,...data];
        if(data.length<LOTE) break;
        pagina++;
      }
      return todas;
    })().catch(e=>{console.warn('Falha ao carregar "vendas":',e.message);return null;}),
    carregar('treinamentos','id'),
    carregar('documentos','id'),
    (async()=>{
      try{
        const {data,error}=await sb.from('agendamentos').select('*').order('data_agendamento').order('horario_agendamento');
        if(error) throw error;
        setStatusSyncAgendamentos({tabela:'disponivel',erro:''});
        return data||[];
      }catch(e){
        const msg=mensagemErroSyncAgendamentos(e);
        setStatusSyncAgendamentos({
          tabela:erroTabelaAgendamentosAusente(e)?'ausente':'erro',
          erro:msg
        });
        console.warn('Falha ao carregar "agendamentos":',msg||e.message||e);
        return null;
      }
    })(),
    carregar('financeiro_lancamentos','data_prevista')
  ]);

  setBootStage('mesclando dados locais');
  if(us&&us.length){
    USUARIOS.splice(0,USUARIOS.length,...us.map(mapUsuarioIn));
    nextUserId=Math.max(...USUARIOS.map(u=>u.id))+1;
    zSetState('state.data.usuarios', USUARIOS);
    zSetState('state.ui.nextUserId', nextUserId);
  }
  if(ss) ss.forEach(s=>SENHAS_INDIVIDUAIS[s.email.toLowerCase()]=s.senha);
  if(vs&&vs.length){
    VENDAS.splice(0,VENDAS.length,...vs.map(mapVendaIn));
    nextVendaId=Math.max(...VENDAS.map(v=>v.id))+1;
    zSetState('state.data.vendas', VENDAS);
    zSetState('state.ui.nextVendaId', nextVendaId);
  }
  {
    if(Array.isArray(ts)) inferirTreinamentosCompatStatus(ts,'banco');
    else setTreinamentosCompatStatus({origem:'local'});
    const treinBanco=Array.isArray(ts)?ts.map(mapTreinIn):[];
    const treinLocal=carregarTreinamentosLS();
    const treinMap=new Map();

    treinBanco.forEach(trein=>{
      treinMap.set(getTreinMergeKeyItem(trein),trein);
    });

    treinLocal.forEach(treinLocalItem=>{
      const chave=getTreinMergeKeyItem(treinLocalItem);
      const atual=treinMap.get(chave);
      treinMap.set(chave,mesclarTreinBancoComLocal(atual,treinLocalItem));
    });

    if(treinMap.size){
      TREIN.splice(0,TREIN.length,...Array.from(treinMap.values()).sort(ordenarTreinamentosMesclados));
      zSetState('state.data.treinamentos', TREIN);
    }
  }
  {
    const docsBanco=Array.isArray(ds)?ds.map(mapDocumentoIn):[];
    const docsLocal=carregarDocumentosLS();
    const docsMap=new Map();
    [...docsLocal,...docsBanco].forEach(doc=>{
      const chave=getDocumentoMergeKey(doc);
      const atual=docsMap.get(chave);
      docsMap.set(chave,preferirDocumentoMaisRecente(atual,doc));
    });
    DOCUMENTOS.splice(0,DOCUMENTOS.length,...Array.from(docsMap.values()).sort(ordenarDocumentos));
    zSetState('state.data.documentos', DOCUMENTOS);
  }
  {
    const finLocal=carregarFinanceiroLancamentosLS();
    const finMesclados=mesclarFinanceiroLancamentosBancoComLocal(Array.isArray(fls)?fls:[], finLocal);
    FINANCEIRO_LANCAMENTOS.splice(0,FINANCEIRO_LANCAMENTOS.length,...finMesclados);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
  }
  {
    const agBanco=Array.isArray(ags)?ags.map(item=>{
      const ag=mapAgendamentoIn(item);
      garantirRefLocalAgendamento(ag,'banco');
      limparAgendamentoSyncPendente(ag);
      return ag;
    }):[];
    const agLocal=carregarAgendamentosLS().map(item=>{
      const ag=mapAgendamentoIn(item);
      garantirRefLocalAgendamento(ag,'local');
      return ag;
    });
    const agMap=new Map();
    const agBancoMap=new Map();
    const agLocalMap=new Map();
    agBanco.forEach(agendamento=>agBancoMap.set(getAgendamentoMergeKey(agendamento),agendamento));
    agLocal.forEach(agendamento=>agLocalMap.set(getAgendamentoMergeKey(agendamento),agendamento));
    [...agLocal,...agBanco].forEach(agendamento=>{
      const chave=getAgendamentoMergeKey(agendamento);
      const atual=agMap.get(chave);
      agMap.set(chave,preferirAgendamentoMaisRecente(atual,agendamento));
    });
    const agMesclados=Array.from(agMap.values()).sort(ordenarAgendamentos);
    agMesclados.forEach(agendamento=>{
      const chave=getAgendamentoMergeKey(agendamento);
      const local=agLocalMap.get(chave);
      const banco=agBancoMap.get(chave);
      const localMaisRecente=!!local&&(!banco||preferirAgendamentoMaisRecente(banco,local)===local);
      if(localMaisRecente){
        marcarAgendamentoSyncPendente(agendamento,local&&local.syncErro||'');
      }else{
        limparAgendamentoSyncPendente(agendamento);
      }
    });
    AGENDAMENTOS.splice(0,AGENDAMENTOS.length,...agMesclados);
    if(typeof nextAgendamentoId!=='undefined'){
      const maiorId=AGENDAMENTOS.reduce((acc,item)=>Math.max(acc,parseInt(item&&item.id,10)||0),0);
      nextAgendamentoId=maiorId+1;
      zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
    }
    zSetState('state.data.agendamentos', AGENDAMENTOS);
    atualizarEstadoSyncAgendamentos();
    salvarLS();
  }
  zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);

  if(us===null&&vs===null) throw new Error('Falha total no carregamento');
  setBootStage('dados carregados');
}

// ── MAPPERS banco → app ───────────────────────────────────────────────────────
// POS-CARGA DO SUPABASE
async function executarPosCargaSupabase(opcoes={}){
  if(supabasePosCargaPromise) return supabasePosCargaPromise;
  const config={
    timeoutMs:Math.max(5000,parseInt(opcoes.timeoutMs,10)||12000),
    silenciosoAgendamentos:opcoes.silenciosoAgendamentos!==false,
    renderizarAgendamentos:opcoes.renderizarAgendamentos!==false,
    silenciosoFinanceiro:opcoes.silenciosoFinanceiro!==false,
    renderizarFinanceiro:opcoes.renderizarFinanceiro!==false,
    persistirRh:opcoes.persistirRh!==false,
    renderizarRh:opcoes.renderizarRh!==false
  };
  supabasePosCargaPromise=(async()=>{
    try{
      if(getStatusAgendamentosSync().tabelaDisponivel&&AGENDAMENTOS.some(agendamentoTemSyncPendente)){
        setBootStage('sincronizando agendamentos pendentes');
        await promiseComTimeout(
          sincronizarAgendamentosPendentes({
            silencioso:config.silenciosoAgendamentos,
            renderizar:config.renderizarAgendamentos
          }),
          config.timeoutMs,
          'Sincronizacao de agendamentos'
        );
      }
    }catch(e){
      const msg=e&&e.message?e.message:e;
      if(/timeout/i.test(String(msg||''))){
        console.info('Pos-carga do Supabase: sincronizacao de agendamentos pendentes ficou para a proxima tentativa:',msg);
      }else{
        console.warn('Pos-carga do Supabase: falha ao sincronizar agendamentos pendentes:',msg);
      }
    }
    try{
      if(FINANCEIRO_LANCAMENTOS.some(lancamentoFinanceiroTemSyncPendente)){
        setBootStage('sincronizando financeiro pendente');
        await promiseComTimeout(
          sincronizarFinanceiroPendentes({
            silencioso:config.silenciosoFinanceiro,
            renderizar:config.renderizarFinanceiro
          }),
          config.timeoutMs,
          'Sincronizacao do financeiro'
        );
      }
    }catch(e){
      const msg=e&&e.message?e.message:e;
      if(/timeout/i.test(String(msg||''))){
        console.info('Pos-carga do Supabase: sincronizacao do financeiro ficou para a proxima tentativa:',msg);
      }else{
        console.warn('Pos-carga do Supabase: falha ao sincronizar o financeiro pendente:',msg);
      }
    }
    try{
      if(typeof aplicarAjustesManuaisRhPendentes==='function'&&VENDAS.length){
        setBootStage('aplicando ajustes de RH');
        await promiseComTimeout(
          aplicarAjustesManuaisRhPendentes({
            persistir:config.persistirRh,
            renderizar:config.renderizarRh
          }),
          config.timeoutMs,
          'Ajustes manuais de RH'
        );
      }
    }catch(e){
      console.warn('Pos-carga do Supabase: falha ao aplicar ajustes de RH:',e.message||e);
    }
    setBootStage('pronto');
    return true;
  })();
  try{
    return await supabasePosCargaPromise;
  }finally{
    supabasePosCargaPromise=null;
  }
}

function agendarPosCargaSupabase(opcoes={}){
  setTimeout(()=>{
    executarPosCargaSupabase(opcoes).catch(e=>{
      console.warn('Pos-carga do Supabase interrompida:',e.message||e);
    });
  },0);
}

// MAPPERS banco -> app
function mapUsuarioIn(u){
  const statusRaw=(u.status||'Ativo');
  const status=statusRaw.charAt(0).toUpperCase()+statusRaw.slice(1).toLowerCase();
  return{
    id:u.id,nome:u.nome,email:u.email,tel:u.tel||'',perfil:u.perfil,
    status,unidade:u.unidade||'',equipe:u.equipe||'',
    banco:u.banco||'',agencia:u.agencia||'',conta:u.conta||'',
    tipoConta:u.tipoConta||u.tipo_conta||'',
    pixTipo:u.pixTipo||u.pix_tipo||'',pix:u.pix||'',
    cpf:u.cpf||'',nasc:u.nasc||'',cep:u.cep||'',
    end:u.end||u.endereco||'',cidade:u.cidade||'',estado:u.estado||'',
    rhContratacao:!!(u.rhContratacao||u.rh_contratacao),
    token:u.token||null
  };
}

function mapUsuarioOut(u){
  return{
    nome:u.nome,email:u.email,tel:u.tel||'',perfil:u.perfil,
    status:u.status||'Ativo',unidade:u.unidade||'',equipe:u.equipe||'',
    banco:u.banco||'',agencia:u.agencia||'',conta:u.conta||'',
    tipo_conta:u.tipoConta||'',pix_tipo:u.pixTipo||'',pix:u.pix||'',
    cpf:u.cpf||'',nasc:u.nasc||'',cep:u.cep||'',
    endereco:u.end||'',cidade:u.cidade||'',estado:u.estado||'',
    rh_contratacao:!!u.rhContratacao
  };
}

function normalizarMesVenda(mes){
  const bruto=String(mes||'').trim();
  if(!bruto) return '';
  const txt=(typeof zUiText==='function'?zUiText(bruto):bruto).trim().toUpperCase();
  return txt==='MARCO'?'MARÇO':txt;
}

function mapVendaIn(v){
  return{
    id:v.id,data:v.data,mes:normalizarMesVenda(v.mes),cliente:v.cliente,produto:v.produto,
    construtora:v.construtora,origem:v.origem,unidade:v.unidade,
    corretor:v.corretor,capitao:v.capitao,gerente:v.gerente,diretor:v.diretor,
    diretor2:v.diretor2||'',cca:v.cca||'',
    valor:parseFloat(v.valor)||0,pct:parseFloat(v.pct)||0,imp:parseFloat(v.imp)||0.11,
    pct_cor:parseFloat(v.pct_cor)||0,pct_cap:parseFloat(v.pct_cap)||0,
    pct_ger:parseFloat(v.pct_ger)||0,pct_dir:parseFloat(v.pct_dir)||0,
    pct_dir2:parseFloat(v.pct_dir2)||0,pct_rh:parseFloat(v.pct_rh)||0,
    bonus:parseFloat(v.bonus)||0,bonus_pct_dir:parseFloat(v.bonus_pct_dir)||0,
    bonus_pct_ger:parseFloat(v.bonus_pct_ger)||0,bonus_pct_cor:parseFloat(v.bonus_pct_cor)||0,
    etapa:parseInt(v.etapa)||0,
    hist:v.hist||[],
    distratada:!!v.distratada,
    anexos:[], // carregado sob demanda
    anexosCarregados:false
  };
}

function mapVendaOut(v){
  return{
    data:v.data,mes:normalizarMesVenda(v.mes),cliente:v.cliente,produto:v.produto,
    construtora:v.construtora,origem:v.origem,unidade:v.unidade,
    corretor:v.corretor,capitao:v.capitao,gerente:v.gerente,diretor:v.diretor,
    valor:v.valor,pct:v.pct,imp:v.imp,pct_cor:v.pct_cor,pct_cap:v.pct_cap,
    pct_ger:v.pct_ger,pct_dir:v.pct_dir,pct_rh:v.pct_rh,
    diretor2:v.diretor2||null,pct_dir2:v.pct_dir2||0,
    cca:v.cca||'',distratada:v.distratada||false,
    bonus:v.bonus||0,bonus_pct_dir:v.bonus_pct_dir||0,
    bonus_pct_ger:v.bonus_pct_ger||0,bonus_pct_cor:v.bonus_pct_cor||0,
    etapa:v.etapa,hist:v.hist
    // anexos: omitido — salvo separadamente via dbSalvarAnexos
  };
}

function mapVendaAnexos(anexos){
  return (anexos||[]).map(a=>({
    nome:a.nome,
    tipo:a.tipo,
    tamanho:a.tamanho,
    data:a.data,
    por:a.por,
    mime:a.mime,
    dataUrl:a.dataUrl||''
  }));
}

function reduzirPayloadVendaPorSchema(payload,colunaAusente=''){
  const reduzido={...(payload||{})};
  const grupos={
    anexos:['anexos'],
    diretor2:['diretor2','pct_dir2'],
    pct_dir2:['diretor2','pct_dir2'],
    pct_rh:['pct_rh'],
    bonus:['bonus','bonus_pct_dir','bonus_pct_ger','bonus_pct_cor'],
    bonus_pct_dir:['bonus','bonus_pct_dir','bonus_pct_ger','bonus_pct_cor'],
    bonus_pct_ger:['bonus','bonus_pct_dir','bonus_pct_ger','bonus_pct_cor'],
    bonus_pct_cor:['bonus','bonus_pct_dir','bonus_pct_ger','bonus_pct_cor']
  };
  const lista=grupos[colunaAusente]||[colunaAusente];
  lista.forEach(coluna=>delete reduzido[coluna]);
  return reduzido;
}

async function salvarVendaComFallbackSchema(payload,modo='update',vendaId=null){
  let payloadAtual={...(payload||{})};
  let payloadReduzido=false;
  while(true){
    try{
      const resposta=modo==='insert'
        ? await sbLong.from('vendas').insert(payloadAtual).select().single()
        : await sbLong.from('vendas').update(payloadAtual).eq('id',vendaId);
      if(resposta.error) throw resposta.error;
      return {data:resposta.data||null,payloadReduzido};
    }catch(error){
      const colunaAusente=extrairColunaAusenteSupabase(error,'vendas');
      if(colunaAusente&&Object.prototype.hasOwnProperty.call(payloadAtual,colunaAusente)){
        payloadAtual=reduzirPayloadVendaPorSchema(payloadAtual,colunaAusente);
        payloadReduzido=true;
        continue;
      }
      throw error;
    }
  }
}

function mapTreinIn(t){
  const trein = {
    id:t.id,
    titulo:t.titulo,
    cat:t.cat,
    aulas:t.aulas,
    dur:t.dur,
    thumb:t.thumb,
    bg:t.bg,
    prog:t.prog
  };
  if(typeof t?.obrigatorio !== 'undefined') trein.obrigatorio = !!t.obrigatorio;
  if(typeof t?.prerequisito === 'string') trein.prerequisito = t.prerequisito;
  if(Array.isArray(t && t.videos)) trein.videos = t.videos.map((v, idx) => ({
    ...v,
    provider:v.provider || (v.youtubeVideoId || v.youtubeUrl || v.embedUrl ? 'youtube' : 'local'),
    ordem:typeof v.ordem === 'number' ? v.ordem : idx
  }));
  return trein;
}
function mapTreinOut(t){
  return{
    titulo:t.titulo,
    cat:t.cat,
    aulas:t.aulas,
    dur:t.dur,
    thumb:t.thumb,
    bg:t.bg,
    prog:t.prog,
    obrigatorio:!!t.obrigatorio,
    prerequisito:t.prerequisito||'',
    videos:Array.isArray(t.videos) ? t.videos.map(v => ({
      id:v.id,
      provider:v.provider || (v.youtubeVideoId || v.youtubeUrl || v.embedUrl ? 'youtube' : 'local'),
      nome:v.nome,
      mime:v.mime,
      size:v.size,
      ordem:v.ordem||0,
      dataUrl:v.dataUrl||'',
      youtubeUrl:v.youtubeUrl||'',
      youtubeVideoId:v.youtubeVideoId||'',
      embedUrl:v.embedUrl||'',
      thumbnail:v.thumbnail||''
    })) : []
  };
}

function carregarTreinamentosLS(){
  try{
    const raw=localStorage.getItem('zel_trein');
    const lista=raw?JSON.parse(raw):[];
    return Array.isArray(lista)?lista.map(mapTreinIn):[];
  }catch(e){
    return [];
  }
}

function getTreinMergeKeyItem(t){
  if(!t) return '';
  if(t.id!=null&&String(t.id)!=='') return `id:${t.id}`;
  const cat=String(t.cat||'').trim().toLowerCase();
  const titulo=String(t.titulo||'').trim().toLowerCase();
  return `local:${cat}::${titulo}`;
}

function escolherListaTreinPreferencial(bancoLista, localLista){
  const banco=Array.isArray(bancoLista)?bancoLista:[];
  const local=Array.isArray(localLista)?localLista:[];
  if(banco.length) return banco;
  return local;
}

function mesclarTreinBancoComLocal(banco, local){
  if(!banco) return local;
  if(!local) return banco;
  const videosBanco=Array.isArray(banco.videos)?banco.videos:[];
  const videosLocal=Array.isArray(local.videos)?local.videos:[];
  return{
    ...local,
    ...banco,
    videos:escolherListaTreinPreferencial(videosBanco,videosLocal),
    obrigatorio:typeof banco.obrigatorio!=='undefined'?!!banco.obrigatorio:!!local.obrigatorio,
    prerequisito:banco.prerequisito||local.prerequisito||''
  };
}

function ordenarTreinamentosMesclados(a,b){
  const idA=parseInt(a&&a.id,10);
  const idB=parseInt(b&&b.id,10);
  const temIdA=Number.isFinite(idA);
  const temIdB=Number.isFinite(idB);
  if(temIdA&&temIdB&&idA!==idB) return idA-idB;
  if(temIdA!==temIdB) return temIdA?-1:1;
  return String(a&&a.titulo||'').localeCompare(String(b&&b.titulo||''),'pt-BR');
}

function mapAgendamentoIn(a){
  const item={
    id:parseInt(a&&a.id,10)||0,
    preenchidoEm:a&&(
      a.preenchido_em||
      a.preenchidoEm||
      a.data_preenchimento||
      a.dataPreenchimento||
      ''
    )||'',
    unidade:a&&a.unidade||'',
    equipe:a&&a.equipe||'',
    corretorId:parseInt(a&&(a.corretor_id||a.corretorId),10)||0,
    corretor:a&&(a.corretor||a.corretor_nome||a.corretorNome)||'',
    corretorEmail:a&&(a.corretor_email||a.corretorEmail)||'',
    cliente:a&&a.cliente||'',
    telefone:a&&a.telefone||'',
    dataAgendamento:a&&(a.data_agendamento||a.dataAgendamento)||'',
    horarioAgendamento:String(a&&(a.horario_agendamento||a.horarioAgendamento)||'').slice(0,5),
    tipoVisita:a&&(a.tipo_visita||a.tipoVisita)||'Primeiro atendimento',
    canalAgendamento:a&&(a.canal_agendamento||a.canalAgendamento)||(((a&&(a.tipo_visita||a.tipoVisita)||'') === 'Envio de documentacao online') ? 'Online - WhatsApp' : 'Presencial - escritorio'),
    criadoPor:a&&(a.criado_por||a.criadoPor)||'',
    criadoPorId:parseInt(a&&(a.criado_por_id||a.criadoPorId),10)||0,
    criadoPorEmail:a&&(a.criado_por_email||a.criadoPorEmail)||'',
    situacao:a&&(a.situacao||a.status)||'Agendado',
    tratativaEm:a&&(a.tratativa_em||a.tratativaEm)||'',
    tratativaPor:a&&(a.tratativa_por||a.tratativaPor)||'',
    tratativaPorId:parseInt(a&&(a.tratativa_por_id||a.tratativaPorId),10)||0,
    tratativaPorEmail:a&&(a.tratativa_por_email||a.tratativaPorEmail)||'',
    reagendadoParaData:a&&(a.reagendado_para_data||a.reagendadoParaData)||'',
    reagendadoParaHorario:String(a&&(a.reagendado_para_horario||a.reagendadoParaHorario)||'').slice(0,5),
    origemAgendamentoId:parseInt(a&&(a.origem_agendamento_id||a.origemAgendamentoId),10)||0,
    novoAgendamentoId:parseInt(a&&(a.novo_agendamento_id||a.novoAgendamentoId),10)||0,
    atualizadoEm:a&&(a.atualizado_em||a.atualizadoEm)||'',
    refLocal:a&&(a.ref_local||a.refLocal)||'',
    syncPendente:!!(a&&(a.sync_pendente||a.syncPendente)),
    syncErro:a&&(a.sync_erro||a.syncErro)||''
  };
  garantirRefLocalAgendamento(item, item.id?'banco':'local');
  return item;
}

function mapAgendamentoOut(a){
  return{
    preenchido_em:a.preenchidoEm||'',
    unidade:a.unidade||'',
    equipe:a.equipe||'',
    corretor_id:a.corretorId||null,
    corretor:a.corretor||'',
    corretor_email:a.corretorEmail||'',
    cliente:a.cliente||'',
    telefone:a.telefone||'',
    data_agendamento:a.dataAgendamento||'',
    horario_agendamento:a.horarioAgendamento||'',
    tipo_visita:a.tipoVisita||'Primeiro atendimento',
    canal_agendamento:a.canalAgendamento||((a.tipoVisita||'') === 'Envio de documentacao online' ? 'Online - WhatsApp' : 'Presencial - escritorio'),
    criado_por:a.criadoPor||'',
    criado_por_id:a.criadoPorId||null,
    criado_por_email:a.criadoPorEmail||'',
    situacao:a.situacao||'Agendado',
    tratativa_em:a.tratativaEm||null,
    tratativa_por:a.tratativaPor||'',
    tratativa_por_id:a.tratativaPorId||null,
    tratativa_por_email:a.tratativaPorEmail||'',
    reagendado_para_data:a.reagendadoParaData||null,
    reagendado_para_horario:a.reagendadoParaHorario||null,
    origem_agendamento_id:a.origemAgendamentoId||null,
    novo_agendamento_id:a.novoAgendamentoId||null,
    atualizado_em:a.atualizadoEm||new Date().toISOString(),
    ref_local:garantirRefLocalAgendamento(a,a&&a.id?'banco':'local')||null
  };
}

function carregarAgendamentosLS(){
  try{
    const raw=localStorage.getItem('zel_agendamentos');
    const lista=raw?JSON.parse(raw):[];
    return Array.isArray(lista)?lista.map(mapAgendamentoIn):[];
  }catch(e){
    return [];
  }
}

function getAgendamentoMergeKey(a){
  if(!a) return '';
  const refLocal=String(a.refLocal||a.ref_local||'').trim();
  if(refLocal) return `ref:${refLocal}`;
  if(a.id!=null&&String(a.id)!=='') return `id:${a.id}`;
  const corretor=String(a.corretor||'').trim().toLowerCase();
  const cliente=String(a.cliente||'').trim().toLowerCase();
  const data=String(a.dataAgendamento||'').trim();
  const hora=String(a.horarioAgendamento||'').trim();
  return `local:${corretor}::${cliente}::${data}::${hora}`;
}

function ordenarAgendamentos(a,b){
  const refA=Date.parse(`${a&&a.dataAgendamento||''}T${a&&a.horarioAgendamento||'00:00'}:00`)||0;
  const refB=Date.parse(`${b&&b.dataAgendamento||''}T${b&&b.horarioAgendamento||'00:00'}:00`)||0;
  if(refA!==refB) return refA-refB;
  return String(a&&a.cliente||'').localeCompare(String(b&&b.cliente||''),'pt-BR');
}

function preferirAgendamentoMaisRecente(atual, proximo){
  if(!atual) return proximo;
  const dataAtual=Date.parse(atual&&atual.atualizadoEm||'')||0;
  const dataProxima=Date.parse(proximo&&proximo.atualizadoEm||'')||0;
  return dataProxima>=dataAtual?proximo:atual;
}

// ── CRUD VENDAS ───────────────────────────────────────────────────────────────
function tipoLancamentoFinanceiroNormalizado(tipo){
  return String(tipo||'').trim().toLowerCase()==='saida' ? 'saida' : 'entrada';
}

function statusLancamentoFinanceiroNormalizado(status){
  return String(status||'').trim().toLowerCase()==='realizado' ? 'realizado' : 'previsto';
}

function textoFinanceiroMaiusculo(valor){
  return String(valor==null?'':valor).trim().toUpperCase();
}

function prepararTextoLancamentoFinanceiro(item){
  const tipo=tipoLancamentoFinanceiroNormalizado(item&&(item.tipo||item.natureza));
  const categoriaRaw=String(item&&(item.categoria||item.grupo)||'').trim();
  const descricaoRaw=String(item&&(item.descricao||item.nome)||'').trim();
  const observacaoRaw=String(item&&(item.observacao||item.obs)||'').trim();
  const categoria=textoFinanceiroMaiusculo(categoriaRaw)||(tipo==='saida'?'OUTRAS SAIDAS':'OUTRAS ENTRADAS');
  const descricao=textoFinanceiroMaiusculo(descricaoRaw)||(tipo==='saida'?'SAIDA MANUAL':'ENTRADA MANUAL');
  const observacao=textoFinanceiroMaiusculo(observacaoRaw);
  return{
    tipo,
    categoria,
    descricao,
    observacao,
    alterado:categoria!==categoriaRaw||descricao!==descricaoRaw||observacao!==observacaoRaw
  };
}

function gerarRefLocalFinanceiro(){
  if(typeof crypto!=='undefined'&&crypto&&typeof crypto.randomUUID==='function'){
    return `fin-${crypto.randomUUID()}`;
  }
  return `fin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

function garantirRefLocalFinanceiro(item){
  if(!item||typeof item!=='object') return '';
  const atual=String(item.refLocal||item.ref_local||'').trim();
  if(atual){
    item.refLocal=atual;
    return atual;
  }
  item.refLocal=gerarRefLocalFinanceiro();
  return item.refLocal;
}

function abrirFinanceiroComprovanteDB(){
  if(!window.indexedDB) return Promise.reject(new Error('indexedDB indisponivel'));
  if(financeiroComprovanteDBPromise) return financeiroComprovanteDBPromise;
  financeiroComprovanteDBPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(FINANCEIRO_COMPROVANTE_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(FINANCEIRO_COMPROVANTE_STORE)){
        db.createObjectStore(FINANCEIRO_COMPROVANTE_STORE,{ keyPath:'id' });
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Falha ao abrir o banco local de comprovantes do financeiro.'));
  });
  return financeiroComprovanteDBPromise;
}

async function salvarFinanceiroComprovanteLocal(id, arquivo, meta={}){
  if(!id||!arquivo) return null;
  const db=await abrirFinanceiroComprovanteDB();
  const registro={
    id:String(id),
    file:arquivo,
    nome:String(meta.nome||arquivo.name||'comprovante').trim()||'comprovante',
    mime:String(meta.mime||arquivo.type||'').trim(),
    size:parseInt(meta.size||arquivo.size,10)||0,
    atualizadoEm:new Date().toISOString()
  };
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FINANCEIRO_COMPROVANTE_STORE,'readwrite');
    tx.onabort=()=>reject(tx.error||new Error('Falha ao salvar o comprovante local do financeiro.'));
    tx.onerror=()=>reject(tx.error||new Error('Falha ao salvar o comprovante local do financeiro.'));
    tx.oncomplete=()=>resolve(registro);
    tx.objectStore(FINANCEIRO_COMPROVANTE_STORE).put(registro);
  });
}

async function obterFinanceiroComprovanteLocal(id){
  if(!id) return null;
  const db=await abrirFinanceiroComprovanteDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FINANCEIRO_COMPROVANTE_STORE,'readonly');
    const req=tx.objectStore(FINANCEIRO_COMPROVANTE_STORE).get(String(id));
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error||new Error('Falha ao carregar o comprovante local do financeiro.'));
  });
}

async function excluirFinanceiroComprovanteLocal(id){
  if(!id) return true;
  const db=await abrirFinanceiroComprovanteDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FINANCEIRO_COMPROVANTE_STORE,'readwrite');
    tx.onabort=()=>reject(tx.error||new Error('Falha ao remover o comprovante local do financeiro.'));
    tx.onerror=()=>reject(tx.error||new Error('Falha ao remover o comprovante local do financeiro.'));
    tx.oncomplete=()=>resolve(true);
    tx.objectStore(FINANCEIRO_COMPROVANTE_STORE).delete(String(id));
  });
}

async function dataUrlParaArquivoFinanceiro(dataUrl,nome='comprovante.pdf',mime=''){
  const res=await fetch(String(dataUrl||''));
  const blob=await res.blob();
  const tipo=String(mime||blob.type||'application/octet-stream').trim()||'application/octet-stream';
  if(typeof File==='function') return new File([blob], nome||'comprovante.pdf', { type: tipo });
  return Object.assign(blob,{ name:nome||'comprovante.pdf', type:tipo });
}

async function prepararComprovanteFinanceiroParaUpload(lancamento){
  if(!lancamento) return null;
  const nome=String(lancamento.comprovanteNome||'comprovante.pdf').trim()||'comprovante.pdf';
  const mime=String(lancamento.comprovanteMime||'').trim();
  if(lancamento.comprovanteLocalId){
    const local=await obterFinanceiroComprovanteLocal(lancamento.comprovanteLocalId).catch(()=>null);
    if(local&&local.file){
      if(typeof File==='function'&&local.file instanceof File) return local.file;
      return new File([local.file], local.nome||nome, { type: local.mime||mime||local.file.type||'application/octet-stream' });
    }
  }
  if(lancamento.comprovanteDataUrl){
    return dataUrlParaArquivoFinanceiro(lancamento.comprovanteDataUrl,nome,mime);
  }
  return null;
}

function mapLancamentoFinanceiroIn(item){
  const texto=prepararTextoLancamentoFinanceiro(item);
  const syncErroOriginal=String(item&&(item.sync_erro||item.syncErro)||'').trim();
  const comprovanteBruto=String(item&&(item.comprovante_data_url||item.comprovanteDataUrl)||'').trim();
  const storageInfoComprovante=(
    !String(item&&(item.comprovante_storage_bucket||item.comprovanteStorageBucket)||'').trim()
    || !String(item&&(item.comprovante_storage_path||item.comprovanteStoragePath)||'').trim()
  ) && typeof parseDocumentoStorageRef==='function'
    ? parseDocumentoStorageRef(comprovanteBruto)
    : null;
  const lancamento={
    id:parseInt(item&&item.id,10)||0,
    tipo:texto.tipo,
    categoria:texto.categoria,
    descricao:texto.descricao,
    status:statusLancamentoFinanceiroNormalizado(item&&item.status),
    valor:parseFloat(item&&item.valor)||0,
    unidade:String(item&&item.unidade||'').trim(),
    dataPrevista:String(item&&(item.data_prevista||item.dataPrevista)||'').slice(0,10),
    dataRealizada:String(item&&(item.data_realizada||item.dataRealizada)||'').slice(0,10),
    observacao:texto.observacao,
    comprovanteNome:String(item&&(item.comprovante_nome||item.comprovanteNome)||'').trim(),
    comprovanteMime:String(item&&(item.comprovante_mime||item.comprovanteMime)||'').trim(),
    comprovanteSize:parseInt(item&&(item.comprovante_size||item.comprovanteSize),10)||0,
    comprovanteDataUrl:storageInfoComprovante?'':comprovanteBruto,
    comprovanteLocalId:String(item&&(item.comprovante_local_id||item.comprovanteLocalId)||'').trim(),
    comprovanteStorageBucket:String(item&&(item.comprovante_storage_bucket||item.comprovanteStorageBucket)||'').trim()||(storageInfoComprovante&&storageInfoComprovante.bucket)||'',
    comprovanteStoragePath:String(item&&(item.comprovante_storage_path||item.comprovanteStoragePath)||'').trim()||(storageInfoComprovante&&storageInfoComprovante.path)||'',
    criadoPor:String(item&&(item.criado_por||item.criadoPor)||'').trim(),
    criadoPorId:parseInt(item&&(item.criado_por_id||item.criadoPorId),10)||0,
    criadoPorEmail:String(item&&(item.criado_por_email||item.criadoPorEmail)||'').trim(),
    atualizadoEm:String(item&&(item.atualizado_em||item.atualizadoEm)||'').trim(),
    refLocal:String(item&&(item.ref_local||item.refLocal)||'').trim(),
    syncPendente:!!(item&&(item.sync_pendente||item.syncPendente))||texto.alterado,
    syncErro:syncErroOriginal||(texto.alterado?'Padronizacao de texto pendente.':'')
  };
  garantirRefLocalFinanceiro(lancamento);
  if(!lancamento.atualizadoEm) lancamento.atualizadoEm=new Date().toISOString();
  return lancamento;
}

function mapLancamentoFinanceiroOut(item){
  garantirRefLocalFinanceiro(item);
  const texto=prepararTextoLancamentoFinanceiro(item);
  return{
    tipo:texto.tipo,
    categoria:texto.categoria,
    descricao:texto.descricao,
    status:statusLancamentoFinanceiroNormalizado(item.status),
    valor:parseFloat(item.valor)||0,
    unidade:item.unidade||'',
    data_prevista:item.dataPrevista||null,
    data_realizada:item.dataRealizada||null,
    observacao:texto.observacao,
    comprovante_nome:item.comprovanteNome||'',
    comprovante_mime:item.comprovanteMime||'',
    comprovante_size:item.comprovanteSize||0,
    comprovante_data_url:item.comprovanteDataUrl||'',
    comprovante_storage_bucket:item.comprovanteStorageBucket||'',
    comprovante_storage_path:item.comprovanteStoragePath||'',
    criado_por:item.criadoPor||'',
    criado_por_id:item.criadoPorId||null,
    criado_por_email:item.criadoPorEmail||'',
    atualizado_em:item.atualizadoEm||new Date().toISOString(),
    ref_local:item.refLocal||null,
    sync_pendente:!!item.syncPendente,
    sync_erro:item.syncErro||''
  };
}

function preservarComprovanteFinanceiroLocal(destino, original = {}){
  if(!destino) return destino;
  if(!destino.comprovanteStorageBucket && original.comprovanteStorageBucket) destino.comprovanteStorageBucket=original.comprovanteStorageBucket;
  if(!destino.comprovanteStoragePath && original.comprovanteStoragePath) destino.comprovanteStoragePath=original.comprovanteStoragePath;

  const storageBucket=String(destino.comprovanteStorageBucket||'').trim();
  const storagePath=String(destino.comprovanteStoragePath||'').trim();
  const possuiStorage=!!(storageBucket&&storagePath);

  if(!destino.comprovanteNome && original.comprovanteNome) destino.comprovanteNome=original.comprovanteNome;
  if(!destino.comprovanteMime && original.comprovanteMime) destino.comprovanteMime=original.comprovanteMime;
  if(!(parseInt(destino.comprovanteSize,10)||0) && (parseInt(original.comprovanteSize,10)||0)) destino.comprovanteSize=original.comprovanteSize;

  if(!possuiStorage){
    if(!destino.comprovanteDataUrl && original.comprovanteDataUrl) destino.comprovanteDataUrl=original.comprovanteDataUrl;
    if(!destino.comprovanteLocalId && original.comprovanteLocalId) destino.comprovanteLocalId=original.comprovanteLocalId;
  }

  return destino;
}

function extrairColunaAusenteSupabase(error,tabela=''){
  const msg=mensagemErroSyncAgendamentos(error);
  const bruto=String(msg||'');
  const prefixo=tabela?`${tabela}.`:'';
  const regexComTabela=new RegExp(`column\\s+${prefixo}([a-z0-9_]+)\\s+does not exist`,'i');
  const regexSemTabela=/column\s+([a-z0-9_]+)\s+does not exist/i;
  const match=bruto.match(regexComTabela)||bruto.match(regexSemTabela);
  return match&&match[1]?String(match[1]).trim().toLowerCase():'';
}

function reduzirPayloadFinanceiroPorSchema(payload,colunaAusente=''){
  const reduzido={...(payload||{})};
  const grupos={
    comprovante_nome:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path'],
    comprovante_mime:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path'],
    comprovante_size:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path'],
    comprovante_data_url:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path'],
    comprovante_storage_bucket:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path'],
    comprovante_storage_path:['comprovante_nome','comprovante_mime','comprovante_size','comprovante_data_url','comprovante_storage_bucket','comprovante_storage_path']
  };
  const lista=grupos[colunaAusente]||[colunaAusente];
  lista.forEach(coluna=>{ if(coluna) delete reduzido[coluna]; });
  return reduzido;
}

function getFinanceiroLancamentoMergeKey(item){
  const mapped=mapLancamentoFinanceiroIn(item);
  if(mapped.refLocal) return `ref:${mapped.refLocal}`;
  if(mapped.id) return `id:${mapped.id}`;
  return `local:${mapped.tipo}:${mapped.dataPrevista}:${mapped.valor}:${mapped.descricao}`;
}

function ordenarFinanceiroLancamentos(a,b){
  const dataA=String(a&&a.dataRealizada||a&&a.dataPrevista||'');
  const dataB=String(b&&b.dataRealizada||b&&b.dataPrevista||'');
  if(dataA!==dataB) return dataA.localeCompare(dataB);
  const valorA=parseFloat(a&&a.valor)||0;
  const valorB=parseFloat(b&&b.valor)||0;
  if(valorA!==valorB) return valorB-valorA;
  return String(a&&a.descricao||'').localeCompare(String(b&&b.descricao||''),'pt-BR');
}

function preferirLancamentoFinanceiroMaisRecente(atual, proximo){
  if(!atual) return proximo;
  const dataAtual=Date.parse(atual&&atual.atualizadoEm||'')||0;
  const dataProxima=Date.parse(proximo&&proximo.atualizadoEm||'')||0;
  const atualPendente=!!(atual&&atual.syncPendente);
  const proximoPendente=!!(proximo&&proximo.syncPendente);
  if(atualPendente!==proximoPendente){
    if(proximoPendente&&dataProxima>=dataAtual) return proximo;
    if(atualPendente&&dataAtual>=dataProxima) return atual;
  }
  return dataProxima>=dataAtual?proximo:atual;
}

function carregarFinanceiroLancamentosLS(){
  try{
    const raw=localStorage.getItem('zel_financeiro_lancamentos');
    const lista=raw?JSON.parse(raw):[];
    return Array.isArray(lista)?lista.map(mapLancamentoFinanceiroIn):[];
  }catch(e){
    return [];
  }
}

function mesclarFinanceiroLancamentosBancoComLocal(bancoLista, localLista){
  const mapa=new Map();
  (Array.isArray(localLista)?localLista:[]).forEach(item=>{
    const mapped=mapLancamentoFinanceiroIn(item);
    const chave=getFinanceiroLancamentoMergeKey(mapped);
    mapa.set(chave,preferirLancamentoFinanceiroMaisRecente(mapa.get(chave), mapped));
  });
  (Array.isArray(bancoLista)?bancoLista:[]).forEach(item=>{
    const mapped=mapLancamentoFinanceiroIn(item);
    const chave=getFinanceiroLancamentoMergeKey(mapped);
    mapa.set(chave,preferirLancamentoFinanceiroMaisRecente(mapa.get(chave), mapped));
  });
  return [...mapa.values()].sort(ordenarFinanceiroLancamentos);
}

function mapDocumentoIn(d){
  const brutoArquivo=d.data_url||d.dataUrl||'';
  const storageInfo=parseDocumentoStorageRef(d.storage_ref||d.storageRef||brutoArquivo);
  return{
    id:d.id,
    titulo:d.titulo||'',
    categoria:d.categoria||'Geral',
    descricao:d.descricao||'',
    arquivoNome:d.arquivo_nome||d.arquivoNome||'',
    mime:d.mime||'application/pdf',
    size:parseInt(d.size,10)||0,
    dataUrl:storageInfo? '' : brutoArquivo,
    storageBucket:d.storage_bucket||d.storageBucket||(storageInfo&&storageInfo.bucket)||'',
    storagePath:d.storage_path||d.storagePath||(storageInfo&&storageInfo.path)||'',
    criadoPor:d.criado_por||d.criadoPor||'',
    atualizadoEm:d.atualizado_em||d.atualizadoEm||'',
    publicado:typeof d.publicado==='boolean'?d.publicado:true
  };
}

function mapDocumentoOut(d){
  const storageRef=d.storageBucket&&d.storagePath?buildDocumentoStorageRef(d.storageBucket,d.storagePath):(d.dataUrl||'');
  return{
    titulo:d.titulo||'',
    categoria:d.categoria||'Geral',
    descricao:d.descricao||'',
    arquivo_nome:d.arquivoNome||'',
    mime:d.mime||'application/pdf',
    size:d.size||0,
    data_url:storageRef,
    criado_por:d.criadoPor||'',
    atualizado_em:d.atualizadoEm||new Date().toISOString(),
    publicado:typeof d.publicado==='boolean'?d.publicado:true
  };
}

function buildDocumentoStorageRef(bucket,path){
  if(!bucket||!path) return '';
  return `storage://${bucket}/${path}`;
}

function parseDocumentoStorageRef(ref){
  const bruto=String(ref||'').trim();
  const match=bruto.match(/^storage:\/\/([^/]+)\/(.+)$/i);
  if(!match) return null;
  return { bucket: match[1], path: match[2] };
}

function getDocumentoMergeKey(d){
  if(!d) return '';
  if(d.id!=null&&String(d.id)!=='') return `id:${d.id}`;
  const titulo=String(d.titulo||'').trim().toLowerCase();
  const categoria=String(d.categoria||'').trim().toLowerCase();
  const arquivo=String(d.arquivoNome||d.arquivo_nome||'').trim().toLowerCase();
  return `local:${titulo}::${categoria}::${arquivo}`;
}

function ordenarDocumentos(a,b){
  const dataA=Date.parse(a&&a.atualizadoEm||'')||0;
  const dataB=Date.parse(b&&b.atualizadoEm||'')||0;
  if(dataA!==dataB) return dataB-dataA;
  return String(a&&a.titulo||'').localeCompare(String(b&&b.titulo||''),'pt-BR');
}

function preferirDocumentoMaisRecente(atual, proximo){
  if(!atual) return proximo;
  const dataAtual=Date.parse(atual&&atual.atualizadoEm||'')||0;
  const dataProxima=Date.parse(proximo&&proximo.atualizadoEm||'')||0;
  return dataProxima>=dataAtual?proximo:atual;
}

function carregarDocumentosLS(){
  try{
    const raw=localStorage.getItem('zel_docs');
    const lista=raw?JSON.parse(raw):[];
    return Array.isArray(lista)?lista.map(mapDocumentoIn):[];
  }catch(e){
    return [];
  }
}

function slugDocumentoArquivo(nome){
  const bruto=String(nome||'documento.pdf').trim();
  const partes=bruto.split('.');
  const ext=partes.length>1?partes.pop().toLowerCase():'pdf';
  const base=partes.join('.')||'documento';
  const limpo=(typeof zUiText==='function'?zUiText(base):base)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80)||'documento';
  return `${limpo}.${ext||'pdf'}`;
}

async function dbUploadDocumentoArquivo(file, opts={}){
  if(!file) throw new Error('Arquivo PDF nao informado.');
  const bucket=opts.bucket||SB_DOCS_BUCKET;
  const pasta=opts.folder||'biblioteca';
  const nome=slugDocumentoArquivo(file.name||'documento.pdf');
  const stamp=Date.now();
  const rand=Math.random().toString(36).slice(2,8);
  const path=`${pasta}/${stamp}-${rand}-${nome}`;
  const {error}=await sb.storage.from(bucket).upload(path,file,{
    upsert:false,
    contentType:file.type||'application/pdf',
    cacheControl:'3600'
  });
  if(error) throw error;
  return { bucket, path, ref:buildDocumentoStorageRef(bucket,path) };
}

async function dbBaixarDocumentoArquivo(doc){
  const brutoDataUrl=String(doc&&doc.dataUrl||'').trim();
  const storageInfo=typeof parseDocumentoStorageRef==='function' ? parseDocumentoStorageRef(brutoDataUrl) : null;
  const bucket=String(doc&&doc.storageBucket||'').trim()||(storageInfo&&storageInfo.bucket)||'';
  const path=String(doc&&doc.storagePath||'').trim()||(storageInfo&&storageInfo.path)||'';
  if(bucket&&path){
    const {data,error}=await sb.storage.from(bucket).download(path);
    if(error) throw error;
    return data||null;
  }
  if(brutoDataUrl){
    const res=await fetch(brutoDataUrl);
    return await res.blob();
  }
  return null;
}

async function dbExcluirDocumentoArquivo(docOrBucket,pathMaybe){
  const bucket=typeof docOrBucket==='object'&&docOrBucket?(docOrBucket.storageBucket||''):String(docOrBucket||'');
  const path=typeof docOrBucket==='object'&&docOrBucket?(docOrBucket.storagePath||''):String(pathMaybe||'');
  if(!bucket||!path) return true;
  const {error}=await sb.storage.from(bucket).remove([path]);
  if(error) throw error;
  return true;
}

async function dbSalvarDocumento(doc, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para documentos.'});
  const dados=mapDocumentoOut(doc);
  const alvoId=id||doc.id;
  if(alvoId){
    const {data,error}=await sb.from('documentos').update(dados).eq('id',alvoId).select().single();
    if(error) throw error;
    if(data&&data.id!=null) doc.id=data.id;
    return doc;
  }
  const {data,error}=await sb.from('documentos').insert(dados).select().single();
  if(error) throw error;
  if(data&&data.id!=null) doc.id=data.id;
  return doc;
}

async function dbExcluirDocumento(docOuId){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para documentos.'});
  const alvoId=typeof docOuId==='object'&&docOuId?docOuId.id:docOuId;
  if(!alvoId) return true;
  const {error}=await sb.from('documentos').delete().eq('id',alvoId);
  if(error) throw error;
  return true;
}

async function dbSalvarVenda(v, tentativa=1){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para vendas.'});
  try{
    const payload={
      ...mapVendaOut(v),
      anexos:mapVendaAnexos(v.anexos)
    };
    const {data,payloadReduzido}=await salvarVendaComFallbackSchema(payload,'insert');
    if(data) v.id=data.id;
    if(payloadReduzido){
      console.warn('Tabela de vendas do Supabase sem todas as colunas mais novas. Venda salva com payload reduzido.');
    }
    if(typeof finSincronizarSaidasComissaoVenda==='function'){
      try{
        await finSincronizarSaidasComissaoVenda(v,{persistir:true});
      }catch(erroFinanceiro){
        console.warn('Falha ao sincronizar repasse automatico de comissao apos salvar a venda:',erroFinanceiro);
      }
    }
    return true;
  }catch(e){
    console.error(`Erro ao salvar venda (tentativa ${tentativa}):`,e.message);
    if(tentativa<3){
      await new Promise(r=>setTimeout(r,1800*tentativa));
      return dbSalvarVenda(v,tentativa+1);
    }
    showToast('❌','Falha ao salvar no banco. Tente novamente.');
    setTimeout(()=>{
      const el=document.getElementById('vr-'+v.id);
      if(el) el.style.borderLeft='3px solid #C05030';
      showToast('⚠️','Venda adicionada localmente mas NÃO salva no banco. Recarregue e tente novamente.');
    },200);
    return false;
  }
}

async function dbAtualizarVenda(v){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para vendas.'});
  await sb.from('vendas').update({
    etapa:v.etapa,hist:v.hist,distratada:v.distratada||false,
    cliente:v.cliente,produto:v.produto,construtora:v.construtora,
    origem:v.origem||'Indicação',unidade:v.unidade||'',
    valor:v.valor,pct:v.pct,imp:v.imp||0.11,
    pct_cor:v.pct_cor||0,pct_cap:v.pct_cap||0,pct_ger:v.pct_ger||0,
    pct_dir:v.pct_dir||0,pct_dir2:v.pct_dir2||0,
    bonus:v.bonus||0,bonus_pct_dir:v.bonus_pct_dir||0,
    bonus_pct_ger:v.bonus_pct_ger||0,bonus_pct_cor:v.bonus_pct_cor||0,
    cca:v.cca||'',
    anexos:(v.anexos||[]).map(a=>({nome:a.nome,tipo:a.tipo,tamanho:a.tamanho,data:a.data,por:a.por,mime:a.mime,dataUrl:a.dataUrl||''}))
  }).eq('id',v.id);
}

async function dbSalvarAnexos(vendaId, anexos){
  if(!anexos||!anexos.length) return;
  try{ await sbLong.from('vendas').update({anexos:mapVendaAnexos(anexos)}).eq('id',vendaId); }
  catch(e){ console.warn('Erro ao salvar anexos:',e.message); }
}

async function dbAtualizarVenda(v){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para vendas.'});
  const tentativa=arguments[1]||1;
  try{
    const payload={
      ...mapVendaOut(v),
      anexos:mapVendaAnexos(v.anexos)
    };
    const {payloadReduzido}=await salvarVendaComFallbackSchema(payload,'update',v.id);
    if(payloadReduzido){
      console.warn('Tabela de vendas do Supabase sem todas as colunas mais novas. Atualizacao salva com payload reduzido.');
    }
    if(typeof finSincronizarSaidasComissaoVenda==='function'){
      try{
        await finSincronizarSaidasComissaoVenda(v,{persistir:true});
      }catch(erroFinanceiro){
        console.warn('Falha ao sincronizar repasse automatico de comissao apos atualizar a venda:',erroFinanceiro);
      }
    }
    return true;
  }catch(error){
    const msg=mensagemErroSyncAgendamentos(error);
    const erroTransitorio=/timeout|network|fetch|abort/i.test(String(msg||''));
    if(erroTransitorio&&tentativa<3){
      console.warn(`Atualizacao da venda falhou por latencia/rede. Repetindo tentativa ${tentativa+1}...`,msg);
      await new Promise(r=>setTimeout(r,1800*tentativa));
      return dbAtualizarVenda(v,tentativa+1);
    }
    throw error;
  }
}

async function carregarAnexosVenda(id){
  try{
    const {data,error}=await sbLong.from('vendas').select('anexos').eq('id',id).single();
    if(error){
      const colunaAusente=extrairColunaAusenteSupabase(error,'vendas');
      if(colunaAusente==='anexos') return;
      return;
    }
    if(!data) return;
    const v=VENDAS.find(x=>x.id===id);
    if(v){
      v.anexos=data.anexos||[];
      v.anexosCarregados=true;
      const el=document.getElementById('vd-body');
      if(el&&curVId===id) showVDetail(id);
    }
  }catch(e){ console.warn('Erro ao carregar anexos:',e.message); }
}

// ── CRUD USUÁRIOS ─────────────────────────────────────────────────────────────
async function dbSalvarUsuario(u, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para usuários.'});
  const dados=mapUsuarioOut(u);
  if(id){
    const {data,error}=await sb.from('usuarios').update(dados).eq('id',id).select().single();
    if(error) throw error;
    if(data&&data.id) u.id=data.id;
  } else {
    const {data,error}=await sb.from('usuarios').insert(dados).select().single();
    if(error) throw error;
    if(!data) throw new Error('Usuário não retornado pelo banco.');
    if(data) u.id=data.id;
  }
  zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
  return u;
}

async function dbExcluirUsuario(email){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para usuários.'});
  const {error}=await sb.from('usuarios').delete().eq('email',email);
  if(error) throw error;
  zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
}

function mapUsuarioOutSnake(u){
  return mapUsuarioOut(u);
}

async function dbSalvarUsuario(u, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para usuários.'});
  const dados=mapUsuarioOut(u);
  if(id){
    const {data,error}=await sb.from('usuarios').update(dados).eq('id',id).select().single();
    if(error) throw error;
    if(data&&data.id) u.id=data.id;
  } else {
    const {data,error}=await sb.from('usuarios').insert(dados).select().single();
    if(error) throw error;
    if(!data) throw new Error('Usuário não retornado pelo banco.');
    if(data&&data.id) u.id=data.id;
  }
  zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
  return u;
}

async function dbSalvarSenha(email, senha){
  await sb.from('senhas').upsert({email:email.toLowerCase(),senha},{onConflict:'email'});
  SENHAS_INDIVIDUAIS[email.toLowerCase()]=senha;
  zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
}

// ── CRUD TREINAMENTOS ─────────────────────────────────────────────────────────
async function dbSalvarTrein(t, idx){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para treinamentos.'});
  const dados=mapTreinOut(t);
  const dadosBase={
    titulo:t.titulo,
    cat:t.cat,
    aulas:t.aulas,
    dur:t.dur,
    thumb:t.thumb,
    bg:t.bg,
    prog:t.prog
  };
  const salvar=async payload=>{
    if(t && t.id){
      const {data,error}=await sb.from('treinamentos').update(payload).eq('id',t.id).select().single();
      if(error) throw error;
      if(data && data.id) t.id = data.id;
      return data;
    }
    const {data,error}=await sb.from('treinamentos').insert(payload).select().single();
    if(error) throw error;
    if(data && data.id) t.id = data.id;
    return data;
  };
  try{
    await salvar(dados);
  }catch(e){
    const msg=String(e && (e.message||e.details||e.hint||e.code) || '').toLowerCase();
    const colunaInvalida=msg.includes('column') || msg.includes('schema cache') || msg.includes('videos') || msg.includes('obrigatorio') || msg.includes('prerequisito');
    if(!colunaInvalida) throw e;
    setTreinamentosCompatStatus({
      origem:'banco',
      videosCompartilhados:msg.includes('videos')?false:TREINAMENTOS_COMPAT_STATUS.videosCompartilhados,
      regrasCompartilhadas:(msg.includes('obrigatorio')||msg.includes('prerequisito'))?false:TREINAMENTOS_COMPAT_STATUS.regrasCompartilhadas
    });
    const tentativasFallback=[
      { label:'payload sem regras', payload:{ ...dadosBase, videos:dados.videos } },
      { label:'payload sem videos', payload:{ ...dadosBase, obrigatorio:!!t.obrigatorio, prerequisito:t.prerequisito||'' } },
      { label:'payload basico', payload:dadosBase }
    ];
    let ultimoErro=e;
    for(const tentativa of tentativasFallback){
      try{
        console.warn(`Tabela de treinamentos sem suporte completo. Tentando ${tentativa.label}.`, ultimoErro);
        await salvar(tentativa.payload);
        return;
      }catch(fallbackError){
        ultimoErro=fallbackError;
      }
    }
    throw ultimoErro;
  }
}

async function dbExcluirTrein(t){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para treinamentos.'});
  if(!t || !t.id) return true;
  const {error}=await sb.from('treinamentos').delete().eq('id', t.id);
  if(error) throw error;
  return true;
}

async function dbSalvarAgendamento(a, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para agendamentos.'});
  garantirRefLocalAgendamento(a,a&&a.id?'banco':'local');
  if(!a.atualizadoEm) a.atualizadoEm=new Date().toISOString();
  const payload=mapAgendamentoOut(a);
  const alvoId=parseInt(id||a.id,10)||0;
  const podeAtualizarPorId=!!(alvoId&&!agendamentoTemSyncPendente(a));
  try{
    let data=null;
    if(payload.ref_local){
      const respostaRef=await sb.from('agendamentos').update(payload).eq('ref_local',payload.ref_local).select().maybeSingle();
      if(respostaRef.error) throw respostaRef.error;
      data=respostaRef.data||null;
    }
    if(!data&&podeAtualizarPorId){
      const respostaId=await sb.from('agendamentos').update(payload).eq('id',alvoId).select().maybeSingle();
      if(respostaId.error) throw respostaId.error;
      data=respostaId.data||null;
    }
    if(!data){
      const respostaInsert=await sb.from('agendamentos').insert(payload).select().single();
      if(respostaInsert.error) throw respostaInsert.error;
      data=respostaInsert.data||null;
    }
    if(data) Object.assign(a,mapAgendamentoIn(data));
    limparAgendamentoSyncPendente(a);
    setStatusSyncAgendamentos({
      tabela:'disponivel',
      erro:'',
      ultimaSync:new Date().toISOString()
    });
    return a;
  }catch(error){
    marcarAgendamentoSyncPendente(a,error);
    setStatusSyncAgendamentos({
      tabela:erroTabelaAgendamentosAusente(error)?'ausente':'erro',
      erro:mensagemErroSyncAgendamentos(error)
    });
    throw error;
  }
}

async function dbExcluirAgendamento(agOuId){
  const alvoId=typeof agOuId==='object'&&agOuId?agOuId.id:agOuId;
  if(!alvoId) return true;
  try{
    const {error}=await sb.from('agendamentos').delete().eq('id',alvoId);
    if(error) throw error;
    setStatusSyncAgendamentos({tabela:'disponivel',erro:''});
    return true;
  }catch(error){
    setStatusSyncAgendamentos({
      tabela:erroTabelaAgendamentosAusente(error)?'ausente':'erro',
      erro:mensagemErroSyncAgendamentos(error)
    });
    throw error;
  }
}

async function dbSalvarLancamentoFinanceiro(lancamento, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para o financeiro.'});
  garantirRefLocalFinanceiro(lancamento);
  if(!lancamento.atualizadoEm) lancamento.atualizadoEm=new Date().toISOString();
  const payloadOriginal=mapLancamentoFinanceiroOut(lancamento);
  const comprovantePreservado={
    comprovanteNome:lancamento.comprovanteNome||'',
    comprovanteMime:lancamento.comprovanteMime||'',
    comprovanteSize:lancamento.comprovanteSize||0,
    comprovanteDataUrl:lancamento.comprovanteDataUrl||'',
    comprovanteLocalId:lancamento.comprovanteLocalId||'',
    comprovanteStorageBucket:lancamento.comprovanteStorageBucket||'',
    comprovanteStoragePath:lancamento.comprovanteStoragePath||''
  };
  const alvoId=parseInt(id||lancamento.id,10)||0;
  try{
    let payloadAtual={...payloadOriginal};
    let data=null;
    let payloadReduzido=false;
    for(let tentativa=0; tentativa<8; tentativa++){
      try{
        data=null;
        if(payloadAtual.ref_local){
          const respostaRef=await sb.from('financeiro_lancamentos').update(payloadAtual).eq('ref_local',payloadAtual.ref_local).select().maybeSingle();
          if(respostaRef.error) throw respostaRef.error;
          data=respostaRef.data||null;
        }
        if(!data&&alvoId){
          const respostaId=await sb.from('financeiro_lancamentos').update(payloadAtual).eq('id',alvoId).select().maybeSingle();
          if(respostaId.error) throw respostaId.error;
          data=respostaId.data||null;
        }
        if(!data){
          const respostaInsert=await sb.from('financeiro_lancamentos').insert(payloadAtual).select().single();
          if(respostaInsert.error) throw respostaInsert.error;
          data=respostaInsert.data||null;
        }
        break;
      }catch(errorInterno){
        const colunaAusente=extrairColunaAusenteSupabase(errorInterno,'financeiro_lancamentos');
        if(colunaAusente&&Object.prototype.hasOwnProperty.call(payloadAtual,colunaAusente)){
          payloadAtual=reduzirPayloadFinanceiroPorSchema(payloadAtual,colunaAusente);
          payloadReduzido=true;
          continue;
        }
        throw errorInterno;
      }
    }
    if(data){
      const dadosMapeados=mapLancamentoFinanceiroIn(data);
      if(payloadReduzido){
        Object.assign(lancamento,dadosMapeados,comprovantePreservado);
      }else{
        Object.assign(lancamento,dadosMapeados);
        preservarComprovanteFinanceiroLocal(lancamento,comprovantePreservado);
      }
    }
    lancamento.syncPendente=!!payloadReduzido;
    lancamento.syncErro=payloadReduzido?'Schema do Supabase ainda nao possui todas as colunas do financeiro.':'';
    return lancamento;
  }catch(error){
    lancamento.syncPendente=true;
    lancamento.syncErro=mensagemErroSyncAgendamentos(error);
    throw error;
  }
}

async function dbExcluirLancamentoFinanceiro(lancamentoOuId){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para o financeiro.'});
  const alvo=typeof lancamentoOuId==='object'&&lancamentoOuId?lancamentoOuId:null;
  const alvoId=parseInt(alvo?alvo.id:lancamentoOuId,10)||0;
  const refLocal=String(alvo&&(alvo.refLocal||alvo.ref_local)||'').trim();
  if(!alvoId&&!refLocal) return true;
  let ultimoErro=null;
  let executouAlgumaExclusao=false;
  if(refLocal){
    const {error}=await sb.from('financeiro_lancamentos').delete().eq('ref_local',refLocal);
    if(error) ultimoErro=error;
    else executouAlgumaExclusao=true;
  }
  if(alvoId){
    const {error}=await sb.from('financeiro_lancamentos').delete().eq('id',alvoId);
    if(error) ultimoErro=error;
    else executouAlgumaExclusao=true;
  }
  if(ultimoErro&&!executouAlgumaExclusao) throw ultimoErro;
  return true;
}

function lancamentoFinanceiroTemSyncPendente(item){
  return !!(item&&item.syncPendente);
}

async function sincronizarFinanceiroPendentes(opcoes={}){
  const pendentes=(Array.isArray(FINANCEIRO_LANCAMENTOS)?FINANCEIRO_LANCAMENTOS:[]).filter(lancamentoFinanceiroTemSyncPendente);
  if(!pendentes.length) return {pendentes:0,sincronizados:0,falhas:0};
  let sincronizados=0;
  let falhas=0;
  for(const item of pendentes){
    try{
      if(!item.comprovanteStoragePath&&(item.comprovanteLocalId||item.comprovanteDataUrl)){
        const arquivo=await prepararComprovanteFinanceiroParaUpload(item);
        if(item.comprovanteLocalId&&!arquivo){
          throw new Error('Comprovante local pendente nao encontrado para sincronizacao.');
        }
        if(arquivo){
          const upload=await dbUploadDocumentoArquivo(arquivo,{ folder:'financeiro/comprovantes' });
          item.comprovanteStorageBucket=upload.bucket||'';
          item.comprovanteStoragePath=upload.path||'';
          item.comprovanteDataUrl='';
          if(item.comprovanteLocalId){
            await excluirFinanceiroComprovanteLocal(item.comprovanteLocalId).catch(()=>true);
            item.comprovanteLocalId='';
          }
        }
      }
      item.atualizadoEm=new Date().toISOString();
      await dbSalvarLancamentoFinanceiro(item,0);
      if(item.comprovanteStoragePath&&item.comprovanteLocalId){
        await excluirFinanceiroComprovanteLocal(item.comprovanteLocalId).catch(()=>true);
        item.comprovanteLocalId='';
      }
      sincronizados++;
    }catch(error){
      item.syncPendente=true;
      item.syncErro=mensagemErroSyncAgendamentos(error);
      falhas++;
    }
  }
  FINANCEIRO_LANCAMENTOS.splice(0,FINANCEIRO_LANCAMENTOS.length,...FINANCEIRO_LANCAMENTOS.sort(ordenarFinanceiroLancamentos));
  zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
  salvarLS();
  if(opcoes.renderizar!==false&&typeof renderFinanceiro==='function'&&!document.getElementById('mod-financeiro')?.classList.contains('hidden')){
    renderFinanceiro();
  }
  if(opcoes.silencioso!==true&&typeof showToast==='function'){
    if(sincronizados&&!falhas) showToast('âœ…',`${sincronizados} lancamento${sincronizados>1?'s':''} financeiro${sincronizados>1?'s':''} sincronizado${sincronizados>1?'s':''} com o Supabase.`);
    else if(sincronizados&&falhas) showToast('âš ï¸',`${sincronizados} lancamento${sincronizados>1?'s':''} financeiro${sincronizados>1?'s':''} sincronizado${sincronizados>1?'s':''}, mas ${falhas} ainda pendente${falhas>1?'s':''}.`);
    else if(falhas) showToast('âš ï¸','Nao foi possivel sincronizar os lancamentos pendentes do financeiro agora.');
  }
  return {pendentes:pendentes.length,sincronizados,falhas};
}

async function sincronizarAgendamentosPendentes(opcoes={}){
  const pendentes=(Array.isArray(AGENDAMENTOS)?AGENDAMENTOS:[]).filter(agendamentoTemSyncPendente);
  const statusAtual=getStatusAgendamentosSync();
  if(statusAtual.sincronizando) return {pendentes:pendentes.length,sincronizados:0,falhas:0,ignorado:true};
  if(!statusAtual.tabelaDisponivel) return {pendentes:pendentes.length,sincronizados:0,falhas:pendentes.length,bloqueado:true};
  if(!pendentes.length){
    setStatusSyncAgendamentos({sincronizando:false});
    return {pendentes:0,sincronizados:0,falhas:0};
  }
  setStatusSyncAgendamentos({
    sincronizando:true,
    erro:'',
    ultimaTentativa:new Date().toISOString()
  });
  let sincronizados=0;
  let falhas=0;
  for(const item of pendentes){
    try{
      await dbSalvarAgendamento(item,0);
      sincronizados++;
    }catch(e){
      falhas++;
    }
  }
  const ordenados=[...(Array.isArray(AGENDAMENTOS)?AGENDAMENTOS:[])].sort(ordenarAgendamentos);
  AGENDAMENTOS.splice(0,AGENDAMENTOS.length,...ordenados);
  zSetState('state.data.agendamentos', AGENDAMENTOS);
  salvarLS();
  setStatusSyncAgendamentos({
    sincronizando:false,
    ultimaSync:sincronizados?new Date().toISOString():AGENDAMENTOS_SYNC_STATUS.ultimaSync
  });
  if(opcoes.renderizar!==false&&typeof renderAgendamentos==='function'&&!document.getElementById('mod-agendamentos')?.classList.contains('hidden')){
    renderAgendamentos();
  }
  if(opcoes.silencioso!==true&&typeof showToast==='function'){
    if(sincronizados&&!falhas) showToast('✅',`${sincronizados} agendamento${sincronizados>1?'s':''} sincronizado${sincronizados>1?'s':''} com o Supabase.`);
    else if(sincronizados&&falhas) showToast('⚠️',`${sincronizados} agendamento${sincronizados>1?'s':''} sincronizado${sincronizados>1?'s':''}, mas ${falhas} ainda pendente${falhas>1?'s':''}.`);
    else if(falhas) showToast('⚠️','Não foi possível sincronizar os agendamentos pendentes agora.');
  }
  return {pendentes:pendentes.length,sincronizados,falhas};
}

// ── LOCAL STORAGE (fallback offline) ─────────────────────────────────────────
function salvarLS(){
  try{
    const vendasSem=VENDAS.map(v=>({...v,anexos:[]}));
    localStorage.setItem('zel_usuarios',JSON.stringify(USUARIOS));
    localStorage.setItem('zel_vendas',JSON.stringify(vendasSem));
    localStorage.setItem('zel_trein',JSON.stringify(TREIN));
    localStorage.setItem('zel_docs',JSON.stringify(DOCUMENTOS));
    localStorage.setItem('zel_agendamentos',JSON.stringify(AGENDAMENTOS));
    localStorage.setItem('zel_financeiro_lancamentos',JSON.stringify(FINANCEIRO_LANCAMENTOS));
    localStorage.setItem('zel_senhas',JSON.stringify(SENHAS_INDIVIDUAIS));
    zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
    zSetState('state.data.vendas', VENDAS);
    zSetState('state.data.treinamentos', TREIN);
    zSetState('state.data.documentos', DOCUMENTOS);
    zSetState('state.data.agendamentos', AGENDAMENTOS);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    atualizarEstadoSyncAgendamentos();
    zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
    if(typeof renderDashboard==='function'&&!document.getElementById('mod-dashboard')?.classList.contains('hidden')){
      renderDashboard();
    }
    return true;
  }catch(e){
    console.warn('Falha ao salvar cache local:',e.message||e);
    return false;
  }
}
function carregarLS(){/* substituído pelo Supabase — mantido como fallback */}

// ── INICIALIZAÇÃO COM RETRY ───────────────────────────────────────────────────
function carregarLS(){
  try{
    const usuariosRaw=localStorage.getItem('zel_usuarios');
    const vendasRaw=localStorage.getItem('zel_vendas');
    const treinRaw=localStorage.getItem('zel_trein');
    const senhasRaw=localStorage.getItem('zel_senhas');
    const docsLocal=carregarDocumentosLS();
    const agendamentosLocal=carregarAgendamentosLS();
    const financeirosLocal=carregarFinanceiroLancamentosLS();

    if(usuariosRaw&&typeof USUARIOS!=='undefined'){
      const usuarios=JSON.parse(usuariosRaw);
      if(Array.isArray(usuarios)){
        USUARIOS.splice(0,USUARIOS.length,...usuarios.map(mapUsuarioIn));
        if(typeof nextUserId!=='undefined'){
          nextUserId=USUARIOS.length?Math.max(...USUARIOS.map(u=>parseInt(u.id,10)||0))+1:1;
          zSetState('state.ui.nextUserId', nextUserId);
        }
        zSetState('state.data.usuarios', USUARIOS);
      }
    }

    if(vendasRaw){
      const vendas=JSON.parse(vendasRaw);
      if(Array.isArray(vendas)){
        VENDAS.splice(0,VENDAS.length,...vendas.map(mapVendaIn));
        if(typeof nextVendaId!=='undefined'){
          nextVendaId=VENDAS.length?Math.max(...VENDAS.map(v=>parseInt(v.id,10)||0))+1:1;
          zSetState('state.ui.nextVendaId', nextVendaId);
        }
        zSetState('state.data.vendas', VENDAS);
      }
    }

    if(treinRaw){
      const treinamentos=JSON.parse(treinRaw);
      if(Array.isArray(treinamentos)){
        TREIN.splice(0,TREIN.length,...treinamentos.map(mapTreinIn));
        zSetState('state.data.treinamentos', TREIN);
      }
    }

    DOCUMENTOS.splice(0,DOCUMENTOS.length,...docsLocal.sort(ordenarDocumentos));
    zSetState('state.data.documentos', DOCUMENTOS);

    AGENDAMENTOS.splice(0,AGENDAMENTOS.length,...agendamentosLocal.sort(ordenarAgendamentos));
    if(typeof nextAgendamentoId!=='undefined'){
      const maiorId=AGENDAMENTOS.reduce((acc,item)=>Math.max(acc,parseInt(item&&item.id,10)||0),0);
      nextAgendamentoId=maiorId+1;
      zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
    }
    zSetState('state.data.agendamentos', AGENDAMENTOS);
    FINANCEIRO_LANCAMENTOS.splice(0,FINANCEIRO_LANCAMENTOS.length,...financeirosLocal.sort(ordenarFinanceiroLancamentos));
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    atualizarEstadoSyncAgendamentos();

    if(senhasRaw){
      const senhas=JSON.parse(senhasRaw);
      if(senhas&&typeof senhas==='object'){
        Object.keys(SENHAS_INDIVIDUAIS).forEach(email=>delete SENHAS_INDIVIDUAIS[email]);
        Object.assign(SENHAS_INDIVIDUAIS, senhas);
        zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
      }
    }
  }catch(e){
    console.warn('Falha ao carregar cache local:',e.message);
  }
}

function iniciarApp(){
  renderFiltros(); renderVList(); renderTrein(); renderProc();
  if(typeof iniciarDashboardLive==='function') iniciarDashboardLive();
  verificarConviteURL();
  atualizarBannerConectividadeApp();
  const splash=document.getElementById('app-splash');
  if(splash){
    splash.style.transition='opacity 0.5s ease';
    splash.style.opacity='0';
    setTimeout(()=>splash.remove(),500);
  }
  document.getElementById('main-app').style.opacity='1';
}

async function carregarComRetry(tentativa=1){
  const MAX=2, TIMEOUT=9000;
  const st=document.getElementById('sp-status-txt');
  if(st) st.textContent=tentativa>1?`Tentativa ${tentativa} de ${MAX}...`:'Carregando dados';
  try{
    await promiseComTimeout(carregarDB(), TIMEOUT, 'Carga inicial do Supabase');
    setAppConectividadeStatus({
      somenteLeitura:false,
      origem:'supabase',
      motivo:''
    });
    const temSessao=restaurarSessao();
    if(!temSessao) document.getElementById('login-screen').classList.remove('hidden');
    iniciarApp();
    agendarPosCargaSupabase({
      timeoutMs:30000,
      silenciosoAgendamentos:true,
      renderizarAgendamentos:true,
      persistirRh:true,
      renderizarRh:true
    });
  }catch(e){
    const etapa=getBootStage();
    console.warn(`Tentativa ${tentativa} falhou na etapa "${etapa}":`,e.message);
    if(tentativa<MAX){
      if(st) st.textContent=`Reconectando... (${tentativa}/${MAX})`;
      await new Promise(r=>setTimeout(r,1500));
      return carregarComRetry(tentativa+1);
    }
    console.error('Supabase indisponível após',MAX,'tentativas. Usando cache local.');
    carregarLS();
    setStatusSyncAgendamentos({
      tabela:'offline',
      erro:'Modo offline — sem conexão com o Supabase.',
      sincronizando:false
    });
    setAppConectividadeStatus({
      somenteLeitura:true,
      origem:'cache_local',
      motivo:'Sem conexão com o Supabase. Apenas consulta do último cache está liberada; novos cadastros e alterações estão bloqueados até reconectar e recarregar a página.'
    });
    const temSessao=restaurarSessao();
    if(!temSessao) document.getElementById('login-screen').classList.remove('hidden');
    iniciarApp();
    setTimeout(()=>{ showToast('⚠️','Modo consulta: dados locais podem estar desatualizados. Cadastros e alterações estão bloqueados até o Supabase voltar.'); },1000);
  }
}

if(typeof window!=='undefined'&&window&&typeof window.addEventListener==='function'){
  window.addEventListener('online', ()=>{
    if(appModoSomenteLeituraAtivo()&&typeof showToast==='function'){
      showToast('✅','Conexão restabelecida. Recarregue a página para voltar ao modo online.');
    }
    agendarPosCargaSupabase({
      timeoutMs:30000,
      silenciosoAgendamentos:true,
      renderizarAgendamentos:true,
      silenciosoFinanceiro:true,
      renderizarFinanceiro:true,
      persistirRh:false,
      renderizarRh:false
    });
  });
}

zRegisterModule('supabase', {
  client: sb,
  carregarDB,
  carregarComRetry,
  iniciarApp,
  salvarLS,
  carregarLS,
  dbSalvarVenda,
  dbAtualizarVenda,
  dbSalvarAnexos,
  carregarAnexosVenda,
  dbSalvarUsuario,
  dbExcluirUsuario,
  dbSalvarSenha,
  dbSalvarTrein,
  dbExcluirTrein,
  dbSalvarAgendamento,
  dbExcluirAgendamento,
  dbSalvarLancamentoFinanceiro,
  dbExcluirLancamentoFinanceiro,
  sincronizarAgendamentosPendentes,
  sincronizarFinanceiroPendentes,
  getStatusAgendamentosSync,
  dbSalvarDocumento,
  dbExcluirDocumento,
  dbUploadDocumentoArquivo,
  dbBaixarDocumentoArquivo,
  dbExcluirDocumentoArquivo,
  salvarFinanceiroComprovanteLocal,
  obterFinanceiroComprovanteLocal,
  excluirFinanceiroComprovanteLocal,
  docsBucket: SB_DOCS_BUCKET
});
