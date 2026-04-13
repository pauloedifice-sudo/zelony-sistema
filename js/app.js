// APP.JS
// Relatorio, detalhe de venda, anexos, exportacoes

let histObsSalvando=false;
let pendComercialSalvando=false;
let pendComercialModo='fechado';

function setHistObsLoading(loading){
  histObsSalvando=loading;
  const campo=document.getElementById('vh-obs-input');
  const botao=document.getElementById('vh-obs-btn');
  const status=document.getElementById('vh-obs-status');
  if(campo) campo.disabled=loading;
  if(botao){
    botao.disabled=loading;
    botao.textContent=loading?zUiText('⏳ Registrando observação...'):zUiText('📝 Registrar observação');
    botao.style.opacity=loading?'0.8':'1';
    botao.style.cursor=loading?'wait':'pointer';
  }
  if(status) status.style.display=loading?'flex':'none';
}

async function salvarObsHistorico(){
  if(histObsSalvando) return;
  const v=VENDAS.find(x=>x.id===curVId);
  if(!v) return;
  const campo=document.getElementById('vh-obs-input');
  if(!campo) return;
  const obs=campo.value.trim();
  if(!obs){
    campo.focus();
    showToast(zUiText('⚠️'),zUiText('Digite uma observação para registrar no histórico.'));
    return;
  }
  const original=JSON.parse(JSON.stringify(v));
  const quem=usuarioLogado?usuarioLogado.nome.split(' ')[0]:'Sistema';
  v.hist.push(criarRegistroHistorico({e:v.etapa,u:quem,o:obs,tipo:'obs'}));
  setHistObsLoading(true);
  try{
    await dbAtualizarVenda(v);
    salvarLS();
    setHistObsLoading(false);
    showVDetail(v.id);
    showToast(zUiText('📝'),zUiText('Observação registrada no histórico.'));
  }catch(e){
    Object.assign(v, original);
    setHistObsLoading(false);
    showVDetail(v.id);
    console.error('Erro ao registrar observação no histórico:', e);
    showToast(zUiText('❌'),zUiText('Falha ao registrar observação no banco. Tente novamente.'));
  }
}

function setPendenciaComercialLoading(loading){
  pendComercialSalvando=loading;
  const editando=pendComercialModo==='editar';
  const campo=document.getElementById('pc-obs-input');
  const status=document.getElementById('pc-status');
  const salvar=document.getElementById('pc-btn-save');
  const cancelar=document.getElementById('pc-btn-cancel');
  const editar=document.getElementById('pc-btn-edit');
  const abrir=document.getElementById('pc-btn-open');
  const resolver=document.getElementById('pc-btn-resolver');
  if(campo) campo.disabled=loading;
  if(status) status.style.display=loading?'flex':'none';
  if(salvar){
    salvar.disabled=loading;
    salvar.textContent=loading?zUiText(editando?'⏳ Atualizando pendência...':'⏳ Registrando pendência...'):zUiText(editando?'✏️ Salvar pendência':'🟠 Registrar pendência');
    salvar.style.opacity=loading?'0.8':'1';
    salvar.style.cursor=loading?'wait':'pointer';
  }
  if(cancelar) cancelar.disabled=loading;
  if(editar) editar.disabled=loading;
  if(abrir) abrir.disabled=loading;
  if(resolver){
    resolver.disabled=loading;
    resolver.textContent=loading?zUiText('⏳ Processando...'):zUiText('✅ Resolver pendência');
    resolver.style.opacity=loading?'0.8':'1';
    resolver.style.cursor=loading?'wait':'pointer';
  }
}

function togglePendenciaComercialForm(modo='nova'){
  pendComercialModo=modo;
  if(curVId) showVDetail(curVId);
  setTimeout(()=>{
    const campo=document.getElementById('pc-obs-input');
    if(campo){
      campo.focus();
      campo.setSelectionRange(campo.value.length,campo.value.length);
    }
  },0);
}

function fecharPendenciaComercialForm(){
  pendComercialModo='fechado';
  if(curVId) showVDetail(curVId);
}

async function salvarPendenciaComercial(){
  if(pendComercialSalvando) return;
  const v=VENDAS.find(x=>x.id===curVId);
  if(!v) return;
  const campo=document.getElementById('pc-obs-input');
  if(!campo) return;
  const obs=campo.value.trim();
  if(!obs){
    campo.focus();
    showToast(zUiText('⚠️'),zUiText('Descreva a pendência comercial antes de registrar.'));
    return;
  }
  const original=JSON.parse(JSON.stringify(v));
  const quem=usuarioLogado?usuarioLogado.nome.split(' ')[0]:'Sistema';
  const jaExiste=typeof temPendenciaComercial==='function'&&temPendenciaComercial(v);
  v.hist=v.hist||[];
  v.hist.push(criarRegistroHistorico({e:v.etapa,u:quem,o:obs,tipo:jaExiste?'pend_comercial_editada':'pend_comercial'}));
  setPendenciaComercialLoading(true);
  try{
    await dbAtualizarVenda(v);
    salvarLS();
    pendComercialModo='fechado';
    setPendenciaComercialLoading(false);
    renderFiltros();
    renderVList();
    showVDetail(v.id);
    showToast(zUiText('🟠'),zUiText(jaExiste?'Pendência comercial atualizada com sucesso.':'Pendência comercial registrada com sucesso.'));
  }catch(e){
    Object.assign(v,original);
    pendComercialModo='fechado';
    setPendenciaComercialLoading(false);
    renderFiltros();
    renderVList();
    showVDetail(v.id);
    console.error('Erro ao salvar pendência comercial:', e);
    showToast(zUiText('❌'),zUiText('Falha ao salvar a pendência comercial no banco. Tente novamente.'));
  }
}

async function resolverPendenciaComercial(){
  if(pendComercialSalvando) return;
  const v=VENDAS.find(x=>x.id===curVId);
  if(!v||(typeof temPendenciaComercial==='function'&&!temPendenciaComercial(v))) return;
  if(!confirm(zUiText('Resolver a pendência comercial desta venda?'))) return;
  const original=JSON.parse(JSON.stringify(v));
  const quem=usuarioLogado?usuarioLogado.nome.split(' ')[0]:'Sistema';
  v.hist=v.hist||[];
  v.hist.push(criarRegistroHistorico({e:v.etapa,u:quem,o:'Pendência comercial resolvida.',tipo:'pend_comercial_resolvida'}));
  setPendenciaComercialLoading(true);
  try{
    await dbAtualizarVenda(v);
    salvarLS();
    pendComercialModo='fechado';
    setPendenciaComercialLoading(false);
    renderFiltros();
    renderVList();
    showVDetail(v.id);
    showToast(zUiText('✅'),zUiText('Pendência comercial resolvida.'));
  }catch(e){
    Object.assign(v,original);
    pendComercialModo='fechado';
    setPendenciaComercialLoading(false);
    renderFiltros();
    renderVList();
    showVDetail(v.id);
    console.error('Erro ao resolver pendência comercial:', e);
    showToast(zUiText('❌'),zUiText('Falha ao resolver a pendência comercial no banco. Tente novamente.'));
  }
}

