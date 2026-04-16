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
const sb=supabase.createClient(SB_URL, SB_KEY);
zSetState('config.supabase', { url: SB_URL, key: SB_KEY });
zSetState('modules.supabase', { client: sb });
const AGENDAMENTOS_SYNC_STATUS={
  tabela:'desconhecida',
  erro:'',
  sincronizando:false,
  pendentes:0,
  ultimaTentativa:'',
  ultimaSync:''
};
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
const VENDAS=[];
let TREIN=[];
const DOCUMENTOS=[];
let AGENDAMENTOS=[];
const USUARIOS_PADRAO=[
  {id:1,nome:'Paulo Edifice',email:'paulo.edifice@gmail.com',tel:'',perfil:'Diretor',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
  {id:2,nome:'Giovana',email:'giovana@zelonyimoveis.com',tel:'',perfil:'RH',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
];
const SENHAS_PADRAO_MAP={'paulo.edifice@gmail.com':'Mudar@123','giovana@zelonyimoveis.com':'Mudar@123'};
zSetState('state.data.vendas', VENDAS);
zSetState('state.data.treinamentos', TREIN);
zSetState('state.data.documentos', DOCUMENTOS);
zSetState('state.data.agendamentos', AGENDAMENTOS);
zSetState('state.data.usuariosPadrao', USUARIOS_PADRAO);
zSetState('state.auth.senhasPadraoMap', SENHAS_PADRAO_MAP);

// ── CARREGAR DO BANCO ─────────────────────────────────────────────────────────
async function carregarDB(){
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

  const [us,ss,vs,ts,ds,ags]=await Promise.all([
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
    })()
  ]);

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
    if(getStatusAgendamentosSync().tabelaDisponivel&&AGENDAMENTOS.some(agendamentoTemSyncPendente)){
      await sincronizarAgendamentosPendentes({silencioso:true,renderizar:false});
    }
  }
  if(typeof aplicarAjustesManuaisRhPendentes==='function'&&VENDAS.length){
    await aplicarAjustesManuaisRhPendentes({persistir:true,renderizar:false});
  }
  zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);

  if(us===null&&vs===null) throw new Error('Falha total no carregamento');
}

// ── MAPPERS banco → app ───────────────────────────────────────────────────────
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
  if(doc&&doc.storageBucket&&doc.storagePath){
    const {data,error}=await sb.storage.from(doc.storageBucket).download(doc.storagePath);
    if(error) throw error;
    return data||null;
  }
  if(doc&&doc.dataUrl){
    const res=await fetch(doc.dataUrl);
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
  const alvoId=typeof docOuId==='object'&&docOuId?docOuId.id:docOuId;
  if(!alvoId) return true;
  const {error}=await sb.from('documentos').delete().eq('id',alvoId);
  if(error) throw error;
  return true;
}

async function dbSalvarVenda(v, tentativa=1){
  try{
    const payload={
      ...mapVendaOut(v),
      anexos:mapVendaAnexos(v.anexos)
    };
    const {data,error}=await sb.from('vendas').insert(payload).select().single();
    if(error) throw error;
    if(data) v.id=data.id;
    return true;
  }catch(e){
    console.error(`Erro ao salvar venda (tentativa ${tentativa}):`,e.message);
    if(tentativa<3){
      await new Promise(r=>setTimeout(r,1500));
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
  try{ await sb.from('vendas').update({anexos:mapVendaAnexos(anexos)}).eq('id',vendaId); }
  catch(e){ console.warn('Erro ao salvar anexos:',e.message); }
}

async function dbAtualizarVenda(v){
  const payload={
    ...mapVendaOut(v),
    anexos:mapVendaAnexos(v.anexos)
  };
  const {error}=await sb.from('vendas').update(payload).eq('id',v.id);
  if(error) throw error;
  return true;
}

async function carregarAnexosVenda(id){
  try{
    const {data,error}=await sb.from('vendas').select('anexos').eq('id',id).single();
    if(error||!data) return;
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
  const {error}=await sb.from('usuarios').delete().eq('email',email);
  if(error) throw error;
  zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
}

function mapUsuarioOutSnake(u){
  return mapUsuarioOut(u);
}

async function dbSalvarUsuario(u, id){
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
  if(!t || !t.id) return true;
  const {error}=await sb.from('treinamentos').delete().eq('id', t.id);
  if(error) throw error;
  return true;
}

async function dbSalvarAgendamento(a, id){
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
    localStorage.setItem('zel_senhas',JSON.stringify(SENHAS_INDIVIDUAIS));
    zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
    zSetState('state.data.vendas', VENDAS);
    zSetState('state.data.treinamentos', TREIN);
    zSetState('state.data.documentos', DOCUMENTOS);
    zSetState('state.data.agendamentos', AGENDAMENTOS);
    atualizarEstadoSyncAgendamentos();
    zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
  }catch(e){}
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
  verificarConviteURL();
  const splash=document.getElementById('app-splash');
  if(splash){
    splash.style.transition='opacity 0.5s ease';
    splash.style.opacity='0';
    setTimeout(()=>splash.remove(),500);
  }
  document.getElementById('main-app').style.opacity='1';
}

async function carregarComRetry(tentativa=1){
  const MAX=3, TIMEOUT=15000;
  const st=document.getElementById('sp-status-txt');
  if(st) st.textContent=tentativa>1?`Tentativa ${tentativa} de ${MAX}...`:'Carregando dados';
  try{
    const comTimeout=(promise,ms)=>Promise.race([
      promise,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))
    ]);
    await comTimeout(carregarDB(), TIMEOUT);
    const temSessao=restaurarSessao();
    if(!temSessao) document.getElementById('login-screen').classList.remove('hidden');
    iniciarApp();
  }catch(e){
    console.warn(`Tentativa ${tentativa} falhou:`,e.message);
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
    const temSessao=restaurarSessao();
    if(!temSessao) document.getElementById('login-screen').classList.remove('hidden');
    iniciarApp();
    setTimeout(()=>{ showToast('⚠️','Modo offline — dados podem estar desatualizados'); },1000);
  }
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
  sincronizarAgendamentosPendentes,
  getStatusAgendamentosSync,
  dbSalvarDocumento,
  dbExcluirDocumento,
  dbUploadDocumentoArquivo,
  dbBaixarDocumentoArquivo,
  dbExcluirDocumentoArquivo,
  docsBucket: SB_DOCS_BUCKET
});
