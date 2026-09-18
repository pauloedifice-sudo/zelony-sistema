// SUPABASE - parte 4/4: operacoes de salvar/excluir no banco (vendas, usuarios, folha, reembolsos, treinamentos, agendamentos, financeiro), sincronizacao de pendentes, boot do app e registro do modulo
async function dbSalvarVenda(v, tentativa=1){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para vendas.'});
  try{
    garantirRefLocalVenda(v,v&&v.id?'banco':'local');
    const payload={
      ...mapVendaOut(v),
      anexos:mapVendaAnexos(v.anexos)
    };
    const {data,payloadReduzido}=await salvarVendaComFallbackSchema(payload,'insert');
    if(data){
      v.id=data.id;
      if(data.ref_local) v.refLocal=String(data.ref_local).trim();
    }
    if(payloadReduzido){
      console.warn('Tabela de vendas do Supabase sem todas as colunas mais novas. Venda salva com payload reduzido.');
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
  const imposto=Number(v.imp);
  await sb.from('vendas').update({
    etapa:v.etapa,hist:v.hist,distratada:v.distratada||false,
    cliente:v.cliente,produto:v.produto,construtora:v.construtora,
    origem:v.origem||'Indicação',unidade:v.unidade||'',
    valor:v.valor,pct:v.pct,imp:Number.isFinite(imposto)?imposto:0.11,
    pct_cor:v.pct_cor||0,pct_cap:v.pct_cap||0,pct_ger:v.pct_ger||0,
    pct_dir:v.pct_dir||0,pct_dir2:v.pct_dir2||0,
    bonus:v.bonus||0,bonus_pct_dir:v.bonus_pct_dir||0,
    bonus_pct_dir2:v.bonus_pct_dir2||0,bonus_pct_ger:v.bonus_pct_ger||0,
    bonus_pct_cor:v.bonus_pct_cor||0,
    cca:normalizarCampoSistema(v.cca)||'',
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
    const data=await salvarUsuarioComFallbackSchema(dados,'update',id);
    if(data&&data.id) u.id=data.id;
  } else {
    const data=await salvarUsuarioComFallbackSchema(dados,'insert',null);
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
    const data=await salvarUsuarioComFallbackSchema(dados,'update',id);
    if(data&&data.id) u.id=data.id;
  } else {
    const data=await salvarUsuarioComFallbackSchema(dados,'insert',null);
    if(!data) throw new Error('Usuário não retornado pelo banco.');
    if(data&&data.id) u.id=data.id;
  }
  zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
  return u;
}

async function dbTrocarSenhaProtegida(email, novaSenha){
  const emailNormalizado=String(email||'').trim().toLowerCase();
  const sessionToken=await usuarioSelfServiceGarantirSessao(emailNormalizado,'');
  await usuarioSelfServiceInvocar('change_password',{sessionToken,novaSenha:String(novaSenha||'')});
}

// ── CRUD FOLHA DE PAGAMENTO ──────────────────────────────────────────────────
async function dbSalvarFolhaPagamentoColaborador(colaborador, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para a folha de pagamento.'});
  const payload=mapFolhaPagamentoOut(colaborador);
  const data=await folhaPagamentoInvocarProtegido('save_payroll',{
    id:id||null,
    colaborador:payload
  });
  if(!data||!data.colaborador) throw new Error('Colaborador da folha não retornado pelo serviço protegido.');
  Object.assign(colaborador,mapFolhaPagamentoIn(data.colaborador));
  zSetState('state.data.folhaPagamentoColaboradores', FOLHA_PAGAMENTO_COLABORADORES);
  return colaborador;
}

async function dbExcluirFolhaPagamentoColaborador(id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para a folha de pagamento.'});
  const alvoId=parseInt(id,10)||0;
  if(!alvoId) return true;
  await folhaPagamentoInvocarProtegido('delete_payroll',{id:alvoId});
  return true;
}

// ── CRUD REEMBOLSOS DE ATO ──────────────────────────────────────────────────
async function dbSalvarReembolsoAto(reembolso, id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para os reembolsos de ATO.'});
  const data=await folhaPagamentoInvocarProtegido('save_ato_refund',{
    id:id||null,
    reembolso:mapReembolsoAtoOut(reembolso)
  });
  if(!data||!data.reembolso) throw new Error('Reembolso de ATO não retornado pelo serviço protegido.');
  Object.assign(reembolso,mapReembolsoAtoIn(data.reembolso));
  zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
  return reembolso;
}

async function dbExcluirReembolsoAto(id){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para os reembolsos de ATO.'});
  const alvoId=parseInt(id,10)||0;
  if(!alvoId) return true;
  const data=await folhaPagamentoInvocarProtegido('delete_ato_refund',{id:alvoId});
  const financeiroId=parseInt(data&&data.financeiroLancamentoId,10)||0;
  const financeiroRef=String(data&&data.financeiroRefLocal||`fin-reembolso-ato-${alvoId}`).trim();
  for(let indice=FINANCEIRO_LANCAMENTOS.length-1;indice>=0;indice--){
    const lancamento=FINANCEIRO_LANCAMENTOS[indice];
    if(
      (financeiroId&&String(lancamento&&lancamento.id)===String(financeiroId))
      ||(financeiroRef&&String(lancamento&&(lancamento.refLocal||lancamento.ref_local)||'')===financeiroRef)
    ){
      FINANCEIRO_LANCAMENTOS.splice(indice,1);
    }
  }
  zSetState('state.data.financeiroLancamentos',FINANCEIRO_LANCAMENTOS);
  return data||{ok:true};
}

async function dbMarcarReembolsoAtoPago(id,dataReembolso){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para os reembolsos de ATO.'});
  const alvoId=parseInt(id,10)||0;
  if(!alvoId) throw new Error('Reembolso inválido para baixa.');
  const data=await folhaPagamentoInvocarProtegido('mark_ato_refunded',{
    id:alvoId,
    data_reembolso:String(dataReembolso||'').slice(0,10)
  });
  if(!data||!data.reembolso) throw new Error('Baixa do reembolso não retornada pelo serviço protegido.');
  if(data.lancamento){
    const lancamento=mapLancamentoFinanceiroIn(data.lancamento);
    lancamento.confirmadoSupabase=true;
    lancamento.syncPendente=false;
    lancamento.syncErro='';
    const indice=FINANCEIRO_LANCAMENTOS.findIndex(item=>(
      (lancamento.id&&String(item.id)===String(lancamento.id))
      ||(lancamento.refLocal&&String(item.refLocal||'')===lancamento.refLocal)
    ));
    if(indice>=0) FINANCEIRO_LANCAMENTOS[indice]=lancamento;
    else FINANCEIRO_LANCAMENTOS.push(lancamento);
    if(typeof ordenarFinanceiroLancamentos==='function') FINANCEIRO_LANCAMENTOS.sort(ordenarFinanceiroLancamentos);
    zSetState('state.data.financeiroLancamentos',FINANCEIRO_LANCAMENTOS);
  }
  return mapReembolsoAtoIn(data.reembolso);
}

function tipoComprovanteReembolsoAto(file){
  const tipo=String(file&&file.type||'').trim().toLowerCase();
  if(['application/pdf','image/jpeg','image/jpg','image/png','image/webp'].includes(tipo)) return tipo;
  const nome=String(file&&file.name||'').toLowerCase();
  if(/\.pdf$/.test(nome)) return 'application/pdf';
  if(/\.png$/.test(nome)) return 'image/png';
  if(/\.webp$/.test(nome)) return 'image/webp';
  if(/\.(jpg|jpeg)$/.test(nome)) return 'image/jpeg';
  return '';
}

async function dbEnviarComprovanteReembolsoAto(id,file){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para os comprovantes de ATO.'});
  const alvoId=parseInt(id,10)||0;
  const mime=tipoComprovanteReembolsoAto(file);
  const nome=String(file&&file.name||'comprovante').trim()||'comprovante';
  const size=Number(file&&file.size)||0;
  if(!alvoId||!file||!mime||size<=0||size>10*1024*1024){
    throw new Error('Envie um comprovante em PDF, JPG, PNG ou WEBP com no máximo 10MB.');
  }
  const autorizado=await folhaPagamentoInvocarProtegido('create_ato_receipt_upload',{
    id:alvoId,nome,mime,size
  });
  const upload=autorizado&&autorizado.upload;
  if(!upload||!upload.bucket||!upload.path||!upload.token){
    throw new Error('O serviço protegido não retornou a autorização para enviar o comprovante.');
  }
  const {error:uploadError}=await sb.storage.from(upload.bucket).uploadToSignedUrl(upload.path,upload.token,file,{
    contentType:mime,
    cacheControl:'3600'
  });
  if(uploadError) throw uploadError;
  const confirmado=await folhaPagamentoInvocarProtegido('confirm_ato_receipt_upload',{
    id:alvoId,
    bucket:upload.bucket,
    path:upload.path,
    nome,
    mime,
    size
  });
  if(!confirmado||!confirmado.reembolso) throw new Error('O comprovante foi enviado, mas o cadastro não foi confirmado. Tente novamente.');
  return mapReembolsoAtoIn(confirmado.reembolso);
}

async function dbObterUrlComprovanteReembolsoAto(id){
  const alvoId=parseInt(id,10)||0;
  if(!alvoId) throw new Error('Reembolso inválido para abrir o comprovante.');
  const data=await folhaPagamentoInvocarProtegido('get_ato_receipt_url',{id:alvoId});
  if(!data||!data.url) throw new Error('Não foi possível obter o comprovante deste reembolso.');
  return data;
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
  const automaticoLegado=lancamentoFinanceiroAutomaticoLegado(lancamento);
  if(automaticoLegado&&!lancamento.edicaoManualLegado){
    throw new Error('Repasses automaticos foram desativados. Cadastre uma saida manual no financeiro.');
  }
  if(ehLancamentoFinanceiroTesteLegado(lancamento)){
    removerLancamentosFinanceirosTesteLegado(FINANCEIRO_LANCAMENTOS);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    if(typeof salvarLS==='function') salvarLS();
    lancamento.syncPendente=false;
    lancamento.syncErro='';
    return lancamento;
  }
  garantirRefLocalFinanceiro(lancamento);
  if(!lancamento.atualizadoEm) lancamento.atualizadoEm=new Date().toISOString();
  const payloadOriginal=mapLancamentoFinanceiroOut(lancamento);
  // Estado de transporte nunca faz parte de uma gravacao confirmada.
  payloadOriginal.sync_pendente=false;
  payloadOriginal.sync_erro='';
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
  const clienteFinanceiro=typeof sbLong!=='undefined'&&sbLong?sbLong:sb;
  try{
    let payloadAtual={...payloadOriginal};
    let data=null;
    let payloadReduzido=false;
    for(let tentativa=0; tentativa<8; tentativa++){
      try{
        data=null;
        if(payloadAtual.ref_local){
          const respostaRef=await clienteFinanceiro.from('financeiro_lancamentos').update(payloadAtual).eq('ref_local',payloadAtual.ref_local).select().maybeSingle();
          if(respostaRef.error) throw respostaRef.error;
          data=respostaRef.data||null;
        }
        if(!data&&alvoId&&!automaticoLegado){
          const respostaId=await clienteFinanceiro.from('financeiro_lancamentos').update(payloadAtual).eq('id',alvoId).select().maybeSingle();
          if(respostaId.error) throw respostaId.error;
          data=respostaId.data||null;
        }
        if(!data){
          // Repasses antigos podem ser editados manualmente, nunca inseridos/recriados.
          if(automaticoLegado) throw new Error('Repasse historico nao encontrado. Atualize o financeiro antes de editar.');
          const respostaInsert=await clienteFinanceiro.from('financeiro_lancamentos').insert(payloadAtual).select().single();
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
    if(automaticoLegado) lancamento.edicaoManualLegado=true;
    lancamento.syncPendente=!!payloadReduzido;
    lancamento.syncErro=payloadReduzido?'Schema do Supabase ainda nao possui todas as colunas do financeiro.':'';
    return lancamento;
  }catch(error){
    // O formulario permanece aberto; a falha nao entra no caixa nem em uma fila.
    lancamento.syncPendente=false;
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

async function dbSalvarSaldoBancario(saldo){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para a conciliacao bancaria.'});
  const payload=mapSaldoBancarioOut(saldo);
  const {data,error}=await sb
    .from('financeiro_saldos_bancarios')
    .upsert(payload,{onConflict:'conta,data_referencia'})
    .select()
    .single();
  if(error) throw error;
  return mapSaldoBancarioIn(data||payload);
}

async function dbExcluirSaldoBancario(saldoOuId){
  appExigirModoOnline({avisar:false, erro:'Modo consulta local ativo para a conciliacao bancaria.'});
  const alvo=typeof saldoOuId==='object'&&saldoOuId?saldoOuId:null;
  const alvoId=parseInt(alvo?alvo.id:saldoOuId,10)||0;
  if(alvoId){
    const {error}=await sb.from('financeiro_saldos_bancarios').delete().eq('id',alvoId);
    if(error) throw error;
    return true;
  }
  const conta=String(alvo&&alvo.conta||'CONTA PRINCIPAL').trim().toUpperCase();
  const dataReferencia=String(alvo&&(alvo.dataReferencia||alvo.data_referencia)||'').slice(0,10);
  if(!dataReferencia) return true;
  const {error}=await sb.from('financeiro_saldos_bancarios').delete().eq('conta',conta).eq('data_referencia',dataReferencia);
  if(error) throw error;
  return true;
}

function lancamentoFinanceiroTemSyncPendente(item){
  // O financeiro nao trabalha mais com fila de gravacoes locais.
  return false;
}

async function sincronizarFinanceiroPendentes(opcoes={}){
  // Mantida por compatibilidade com chamadas antigas, sem alterar dados.
  return {pendentes:0,sincronizados:0,falhas:0,desativado:true};
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
  let descartados=0;
  for(const item of pendentes){
    try{
      await dbSalvarAgendamento(item,0);
      sincronizados++;
    }catch(e){
      if(erroAgendamentoTelefoneDuplicado(e)){
        const idx=AGENDAMENTOS.findIndex(atual=>atual&&getAgendamentoMergeKey(atual)===getAgendamentoMergeKey(item));
        if(idx>=0) AGENDAMENTOS.splice(idx,1);
        descartados++;
        continue;
      }
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
  if(opcoes.silencioso!==true&&typeof showToast==='function'&&!sincronizados&&!falhas&&descartados){
    showToast('âš ï¸',`${descartados} agendamento${descartados>1?'s foram':' foi'} removido${descartados>1?'s':''} por telefone ja cadastrado em outro compromisso aberto.`);
  }
  return {pendentes:pendentes.length,sincronizados,falhas,descartados};
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
    localStorage.setItem('zel_financeiro_saldos_bancarios',JSON.stringify(FINANCEIRO_SALDOS_BANCARIOS));
    zSetState('state.data.usuarios', typeof USUARIOS !== 'undefined' ? USUARIOS : null);
    zSetState('state.data.vendas', VENDAS);
    zSetState('state.data.treinamentos', TREIN);
    zSetState('state.data.documentos', DOCUMENTOS);
    zSetState('state.data.agendamentos', AGENDAMENTOS);
    zSetState('state.data.financeiroLancamentos', FINANCEIRO_LANCAMENTOS);
    zSetState('state.data.financeiroSaldosBancarios', FINANCEIRO_SALDOS_BANCARIOS);
    zSetState('state.data.folhaPagamentoColaboradores', FOLHA_PAGAMENTO_COLABORADORES);
    zSetState('state.data.reembolsosAto', REEMBOLSOS_ATO);
    atualizarEstadoSyncAgendamentos();
    zSetState('state.auth.senhasIndividuais', SENHAS_INDIVIDUAIS);
    if(typeof renderDashboard==='function'&&!document.getElementById('mod-dashboard')?.classList.contains('hidden')){
      renderDashboard();
    }
    if(typeof renderRhDashboard==='function'&&!document.getElementById('mod-rh')?.classList.contains('hidden')){
      renderRhDashboard();
    }
    if(typeof renderFolhaPagamento==='function'&&!document.getElementById('mod-folha-pagamento')?.classList.contains('hidden')){
      renderFolhaPagamento();
    }
    if(typeof renderReembolsosAto==='function'&&!document.getElementById('mod-reembolsos-ato')?.classList.contains('hidden')){
      renderReembolsosAto();
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

  }catch(e){
    console.warn('Falha ao carregar cache local:',e.message);
  }
}

function iniciarApp(){
  revelarShellApp();
  renderizarModulosBaseApp();
}

async function carregarDadosAposAutenticacao(opcoes={}){
  if(cargaModulosConcluida){
    if(opcoes.renderizar!==false) renderizarModulosBaseApp();
    return true;
  }
  const MAX=Math.max(1,parseInt(opcoes.maxTentativas,10)||2);
  const TIMEOUT=Math.max(20000,parseInt(opcoes.timeoutMs,10)||45000);
  const silencioso=opcoes.silencioso===true;
  const renderizar=opcoes.renderizar!==false;

  for(let tentativa=1;tentativa<=MAX;tentativa++){
    try{
      await promiseComTimeout(carregarModulosDB(), TIMEOUT, 'Carga dos modulos do Supabase');
      setAppConectividadeStatus({
        somenteLeitura:false,
        origem:'supabase',
        motivo:''
      });
      if(renderizar) renderizarModulosBaseApp();
      agendarPosCargaSupabase({
        timeoutMs:30000,
        silenciosoAgendamentos:true,
        renderizarAgendamentos:true,
        persistirRh:true,
        renderizarRh:true
      });
      return true;
    }catch(e){
      const etapa=getBootStage();
      console.warn(`Tentativa ${tentativa} falhou na etapa "${etapa}":`,e.message);
      if(tentativa<MAX){
        await new Promise(r=>setTimeout(r,1500*tentativa));
        continue;
      }
      const haCacheConsultavel=VENDAS.length>0||TREIN.length>0||DOCUMENTOS.length>0||AGENDAMENTOS.length>0||FINANCEIRO_LANCAMENTOS.length>0;
      setStatusSyncAgendamentos({
        tabela:'offline',
        erro:'Modo offline - sem conexao com o Supabase.',
        sincronizando:false
      });
      setAppConectividadeStatus({
        somenteLeitura:true,
        origem:'cache_local',
        motivo:'Sem conexao estavel com o Supabase. Apenas consulta do ultimo cache esta liberada; novos cadastros e alteracoes ficam bloqueados ate reconectar e recarregar a pagina.'
      });
      if(renderizar) renderizarModulosBaseApp();
      if(!silencioso&&typeof showToast==='function'){
        showToast('!', haCacheConsultavel
          ? 'Modo consulta ativado. O sistema abriu com o ultimo cache disponivel.'
          : 'Nao foi possivel sincronizar os modulos do sistema agora. Tente novamente em instantes.');
      }
      return haCacheConsultavel;
    }
  }
  return false;
}

async function carregarComRetry(tentativa=1){
  const MAX=3, TIMEOUT=18000;
  const st=document.getElementById('sp-status-txt');
  if(tentativa===1) carregarLS();
  if(st) st.textContent=tentativa>1?`Tentativa ${tentativa} de ${MAX}...`:'Validando acesso';
  try{
    await promiseComTimeout(carregarDB({somenteCredenciais:true}), TIMEOUT, 'Autenticacao inicial do Supabase');
    setAppConectividadeStatus({
      somenteLeitura:false,
      origem:'supabase',
      motivo:''
    });
    const temSessao=restaurarSessao();
    if(!temSessao){
      if(typeof mostrarTelaLogin==='function') mostrarTelaLogin();
      else{
        const telaLogin=document.getElementById('login-screen');
        if(telaLogin){
          telaLogin.style.display='flex';
          telaLogin.classList.remove('hidden');
        }
      }
    }
    revelarShellApp();
    if(temSessao){
      renderizarModulosBaseApp();
      void carregarDadosAposAutenticacao({
        silencioso:true,
        renderizar:true,
        maxTentativas:2,
        timeoutMs:45000
      });
    }
  }catch(e){
    const etapa=getBootStage();
    console.warn(`Tentativa ${tentativa} falhou na etapa "${etapa}":`,e.message);
    if(tentativa<MAX){
      if(st) st.textContent=`Reconectando... (${tentativa}/${MAX})`;
      await new Promise(r=>setTimeout(r,2000*tentativa));
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
    if(!temSessao){
      if(typeof mostrarTelaLogin==='function') mostrarTelaLogin();
      else{
        const telaLogin=document.getElementById('login-screen');
        if(telaLogin){
          telaLogin.style.display='flex';
          telaLogin.classList.remove('hidden');
        }
      }
    }
    revelarShellApp();
    if(temSessao) renderizarModulosBaseApp();
    setTimeout(()=>{
      if(typeof showToast==='function'){
        showToast('!', 'Modo consulta: dados locais podem estar desatualizados. Cadastros e alteracoes estao bloqueados ate o Supabase voltar.');
      }
    },1000);
    return;
    setTimeout(()=>{ showToast('⚠️','Modo consulta: dados locais podem estar desatualizados. Cadastros e alterações estão bloqueados até o Supabase voltar.'); },1000);
  }
}

if(typeof window!=='undefined'&&window&&typeof window.addEventListener==='function'){
  window.addEventListener('online', ()=>{
    if(appModoSomenteLeituraAtivo()&&typeof showToast==='function'){
      showToast('✅','Conexão restabelecida. Recarregue a página para voltar ao modo online.');
    }
    if(typeof usuarioLogado!=='undefined'&&usuarioLogado){
      void carregarDadosAposAutenticacao({
        silencioso:true,
        renderizar:true,
        maxTentativas:1,
        timeoutMs:45000
      });
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
  carregarDadosAposAutenticacao,
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
  dbSalvarFolhaPagamentoColaborador,
  dbExcluirFolhaPagamentoColaborador,
  dbSalvarReembolsoAto,
  dbExcluirReembolsoAto,
  dbMarcarReembolsoAtoPago,
  dbEnviarComprovanteReembolsoAto,
  dbObterUrlComprovanteReembolsoAto,
  dbSalvarTrein,
  dbExcluirTrein,
  dbSalvarAgendamento,
  dbExcluirAgendamento,
  dbSalvarLancamentoFinanceiro,
  dbExcluirLancamentoFinanceiro,
  usuarioSelfServiceEmitirSessao,
  usuarioSelfServiceGarantirSessao,
  usuarioSelfServiceAtualizarMe,
  usuarioSelfServiceLimparSessao,
  dbCriarConviteUsuarioProtegido,
  dbObterConviteUsuarioSeguro,
  dbConcluirConviteUsuarioSeguro,
  recarregarFolhaPagamentoProtegida,
  recarregarReembolsosAtoProtegidos,
  recarregarAgendamentosCompartilhados,
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