function getHistVisual(h){
  if(h.tipo==='edicao') return {label:'✏️ Edição registrada',color:'#3060B8'};
  if(h.tipo==='distrato') return {label:'⚠️ Distrato',color:'#C05030'};
  if(h.tipo==='reversao') return {label:'↩ Etapa revertida',color:'#C08020'};
  if(h.tipo==='obs') return {label:'📝 Observação registrada',color:'#7A5AC8'};
  if(h.tipo==='pend_comercial') return {label:'🟠 Pendência comercial aberta',color:'#C08020'};
  if(h.tipo==='pend_comercial_editada') return {label:'🟠 Pendência comercial atualizada',color:'#C08020'};
  if(h.tipo==='pend_comercial_resolvida') return {label:'✅ Pendência comercial resolvida',color:'#2E7E5E'};
  return {label:ETAPAS[h.e],color:'var(--gold)'};
}

function limparDetalheVenda(mensagem='Selecione uma venda'){
  curVId=null;
  zSetState('state.ui.curVId', curVId);
  document.querySelectorAll('.vrow').forEach(r=>r.classList.remove('active'));
  const vazio=document.getElementById('vd-empty');
  const corpo=document.getElementById('vd-body');
  if(vazio) vazio.innerHTML=`<div style="font-size:28px;opacity:0.25;color:var(--gold);">◈</div><div style="font-size:13px;color:var(--tm);">${zUiText(mensagem)}</div>`;
  if(corpo){
    corpo.innerHTML='';
    corpo.classList.add('hidden');
  }
  if(vazio) vazio.classList.remove('hidden');
}

