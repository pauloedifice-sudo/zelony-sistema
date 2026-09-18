// SUPABASE - parte 1/4: conexao/fetch com timeout, estado de boot/conectividade, autoatendimento de usuario, carga bruta das tabelas e aplicacao dos dados operacionais
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
const USER_SELF_SERVICE_FUNCTION_NAME='usuario-self-service';
let usuarioSessaoAutoatendimentoToken='';
let usuarioSessaoAutoatendimentoExpiraEm='';

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
const FINANCEIRO_SALDOS_BANCARIOS=[];
const FOLHA_PAGAMENTO_COLABORADORES=[];
const REEMBOLSOS_ATO=[];
const FINANCEIRO_COMPROVANTE_DB='zel_financeiro_comprovantes';
const FINANCEIRO_COMPROVANTE_STORE='arquivos';
const FINANCEIRO_TESTES_LEGADOS_BLOQUEADOS=[
  {descricao:'DEEP SALES',valor:3000},
  {descricao:'TESTE EXEMPLO',valor:4500},
  {descricao:'LEADS',valor:3000}
];
const USUARIOS_PADRAO=[
  {id:1,nome:'Paulo Edifice',email:'paulo.edifice@gmail.com',tel:'',perfil:'Diretor',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false,dataAtivacao:'',dataInativacao:'',historicoStatus:[]},
  {id:2,nome:'Giovana',email:'giovana@zelonyimoveis.com',tel:'',perfil:'RH',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false,dataAtivacao:'',dataInativacao:'',historicoStatus:[]},
];
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
let appShellInicializado=false;
let cargaCredenciaisPromise=null;
let cargaModulosPromise=null;
let cargaModulosConcluida=false;
let recargaAgendamentosPromise=null;
const SUPABASE_SCHEMA_AUSENCIAS={};

function textoFinanceiroTesteLegado(valor){
  return String(valor||'').trim().replace(/\s+/g,' ').toUpperCase();
}

function ehLancamentoFinanceiroTesteLegado(item){
  const descricao=textoFinanceiroTesteLegado(item&&(item.descricao||''));
  const valor=parseFloat(item&&item.valor)||0;
  return FINANCEIRO_TESTES_LEGADOS_BLOQUEADOS.some(meta=>
    meta.descricao===descricao&&Math.abs((parseFloat(meta.valor)||0)-valor)<0.0001
  );
}

