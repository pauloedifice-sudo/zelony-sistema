// SUPABASE - parte 2/4: orquestracao de carga do banco, mappers de usuario/folha/reembolso/venda, salvamento com fallback de schema e mappers/merge de treinamentos
async function carregarCredenciaisDB(){
  if(cargaCredenciaisPromise) return cargaCredenciaisPromise;
  cargaCredenciaisPromise=(async()=>{
    setBootStage('preparando acesso');
    setStatusSyncAgendamentos({
      tabela:'carregando',
      erro:'',
      sincronizando:false,
      ultimaTentativa:new Date().toISOString()
    });
    setBootStage('acordando projeto do Supabase');
    await sbLong.from('usuarios').select('id').limit(1);
    setBootStage('validando usuarios');
    const us=await carregarTabelaSupabase('usuarios','id');
    aplicarUsuariosESenhas(us);
    if(us===null) throw new Error('Falha total no carregamento de usuarios');
    setBootStage('credenciais carregadas');
    return {us};
  })();
  try{
    return await cargaCredenciaisPromise;
  }finally{
    cargaCredenciaisPromise=null;
  }
}

async function carregarModulosDB(){
  if(cargaModulosPromise) return cargaModulosPromise;
  if(cargaModulosConcluida) return {cache:true};
  cargaModulosPromise=(async()=>{
    setBootStage('buscando dados dos modulos');
    const [vs,ts,ds,ags,fls,fsbs]=await Promise.all([
      carregarVendasSupabase(),
      carregarTabelaSupabase('treinamentos','id'),
      carregarTabelaSupabase('documentos','id'),
      carregarAgendamentosSupabase(),
      carregarTabelaSupabase('financeiro_lancamentos','data_prevista'),
      carregarTabelaSupabase('financeiro_saldos_bancarios','data_referencia')
    ]);
    aplicarDadosOperacionais({vs,ts,ds,ags,fls,fsbs});
    const tudoFalhou=vs===null&&ts===null&&ds===null&&ags===null&&fls===null&&fsbs===null;
    if(tudoFalhou&&VENDAS.length===0&&TREIN.length===0&&DOCUMENTOS.length===0&&AGENDAMENTOS.length===0&&FINANCEIRO_LANCAMENTOS.length===0){
      throw new Error('Falha total no carregamento dos modulos');
    }
    cargaModulosConcluida=true;
    setBootStage('dados carregados');
    return {vs,ts,ds,ags,fls,fsbs};
  })();
  try{
    return await cargaModulosPromise;
  }finally{
    cargaModulosPromise=null;
  }
}

async function carregarDB(opcoes={}){
  const config=opcoes||{};
  await carregarCredenciaisDB();
  if(config.somenteCredenciais) return true;
  return carregarModulosDB();
}

async function recarregarAgendamentosCompartilhados(opcoes={}){
  if(recargaAgendamentosPromise) return recargaAgendamentosPromise;
  const config={
    salvarCache:opcoes.salvarCache!==false,
    renderizar:opcoes.renderizar!==false,
    renderizarDashboard:opcoes.renderizarDashboard!==false,
    atualizarNotificacoes:opcoes.atualizarNotificacoes!==false
  };
  recargaAgendamentosPromise=(async()=>{
    const ags=await carregarAgendamentosSupabase();
    if(!Array.isArray(ags)) return {ok:false,atualizado:false,erro:true};
    aplicarAgendamentosOperacionais(ags);
    if(config.salvarCache) salvarLS();
    if(config.renderizar&&typeof renderAgendamentos==='function'&&!document.getElementById('mod-agendamentos')?.classList.contains('hidden')){
      renderAgendamentos();
    }
    if(config.renderizarDashboard&&typeof renderDashboard==='function'&&!document.getElementById('mod-dashboard')?.classList.contains('hidden')){
      renderDashboard();
    }
    if(config.atualizarNotificacoes&&typeof atualizarBadgeNotificacoes==='function'){
      atualizarBadgeNotificacoes();
    }
    return {ok:true,atualizado:true,total:AGENDAMENTOS.length};
  })();
  try{
    return await recargaAgendamentosPromise;
  }finally{
    recargaAgendamentosPromise=null;
  }
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
    // Falhas financeiras antigas nao sao reenviadas automaticamente. Novas
    // movimentacoes so entram no caixa depois da confirmacao do banco.
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
    id:u.id,nome:normalizarCampoSistema(u.nome),email:u.email,tel:u.tel||'',perfil:u.perfil,
    status,unidade:u.unidade||'',equipe:u.equipe||'',
    banco:u.banco||'',agencia:u.agencia||'',conta:u.conta||'',
    tipoConta:u.tipoConta||u.tipo_conta||'',
    pixTipo:u.pixTipo||u.pix_tipo||'',pix:u.pix||'',
    cpf:u.cpf||'',nasc:u.nasc||'',cep:u.cep||'',
    end:u.end||u.endereco||'',cidade:u.cidade||'',estado:u.estado||'',
    rhContratacao:!!(u.rhContratacao||u.rh_contratacao),
    dataAtivacao:normalizarDataUsuarioCampo(u.dataAtivacao||u.data_ativacao||''),
    dataInativacao:normalizarDataUsuarioCampo(u.dataInativacao||u.data_inativacao||''),
    historicoStatus:normalizarUsuarioHistoricoStatus(u.historicoStatus||u.historico_status||[]),
    token:u.token||null
  };
}