function showVDetail(id){
  const vendasVisiveis=typeof vendasU==='function'?vendasU(VENDAS):VENDAS;
  const v=vendasVisiveis.find(x=>x.id===id);
  if(!v){ limparDetalheVenda(); return; }
  if(curVId!==id) pendComercialModo='fechado';
  curVId=id;
  zSetState('state.ui.curVId', curVId);
  normalizarVendaNumeros(v);
  const pendencia=typeof getPendenciaComercial==='function'?getPendenciaComercial(v):null;
  if(!pendencia&&pendComercialModo==='editar') pendComercialModo='fechado';
  const podeGerirPendencia=role!=='rh'&&!v.distratada;
  const formPendAberto=(pendComercialModo==='nova'||pendComercialModo==='editar')&&podeGerirPendencia;
  document.querySelectorAll('.vrow').forEach(r=>r.classList.remove('active'));
  const row=document.getElementById('vr-'+id);
  if(row) row.classList.add('active');
  document.getElementById('vd-empty').classList.add('hidden');
  document.getElementById('vd-body').classList.remove('hidden');
  const isFinal=v.etapa>=ETAPAS.length-1;

  const steps=ETAPAS.map((e,i)=>{
    const done=i<v.etapa, cur=i===v.etapa, last=i===ETAPAS.length-1;
    const label=zUiText(e);
    const nomeAbrev=label.length>9?label.slice(0,8)+'...':label;
    return`<div class="si"><div style="display:flex;align-items:center;width:100%;"><div class="sc ${done?'done':cur?'cur':''}" title="${label}">${done?zUiText('✓'):i+1}</div>${!last?`<div class="sl ${done?'done':''}"></div>`:''}</div><div style="font-size:8px;font-weight:${cur?'700':'400'};color:${cur?'var(--gold)':done?'var(--ts)':'var(--tm)'};text-align:center;margin-top:5px;line-height:1.2;padding:0 2px;opacity:${cur?1:done?0.8:0.5};">${nomeAbrev}</div></div>`;
  }).join('');

  const podeVerImposto=['dir','fin','dono'].includes(role);
  const valorImposto=impostoComissao(v);
  let mH='';
  if(role==='cor'){
    mH=`<div class="mc a"><div class="mc-l">${zUiText('Valor de venda')}</div><div class="mc-v g">${fmt(v.valor)}</div></div><div class="mc"><div class="mc-l">${zUiText('Minha comissÃ£o')}</div><div class="mc-v g">${fmt(comC(v))}</div><div class="mc-s">${pctSeguro(v.pct_cor,1)} ${zUiText('lÃ­q.')}</div></div><div class="mc"><div class="mc-l">${zUiText('Etapa')}</div><div class="mc-v">${v.etapa+1}/${ETAPAS.length}</div></div><div class="mc"><div class="mc-l">${zUiText('Status')}</div><div class="mc-v" style="font-size:13px;">${isFinal?zUiText('✓ Pago'):zUiText('Andamento')}</div></div>`;
  }else if(role==='cap'){
    mH=`<div class="mc a"><div class="mc-l">${zUiText('Valor venda')}</div><div class="mc-v g">${fmt(v.valor)}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. corretor')}</div><div class="mc-v">${fmt(comC(v))}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. capitÃ£o')}</div><div class="mc-v g">${fmt(comCap(v))}</div></div><div class="mc"><div class="mc-l">${zUiText('Total visÃ­vel')}</div><div class="mc-v g">${fmt(comCap(v)+comC(v))}</div></div>`;
  }else if(role==='ger'){
    mH=`<div class="mc a"><div class="mc-l">${zUiText('Valor venda')}</div><div class="mc-v g">${fmt(v.valor)}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. corretor')}</div><div class="mc-v">${fmt(comC(v))}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. capitÃ£o')}</div><div class="mc-v">${fmt(comCap(v))}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. gerente')}</div><div class="mc-v g">${fmt(comG(v))}</div></div>`;
  }else{
    mH=`<div class="mc a"><div class="mc-l">${zUiText('Valor venda')}</div><div class="mc-v g">${fmt(v.valor)}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. bruta')}</div><div class="mc-v">${fmt(comBruta(v))}</div><div class="mc-s">${pctSeguro(v.pct,0)}</div></div><div class="mc"><div class="mc-l">${zUiText('Com. lÃ­quida')}</div><div class="mc-v g">${fmt(comTotal(v))}</div></div><div class="mc"><div class="mc-l">${zUiText('Imposto')}</div><div class="mc-v" style="color:#C06020;">${fmt(valorImposto)}</div><div class="mc-s">${pctSeguro(v.imp,0)} ${zUiText('sobre com. bruta')}</div></div><div class="mc"><div class="mc-l">${zUiText('Zelony')}</div><div class="mc-v">${fmt(comZ(v))}</div></div>`;
  }

  const mbs=[];
  mbs.push({n:v.corretor,c:'Corretor',val:comC(v),pct:v.pct_cor});
  if(['cap','ger','dir','fin','dono'].includes(role)&&v.capitao) mbs.push({n:v.capitao,c:'Capitão',val:comCap(v),pct:v.pct_cap});
  if(['ger','dir','fin','dono'].includes(role)) mbs.push({n:v.gerente,c:'Gerente',val:comG(v),pct:v.pct_ger});
  if(['dir','fin','dono'].includes(role)) mbs.push({n:v.diretor,c:'Diretor',val:comD(v),pct:v.pct_dir});
  if(['dir','fin','dono'].includes(role)&&v.diretor2) mbs.push({n:v.diretor2,c:'Diretor 2',val:comD2(v),pct:v.pct_dir2});
  if(['fin','dono'].includes(role)) mbs.push({n:'Zelony',c:'Imobiliária',val:comZ(v),pct:pctZelony(v)});

  const rhRow=(['dir','fin','dono','rh'].includes(role)&&v.pct_rh>0)?`<div class="eq-row" style="background:#EEF4FE;border-radius:6px;padding:6px 8px;margin-top:6px;border:1px solid #90B8E8;"><div style="width:25px;height:25px;border-radius:50%;background:#D0E4FF;border:1px solid #90B8E8;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${zUiText('🤝')}</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:500;color:#1A56C4;">${zUiText('RH — Contratação')}</div><div style="font-size:9px;color:#4070B0;">${pctSeguro(v.pct_rh,1)}</div></div><span style="font-size:13px;font-weight:600;color:#1A56C4;">${fmt(comRH(v))}</span></div>`:'';
  const impostoRow=podeVerImposto?`<div style="margin-top:8px;border-top:1px dashed rgba(184,144,42,0.25);padding-top:8px;"><div class="eq-row" style="background:#FEF6EC;border-radius:6px;padding:6px 8px;margin:0 -2px;border:1px solid #F0D2A8;"><div style="width:25px;height:25px;border-radius:50%;background:#FEF0DC;border:1px solid #E8A040;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${zUiText('📋')}</div><div style="flex:1"><div style="font-size:12px;font-weight:600;color:#A05010;">${zUiText('Imposto geral da venda')}</div><div style="font-size:9px;color:#B07030;">${pctSeguro(v.imp,0)} ${zUiText('sobre comissão bruta')} (${fmt(comBruta(v))})</div></div><span style="font-size:13px;font-weight:700;color:#C06020;">- ${fmt(valorImposto)}</span></div></div>`:'';

  const distH=`<div class="sec"><div class="sec-h">${zUiText('DistribuiÃ§Ã£o da comissÃ£o')}</div><div class="sec-b">${mbs.map(m=>{
    const usuario=USUARIOS.find(u=>campoVendaBatePessoa(m.n,u));
    const pixCopyArg=encodeURIComponent(String((usuario&&usuario.pix)||''));
    const bancoPix=usuario&&usuario.banco?`<div style="display:flex;align-items:center;gap:10px;margin-top:3px;flex-wrap:wrap;"><span style="font-size:9px;background:var(--gold-bg);color:var(--gold);border:1px solid var(--gold-bd);border-radius:4px;padding:1px 7px;font-weight:500;">${zUiText('🏦')} ${zUiText(usuario.banco)}</span><span style="font-size:9px;background:#EEF4FE;color:#3060B8;border:1px solid #90B8E8;border-radius:4px;padding:1px 7px;font-weight:500;">${zUiText('🔑')} ${zUiText(usuario.pixTipo)}: ${zUiText(usuario.pix)}</span>${usuario.pix?`<button class="copy-chip-btn" type="button" onmousedown="event.preventDefault()" onclick="event.preventDefault();event.stopPropagation();copiarTexto(decodeURIComponent('${pixCopyArg}'),'Chave Pix');return false;">${zUiText('📋')} ${zUiText('Copiar')}</button>`:''}</div>`:`<div style="font-size:9px;color:var(--tm);margin-top:2px;">${zUiText('⚠️ Sem dados bancários cadastrados')}</div>`;
    return`<div class="eq-row" style="flex-wrap:wrap;"><div class="eav">${ini(m.n)}</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:500;">${zUiText(m.n)}</div><div style="font-size:9px;color:var(--tm);">${zUiText(m.c)} ${zUiText('·')} ${pctSeguro(m.pct,2)}</div>${bancoPix}</div><span style="font-size:13px;font-weight:600;color:var(--gold);white-space:nowrap;margin-left:8px;">${fmt(m.val)}</span></div>`;
  }).join('')}${rhRow}${impostoRow}</div></div>`;

  const bonusDist=(()=>{
    if(!v.bonus||v.bonus<=0) return [];
    if(role==='cor') return [{n:v.corretor,c:'Corretor',val:bonusCor(v),pct:v.bonus_pct_cor}];
    if(role==='ger') return [{n:v.gerente,c:'Gerente',val:bonusGer(v),pct:v.bonus_pct_ger},{n:v.corretor,c:'Corretor',val:bonusCor(v),pct:v.bonus_pct_cor}];
    if(['dir','fin','dono'].includes(role)) return [{n:v.diretor,c:'Diretor',val:bonusDir(v),pct:v.bonus_pct_dir},{n:v.gerente,c:'Gerente',val:bonusGer(v),pct:v.bonus_pct_ger},{n:v.corretor,c:'Corretor',val:bonusCor(v),pct:v.bonus_pct_cor}];
    return [];
  })().filter(b=>b.pct>0);
  const bonusH=bonusDist.length?`<div class="sec"><div class="sec-h" style="color:#2E7E5E;">${zUiText('🎁 Bônus da construtora')}</div><div class="sec-b"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><span class="zbg" style="background:#E8F5EE;color:#2E7E5E;border:1px solid #80C8A0;font-size:12px;font-weight:600;">${fmt(v.bonus)} ${zUiText('total')}</span></div>${bonusDist.map(b=>`<div class="eq-row"><div class="eav">${ini(b.n)}</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:500;">${zUiText(b.n)}</div><div style="font-size:9px;color:var(--tm);">${zUiText(b.c)} ${zUiText('·')} ${b.pct}% ${zUiText('do bônus')}</div></div><span style="font-size:13px;font-weight:600;color:#2E7E5E;">${fmt(b.val)}</span></div>`).join('')}</div></div>`:'';

  if(!v.anexos) v.anexos=[];
  const anexosH=renderAnexosSec(v);
  const hH=[...v.hist].reverse().map(h=>{
    const hv=getHistVisual(h);
    return`<div class="hist-item"><div class="hlw"><div class="hd" style="background:${hv.color};"></div><div class="hl"></div></div><div style="flex:1;padding-bottom:3px;"><div style="font-size:12px;font-weight:600;color:${hv.color};">${zUiText(hv.label)}</div><div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText(formatarMomentoHistorico(h))} ${zUiText('·')} ${zUiText('por')} ${zUiText(h.u)}</div>${h.o?`<div class="hobs">"${zUiText(h.o)}"</div>`:''}</div></div>`;
  }).join('');
  const obsComposer=`<div style="display:flex;flex-direction:column;gap:8px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-bottom:12px;"><div style="font-size:10px;color:var(--gold);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${zUiText('Registrar observação')}</div><textarea id="vh-obs-input" placeholder="${zUiText('Escreva uma observação para ficar registrada no histórico desta venda...')}" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){salvarObsHistorico();}" style="background:#fff;border:1px solid var(--bd);border-radius:7px;padding:10px;font-size:12px;color:var(--tx);outline:none;width:100%;font-family:'Inter',sans-serif;resize:vertical;min-height:72px;"></textarea><div id="vh-obs-status" style="display:none;font-size:11px;color:var(--tm);align-items:center;gap:8px;"><span style="font-size:13px;">⏳</span><span>${zUiText('Registrando observação no banco de dados...')}</span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div style="font-size:10px;color:var(--tm);">${zUiText('Dica')}: ${zUiText('use Ctrl+Enter para registrar mais rápido.')}</div><button id="vh-obs-btn" type="button" onclick="salvarObsHistorico()" style="background:var(--gold);color:#fff;border:none;border-radius:7px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;">${zUiText('📝 Registrar observação')}</button></div></div>`;

  const prevCard=(()=>{
    const prev=calcPrevisao(v);
    if(!prev) return '';
    const temAtraso=prev.totalAtraso>0;
    const cor=temAtraso?'#C05030':'#2E7E5E';
    const bg=temAtraso?'#FEF0EC':'#E8F5EE';
    const bd=temAtraso?'#E0A090':'#80C8A0';
    return`<div style="background:${bg};border:1px solid ${bd};border-radius:7px;padding:10px 14px;margin-top:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:${cor};font-weight:700;margin-bottom:2px;">${zUiText('📅 Previsão de recebimento')}</div><div style="font-size:18px;font-weight:700;color:${cor};font-family:'Playfair Display',serif;">${zUiText(prev.data)}</div></div>
        ${temAtraso?`<div style="text-align:right;"><div style="font-size:9px;color:#C05030;font-weight:600;">${zUiText('⚠️')} ${prev.totalAtraso} ${zUiText(`dia${prev.totalAtraso!==1?'s':''} de atraso acumulado`)}</div>${prev.atrasosAcumulados>0?`<div style="font-size:8px;color:#C07060;">${prev.atrasosAcumulados}d ${zUiText('em etapas anteriores')}</div>`:''}${prev.atrasoCorrente>0?`<div style="font-size:8px;color:#C07060;">${prev.atrasoCorrente}d ${zUiText('na etapa atual')}</div>`:''}${prev.antecipacoes>0?`<div style="font-size:8px;color:#2E9E6E;">${zUiText('✅')} ${zUiText('−')}${prev.antecipacoes}d ${zUiText('antecipados')}</div>`:''}</div>`:`<div style="text-align:right;">${prev.antecipacoes>0?`<div style="font-size:9px;color:#2E9E6E;font-weight:600;">${zUiText('🚀')} ${prev.antecipacoes} ${zUiText(`dia${prev.antecipacoes!==1?'s':''} antecipados!`)}</div>`:`<div style="font-size:9px;color:#2E7E5E;">${zUiText('✅ No prazo estimado')}</div>`}</div>`}
      </div>
    </div>`;
  })();

  const prazoAtualCard=(()=>{
    const a=labelAtraso(v);
    if(!a) return '';
    const cores={ok:'background:#E8F5EE;color:#2E7E5E;border:1px solid #80C8A0;',alerta:'background:#FFF8E8;color:#C08020;border:1px solid #E8C060;',atrasada:'background:#FEF0EC;color:#C05030;border:1px solid #E0A090;'};
    const icones={ok:zUiText('🟢'),alerta:zUiText('🟡'),atrasada:zUiText('🔴')};
    const prazo=PRAZOS_ETAPA[v.etapa];
    return`<div style="${cores[a.tipo]}border-radius:7px;padding:7px 12px;margin-top:6px;display:flex;align-items:center;justify-content:space-between;"><div style="font-size:11px;font-weight:600;">${icones[a.tipo]} ${zUiText('Etapa atual')}: ${zUiText(a.label)}</div><div style="font-size:9px;opacity:0.8;">${zUiText('Prazo desta etapa')}: ${prazo} ${zUiText(`dia${prazo!==1?'s':''}`)}</div></div>`;
  })();

  const pendenciaBox=(()=>{
    if(!podeGerirPendencia&&!pendencia) return '';
    return`<div class="pend-comercial-box ${pendencia?'active':''}">
      <div class="pend-comercial-head">
        <div>
          <div class="pend-comercial-kicker">${zUiText('Pendência comercial')}</div>
          <div class="pend-comercial-title">${pendencia?zUiText('Pendência comercial em aberto'):zUiText('Fluxo comercial sem pendências ativas')}</div>
        </div>
        ${pendencia?`<span class="pend-comercial-badge">${zUiText('🟠 Ativa')}</span>`:''}
      </div>
      ${pendencia?`<div class="pend-comercial-copy">${zUiText(pendencia.obs||'Sem descrição registrada para esta pendência.')}</div><div class="pend-comercial-meta">${zUiText('Aberta por')} ${zUiText(pendencia.por||'Sistema')} ${zUiText('em')} ${zUiText(pendencia.em||'—')}</div>`:`<div class="pend-comercial-meta">${zUiText('Use esta sinalização quando o comercial ainda precisar resolver alguma pendência antes de a venda seguir com segurança.')}</div>`}
      ${podeGerirPendencia?`<div class="pend-comercial-actions">${!pendencia?`<button id="pc-btn-open" type="button" class="btn-pend-primary" onclick="togglePendenciaComercialForm('nova')">${zUiText('🟠 Marcar pendência comercial')}</button>`:`${pendComercialModo!=='editar'?`<button id="pc-btn-edit" type="button" class="btn-pend-secondary" onclick="togglePendenciaComercialForm('editar')">${zUiText('✏️ Editar pendência')}</button>`:''}<button id="pc-btn-resolver" type="button" class="btn-pend-primary" onclick="resolverPendenciaComercial()">${zUiText('✅ Resolver pendência')}</button>`}</div>`:''}
      ${formPendAberto?`<div class="pend-comercial-form"><textarea id="pc-obs-input" placeholder="${zUiText('Ex.: documento pendente, ajuste comercial, retorno do cliente, divergência de informação...')}" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){salvarPendenciaComercial();}"></textarea><div id="pc-status" class="pend-comercial-status" style="display:none;"><span style="font-size:13px;">⏳</span><span>${zUiText('Salvando pendência comercial no banco de dados...')}</span></div><div class="pend-comercial-help">${zUiText('Dica')}: ${zUiText('registre aqui o que falta resolver e use Ctrl+Enter para salvar mais rápido.')}</div><div class="pend-comercial-actions"><button id="pc-btn-cancel" type="button" class="btn-pend-secondary" onclick="fecharPendenciaComercialForm()">${zUiText('Cancelar')}</button><button id="pc-btn-save" type="button" class="btn-pend-primary" onclick="salvarPendenciaComercial()">${zUiText(pendComercialModo==='editar'?'✏️ Salvar pendência':'🟠 Registrar pendência')}</button></div></div>`:''}
    </div>`;
  })();

  document.getElementById('vd-body').innerHTML=`
  <div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:16px;font-weight:500;">${zUiText(v.cliente.split('/')[0].trim())}${v.distratada?` <span style="font-size:11px;background:#FEF0EC;color:#C05030;border:1px solid #E0A090;border-radius:4px;padding:2px 8px;font-family:'Inter',sans-serif;font-weight:600;">${zUiText('⚠️ DISTRATADA')}</span>`:''}</div>
        <div style="font-size:11px;color:var(--tm);margin-top:2px;">${zUiText(v.produto)} ${zUiText('·')} ${zUiText(v.construtora)} ${zUiText('·')} ${zUiText(v.data)}</div>
        <div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;">
          <span class="zbg bg-b">${zUiText(v.mes)}</span><span class="zbg bg-a">${fmt(v.valor)}</span><span class="zbg bg-g">${zUiText(lblCom())}: ${fmt(comVis(v))}</span>
          ${v.unidade?`<span class="badge-unid ${v.unidade==='Centro'?'badge-centro':'badge-cristo'}">${zUiText('📍')} ${zUiText(v.unidade)}</span>`:''}
          ${v.cca?`<span class="zbg" style="background:#F0F4FF;color:#3060B8;border:1px solid #93B4F5;">${zUiText('🧑‍💼')} CCA: ${zUiText(v.cca)}</span>`:''}
          ${v.bonus>0?`<span class="zbg" style="background:#E8F5EE;color:#2E7E5E;border:1px solid #80C8A0;">${zUiText('🎁 Bônus')}: ${fmt(v.bonus)}</span>`:''}
        </div>
      </div>
      ${['dir','fin','dono'].includes(role)&&!v.distratada?`<div style="display:flex;gap:6px;flex-shrink:0;"><button onclick="abrirEditVenda(${v.id})" style="background:var(--bg);border:1px solid var(--bd);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--ts);cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--bd)'">${zUiText('✏️ Editar')}</button><button onclick="abrirDistrato(${v.id})" style="background:#FEF0EC;border:1px solid #E0A090;border-radius:6px;padding:5px 12px;font-size:11px;color:#C05030;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;">${zUiText('⚠️ Distrato')}</button></div>`:''}
    </div>
  </div>
  <div class="mets">${mH}</div>
  <div class="prog-wrap">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:var(--gold);font-weight:600;margin-bottom:10px;">${zUiText('EvoluÃ§Ã£o da venda')}</div>
    <div class="prog-steps">${steps}</div>
    <div class="pcur"><div class="pdot"></div><div style="flex:1"><div style="font-size:12px;font-weight:600;">${zUiText(ETAPAS[v.etapa])}</div><div style="font-size:9px;color:var(--tm);margin-top:1px;">${zUiText('Etapa')} ${v.etapa+1}/${ETAPAS.length} ${zUiText('·')} ${zUiText(v.hist.slice(-1)[0]?.d||'—')}</div></div><span class="zbg ${isFinal?'bg-g':'bg-a'}">${v.etapa+1}/${ETAPAS.length}</span></div>
    ${prevCard}${prazoAtualCard}
    ${pendenciaBox}
    ${['fin','dir','dono'].includes(role)&&!isFinal?`<button class="btn-av" onclick="abrirM(${v.id})">${zUiText('Avançar')}: ${zUiText(ETAPAS[v.etapa+1])} ${zUiText('→')}</button>`:''}
    ${['fin','dir','dono'].includes(role)&&v.etapa>0&&!isFinal?`<button class="btn-av" onclick="voltarEtapa(${v.id})" style="background:var(--bg);border:1px solid var(--bd);color:var(--ts);margin-left:6px;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--bd)'">${zUiText('← Voltar etapa')}</button>`:''}
    ${isFinal&&['fin','dir','dono'].includes(role)&&v.etapa>0?`<button class="btn-av" onclick="voltarEtapa(${v.id})" style="background:var(--bg);border:1px solid var(--bd);color:var(--ts);" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--bd)'">${zUiText('← Voltar etapa')}</button>`:''}
    ${!['fin','dir','dono'].includes(role)?`<div style="font-size:9px;color:var(--tm);margin-top:5px;">${zUiText('Apenas Financeiro ou Diretor podem avanÃ§ar etapas.')}</div>`:''}
  </div>
  ${distH}${bonusH}
  <div class="sec"><div class="sec-h">${zUiText('HistÃ³rico')}</div><div class="sec-b">${obsComposer}${hH||`<div style="text-align:center;padding:12px;font-size:11px;color:var(--tm);">${zUiText('Nenhum registro no histórico ainda.')}</div>`}</div></div>
  ${anexosH}`;

  const inp=document.getElementById('anexo-input-'+v.id);
  if(inp) inp.addEventListener('change',e=>handleAnexoUpload(e,v.id));
  const drop=document.getElementById('anexo-drop-'+v.id);
  if(drop){
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.style.borderColor='var(--gold)';drop.style.background='var(--gold-bg)';});
    drop.addEventListener('dragleave',()=>{drop.style.borderColor='';drop.style.background='';});
    drop.addEventListener('drop',e=>{e.preventDefault();drop.style.borderColor='';drop.style.background='';const files=e.dataTransfer.files;if(files.length)processAnexoFiles(files,v.id);});
  }
  const pcInput=document.getElementById('pc-obs-input');
  if(pcInput&&pendencia&&pendComercialModo==='editar') pcInput.value=pendencia.obs||'';
  if(['dir','fin','dono'].includes(role)&&!v.anexosCarregados) carregarAnexosVenda(v.id);
}

function renderAnexosSec(v){
  const podeEditar=['dir','fin','dono'].includes(role);
  const podeVer=['dir','fin','dono'].includes(role);
  if(!podeVer) return '';
  const tipos={comprovante:{label:'Comprovante',badge:'badge-comp',icon:'🧾'},contrato:{label:'Contrato',badge:'badge-cont',icon:'📄'},outro:{label:'Outro',badge:'badge-outro',icon:'📎'}};
  const lista=v.anexos&&v.anexos.length?v.anexos.map((a,i)=>{
    const t=tipos[a.tipo]||tipos.outro;
    const ext=a.nome.split('.').pop().toLowerCase();
    const icon=['jpg','jpeg','png','gif','webp'].includes(ext)?'🖼️':ext==='pdf'?'📕':'📎';
    return`<div class="anexo-item"><span class="anexo-icon">${zUiText(icon)}</span><div class="anexo-info"><div class="anexo-nome" title="${zUiText(a.nome)}">${zUiText(a.nome)}</div><div class="anexo-meta">${zUiText(a.tamanho)} ${zUiText('·')} ${zUiText(a.data)} ${zUiText('·')} ${zUiText('por')} ${zUiText(a.por)}</div></div><span class="anexo-badge ${t.badge}">${zUiText(t.label)}</span><div class="anexo-btns"><button class="btn-anexo-view" onclick="verAnexo(${v.id},${i})">${zUiText('👁 Ver')}</button>${podeEditar?`<button class="btn-anexo-del" onclick="delAnexo(${v.id},${i})">${zUiText('🗑')}</button>`:''}</div></div>`;
  }).join(''):`<div style="text-align:center;padding:14px;font-size:11px;color:var(--tm);">${zUiText('Nenhum anexo ainda.')}</div>`;
  const uploadSection=podeEditar?`<div class="anexo-drop" id="anexo-drop-${v.id}" onclick="document.getElementById('anexo-input-${v.id}').click()"><div class="anexo-drop-icon">${zUiText('📤')}</div><div class="anexo-drop-txt"><strong>${zUiText('Clique para adicionar')}</strong> ${zUiText('ou arraste o arquivo aqui')}<br>${zUiText('PDF, JPG, PNG — máx. 10MB')}</div></div><input type="file" class="anexo-input" id="anexo-input-${v.id}" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple><div style="display:flex;gap:6px;flex-wrap:wrap;margin:-4px 0 2px;"><span style="font-size:10px;color:var(--tm);">${zUiText('Classificar como')}:</span><label style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--ts);cursor:pointer;"><input type="radio" name="tipo-anexo-${v.id}" value="comprovante" checked style="accent-color:var(--gold);"> ${zUiText('Comprovante')}</label><label style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--ts);cursor:pointer;"><input type="radio" name="tipo-anexo-${v.id}" value="contrato" style="accent-color:var(--gold);"> ${zUiText('Contrato')}</label><label style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--ts);cursor:pointer;"><input type="radio" name="tipo-anexo-${v.id}" value="outro" style="accent-color:var(--gold);"> ${zUiText('Outro')}</label></div>`:'';
  return`<div class="anexos-sec"><div class="anexos-h"><span>${zUiText('📎 Anexos')} <span style="font-weight:400;color:var(--tm);text-transform:none;letter-spacing:0;">(${v.anexos?v.anexos.length:0} ${zUiText(`arquivo${v.anexos&&v.anexos.length!==1?'s':''}`)})</span></span></div><div class="anexos-body">${uploadSection}<div class="anexo-list">${lista}</div></div></div>`;
}

