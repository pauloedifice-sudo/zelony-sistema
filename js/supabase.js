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
const sb=supabase.createClient(SB_URL, SB_KEY);
zSetState('config.supabase', { url: SB_URL, key: SB_KEY });
zSetState('modules.supabase', { client: sb });

// ── DADOS EM MEMÓRIA ──────────────────────────────────────────────────────────
const VENDAS=[];
let TREIN=[];
const USUARIOS_PADRAO=[
  {id:1,nome:'Paulo Edifice',email:'paulo.edifice@gmail.com',tel:'',perfil:'Diretor',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
  {id:2,nome:'Giovana',email:'giovana@zelonyimoveis.com',tel:'',perfil:'RH',status:'Ativo',unidade:'Ambas',banco:'',agencia:'',conta:'',tipoConta:'',pixTipo:'',pix:'',rhContratacao:false},
];
const SENHAS_PADRAO_MAP={'paulo.edifice@gmail.com':'Mudar@123','giovana@zelonyimoveis.com':'Mudar@123'};
zSetState('state.data.vendas', VENDAS);
zSetState('state.data.treinamentos', TREIN);
zSetState('state.data.usuariosPadrao', USUARIOS_PADRAO);
zSetState('state.auth.senhasPadraoMap', SENHAS_PADRAO_MAP);

// ── CARREGAR DO BANCO ─────────────────────────────────────────────────────────
async function carregarDB(){
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

  const [us,ss,vs,ts]=await Promise.all([
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
  if(ts&&ts.length){
    TREIN.splice(0,TREIN.length,...ts.map(mapTreinIn));
    zSetState('state.data.treinamentos', TREIN);
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

function mapVendaIn(v){
  return{
    id:v.id,data:v.data,mes:v.mes,cliente:v.cliente,produto:v.produto,
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
    anexos:[] // carregado sob demanda
  };
}

function mapVendaOut(v){
  return{
    data:v.data,mes:v.mes,cliente:v.cliente,produto:v.produto,
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

function mapTreinIn(t){ return{titulo:t.titulo,cat:t.cat,aulas:t.aulas,dur:t.dur,thumb:t.thumb,bg:t.bg,prog:t.prog}; }
function mapTreinOut(t){ return{titulo:t.titulo,cat:t.cat,aulas:t.aulas,dur:t.dur,thumb:t.thumb,bg:t.bg,prog:t.prog}; }

// ── CRUD VENDAS ───────────────────────────────────────────────────────────────
async function dbSalvarVenda(v, tentativa=1){
  try{
    const {data,error}=await sb.from('vendas').insert(mapVendaOut(v)).select().single();
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
  try{ await sb.from('vendas').update({anexos:anexos}).eq('id',vendaId); }
  catch(e){ console.warn('Erro ao salvar anexos:',e.message); }
}

async function dbAtualizarVenda(v){
  const payload={
    ...mapVendaOut(v),
    anexos:(v.anexos||[]).map(a=>({nome:a.nome,tipo:a.tipo,tamanho:a.tamanho,data:a.data,por:a.por,mime:a.mime,dataUrl:a.dataUrl||''}))
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
    if(v&&data.anexos){
      v.anexos=data.anexos;
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
  if(idx!==undefined&&idx>=0){
    const {data:todos}=await sb.from('treinamentos').select('id,titulo,cat');
    if(todos){
      const found=todos.find(x=>x.titulo===TREIN[idx].titulo&&x.cat===TREIN[idx].cat);
      if(found) await sb.from('treinamentos').update(dados).eq('id',found.id);
      else await sb.from('treinamentos').insert(dados);
    }
  } else {
    await sb.from('treinamentos').insert(dados);
  }
}

// ── LOCAL STORAGE (fallback offline) ─────────────────────────────────────────
function salvarLS(){
  try{
    const vendasSem=VENDAS.map(v=>({...v,anexos:[]}));
    localStorage.setItem('zel_usuarios',JSON.stringify(USUARIOS));
    localStorage.setItem('zel_vendas',JSON.stringify(vendasSem));
    localStorage.setItem('zel_trein',JSON.stringify(TREIN));
    localStorage.setItem('zel_senhas',JSON.stringify(SENHAS_INDIVIDUAIS));
    zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
    zSetState('state.data.vendas', VENDAS);
    zSetState('state.data.treinamentos', TREIN);
    zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
  }catch(e){}
}
function carregarLS(){/* substituído pelo Supabase — mantido como fallback */}

// ── INICIALIZAÇÃO COM RETRY ───────────────────────────────────────────────────
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
  dbSalvarTrein
});
