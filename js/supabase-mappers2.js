// SUPABASE - parte 3/4: mappers/merge de agendamentos, financeiro (lancamentos/saldos/comprovantes) e documentos (storage/upload/download)
function mapAgendamentoBooleano(valor){
  if(typeof valor==='boolean') return valor;
  const texto=String(valor==null?'':valor).trim().toLowerCase();
  if(['sim','true','1'].includes(texto)) return true;
  if(['não','nao','false','0'].includes(texto)) return false;
  return null;
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
    rendaBrutaFamiliar:Number(a&&(a.renda_bruta_familiar??a.rendaBrutaFamiliar))||0,
    localCompra:a&&(a.local_compra||a.localCompra)||'',
    tipoImovelInteresse:a&&(a.tipo_imovel_interesse||a.tipoImovelInteresse)||'',
    finalidadeImovel:a&&(a.finalidade_imovel||a.finalidadeImovel)||'',
    assinouPropostaCompra:mapAgendamentoBooleano(a&&(a.assinou_proposta_compra??a.assinouPropostaCompra)),
    pagouAto:mapAgendamentoBooleano(a&&(a.pagou_ato??a.pagouAto)),
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
    renda_bruta_familiar:Number(a.rendaBrutaFamiliar)||null,
    local_compra:a.localCompra||null,
    tipo_imovel_interesse:a.tipoImovelInteresse||null,
    finalidade_imovel:a.finalidadeImovel||null,
    assinou_proposta_compra:mapAgendamentoBooleano(a.assinouPropostaCompra),
    pagou_ato:mapAgendamentoBooleano(a.pagouAto),
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

function lancamentoFinanceiroAutomaticoLegado(item){
  // A origem e identificada pela referencia, nunca pela categoria de uma saida manual.
  return /^fin-comissao-venda-\d+-[a-z0-9_]+$/i.test(String(item&&(item.refLocal||item.ref_local)||'').trim());
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
    confirmadoSupabase:!!(item&&item.confirmadoSupabase),
    // Marcador apenas local: permite retomar uma baixa manual de repasse antigo apos recarregar.
    edicaoManualLegado:!!(item&&item.edicaoManualLegado),
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

function mapSaldoBancarioIn(item){
  return {
    id:parseInt(item&&item.id,10)||0,
    conta:String(item&&(item.conta||'CONTA PRINCIPAL')||'CONTA PRINCIPAL').trim().toUpperCase(),
    dataReferencia:String(item&&(item.data_referencia||item.dataReferencia)||'').slice(0,10),
    saldo:parseFloat(item&&(item.saldo_bancario??item.saldo))||0,
    observacao:String(item&&(item.observacao||'')||'').trim().toUpperCase(),
    criadoPor:String(item&&(item.criado_por||item.criadoPor)||'').trim(),
    criadoPorId:parseInt(item&&(item.criado_por_id||item.criadoPorId),10)||0,
    criadoPorEmail:String(item&&(item.criado_por_email||item.criadoPorEmail)||'').trim(),
    atualizadoEm:String(item&&(item.atualizado_em||item.atualizadoEm)||'').trim()
  };
}

function mapSaldoBancarioOut(item){
  return {
    conta:String(item&&item.conta||'CONTA PRINCIPAL').trim().toUpperCase()||'CONTA PRINCIPAL',
    data_referencia:String(item&&item.dataReferencia||'').slice(0,10),
    saldo_bancario:parseFloat(item&&item.saldo)||0,
    observacao:String(item&&item.observacao||'').trim().toUpperCase(),
    criado_por:String(item&&item.criadoPor||'').trim(),
    criado_por_id:parseInt(item&&item.criadoPorId,10)||null,
    criado_por_email:String(item&&item.criadoPorEmail||'').trim(),
    atualizado_em:item&&item.atualizadoEm||new Date().toISOString()
  };
}

function ordenarSaldosBancarios(a,b){
  const dataA=String(a&&(a.dataReferencia||a.data_referencia)||'');
  const dataB=String(b&&(b.dataReferencia||b.data_referencia)||'');
  if(dataA!==dataB) return dataA.localeCompare(dataB);
  return (parseInt(a&&a.id,10)||0)-(parseInt(b&&b.id,10)||0);
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
  const tabelaEscapada=String(tabela||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const regexRelacaoComTabela=tabelaEscapada
    ? new RegExp(`column\\s+["']?([a-z0-9_]+)["']?\\s+of\\s+relation\\s+["']?${tabelaEscapada}["']?\\s+does not exist`,'i')
    : null;
  const regexRelacaoSemTabela=/column\s+["']?([a-z0-9_]+)["']?\s+of\s+relation\s+["']?[a-z0-9_]+["']?\s+does not exist/i;
  const regexSchemaCacheComTabela=tabelaEscapada
    ? new RegExp(`Could not find the ['"]?([a-z0-9_]+)['"]? column of ['"]?${tabelaEscapada}['"]? in the schema cache`,'i')
    : null;
  const regexSchemaCacheSemTabela=/Could not find the ['"]?([a-z0-9_]+)['"]? column of ['"]?[a-z0-9_]+['"]? in the schema cache/i;
  const match=bruto.match(regexComTabela)
    || bruto.match(regexSemTabela)
    || (regexRelacaoComTabela?bruto.match(regexRelacaoComTabela):null)
    || bruto.match(regexRelacaoSemTabela)
    || (regexSchemaCacheComTabela?bruto.match(regexSchemaCacheComTabela):null)
    || bruto.match(regexSchemaCacheSemTabela);
  const coluna=match&&match[1]?String(match[1]).trim().toLowerCase():'';
  if(coluna&&tabela) registrarColunaAusenteSupabase(tabela,coluna);
  return coluna;
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
    return Array.isArray(lista)
      ? lista.map(mapLancamentoFinanceiroIn).filter(item=>
        !ehLancamentoFinanceiroTesteLegado(item)
        && (!item.syncPendente||item.confirmadoSupabase)
      )
      : [];
  }catch(e){
    return [];
  }
}

function carregarFinanceiroSaldosBancariosLS(){
  try{
    const raw=localStorage.getItem('zel_financeiro_saldos_bancarios');
    const lista=raw?JSON.parse(raw):[];
    return Array.isArray(lista)?lista.map(mapSaldoBancarioIn).filter(item=>item.dataReferencia):[];
  }catch(e){
    return [];
  }
}

function mesclarFinanceiroLancamentosBancoComLocal(bancoLista, localLista){
  const bancoMap=new Map();
  (Array.isArray(bancoLista)?bancoLista:[]).forEach(item=>{
    const mapped=mapLancamentoFinanceiroIn(item);
    if(ehLancamentoFinanceiroTesteLegado(mapped)) return;
    mapped.confirmadoSupabase=true;
    mapped.syncPendente=false;
    mapped.syncErro='';
    const chave=getFinanceiroLancamentoMergeKey(mapped);
    bancoMap.set(chave,preferirLancamentoFinanceiroMaisRecente(bancoMap.get(chave), mapped));
  });
  return [...bancoMap.values()]
    .sort(ordenarFinanceiroLancamentos);
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