function getTipoAnexo(vendaId){const radios=document.querySelectorAll(`input[name="tipo-anexo-${vendaId}"]`);for(const r of radios){if(r.checked)return r.value;}return'outro';}
function handleAnexoUpload(e,vendaId){processAnexoFiles(e.target.files,vendaId);e.target.value='';}
function processAnexoFiles(files,vendaId){
  const v=VENDAS.find(x=>x.id===vendaId);
  if(!v)return;
  if(!v.anexos) v.anexos=[];
  const tipo=getTipoAnexo(vendaId);
  let processados=0;const total=files.length;
  Array.from(files).forEach(file=>{
    if(file.size>10*1024*1024){showToast(zUiText('⚠️'),zUiText(`"${file.name}" é maior que 10MB.`));processados++;return;}
    const reader=new FileReader();
    reader.onload=e=>{
      v.anexos.push({nome:file.name,tipo,tamanho:fmtTamanho(file.size),data:hoje().slice(0,5),por:usuarioLogado?usuarioLogado.nome.split(' ')[0]:'Sistema',dataUrl:e.target.result,mime:file.type});
      processados++;
      if(processados===total){dbAtualizarVenda(v).catch(err=>console.error(err));salvarLS();showVDetail(vendaId);showToast(zUiText('✅'),zUiText(`${total} arquivo${total>1?'s':''} adicionado${total>1?'s':''}!`));}
    };
    reader.readAsDataURL(file);
  });
}
function delAnexo(vendaId,idx){const v=VENDAS.find(x=>x.id===vendaId);if(!v||!v.anexos)return;if(!confirm(zUiText(`Remover "${v.anexos[idx].nome}"?`)))return;v.anexos.splice(idx,1);dbAtualizarVenda(v).catch(err=>console.error(err));salvarLS();showVDetail(vendaId);showToast(zUiText('🗑'),zUiText('Anexo removido.'));}
function verAnexo(vendaId,idx){const v=VENDAS.find(x=>x.id===vendaId);if(!v||!v.anexos||!v.anexos[idx])return;const a=v.anexos[idx];document.getElementById('av-nome').textContent=zUiText(a.nome);const cont=document.getElementById('av-content');if(a.mime&&a.mime.startsWith('image/')){cont.innerHTML=`<img src="${a.dataUrl}" alt="${zUiText(a.nome)}">`;}else if(a.mime==='application/pdf'){cont.innerHTML=`<iframe src="${a.dataUrl}" title="${zUiText(a.nome)}"></iframe>`;}else{cont.innerHTML=`<div style="color:#fff;font-size:13px;padding:20px;background:rgba(255,255,255,0.1);border-radius:8px;">${zUiText('Pré-visualização não disponível.')}<br><a href="${a.dataUrl}" download="${zUiText(a.nome)}" style="color:var(--gold-l);margin-top:10px;display:inline-block;">${zUiText('⬇ Baixar arquivo')}</a></div>`;}document.getElementById('anexo-viewer').classList.add('show');}
function fecharViewer(){document.getElementById('anexo-viewer').classList.remove('show');document.getElementById('av-content').innerHTML='';}
function aplicarFiltroCorretorRel(lista){
  const vfCorretor=document.getElementById('vf-corretor')?.value;
  return vfCorretor?lista.filter(v=>v.corretor===vfCorretor):lista;
}