function mapUsuarioOut(u){
  return{
    nome:normalizarCampoSistema(u.nome),email:u.email,tel:u.tel||'',perfil:u.perfil,
    status:u.status||'Ativo',unidade:u.unidade||'',equipe:u.equipe||'',
    banco:u.banco||'',agencia:u.agencia||'',conta:u.conta||'',
    tipo_conta:u.tipoConta||'',pix_tipo:u.pixTipo||'',pix:u.pix||'',
    cpf:u.cpf||'',nasc:u.nasc||'',cep:u.cep||'',
    endereco:u.end||'',cidade:u.cidade||'',estado:u.estado||'',
    rh_contratacao:!!u.rhContratacao,
    data_ativacao:normalizarDataUsuarioCampo(u.dataAtivacao||'')||null,
    data_inativacao:normalizarDataUsuarioCampo(u.dataInativacao||'')||null,
    historico_status:normalizarUsuarioHistoricoStatus(u.historicoStatus||[])
  };
}

function mapFolhaPagamentoIn(item){
  const salario=Number(item&&(item.salario!=null?item.salario:item.valor_salario));
  return{
    id:item&&item.id!=null?parseInt(item.id,10)||item.id:null,
    nome:normalizarCampoSistema(item&&item.nome||''),
    cpf:String(item&&item.cpf||'').replace(/\D/g,''),
    funcao:normalizarCampoSistema(item&&(item.funcao||item['função'])||''),
    salario:Number.isFinite(salario)?salario:0,
    chavePix:String(item&&(item.chavePix||item.chave_pix)||'').trim(),
    banco:normalizarCampoSistema(item&&item.banco||''),
    criadoPor:item&&(item.criadoPor||item.criado_por)||'',
    criadoPorId:item&&(item.criadoPorId||item.criado_por_id)||null,
    criadoPorEmail:item&&(item.criadoPorEmail||item.criado_por_email)||'',
    atualizadoEm:item&&(item.atualizadoEm||item.atualizado_em)||''
  };
}

function mapFolhaPagamentoOut(item){
  return{
    nome:normalizarCampoSistema(item&&item.nome||''),
    cpf:String(item&&item.cpf||'').replace(/\D/g,''),
    funcao:normalizarCampoSistema(item&&item.funcao||''),
    salario:Number(item&&item.salario)||0,
    chave_pix:String(item&&item.chavePix||'').trim(),
    banco:normalizarCampoSistema(item&&item.banco||''),
    criado_por:item&&item.criadoPor||null,
    criado_por_id:item&&item.criadoPorId||null,
    criado_por_email:item&&item.criadoPorEmail||null,
    atualizado_em:new Date().toISOString()
  };
}