function removerLancamentosFinanceirosTesteLegado(lista){
  const base=Array.isArray(lista)?lista:[];
  const removidos=[];
  for(let i=base.length-1;i>=0;i--){
    if(!ehLancamentoFinanceiroTesteLegado(base[i])) continue;
    removidos.push(base[i]);
    base.splice(i,1);
  }
  return removidos;
}
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
    banner.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100000;max-width:min(920px,calc(100vw - 32px));background:linear-gradient(180deg,rgba(31,31,31,0.98) 0%,rgba(19,19,19,0.96) 100%);border:1px solid rgba(201,154,46,0.32);color:#E8C46A;border-radius:14px;box-shadow:0 14px 32px rgba(0,0,0,0.4);padding:12px 16px;font:600 12px/1.45 \'Inter\',sans-serif;';
    docBody.appendChild(banner);
  }
  const motivo=String(APP_CONECTIVIDADE_STATUS.motivo||'').trim()||'Modo consulta ativo. Cadastros e alterações estão bloqueados até a conexão com o Supabase voltar.';
  banner.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><span>${zUiText('Modo consulta')}</span><span style="font-weight:500;color:#C9BDA4;">${zUiText(motivo)}</span><button type="button" onclick="window.location.reload()" style="margin-left:auto;background:var(--gold);color:#0B0B0B;border:0;border-radius:999px;padding:8px 14px;font:600 12px 'Inter',sans-serif;cursor:pointer;">${zUiText('Recarregar')}</button></div>`;
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

function revelarShellApp(){
  if(appShellInicializado) return;
  appShellInicializado=true;
  atualizarBannerConectividadeApp();
  if(typeof verificarConviteURL==='function') verificarConviteURL();
  const splash=document.getElementById('app-splash');
  if(splash){
    splash.style.transition='opacity 0.5s ease';
    splash.style.opacity='0';
    setTimeout(()=>splash.remove(),500);
  }
  const app=document.getElementById('main-app');
  if(app) app.style.opacity='1';
}

function renderizarModulosBaseApp(){
  if(typeof renderFiltros==='function') renderFiltros();
  if(typeof renderVList==='function') renderVList();
  if(typeof vtab!=='undefined'&&vtab==='rel'&&typeof renderRel==='function') renderRel();
  if(typeof curVId!=='undefined'&&curVId&&typeof showVDetail==='function') showVDetail(curVId);
  if(typeof renderTrein==='function') renderTrein();
  if(typeof renderProc==='function') renderProc();
  if(!document.getElementById('mod-documentos')?.classList.contains('hidden')&&typeof renderDocumentos==='function') renderDocumentos();
  if(!document.getElementById('mod-agendamentos')?.classList.contains('hidden')&&typeof renderAgendamentos==='function') renderAgendamentos();
  if(!document.getElementById('mod-envios')?.classList.contains('hidden')&&typeof renderEnvios==='function') renderEnvios();
  if(!document.getElementById('mod-financeiro')?.classList.contains('hidden')&&typeof renderFinanceiro==='function') renderFinanceiro();
  if(!document.getElementById('mod-reembolsos-ato')?.classList.contains('hidden')&&typeof renderReembolsosAto==='function') renderReembolsosAto();
  if(!document.getElementById('mod-folha-pagamento')?.classList.contains('hidden')&&typeof renderFolhaPagamento==='function') renderFolhaPagamento();
  if(!document.getElementById('mod-dashboard')?.classList.contains('hidden')&&typeof renderDashboard==='function') renderDashboard();
  if(!document.getElementById('mod-rh')?.classList.contains('hidden')&&typeof renderRhDashboard==='function') renderRhDashboard();
  if(!document.getElementById('mod-usuarios')?.classList.contains('hidden')&&typeof renderUsuarios==='function') renderUsuarios();
  if(typeof renderBtnNovaVenda==='function') renderBtnNovaVenda();
  if(typeof atualizarBadgeNotificacoes==='function') atualizarBadgeNotificacoes();
  if(typeof iniciarDashboardLive==='function') iniciarDashboardLive();
}
window.getAppConectividadeStatus=getAppConectividadeStatus;
window.appPodePersistirNoSupabase=appPodePersistirNoSupabase;
window.appModoSomenteLeituraAtivo=appModoSomenteLeituraAtivo;
window.atualizarBannerConectividadeApp=atualizarBannerConectividadeApp;
window.erroAgendamentoTelefoneDuplicado=erroAgendamentoTelefoneDuplicado;
window.mensagemErroAgendamentoTelefoneDuplicado=mensagemErroAgendamentoTelefoneDuplicado;
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
function erroAgendamentoTelefoneDuplicado(erro){
  const msg=mensagemErroSyncAgendamentos(erro);
  return /AGENDAMENTO_TELEFONE_DUPLICADO/i.test(msg);
}
function mensagemErroAgendamentoTelefoneDuplicado(erro){
  const msg=mensagemErroSyncAgendamentos(erro).replace(/^AGENDAMENTO_TELEFONE_DUPLICADO:\s*/i,'').trim();
  return msg||'Ja existe um compromisso em aberto para este telefone.';
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
zSetState('state.data.financeiroSaldosBancarios', FINANCEIRO_SALDOS_BANCARIOS);
zSetState('state.data.folhaPagamentoColaboradores', FOLHA_PAGAMENTO_COLABORADORES);
zSetState('state.data.reembolsosAto', REEMBOLSOS_ATO);
zSetState('state.data.usuariosPadrao', USUARIOS_PADRAO);
zSetState('state.auth.usuarioSessaoAutoatendimentoToken', usuarioSessaoAutoatendimentoToken);
zSetState('state.auth.usuarioSessaoAutoatendimentoExpiraEm', usuarioSessaoAutoatendimentoExpiraEm);

function usuarioSelfServiceBuildFunctionUrl(){
  return `${SB_URL}/functions/v1/${USER_SELF_SERVICE_FUNCTION_NAME}`;
}

function usuarioSelfServiceSessaoValida(){
  if(!usuarioSessaoAutoatendimentoToken||!usuarioSessaoAutoatendimentoExpiraEm) return false;
  const expira=Date.parse(usuarioSessaoAutoatendimentoExpiraEm);
  if(!Number.isFinite(expira)) return false;
  return expira>(Date.now()+60*1000);
}

function usuarioSelfServiceRegistrarSessao(token='',expiraEm=''){
  usuarioSessaoAutoatendimentoToken=String(token||'').trim();
  usuarioSessaoAutoatendimentoExpiraEm=String(expiraEm||'').trim();
  zSetState('state.auth.usuarioSessaoAutoatendimentoToken', usuarioSessaoAutoatendimentoToken);
  zSetState('state.auth.usuarioSessaoAutoatendimentoExpiraEm', usuarioSessaoAutoatendimentoExpiraEm);
  return usuarioSelfServiceSessaoValida();
}

function usuarioSelfServiceLimparSessao(){
  usuarioSessaoAutoatendimentoToken='';
  usuarioSessaoAutoatendimentoExpiraEm='';
  if(typeof FOLHA_PAGAMENTO_COLABORADORES!=='undefined'){
    FOLHA_PAGAMENTO_COLABORADORES.splice(0,FOLHA_PAGAMENTO_COLABORADORES.length);
    zSetState('state.data.folhaPagamentoColaboradores',FOLHA_PAGAMENTO_COLABORADORES);
  }
  if(typeof REEMBOLSOS_ATO!=='undefined'){
    REEMBOLSOS_ATO.splice(0,REEMBOLSOS_ATO.length);
    zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
  }
  if(typeof folhaResetarCargaProtegida==='function') folhaResetarCargaProtegida();
  if(typeof atoResetarCargaProtegida==='function') atoResetarCargaProtegida();
  zSetState('state.auth.usuarioSessaoAutoatendimentoToken', usuarioSessaoAutoatendimentoToken);
  zSetState('state.auth.usuarioSessaoAutoatendimentoExpiraEm', usuarioSessaoAutoatendimentoExpiraEm);
}

async function usuarioSelfServiceInvocar(action,payload={}){
  const response=await fetch(usuarioSelfServiceBuildFunctionUrl(),{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      apikey:SB_KEY,
      Authorization:`Bearer ${SB_KEY}`
    },
    body:JSON.stringify({
      action:String(action||'').trim(),
      ...(payload||{})
    })
  });
  let data=null;
  try{
    data=await response.json();
  }catch(_e){
    data=null;
  }
  if(!response.ok){
    const mensagemErro=data&&data.error&&typeof data.error==='object'
      ? (data.error.message||data.error.details||data.error.hint||data.message)
      : data&&(data.error||data.message);
    const mensagem=mensagemErro&&String(mensagemErro)!=='[object Object]'
      ? String(mensagemErro)
      : `Não foi possível concluir a operação no banco de dados (HTTP ${response.status}).`;
    throw new Error(mensagem);
  }
  return data||{};
}

async function usuarioSelfServiceEmitirSessao(email='',senha=''){
  const data=await usuarioSelfServiceInvocar('issue_session',{
    email:String(email||'').trim().toLowerCase(),
    senha:String(senha||'')
  });
  usuarioSelfServiceRegistrarSessao(data&&data.sessionToken||'',data&&data.sessionExpiresAt||'');
  return data||{};
}

async function usuarioSelfServiceGarantirSessao(email='',senhaFallback=''){
  if(usuarioSelfServiceSessaoValida()) return usuarioSessaoAutoatendimentoToken;
  const senha=String(senhaFallback||'');
  if(!email||!senha){
    throw new Error('Sessão protegida indisponível. Entre novamente para atualizar seus dados.');
  }
  const data=await usuarioSelfServiceEmitirSessao(email,senha);
  if(!usuarioSelfServiceSessaoValida()) throw new Error('Não foi possível proteger a sessão de autoatendimento agora.');
  return String(data&&data.sessionToken||usuarioSessaoAutoatendimentoToken||'').trim();
}

function usuarioSelfServiceMapUsuario(usuario){
  if(!usuario||typeof usuario!=='object') return null;
  return{
    id:usuario.id,
    nome:normalizarCampoSistema(usuario.nome),
    email:usuario.email,
    tel:usuario.tel||'',
    perfil:usuario.perfil||'',
    status:usuario.status||'Ativo',
    unidade:usuario.unidade||'',
    equipe:usuario.equipe||'',
    banco:usuario.banco||'',
    agencia:usuario.agencia||'',
    conta:usuario.conta||'',
    tipoConta:usuario.tipoConta||usuario.tipo_conta||'',
    pixTipo:usuario.pixTipo||usuario.pix_tipo||'',
    pix:usuario.pix||'',
    cpf:usuario.cpf||'',
    nasc:usuario.nasc||'',
    cep:usuario.cep||'',
    end:usuario.end||usuario.endereco||'',
    cidade:usuario.cidade||'',
    estado:usuario.estado||'',
    rhContratacao:!!(usuario.rhContratacao||usuario.rh_contratacao),
    dataAtivacao:normalizarDataUsuarioCampo(usuario.dataAtivacao||usuario.data_ativacao||''),
    dataInativacao:normalizarDataUsuarioCampo(usuario.dataInativacao||usuario.data_inativacao||''),
    historicoStatus:normalizarUsuarioHistoricoStatus(usuario.historicoStatus||usuario.historico_status||[])
  };
}

async function usuarioSelfServiceAtualizarMe(dados={},opcoes={}){
  const email=String(opcoes&&opcoes.email||((typeof usuarioLogado!=='undefined'&&usuarioLogado&&usuarioLogado.email)||'')).trim().toLowerCase();
  const senhaFallback=String(opcoes&&opcoes.senhaFallback||'');
  const tentativa=Number(opcoes&&opcoes._tentativa||0);
  try{
    const sessionToken=await usuarioSelfServiceGarantirSessao(email,senhaFallback);
    const data=await usuarioSelfServiceInvocar('update_self',{
      sessionToken,
      updates:{
        tel:String(dados&&dados.tel||'').trim(),
        banco:String(dados&&dados.banco||'').trim(),
        agencia:String(dados&&dados.agencia||'').trim(),
        conta:String(dados&&dados.conta||'').trim(),
        tipoConta:String(dados&&dados.tipoConta||'').trim(),
        pixTipo:String(dados&&dados.pixTipo||'').trim(),
        pix:String(dados&&dados.pix||'').trim()
      }
    });
    return{
      ...(data||{}),
      usuario:usuarioSelfServiceMapUsuario(data&&data.usuario)
    };
  }catch(e){
    const msg=String(e&&e.message||e||'');
    const expirou=/sess[aã]o|session|token/i.test(msg);
    if(expirou&&tentativa<1&&senhaFallback){
      usuarioSelfServiceLimparSessao();
      return usuarioSelfServiceAtualizarMe(dados,{...(opcoes||{}),_tentativa:tentativa+1});
    }
    throw e;
  }
}

async function dbCriarConviteUsuarioProtegido(convite={}){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para convites de usuários.'});
  const data=await folhaPagamentoInvocarProtegido('create_user_invite',{
    convite:{
      nome:String(convite&&convite.nome||'').trim(),
      email:String(convite&&convite.email||'').trim().toLowerCase(),
      perfil:String(convite&&convite.perfil||'').trim(),
      equipe:String(convite&&convite.equipe||'').trim(),
      unidade:String(convite&&convite.unidade||'').trim(),
      rhContratacao:!!(convite&&convite.rhContratacao)
    }
  });
  if(!data||!data.link||!data.usuario) throw new Error('O serviço protegido não confirmou a criação do convite.');
  return{
    ...data,
    usuario:typeof mapUsuarioIn==='function'?mapUsuarioIn(data.usuario):usuarioSelfServiceMapUsuario(data.usuario)
  };
}

async function dbObterConviteUsuarioSeguro(token=''){
  const data=await usuarioSelfServiceInvocar('get_user_invite',{
    token:String(token||'').trim()
  });
  if(!data||!data.convite) throw new Error('Convite não retornado pelo serviço protegido.');
  return data.convite;
}

async function dbConcluirConviteUsuarioSeguro(token='',dados={},senha=''){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para concluir o convite.'});
  const data=await usuarioSelfServiceInvocar('complete_user_invite',{
    token:String(token||'').trim(),
    dados:{
      nome:String(dados&&dados.nome||'').trim(),
      tel:String(dados&&dados.tel||'').trim(),
      nasc:String(dados&&dados.nasc||'').trim(),
      cpf:String(dados&&dados.cpf||'').trim(),
      cep:String(dados&&dados.cep||'').trim(),
      endereco:String(dados&&(dados.endereco||dados.end)||'').trim(),
      cidade:String(dados&&dados.cidade||'').trim(),
      estado:String(dados&&dados.estado||'').trim(),
      banco:String(dados&&dados.banco||'').trim(),
      agencia:String(dados&&dados.agencia||'').trim(),
      conta:String(dados&&dados.conta||'').trim(),
      tipoConta:String(dados&&dados.tipoConta||'').trim(),
      pixTipo:String(dados&&dados.pixTipo||'').trim(),
      pix:String(dados&&dados.pix||'').trim()
    },
    senha:String(senha||'')
  });
  if(!data||!data.usuario) throw new Error('O serviço protegido não confirmou a conclusão do cadastro.');
  return{
    ...data,
    usuario:typeof mapUsuarioIn==='function'?mapUsuarioIn(data.usuario):usuarioSelfServiceMapUsuario(data.usuario)
  };
}

async function folhaPagamentoInvocarProtegido(action,payload={},tentativa=0){
  const email=String((typeof usuarioLogado!=='undefined'&&usuarioLogado&&usuarioLogado.email)||'').trim().toLowerCase();
  try{
    const sessionToken=await usuarioSelfServiceGarantirSessao(email,'');
    return await usuarioSelfServiceInvocar(action,{sessionToken,...(payload||{})});
  }catch(e){
    const msg=String(e&&e.message||e||'');
    if(/sess[aã]o|session|token/i.test(msg)&&tentativa<1&&senha){
      usuarioSelfServiceLimparSessao();
      return folhaPagamentoInvocarProtegido(action,payload,tentativa+1);
    }
    throw e;
  }
}

async function recarregarFolhaPagamentoProtegida(){
  const data=await folhaPagamentoInvocarProtegido('list_payroll');
  const lista=Array.isArray(data&&data.colaboradores)?data.colaboradores:[];
  FOLHA_PAGAMENTO_COLABORADORES.splice(
    0,
    FOLHA_PAGAMENTO_COLABORADORES.length,
    ...lista.map(mapFolhaPagamentoIn).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
  );
  zSetState('state.data.folhaPagamentoColaboradores',FOLHA_PAGAMENTO_COLABORADORES);
  return FOLHA_PAGAMENTO_COLABORADORES;
}

async function recarregarReembolsosAtoProtegidos(){
  const data=await folhaPagamentoInvocarProtegido('list_ato_refunds');
  const lista=Array.isArray(data&&data.reembolsos)?data.reembolsos:[];
  REEMBOLSOS_ATO.splice(
    0,
    REEMBOLSOS_ATO.length,
    ...lista.map(mapReembolsoAtoIn).sort((a,b)=>String(a.dataPrevista||'').localeCompare(String(b.dataPrevista||'')))
  );
  zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
  return REEMBOLSOS_ATO;
}

// ── CARREGAR DO BANCO ─────────────────────────────────────────────────────────
async function carregarTabelaSupabase(tabela, order='id'){
  try{
    if(tabela==='usuarios'){
      const baseCols='id,nome,email,tel,perfil,status,unidade,equipe,banco,agencia,conta,tipo_conta,pix_tipo,pix,cpf,nasc,cep,endereco,cidade,estado,rh_contratacao';
      let colunas=`${baseCols},data_ativacao,data_inativacao,historico_status`;
      while(true){
        try{
          const q=sbLong.from(tabela).select(colunas);
          if(order) q.order(order);
          const {data,error}=await q;
          if(error) throw error;
          return data||[];
        }catch(errorUsuarios){
          const colunaAusente=extrairColunaAusenteSupabase(errorUsuarios,'usuarios');
          if(colunaAusente&&colunas.includes(colunaAusente)){
            registrarColunaAusenteSupabase('usuarios',colunaAusente);
            colunas=colunas.split(',').map(item=>item.trim()).filter(item=>item&&item!==colunaAusente).join(',');
            continue;
          }
          throw errorUsuarios;
        }
      }
    }
    const q=sbLong.from(tabela).select('*');
    if(order) q.order(order);
    const {data,error}=await q;
    if(error) throw error;
    return data||[];
  }catch(e){
    console.warn(`Falha ao carregar "${tabela}":`,e.message);
    return null;
  }
}

async function carregarVendasSupabase(){
  const VENDAS_COLS_BASE='id,data,mes,cliente,produto,construtora,origem,unidade,corretor,capitao,gerente,diretor,diretor2,cca,valor,pct,imp,pct_cor,pct_cap,pct_ger,pct_dir,pct_dir2,pct_rh,bonus,bonus_pct_dir,bonus_pct_dir2,bonus_pct_ger,bonus_pct_cor,bonus_forma,bonus_status,bonus_obs,etapa,hist,distratada';
  let colunas=`${VENDAS_COLS_BASE},ref_local`;
  try{
    let todas=[]; let pagina=0; const LOTE=20;
    while(true){
      try{
        const {data,error}=await sbLong.from('vendas').select(colunas).order('id').range(pagina*LOTE,(pagina+1)*LOTE-1);
        if(error) throw error;
        if(!data||data.length===0) break;
        todas=[...todas,...data];
        if(data.length<LOTE) break;
        pagina++;
      }catch(errorPagina){
        const colunaAusente=extrairColunaAusenteSupabase(errorPagina,'vendas');
        if(colunaAusente&&colunas.includes(colunaAusente)){
          registrarColunaAusenteSupabase('vendas',colunaAusente);
          colunas=colunas.split(',').map(item=>item.trim()).filter(item=>item&&item!==colunaAusente).join(',');
          todas=[];
          pagina=0;
          continue;
        }
        throw errorPagina;
      }
    }
    return todas;
  }catch(e){
    console.warn('Falha ao carregar "vendas":',e.message);
    return null;
  }
}

async function carregarAgendamentosSupabase(){
  try{
    let todas=[];
    let pagina=0;
    const LOTE=200;
    while(true){
      const inicio=pagina*LOTE;
      const fim=inicio+LOTE-1;
      const {data,error}=await sbLong
        .from('agendamentos')
        .select('*')
        .order('data_agendamento')
        .order('horario_agendamento')
        .order('id')
        .range(inicio,fim);
      if(error) throw error;
      const lote=Array.isArray(data)?data:[];
      if(!lote.length) break;
      todas.push(...lote);
      if(lote.length<LOTE) break;
      pagina++;
    }
    setStatusSyncAgendamentos({tabela:'disponivel',erro:''});
    return todas;
  }catch(e){
    const msg=mensagemErroSyncAgendamentos(e);
    setStatusSyncAgendamentos({
      tabela:erroTabelaAgendamentosAusente(e)?'ausente':'erro',
      erro:msg
    });
    console.warn('Falha ao carregar "agendamentos":',msg||e.message||e);
    return null;
  }
}

function aplicarUsuariosESenhas(us){
  if(Array.isArray(us)){
    USUARIOS.splice(0,USUARIOS.length,...us.map(mapUsuarioIn));
    if(typeof nextUserId!=='undefined'){
      const maiorId=USUARIOS.reduce((acc,item)=>Math.max(acc,parseInt(item&&item.id,10)||0),0);
      nextUserId=maiorId+1;
      zSetState('state.ui.nextUserId', nextUserId);
    }
    zSetState('state.data.usuarios', USUARIOS);
  }
}

function aplicarAgendamentosOperacionais(ags){
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
    const localAtualizadoEm=Date.parse(local&&local.atualizadoEm||'')||0;
    const bancoAtualizadoEm=Date.parse(banco&&banco.atualizadoEm||'')||0;
    const localMaisRecente=!!local&&(!banco||localAtualizadoEm>bancoAtualizadoEm);
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
  return AGENDAMENTOS;
}

function aplicarDadosOperacionais({vs,ts,ds,ags,fls,fsbs}={}){
  setBootStage('mesclando dados operacionais');
  if(Array.isArray(vs)){
    VENDAS.splice(0,VENDAS.length,...vs.map(mapVendaIn));
    if(typeof nextVendaId!=='undefined'){
      const maiorId=VENDAS.reduce((acc,item)=>Math.max(acc,parseInt(item&&item.id,10)||0),0);
      nextVendaId=maiorId+1;
      zSetState('state.ui.nextVendaId', nextVendaId);
    }
    zSetState('state.data.vendas', VENDAS);
  }
  {
    if(Array.isArray(ts)) inferirTreinamentosCompatStatus(ts,'banco');
    else setTreinamentosCompatStatus({origem:'local'});
    const treinBanco=Array.isArray(ts)?ts.map(mapTreinIn):[];
    const treinLocal=carregarTreinamentosLS();
    const treinMap=new Map();
    treinBanco.forEach(trein=>{ treinMap.set(getTreinMergeKeyItem(trein),trein); });
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
    // O caixa compartilhado usa o Supabase como fonte de verdade. O cache local
    // continua servindo para consulta durante uma indisponibilidade, mas nunca
    // injeta no caixa um lancamento cuja gravacao nao foi confirmada pelo banco.
    if(Array.isArray(fls)){
      const finMesclados=mesclarFinanceiroLancamentosBancoComLocal(fls, carregarFinanceiroLancamentosLS());
      FINANCEIRO_LANCAMENTOS.splice(0,FINANCEIRO_LANCAMENTOS.length,...finMesclados);
      zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    }
  }
  {
    const saldosLocal=carregarFinanceiroSaldosBancariosLS();
    const saldosOrigem=Array.isArray(fsbs)?fsbs.map(mapSaldoBancarioIn):saldosLocal;
    FINANCEIRO_SALDOS_BANCARIOS.splice(0,FINANCEIRO_SALDOS_BANCARIOS.length,...saldosOrigem.sort(ordenarSaldosBancarios));
    zSetState('state.data.financeiroSaldosBancarios', FINANCEIRO_SALDOS_BANCARIOS);
  }
  {
    aplicarAgendamentosOperacionais(ags);
  }
  salvarLS();
}