function renderRel(){
  const meses=['TODOS',...new Set(VENDAS.map(v=>v.mes).filter(Boolean))];
  document.getElementById('rel-filters').innerHTML=meses.map(m=>`<button class="rf ${relMes===m?'active':''}" onclick="setRM('${m}',this)">${zUiText(m)}</button>`).join('');
  let l=aplicarFiltroCorretorRel(vendasU(relMes==='TODOS'?VENDAS:VENDAS.filter(v=>v.mes===relMes)));
  const ativas=l.filter(v=>!v.distratada);
  const distratadas=l.filter(v=>v.distratada);
  const conc=ativas.filter(v=>v.etapa===ETAPAS.length-1);
  const emAnd=ativas.filter(v=>v.etapa<ETAPAS.length-1);
  const vgv=ativas.reduce((s,v)=>s+v.valor,0);
  const comBrutaTotal=ativas.reduce((s,v)=>s+comBruta(v),0);
  const comLiq=ativas.reduce((s,v)=>s+comTotal(v),0);
  const comZel=ativas.reduce((s,v)=>s+comZ(v),0);
  const mc=ativas.reduce((s,v)=>s+comVis(v),0);
  const totalBonus=ativas.reduce((s,v)=>s+(v.bonus||0),0);
  const isAdmin=['dir','fin','dono'].includes(role);
  const porOrigem={};ativas.forEach(v=>{const o=v.origem||'Outros';porOrigem[o]=(porOrigem[o]||0)+1;});
  const porConst={};ativas.forEach(v=>{const c=v.construtora||'Ã¢â‚¬â€';if(!porConst[c])porConst[c]={n:0,vgv:0};porConst[c].n++;porConst[c].vgv+=v.valor;});

  document.getElementById('rel-mets').innerHTML=`
    <div class="mc a"><div class="mc-l">VGV Total</div><div class="mc-v g">${fmtK(vgv)}</div><div class="mc-s">${ativas.length} ${zUiText(`venda${ativas.length!==1?'s':''}`)} ${zUiText('ativas')}</div></div>
    ${isAdmin?`<div class="mc"><div class="mc-l">${zUiText('Com. Bruta')}</div><div class="mc-v g">${fmtK(comBrutaTotal)}</div><div class="mc-s">${zUiText('antes do imposto')}</div></div>`:''}
    ${isAdmin?`<div class="mc"><div class="mc-l">${zUiText('Com. LÃ­quida')}</div><div class="mc-v g">${fmtK(comLiq)}</div><div class="mc-s">${zUiText('apÃ³s imposto')}</div></div>`:''}
    ${isAdmin?`<div class="mc"><div class="mc-l">${zUiText('Zelony')}</div><div class="mc-v g">${fmtK(comZel)}</div><div class="mc-s">${zUiText('lucro lÃ­quido')}</div></div>`:''}
    ${!isAdmin?`<div class="mc"><div class="mc-l">${zUiText(lblCom())}</div><div class="mc-v g">${fmtK(mc)}</div><div class="mc-s">${zUiText('total perÃ­odo')}</div></div>`:''}
    <div class="mc"><div class="mc-l">${zUiText('ConcluÃ­das')}</div><div class="mc-v" style="color:#2E9E6E;">${conc.length}</div><div class="mc-s">${zUiText('comissÃ£o recebida')}</div></div>
    <div class="mc"><div class="mc-l">${zUiText('Em andamento')}</div><div class="mc-v">${emAnd.length}</div><div class="mc-s">${zUiText('em processo')}</div></div>
    ${distratadas.length>0?`<div class="mc"><div class="mc-l">${zUiText('Distratos')}</div><div class="mc-v" style="color:#C05030;">${distratadas.length}</div></div>`:''}
    ${totalBonus>0&&isAdmin?`<div class="mc"><div class="mc-l">${zUiText('BÃ´nus Total')}</div><div class="mc-v g">${fmtK(totalBonus)}</div></div>`:''}`;

  const origemHTML=Object.entries(porOrigem).sort((a,b)=>b[1]-a[1]).map(([o,n])=>{const pct=ativas.length>0?Math.round(n/ativas.length*100):0;return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd);"><div style="width:80px;font-size:10px;color:var(--ts);">${zUiText(o)}</div><div style="flex:1;height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;"><div style="height:100%;background:var(--gold);border-radius:3px;width:${pct}%;"></div></div><div style="font-size:10px;font-weight:600;color:var(--gold);width:20px;text-align:right;">${n}</div><div style="font-size:9px;color:var(--tm);width:30px;">${pct}%</div></div>`;}).join('');
  const constHTML=Object.entries(porConst).sort((a,b)=>b[1].vgv-a[1].vgv).slice(0,6).map(([c,d])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--bd);"><div style="font-size:10px;color:var(--ts);">${zUiText(c)}</div><div style="display:flex;gap:12px;align-items:center;"><span style="font-size:9px;color:var(--tm);">${d.n} ${zUiText(`venda${d.n!==1?'s':''}`)}</span><span style="font-size:11px;font-weight:600;color:var(--gold);">${fmtK(d.vgv)}</span></div></div>`).join('');

  document.getElementById('rel-n').textContent=zUiText(`${l.length} venda${l.length!==1?'s':''}`);
  document.getElementById('rel-thead').innerHTML=`<th>${zUiText('Data')}</th><th>${zUiText('MÃªs')}</th><th>${zUiText('Cliente')}</th><th>${zUiText('Produto')}</th><th>${zUiText('Construtora')}</th><th>${zUiText('Origem')}</th><th>${zUiText('Corretor')}</th><th>${zUiText('Gerente')}</th>${isAdmin?`<th>${zUiText('CCA')}</th>`:''}<th>${zUiText('Valor')}</th>${isAdmin?`<th>${zUiText('Com. Bruta')}</th><th>${zUiText('Com. LÃ­quida')}</th><th>${zUiText('Zelony')}</th>`:''}${!isAdmin?`<th>${zUiText(lblCom())}</th>`:''} ${totalBonus>0&&isAdmin?`<th>${zUiText('BÃ´nus')}</th>`:''}<th>${zUiText('Etapa')}</th><th>${zUiText('Unidade')}</th>`;
  document.getElementById('rel-body').innerHTML=l.map(v=>`<tr style="${v.distratada?'opacity:0.5;text-decoration:line-through;':''}"><td>${zUiText(v.data)}</td><td><span class="zbg bg-b" style="font-size:8px;">${zUiText(v.mes)}</span></td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${zUiText(v.cliente.split('/')[0].trim())}</td><td>${zUiText(v.produto)}</td><td>${zUiText(v.construtora)}</td><td><span style="font-size:9px;background:var(--bg2);border:1px solid var(--bd);border-radius:3px;padding:1px 5px;">${zUiText(v.origem||'—')}</span></td><td>${zUiText(v.corretor)}</td><td>${zUiText(v.gerente||'—')}</td>${isAdmin?`<td style="font-size:9px;">${zUiText(v.cca||'—')}</td>`:''}<td class="pos">${fmt(v.valor)}</td>${isAdmin?`<td class="pos">${fmt(comBruta(v))}</td><td class="pos">${fmt(comTotal(v))}</td><td class="pos" style="color:var(--gold);">${fmt(comZ(v))}</td>`:''} ${!isAdmin?`<td class="pos">${fmt(comVis(v))}</td>`:''}${totalBonus>0&&isAdmin?`<td class="pos" style="color:#2E9E6E;">${v.bonus>0?fmt(v.bonus):zUiText('—')}</td>`:''}<td><span class="spill${v.etapa===ETAPAS.length-1?' f':''}">${zUiText(ETAPAS[v.etapa])}</span>${v.distratada?`<span style="font-size:8px;color:#C05030;margin-left:3px;">${zUiText('⚠️')}</span>`:''}</td><td style="font-size:9px;">${zUiText(v.unidade||'—')}</td></tr>`).join('');

  const relMets=document.getElementById('rel-mets');
  const existing=document.getElementById('rel-analises');if(existing)existing.remove();
  if(ativas.length>0){
    const div=document.createElement('div');div.id='rel-analises';div.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;';
    div.innerHTML=`<div style="background:var(--bg);border:1px solid var(--bd);border-radius:9px;padding:12px 14px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:600;margin-bottom:8px;">${zUiText('📌 Origem dos leads')}</div>${origemHTML||`<div style="font-size:11px;color:var(--tm);">${zUiText('Sem dados')}</div>`}</div><div style="background:var(--bg);border:1px solid var(--bd);border-radius:9px;padding:12px 14px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--tm);font-weight:600;margin-bottom:8px;">${zUiText('🏗️ Top construtoras (VGV)')}</div>${constHTML||`<div style="font-size:11px;color:var(--tm);">${zUiText('Sem dados')}</div>`}</div>`;
    relMets.after(div);
  }
}
function setRM(m,el){relMes=m;zSetState('state.ui.relMes', relMes);document.querySelectorAll('.rf').forEach(b=>b.classList.remove('active'));el.classList.add('active');renderRel();}

function exportXLSX(){
  const btn=document.getElementById('bxl');btn.classList.add('loading');btn.textContent='Gerando...';
  setTimeout(()=>{
    let l=aplicarFiltroCorretorRel(vendasU(relMes==='TODOS'?VENDAS:VENDAS.filter(v=>v.mes===relMes)));
    const isAdmin=['dir','fin','dono'].includes(role);
    const cabecalho=[zUiText('Data'),zUiText('MÃªs'),zUiText('Cliente'),zUiText('Produto'),zUiText('Construtora'),zUiText('Origem'),zUiText('Corretor'),zUiText('Gerente'),'CCA','Valor (R$)',zUiText('Com. Bruta (R$)'),zUiText('Com. LÃ­quida (R$)'),'Zelony (R$)',zUiText('BÃ´nus (R$)'),zUiText('Etapa'),zUiText('Unidade'),zUiText('Status')];
    const linhas=l.map(v=>[zUiText(v.data),zUiText(v.mes),zUiText(v.cliente.split('/')[0].trim()),zUiText(v.produto),zUiText(v.construtora),zUiText(v.origem||''),zUiText(v.corretor),zUiText(v.gerente||''),zUiText(v.cca||''),v.valor,Math.round(comBruta(v)),Math.round(comTotal(v)),isAdmin?Math.round(comZ(v)):Math.round(comVis(v)),v.bonus||0,zUiText(ETAPAS[v.etapa]),zUiText(v.unidade||''),zUiText(v.distratada?'Distratada':'Ativa')]);
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([cabecalho,...linhas]);
    ws['!cols']=[{wch:8},{wch:10},{wch:28},{wch:14},{wch:14},{wch:12},{wch:22},{wch:22},{wch:10},{wch:14},{wch:14},{wch:14},{wch:12},{wch:10},{wch:20},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws,'Vendas');
    const porConst={};l.filter(v=>!v.distratada).forEach(v=>{const c=v.construtora||'Ã¢â‚¬â€';if(!porConst[c])porConst[c]={vendas:0,vgv:0,comBruta:0,comLiq:0};porConst[c].vendas++;porConst[c].vgv+=v.valor;porConst[c].comBruta+=comBruta(v);porConst[c].comLiq+=comTotal(v);});
    const wsConst=XLSX.utils.aoa_to_sheet([[zUiText('Construtora'),zUiText('Vendas'),'VGV (R$)',zUiText('Com. Bruta (R$)'),zUiText('Com. LÃ­quida (R$)')],...Object.entries(porConst).sort((a,b)=>b[1].vgv-a[1].vgv).map(([c,d])=>[zUiText(c),d.vendas,Math.round(d.vgv),Math.round(d.comBruta),Math.round(d.comLiq)])]);
    XLSX.utils.book_append_sheet(wb,wsConst,'Por Construtora');
    const porOrig={};l.filter(v=>!v.distratada).forEach(v=>{const o=v.origem||'Outros';porOrig[o]=(porOrig[o]||0)+1;});
    const wsOrig=XLSX.utils.aoa_to_sheet([[zUiText('Origem'),zUiText('Quantidade'),'%'],...Object.entries(porOrig).sort((a,b)=>b[1]-a[1]).map(([o,n])=>[zUiText(o),n,((n/l.filter(v=>!v.distratada).length)*100).toFixed(1)+'%'])]);
    XLSX.utils.book_append_sheet(wb,wsOrig,'Por Origem');
    XLSX.writeFile(wb,`Zelony_${relMes}_${hoje().replace(/\//g,'-')}.xlsx`);
    showToast(zUiText('✅'),zUiText('Excel exportado com 3 abas!'));
    btn.classList.remove('loading');btn.textContent=zUiText('⬇ Excel');
  },300);
}

function exportPDF(){
  const btn=document.getElementById('bpdf');btn.classList.add('loading');btn.textContent='Gerando...';
  setTimeout(()=>{
    try{
      const{jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
      let l=aplicarFiltroCorretorRel(vendasU(relMes==='TODOS'?VENDAS:VENDAS.filter(v=>v.mes===relMes)));
      const ativas=l.filter(v=>!v.distratada);
      const W=doc.internal.pageSize.getWidth();
      doc.setFillColor(184,144,42);doc.rect(0,0,W,28,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(255,255,255);doc.text(zUiText('ZELONY IMÃ“VEIS'),W/2,12,{align:'center'});
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(255,248,220);doc.text(zUiText(`RelatÃ³rio ${relMes} Â· Gerado em ${hoje()}`),W/2,20,{align:'center'});
      doc.setDrawColor(255,255,255);doc.setLineWidth(0.3);doc.line(14,25,W-14,25);
      const vgv=ativas.reduce((s,v)=>s+v.valor,0),comBrutaTotal=ativas.reduce((s,v)=>s+comBruta(v),0),comLiq=ativas.reduce((s,v)=>s+comTotal(v),0),zelony=ativas.reduce((s,v)=>s+comZ(v),0),conc=ativas.filter(v=>v.etapa===ETAPAS.length-1).length;
      const kpis=[['VGV TOTAL',fmt(vgv)],[zUiText('COM. BRUTA'),fmt(comBrutaTotal)],[zUiText('COM. LÃQUIDA'),fmt(comLiq)],['ZELONY',fmt(zelony)],[zUiText('VENDAS'),String(ativas.length)],[zUiText('CONCLUÃDAS'),String(conc)]];
      const kw=(W-28)/kpis.length;
      doc.setFillColor(253,248,238);doc.rect(14,27,W-28,18,'F');doc.setDrawColor(184,144,42);doc.rect(14,27,W-28,18);
      kpis.forEach(([lb,val],i)=>{const x=14+i*kw+kw/2;doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(138,110,60);doc.text(zUiText(lb),x,32,{align:'center'});doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(184,144,42);doc.text(String(val),x,41,{align:'center'});if(i<kpis.length-1){doc.setDrawColor(220,185,100);doc.line(14+(i+1)*kw,28,14+(i+1)*kw,44);}});
      doc.autoTable({startY:49,head:[[zUiText('Data'),zUiText('MÃªs'),zUiText('Cliente'),zUiText('Produto'),zUiText('Construtora'),zUiText('Origem'),zUiText('Corretor'),zUiText('Gerente'),'CCA',zUiText('Valor'),'Com.Bruta',zUiText('Com.LÃ­q.'),'Zelony',zUiText('BÃ´nus'),zUiText('Etapa'),'Unid.']],body:l.map(v=>[zUiText(v.data),zUiText(v.mes),zUiText(v.cliente.split('/')[0].trim().slice(0,18)),zUiText(v.produto.slice(0,12)),zUiText(v.construtora.slice(0,10)),zUiText(v.origem||''),zUiText(v.corretor.split(' ')[0]),zUiText((v.gerente||'').split(' ')[0]),zUiText(v.cca||'â€”'),fmt(v.valor),fmt(comBruta(v)),fmt(comTotal(v)),fmt(comZ(v)),v.bonus>0?fmt(v.bonus):zUiText('â€”'),zUiText(ETAPAS[v.etapa].slice(0,14))+(v.distratada?' '+zUiText('âš ï¸'):''),zUiText(v.unidade||'â€”')]),theme:'plain',headStyles:{fillColor:[253,248,238],textColor:[184,144,42],fontSize:6,fontStyle:'bold',halign:'center',lineColor:[220,185,100],lineWidth:0.3},bodyStyles:{fontSize:6,textColor:[60,48,30]},alternateRowStyles:{fillColor:[250,245,236]},columnStyles:{0:{cellWidth:10},1:{cellWidth:12},2:{cellWidth:25},3:{cellWidth:16},4:{cellWidth:16},5:{cellWidth:14},6:{cellWidth:16},7:{cellWidth:16},8:{cellWidth:12},9:{cellWidth:17},10:{cellWidth:16},11:{cellWidth:16},12:{cellWidth:14},13:{cellWidth:12},14:{cellWidth:20},15:{cellWidth:10}},margin:{left:7,right:7},didDrawPage:(d)=>{doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(140,110,60);doc.text(zUiText(`Zelony ImÃ³veis Â· ${hoje()} Â· PÃ¡g. ${d.pageNumber}`),W/2,doc.internal.pageSize.getHeight()-4,{align:'center'});}});
      doc.addPage();doc.setFillColor(184,144,42);doc.rect(0,0,W,14,'F');doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(255,255,255);doc.text(zUiText('AnÃ¡lise do PerÃ­odo'),W/2,9,{align:'center'});
      const pC={};ativas.forEach(v=>{const c=v.construtora||'Ã¢â‚¬â€';if(!pC[c])pC[c]={n:0,vgv:0,com:0};pC[c].n++;pC[c].vgv+=v.valor;pC[c].com+=comZ(v);});
      doc.autoTable({startY:18,tableWidth:(W-28)/2,head:[[zUiText('Construtora'),zUiText('Vendas'),'VGV','Zelony']],body:Object.entries(pC).sort((a,b)=>b[1].vgv-a[1].vgv).map(([c,d])=>[zUiText(c),d.n,fmt(d.vgv),fmt(d.com)]),theme:'plain',headStyles:{fillColor:[253,248,238],textColor:[184,144,42],fontSize:7,fontStyle:'bold'},bodyStyles:{fontSize:7,textColor:[60,48,30]},alternateRowStyles:{fillColor:[250,245,236]},margin:{left:14}});
      const pO={};ativas.forEach(v=>{const o=v.origem||'Outros';pO[o]=(pO[o]||0)+1;});
      doc.autoTable({startY:18,tableWidth:(W-28)/2,head:[[zUiText('Origem'),zUiText('Vendas'),'%']],body:Object.entries(pO).sort((a,b)=>b[1]-a[1]).map(([o,n])=>[zUiText(o),n,((n/ativas.length)*100).toFixed(1)+'%']),theme:'plain',headStyles:{fillColor:[253,248,238],textColor:[184,144,42],fontSize:7,fontStyle:'bold'},bodyStyles:{fontSize:7,textColor:[60,48,30]},alternateRowStyles:{fillColor:[250,245,236]},margin:{left:14+(W-28)/2+7}});
      doc.save(`Zelony_${relMes}_${hoje().replace(/\//g,'-')}.pdf`);
      showToast(zUiText('✅'),zUiText('PDF exportado com análises!'));
    }catch(e){console.error(e);showToast(zUiText('❌'),zUiText('Erro ao gerar PDF.'));}
    btn.classList.remove('loading');btn.textContent=zUiText('⬇ PDF');
  },300);
}

zRegisterModule('app', {
  limparDetalheVenda,
  showVDetail,
  salvarObsHistorico,
  togglePendenciaComercialForm,
  fecharPendenciaComercialForm,
  salvarPendenciaComercial,
  resolverPendenciaComercial,
  renderAnexosSec,
  handleAnexoUpload,
  processAnexoFiles,
  delAnexo,
  verAnexo,
  fecharViewer,
  renderRel,
  setRM,
  exportXLSX,
  exportPDF
});