function mapReembolsoAtoIn(item){
  const valor=Number(item&&item.valor);
  return{
    id:item&&item.id!=null?parseInt(item.id,10)||item.id:null,
    cliente:normalizarCampoSistema(item&&item.cliente||''),
    telefone:String(item&&item.telefone||'').trim(),
    valor:Number.isFinite(valor)?valor:0,
    dataPrevista:String(item&&(item.data_prevista||item.dataPrevista)||'').slice(0,10),
    banco:normalizarCampoSistema(item&&item.banco||''),
    chavePix:String(item&&(item.chave_pix||item.chavePix)||'').trim(),
    status:String(item&&item.status||'pendente').trim().toLowerCase()==='reembolsado'?'reembolsado':'pendente',
    dataReembolso:String(item&&(item.data_reembolso||item.dataReembolso)||'').slice(0,10),
    financeiroLancamentoId:parseInt(item&&(item.financeiro_lancamento_id||item.financeiroLancamentoId),10)||null,
    comprovanteNome:String(item&&(item.comprovante_nome||item.comprovanteNome)||'').trim(),
    comprovanteMime:String(item&&(item.comprovante_mime||item.comprovanteMime)||'').trim(),
    comprovanteSize:parseInt(item&&(item.comprovante_size||item.comprovanteSize),10)||0,
    comprovanteStorageBucket:String(item&&(item.comprovante_storage_bucket||item.comprovanteStorageBucket)||'').trim(),
    comprovanteStoragePath:String(item&&(item.comprovante_storage_path||item.comprovanteStoragePath)||'').trim(),
    criadoPor:item&&(item.criadoPor||item.criado_por)||'',
    criadoPorId:item&&(item.criadoPorId||item.criado_por_id)||null,
    criadoPorEmail:item&&(item.criadoPorEmail||item.criado_por_email)||'',
    atualizadoEm:item&&(item.atualizadoEm||item.atualizado_em)||''
  };
}

function mapReembolsoAtoOut(item){
  return{
    cliente:normalizarCampoSistema(item&&item.cliente||''),
    telefone:String(item&&item.telefone||'').trim(),
    valor:Number(item&&item.valor)||0,
    data_prevista:String(item&&item.dataPrevista||'').slice(0,10),
    banco:normalizarCampoSistema(item&&item.banco||''),
    chave_pix:String(item&&item.chavePix||'').trim()
  };
}

function normalizarDataUsuarioCampo(valor){
  const bruto=String(valor||'').trim();
  if(!bruto) return '';
  const matchIso=bruto.match(/^(\d{4}-\d{2}-\d{2})/);
  if(matchIso) return matchIso[1];
  if(typeof obterMomentoHistorico==='function'){
    const info=obterMomentoHistorico({d:bruto},{preferTs:false});
    if(info&&info.date){
      const ano=info.date.getFullYear();
      const mes=String(info.date.getMonth()+1).padStart(2,'0');
      const dia=String(info.date.getDate()).padStart(2,'0');
      return `${ano}-${mes}-${dia}`;
    }
  }
  return '';
}

function normalizarUsuarioHistoricoStatus(valor){
  let bruto=valor;
  if(typeof bruto==='string'&&bruto.trim()){
    try{
      bruto=JSON.parse(bruto);
    }catch(_e){
      bruto=[];
    }
  }
  if(!Array.isArray(bruto)) return [];
  return bruto.filter(item=>item&&typeof item==='object').map(item=>({
    tipo:String(item.tipo||'').trim(),
    data:String(item.data||item.d||'').trim(),
    ts:String(item.ts||'').trim(),
    por:String(item.por||item.u||'').trim(),
    statusAnterior:String(item.statusAnterior||'').trim(),
    statusNovo:String(item.statusNovo||'').trim(),
    origem:String(item.origem||'').trim(),
    equipeAnterior:String(item.equipeAnterior||'').trim(),
    equipeNova:String(item.equipeNova||'').trim()
  }));
}

function normalizarMesVenda(mes){
  const bruto=String(mes||'').trim();
  if(!bruto) return '';
  const txt=(typeof zUiText==='function'?zUiText(bruto):bruto).trim().toUpperCase();
  return txt==='MARCO'?'MARÇO':txt;
}

function normalizarCampoSistema(valor){
  if(typeof zNormalizarCampoTexto==='function') return zNormalizarCampoTexto(valor);
  return String(valor||'').trim();
}

function registrarColunaAusenteSupabase(tabela='',coluna=''){
  const tabelaKey=String(tabela||'').trim().toLowerCase();
  const colunaKey=String(coluna||'').trim().toLowerCase();
  if(!tabelaKey||!colunaKey) return false;
  if(!SUPABASE_SCHEMA_AUSENCIAS[tabelaKey]) SUPABASE_SCHEMA_AUSENCIAS[tabelaKey]=new Set();
  SUPABASE_SCHEMA_AUSENCIAS[tabelaKey].add(colunaKey);
  return true;
}

function colunaAusenteSupabaseRegistrada(tabela='',coluna=''){
  const tabelaKey=String(tabela||'').trim().toLowerCase();
  const colunaKey=String(coluna||'').trim().toLowerCase();
  return !!(tabelaKey&&colunaKey&&SUPABASE_SCHEMA_AUSENCIAS[tabelaKey]&&SUPABASE_SCHEMA_AUSENCIAS[tabelaKey].has(colunaKey));
}

function gerarRefLocalVenda(){
  if(typeof crypto!=='undefined'&&crypto&&typeof crypto.randomUUID==='function'){
    return `ven-${crypto.randomUUID()}`;
  }
  return `ven-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

function garantirRefLocalVenda(item,origem='local'){
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
  item.refLocal=gerarRefLocalVenda();
  return item.refLocal;
}

function extrairUltimaGestaoBonusHistorico(hist){
  const itens=Array.isArray(hist)?hist:[];
  for(let i=itens.length-1;i>=0;i--){
    const item=itens[i];
    if(!item||String(item.tipo||'').trim().toLowerCase()!=='bonus_gestao') continue;
    return{
      forma:String(item.bonusForma||'').trim().toLowerCase(),
      status:String(item.bonusStatus||'').trim().toLowerCase(),
      obs:String(item.bonusObs||'').trim()
    };
  }
  return null;
}

function mapVendaIn(v){
  const imposto=parseFloat(v.imp);
  const bonusHist=extrairUltimaGestaoBonusHistorico(v&&v.hist);
  const venda={
    id:v.id,data:v.data,mes:normalizarMesVenda(v.mes),cliente:v.cliente,produto:v.produto,
    construtora:normalizarCampoSistema(v.construtora),origem:normalizarCampoSistema(v.origem),unidade:normalizarCampoSistema(v.unidade),
    corretor:normalizarCampoSistema(v.corretor),capitao:normalizarCampoSistema(v.capitao),gerente:normalizarCampoSistema(v.gerente),diretor:normalizarCampoSistema(v.diretor),
    diretor2:normalizarCampoSistema(v.diretor2||''),cca:normalizarCampoSistema(v.cca||''),
    valor:parseFloat(v.valor)||0,pct:parseFloat(v.pct)||0,imp:Number.isFinite(imposto)?imposto:0.11,
    pct_cor:parseFloat(v.pct_cor)||0,pct_cap:parseFloat(v.pct_cap)||0,
    pct_ger:parseFloat(v.pct_ger)||0,pct_dir:parseFloat(v.pct_dir)||0,
    pct_dir2:parseFloat(v.pct_dir2)||0,pct_rh:parseFloat(v.pct_rh)||0,
    bonus:parseFloat(v.bonus)||0,bonus_pct_dir:parseFloat(v.bonus_pct_dir)||0,
    bonus_pct_dir2:parseFloat(v.bonus_pct_dir2)||0,bonus_pct_ger:parseFloat(v.bonus_pct_ger)||0,
    bonus_pct_cor:parseFloat(v.bonus_pct_cor)||0,
    bonus_forma:String(v.bonus_forma||v.bonusForma||(bonusHist&&bonusHist.forma)||'').trim(),
    bonus_status:String(v.bonus_status||v.bonusStatus||(bonusHist&&bonusHist.status)||'').trim(),
    bonus_obs:String(v.bonus_obs||v.bonusObs||'').trim(),
    etapa:parseInt(v.etapa)||0,
    hist:v.hist||[],
    distratada:!!v.distratada,
    refLocal:String(v&&(v.ref_local||v.refLocal)||'').trim(),
    anexos:[], // carregado sob demanda
    anexosCarregados:false
  };
  garantirRefLocalVenda(venda,v&&v.id?'banco':'local');
  return venda;
}

function mapVendaOut(v){
  const bonusHist=extrairUltimaGestaoBonusHistorico(v&&v.hist);
  const bonusForma=String(v.bonus_forma||v.bonusForma||(bonusHist&&bonusHist.forma)||'').trim();
  const bonusStatus=String(v.bonus_status||v.bonusStatus||(bonusHist&&bonusHist.status)||'').trim();
  return{
    data:v.data,mes:normalizarMesVenda(v.mes),cliente:v.cliente,produto:v.produto,
    construtora:normalizarCampoSistema(v.construtora),origem:normalizarCampoSistema(v.origem),unidade:normalizarCampoSistema(v.unidade),
    corretor:normalizarCampoSistema(v.corretor),capitao:normalizarCampoSistema(v.capitao),gerente:normalizarCampoSistema(v.gerente),diretor:normalizarCampoSistema(v.diretor),
    valor:v.valor,pct:v.pct,imp:v.imp,pct_cor:v.pct_cor,pct_cap:v.pct_cap,
    pct_ger:v.pct_ger,pct_dir:v.pct_dir,pct_rh:v.pct_rh,
    diretor2:normalizarCampoSistema(v.diretor2||'')||null,pct_dir2:v.pct_dir2||0,
    cca:normalizarCampoSistema(v.cca||''),distratada:v.distratada||false,
    bonus:v.bonus||0,bonus_pct_dir:v.bonus_pct_dir||0,
    bonus_pct_dir2:v.bonus_pct_dir2||0,bonus_pct_ger:v.bonus_pct_ger||0,
    bonus_pct_cor:v.bonus_pct_cor||0,
    bonus_forma:v.bonus>0?(bonusForma||'comissao'):null,
    bonus_status:v.bonus>0?(bonusStatus||'pendente'):null,
    bonus_obs:v.bonus>0?String(v.bonus_obs||'').trim():null,
    etapa:v.etapa,hist:v.hist,
    ref_local:garantirRefLocalVenda(v,v&&v.id?'banco':'local')||null
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
    ref_local:['ref_local'],
    diretor2:['diretor2','pct_dir2'],
    pct_dir2:['diretor2','pct_dir2'],
    pct_rh:['pct_rh'],
    bonus:['bonus'],
    bonus_pct_dir:['bonus_pct_dir'],
    bonus_pct_dir2:['bonus_pct_dir2'],
    bonus_pct_ger:['bonus_pct_ger'],
    bonus_pct_cor:['bonus_pct_cor'],
    bonus_forma:['bonus_forma'],
    bonus_status:['bonus_status'],
    bonus_obs:['bonus_obs']
  };
  const lista=grupos[colunaAusente]||[colunaAusente];
  lista.forEach(coluna=>delete reduzido[coluna]);
  return reduzido;
}

function reduzirPayloadUsuarioPorSchema(payload,colunaAusente=''){
  const reduzido={...(payload||{})};
  const grupos={
    data_ativacao:['data_ativacao'],
    data_inativacao:['data_inativacao'],
    historico_status:['historico_status']
  };
  const lista=grupos[colunaAusente]||[colunaAusente];
  lista.forEach(coluna=>{ if(coluna) delete reduzido[coluna]; });
  return reduzido;
}

async function salvarUsuarioComFallbackSchema(payload,modo='update',usuarioId=null){
  let payloadAtual={...(payload||{})};
  while(true){
    try{
      if(modo==='insert'){
        const {data,error}=await sb.from('usuarios').insert(payloadAtual).select().single();
        if(error) throw error;
        return data||null;
      }
      const {data,error}=await sb.from('usuarios').update(payloadAtual).eq('id',usuarioId).select().single();
      if(error) throw error;
      return data||null;
    }catch(errorUsuario){
      const colunaAusente=extrairColunaAusenteSupabase(errorUsuario,'usuarios');
      if(colunaAusente&&Object.prototype.hasOwnProperty.call(payloadAtual,colunaAusente)){
        registrarColunaAusenteSupabase('usuarios',colunaAusente);
        payloadAtual=reduzirPayloadUsuarioPorSchema(payloadAtual,colunaAusente);
        continue;
      }
      throw errorUsuario;
    }
  }
}

async function salvarVendaComFallbackSchema(payload,modo='update',vendaId=null){
  let payloadAtual={...(payload||{})};
  let payloadReduzido=false;
  while(true){
    try{
      let data=null;
      if(payloadAtual.ref_local&&!colunaAusenteSupabaseRegistrada('vendas','ref_local')){
        const respostaRef=await sbLong.from('vendas').update(payloadAtual).eq('ref_local',payloadAtual.ref_local).select().maybeSingle();
        if(respostaRef.error) throw respostaRef.error;
        data=respostaRef.data||null;
      }
      if(!data&&modo==='insert'){
        const respostaInsert=await sbLong.from('vendas').insert(payloadAtual).select().single();
        if(respostaInsert.error) throw respostaInsert.error;
        data=respostaInsert.data||null;
      }
      if(!data&&modo!=='insert'&&vendaId!=null){
        const respostaId=await sbLong.from('vendas').update(payloadAtual).eq('id',vendaId).select().maybeSingle();
        if(respostaId.error) throw respostaId.error;
        data=respostaId.data||null;
      }
      return {data,payloadReduzido};
    }catch(error){
      const colunaAusente=extrairColunaAusenteSupabase(error,'vendas');
      if(colunaAusente&&Object.prototype.hasOwnProperty.call(payloadAtual,colunaAusente)){
        registrarColunaAusenteSupabase('vendas',colunaAusente);
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

