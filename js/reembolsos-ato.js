// REEMBOLSOS DE ATO
// Controle simples de valores a devolver aos clientes, com baixa no Financeiro.

let atoBusca='';
let atoFiltro='todos';
let atoModalAberto=false;
let atoModalId=null;
let atoSalvando=false;
let atoExcluindoId=null;
let atoPagamentoId=null;
let atoComprovanteId=null;
let atoComprovanteEnviandoId=null;
let atoComprovanteAbrindoId=null;
let atoCarregando=false;
let atoCarregada=false;
let atoErro='';

zSetState('state.ui.atoBusca',atoBusca);
zSetState('state.ui.atoFiltro',atoFiltro);

function atoPodeAcessar(){
  return ['dono','fin'].includes(String(typeof role!=='undefined'?role:'').toLowerCase());
}

function atoResetarCargaProtegida(){
  atoCarregando=false;
  atoCarregada=false;
  atoErro='';
}

async function atoGarantirDadosProtegidos(forcar=false){
  if(!atoPodeAcessar()||atoCarregando||(!forcar&&atoCarregada)) return;
  atoCarregando=true;
  atoErro='';
  renderReembolsosAto();
  try{
    if(typeof recarregarReembolsosAtoProtegidos!=='function') throw new Error('Serviço protegido dos reembolsos indisponível.');
    await recarregarReembolsosAtoProtegidos();
    atoCarregada=true;
  }catch(erro){
    atoCarregada=false;
    atoErro=atoMensagemErro(erro,'Não foi possível carregar os reembolsos de ATO.');
    console.error('Falha ao carregar reembolsos de ATO:',erro);
  }finally{
    atoCarregando=false;
    if(!document.getElementById('mod-reembolsos-ato')?.classList.contains('hidden')) renderReembolsosAto();
  }
}

function atoRecarregar(){
  atoErro='';
  atoGarantirDadosProtegidos(true);
}

function atoEscape(valor){
  return String(valor==null?'':valor)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function atoSomenteDigitos(valor){
  return String(valor||'').replace(/\D/g,'');
}

function atoFormatarTelefone(valor){
  const numero=atoSomenteDigitos(valor).slice(0,11);
  if(numero.length<=2) return numero?`(${numero}`:'';
  if(numero.length<=6) return `(${numero.slice(0,2)}) ${numero.slice(2)}`;
  if(numero.length<=10) return `(${numero.slice(0,2)}) ${numero.slice(2,6)}-${numero.slice(6)}`;
  return `(${numero.slice(0,2)}) ${numero.slice(2,7)}-${numero.slice(7)}`;
}

function atoMascaraTelefone(campo){
  if(campo) campo.value=atoFormatarTelefone(campo.value);
}

function atoParseValor(valor){
  if(typeof valor==='number') return Number.isFinite(valor)?valor:0;
  const bruto=String(valor||'').trim().replace(/R\$\s?/gi,'').replace(/\s/g,'');
  if(!bruto) return 0;
  const normalizado=bruto.includes(',')?bruto.replace(/\./g,'').replace(',','.'):bruto;
  const numero=Number(normalizado);
  return Number.isFinite(numero)?numero:0;
}

function atoFormatarMoeda(valor){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(valor)||0);
}

function atoValorCampo(valor){
  return (Number(valor)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function atoHoje(){
  const agora=new Date();
  const ano=agora.getFullYear();
  const mes=String(agora.getMonth()+1).padStart(2,'0');
  const dia=String(agora.getDate()).padStart(2,'0');
  return `${ano}-${mes}-${dia}`;
}

function atoFormatarData(valor){
  const match=String(valor||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:'—';
}

function atoNormalizarTexto(valor){
  const texto=typeof zNormalizarCampoTexto==='function'?zNormalizarCampoTexto(valor):String(valor||'').trim();
  return texto.toUpperCase();
}

function atoPorId(id){
  return REEMBOLSOS_ATO.find(item=>String(item.id)===String(id))||null;
}

function atoTemComprovante(item){
  return !!(item&&item.comprovanteStorageBucket&&item.comprovanteStoragePath);
}

function atoFormatarTamanhoArquivo(valor){
  const bytes=Number(valor)||0;
  if(bytes<=0) return '';
  if(bytes<1024*1024) return `${Math.max(1,Math.round(bytes/1024))} KB`;
  return `${(bytes/(1024*1024)).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} MB`;
}

function atoAplicarAtualizacao(atualizado){
  if(!atualizado) return null;
  const indice=REEMBOLSOS_ATO.findIndex(item=>String(item.id)===String(atualizado.id));
  if(indice>=0) REEMBOLSOS_ATO[indice]=atualizado;
  zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
  salvarLS();
  return atualizado;
}

function atoStatus(item,hoje=atoHoje()){
  if(String(item&&item.status||'').toLowerCase()==='reembolsado') return 'reembolsado';
  return String(item&&item.dataPrevista||'')<hoje?'atrasado':'pendente';
}

function atoListaFiltrada(){
  const busca=String(atoBusca||'').trim().toLocaleLowerCase('pt-BR');
  return [...REEMBOLSOS_ATO]
    .filter(item=>atoFiltro==='todos'||atoStatus(item)===atoFiltro)
    .filter(item=>{
      if(!busca) return true;
      const campos=[item.cliente,item.telefone,item.banco,item.chavePix,atoFormatarMoeda(item.valor)]
        .map(valor=>String(valor||'').toLocaleLowerCase('pt-BR'));
      return campos.some(valor=>valor.includes(busca))||atoSomenteDigitos(item.telefone).includes(atoSomenteDigitos(busca));
    })
    .sort((a,b)=>{
      const statusA=atoStatus(a)==='reembolsado'?1:0;
      const statusB=atoStatus(b)==='reembolsado'?1:0;
      if(statusA!==statusB) return statusA-statusB;
      if(statusA) return String(b.dataReembolso||'').localeCompare(String(a.dataReembolso||''));
      return String(a.dataPrevista||'').localeCompare(String(b.dataPrevista||''));
    });
}

function atoAtualizarBusca(valor){
  atoBusca=String(valor||'');
  zSetState('state.ui.atoBusca',atoBusca);
  renderReembolsosAto();
  const campo=document.getElementById('ato-busca');
  if(campo){
    campo.focus();
    campo.setSelectionRange(campo.value.length,campo.value.length);
  }
}

function atoAtualizarFiltro(valor){
  atoFiltro=['todos','pendente','atrasado','reembolsado'].includes(valor)?valor:'todos';
  zSetState('state.ui.atoFiltro',atoFiltro);
  renderReembolsosAto();
}

function atoAbrirNovo(){
  if(!atoPodeAcessar()) return;
  atoModalId=null;
  atoModalAberto=true;
  renderReembolsosAto();
  setTimeout(()=>document.getElementById('ato-cliente')?.focus(),50);
}

function atoEditar(id){
  const item=atoPorId(id);
  if(!atoPodeAcessar()||!item||atoStatus(item)==='reembolsado') return;
  atoModalId=id;
  atoModalAberto=true;
  renderReembolsosAto();
  setTimeout(()=>document.getElementById('ato-cliente')?.focus(),50);
}

function atoFecharModal(){
  if(atoSalvando) return;
  atoModalAberto=false;
  atoModalId=null;
  renderReembolsosAto();
}

function atoFecharModalBackdrop(event){
  if(event&&event.target&&event.target.id==='ato-modal-backdrop') atoFecharModal();
}

async function atoCopiarPix(id){
  const item=atoPorId(id);
  if(!item||!item.chavePix) return;
  if(typeof copiarTexto==='function'){
    copiarTexto(item.chavePix,'Chave PIX');
    return;
  }
  try{
    await navigator.clipboard.writeText(item.chavePix);
    if(typeof showToast==='function') showToast('📋','Chave PIX copiada.');
  }catch(_erro){
    if(typeof showToast==='function') showToast('⚠️','Não foi possível copiar a chave PIX.');
  }
}

function atoSelecionarComprovante(id){
  const item=atoPorId(id);
  if(!atoPodeAcessar()||!item||atoStatus(item)!=='reembolsado'||atoComprovanteEnviandoId!=null) return;
  atoComprovanteId=id;
  const input=document.getElementById('ato-comprovante-input');
  if(!input){
    if(typeof showToast==='function') showToast('⚠️','O seletor de comprovante não está disponível.');
    return;
  }
  input.value='';
  input.click();
}

function atoComprovantePermitido(file){
  const mime=String(file&&file.type||'').toLowerCase();
  const nome=String(file&&file.name||'').toLowerCase();
  return mime==='application/pdf'||['image/jpeg','image/jpg','image/png','image/webp'].includes(mime)||/\.(pdf|jpg|jpeg|png|webp)$/i.test(nome);
}

async function atoComprovanteSelecionado(event){
  const input=event&&event.target;
  const file=input&&input.files&&input.files[0];
  const item=atoPorId(atoComprovanteId);
  if(!file||!item){
    atoComprovanteId=null;
    return;
  }
  if(!atoComprovantePermitido(file)){
    if(typeof showToast==='function') showToast('⚠️','Use um comprovante em PDF, JPG, PNG ou WEBP.');
    input.value='';
    atoComprovanteId=null;
    return;
  }
  if(Number(file.size)>10*1024*1024){
    if(typeof showToast==='function') showToast('⚠️','O comprovante deve ter no máximo 10MB.');
    input.value='';
    atoComprovanteId=null;
    return;
  }
  if(atoTemComprovante(item)&&!window.confirm(`Substituir o comprovante atual de ${item.cliente}?`)){
    input.value='';
    atoComprovanteId=null;
    return;
  }
  atoComprovanteEnviandoId=item.id;
  renderReembolsosAto();
  try{
    if(typeof dbEnviarComprovanteReembolsoAto!=='function') throw new Error('Envio de comprovante indisponível.');
    const atualizado=await dbEnviarComprovanteReembolsoAto(item.id,file);
    atoAplicarAtualizacao(atualizado);
    if(typeof showToast==='function') showToast('✅','Comprovante anexado ao reembolso.');
  }catch(erro){
    console.error('Falha ao anexar comprovante do reembolso:',erro);
    if(typeof showToast==='function') showToast('❌',atoMensagemErro(erro,'Não foi possível anexar o comprovante.'));
  }finally{
    atoComprovanteEnviandoId=null;
    atoComprovanteId=null;
    if(input) input.value='';
    renderReembolsosAto();
  }
}

async function atoAbrirComprovante(id){
  if(!atoPodeAcessar()||atoComprovanteAbrindoId!=null) return;
  const item=atoPorId(id);
  if(!item||!atoTemComprovante(item)) return;
  const janela=window.open('','_blank');
  if(!janela){
    if(typeof showToast==='function') showToast('⚠️','Permita a abertura de uma nova aba para visualizar o comprovante.');
    return;
  }
  try{
    janela.opener=null;
    if(janela.document){
      janela.document.title='Comprovante do reembolso';
      janela.document.body.innerHTML='<div style="font-family:Arial,sans-serif;padding:24px;color:#6B5B3E;">Abrindo comprovante...</div>';
    }
  }catch(_erroPreparar){}
  atoComprovanteAbrindoId=id;
  renderReembolsosAto();
  try{
    if(typeof dbObterUrlComprovanteReembolsoAto!=='function') throw new Error('Visualização de comprovante indisponível.');
    const acesso=await dbObterUrlComprovanteReembolsoAto(item.id);
    janela.location.href=acesso.url;
  }catch(erro){
    try{janela.close();}catch(_erroFechar){}
    console.error('Falha ao abrir comprovante do reembolso:',erro);
    if(typeof showToast==='function') showToast('❌',atoMensagemErro(erro,'Não foi possível abrir o comprovante.'));
  }finally{
    atoComprovanteAbrindoId=null;
    renderReembolsosAto();
  }
}

function atoMensagemErro(erro,fallback='Não foi possível concluir esta operação.'){
  const texto=String(erro&&(erro.message||erro.details||erro.hint)||erro||'').trim();
  if(/a[cç][aã]o inv[aá]lida|ato_refund|mark_ato_refunded/i.test(texto)) return 'O serviço de reembolsos ainda não está atualizado no servidor.';
  if(/reembolsos_ato|schema cache|PGRST205/i.test(texto)) return 'A estrutura de reembolsos ainda não está disponível no banco.';
  if(/sess[aã]o|session|token/i.test(texto)) return 'Sua sessão protegida expirou. Entre novamente no sistema e tente outra vez.';
  if(/perfil|acesso|permission|permiss[aã]o|403/i.test(texto)) return 'Seu perfil não possui permissão para alterar os reembolsos de ATO.';
  if(/já foi reembolsado|already refunded/i.test(texto)) return 'Este reembolso já foi concluído e não pode ser alterado.';
  return texto||fallback;
}

async function atoSalvar(event){
  if(event&&typeof event.preventDefault==='function') event.preventDefault();
  if(atoSalvando||!atoPodeAcessar()) return;
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os reembolsos estão em modo consulta.'})) return;

  const campo=id=>document.getElementById(id);
  const cliente=atoNormalizarTexto(campo('ato-cliente')?.value||'');
  const telefone=atoFormatarTelefone(campo('ato-telefone')?.value||'');
  const valor=atoParseValor(campo('ato-valor')?.value||'');
  const dataPrevista=String(campo('ato-data-prevista')?.value||'').slice(0,10);
  const banco=atoNormalizarTexto(campo('ato-banco')?.value||'');
  const chavePix=String(campo('ato-pix')?.value||'').trim();
  const exigir=(condicao,id,mensagem)=>{
    if(condicao) return false;
    campo(id)?.focus();
    if(typeof showToast==='function') showToast('⚠️',mensagem);
    return true;
  };
  if(exigir(cliente,'ato-cliente','Informe o nome do cliente.')) return;
  if(exigir(atoSomenteDigitos(telefone).length>=8,'ato-telefone','Informe um telefone válido.')) return;
  if(exigir(valor>0,'ato-valor','Informe um valor maior que zero.')) return;
  if(exigir(/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista),'ato-data-prevista','Informe a data prevista para o reembolso.')) return;
  if(exigir(banco,'ato-banco','Informe o banco.')) return;
  if(exigir(chavePix,'ato-pix','Informe a chave PIX.')) return;

  const original=atoModalId==null?null:atoPorId(atoModalId);
  if(original&&atoStatus(original)==='reembolsado'){
    if(typeof showToast==='function') showToast('⚠️','Um reembolso concluído não pode ser alterado.');
    return;
  }
  const candidato={
    ...(original||{}),cliente,telefone,valor,dataPrevista,banco,chavePix,status:'pendente',dataReembolso:'',
    criadoPor:original&&original.criadoPor||(usuarioLogado&&usuarioLogado.nome)||'',
    criadoPorId:original&&original.criadoPorId||(usuarioLogado&&usuarioLogado.id)||null,
    criadoPorEmail:original&&original.criadoPorEmail||(usuarioLogado&&usuarioLogado.email)||''
  };
  const botao=campo('ato-save-btn');
  atoSalvando=true;
  if(botao){
    botao.disabled=true;
    botao.textContent=original?'Salvando alterações...':'Cadastrando...';
  }
  try{
    await dbSalvarReembolsoAto(candidato,original&&original.id);
    if(original){
      const indice=REEMBOLSOS_ATO.indexOf(original);
      if(indice>=0) REEMBOLSOS_ATO[indice]=candidato;
    }else{
      REEMBOLSOS_ATO.push(candidato);
    }
    zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
    atoModalAberto=false;
    atoModalId=null;
    salvarLS();
    renderReembolsosAto();
    if(typeof showToast==='function') showToast('✅',original?'Reembolso atualizado.':'Reembolso adicionado.');
  }catch(erro){
    console.error('Falha ao salvar reembolso de ATO:',erro);
    if(typeof showToast==='function') showToast('❌',atoMensagemErro(erro,'Não foi possível salvar o reembolso.'));
    if(botao){
      botao.disabled=false;
      botao.textContent=original?'Salvar alterações':'Adicionar reembolso';
    }
  }finally{
    atoSalvando=false;
  }
}

async function atoExcluir(id){
  if(!atoPodeAcessar()||atoExcluindoId!=null||atoPagamentoId!=null||atoComprovanteEnviandoId!=null) return;
  const item=atoPorId(id);
  if(!item) return;
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os reembolsos estão em modo consulta.'})) return;
  const concluido=atoStatus(item)==='reembolsado';
  const impacto=concluido
    ? `\n\nA saída automática de ${atoFormatarMoeda(item.valor)} no Financeiro${atoTemComprovante(item)?' e o comprovante anexado':''} também será excluída.`
    : '';
  if(!window.confirm(`Excluir o lançamento de reembolso de ${item.cliente}?${impacto}\n\nEsta ação não pode ser desfeita.`)) return;
  atoExcluindoId=id;
  renderReembolsosAto();
  try{
    await dbExcluirReembolsoAto(item.id);
    const indice=REEMBOLSOS_ATO.indexOf(item);
    if(indice>=0) REEMBOLSOS_ATO.splice(indice,1);
    zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
    salvarLS();
    if(typeof showToast==='function') showToast('✅',concluido
      ? `Reembolso e saída financeira excluídos${atoTemComprovante(item)?', junto com o comprovante.':'.'}`
      : 'Lançamento de reembolso excluído.');
  }catch(erro){
    console.error('Falha ao excluir reembolso de ATO:',erro);
    if(typeof showToast==='function') showToast('❌',atoMensagemErro(erro,'Não foi possível excluir o reembolso.'));
  }finally{
    atoExcluindoId=null;
    renderReembolsosAto();
  }
}

async function atoMarcarReembolsado(id){
  if(!atoPodeAcessar()||atoPagamentoId!=null) return;
  const item=atoPorId(id);
  if(!item||atoStatus(item)==='reembolsado') return;
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. Os reembolsos estão em modo consulta.'})) return;
  const hoje=atoHoje();
  const mensagem=`Confirmar o reembolso de ${atoFormatarMoeda(item.valor)} para ${item.cliente} hoje (${atoFormatarData(hoje)})?\n\nA saída será lançada automaticamente no Financeiro na data de hoje.`;
  if(!window.confirm(mensagem)) return;
  atoPagamentoId=id;
  renderReembolsosAto();
  try{
    const atualizado=await dbMarcarReembolsoAtoPago(item.id,hoje);
    const indice=REEMBOLSOS_ATO.indexOf(item);
    if(indice>=0) REEMBOLSOS_ATO[indice]=atualizado;
    zSetState('state.data.reembolsosAto',REEMBOLSOS_ATO);
    salvarLS();
    if(typeof showToast==='function') showToast('✅','Reembolso concluído. Agora anexe o comprovante nesta linha.');
  }catch(erro){
    console.error('Falha ao concluir reembolso de ATO:',erro);
    if(typeof showToast==='function') showToast('❌',atoMensagemErro(erro,'Não foi possível concluir o reembolso.'));
  }finally{
    atoPagamentoId=null;
    renderReembolsosAto();
  }
}

function atoModalHtml(){
  if(!atoModalAberto) return '';
  const item=atoModalId==null?null:atoPorId(atoModalId);
  return `<div class="folha-modal-backdrop" id="ato-modal-backdrop" onclick="atoFecharModalBackdrop(event)">
    <form class="folha-modal" onsubmit="atoSalvar(event)">
      <div class="folha-modal-head">
        <div><span>${item?'Editar cadastro':'Novo cadastro'}</span><h3>${item?'Atualizar reembolso':'Adicionar reembolso de ATO'}</h3></div>
        <button type="button" class="folha-icon-btn" onclick="atoFecharModal()" aria-label="Fechar">✕</button>
      </div>
      <div class="folha-form-grid">
        <label class="folha-field folha-field-wide"><span>Cliente</span><input id="ato-cliente" type="text" maxlength="160" value="${atoEscape(item&&item.cliente||'')}" placeholder="NOME DO CLIENTE" autocomplete="off" required></label>
        <label class="folha-field"><span>Telefone</span><input id="ato-telefone" type="tel" inputmode="tel" maxlength="15" value="${atoEscape(atoFormatarTelefone(item&&item.telefone||''))}" oninput="atoMascaraTelefone(this)" placeholder="(00) 00000-0000" autocomplete="off" required></label>
        <label class="folha-field"><span>Valor a reembolsar</span><div class="folha-money-input"><b>R$</b><input id="ato-valor" type="text" inputmode="decimal" value="${atoEscape(item?atoValorCampo(item.valor):'')}" placeholder="0,00" autocomplete="off" required></div></label>
        <label class="folha-field"><span>Data prevista</span><input id="ato-data-prevista" type="date" value="${atoEscape(item&&item.dataPrevista||atoHoje())}" required></label>
        <label class="folha-field"><span>Banco</span><input id="ato-banco" type="text" maxlength="100" value="${atoEscape(item&&item.banco||'')}" placeholder="EX.: NUBANK" autocomplete="off" required></label>
        <label class="folha-field folha-field-wide"><span>Chave PIX</span><input id="ato-pix" type="text" maxlength="180" value="${atoEscape(item&&item.chavePix||'')}" placeholder="CPF, E-MAIL, TELEFONE OU CHAVE ALEATÓRIA" autocomplete="off" required></label>
      </div>
      <div class="folha-modal-foot">
        <button type="button" class="folha-btn secondary" onclick="atoFecharModal()">Cancelar</button>
        <button type="submit" class="folha-btn primary" id="ato-save-btn">${item?'Salvar alterações':'Adicionar reembolso'}</button>
      </div>
    </form>
  </div>`;
}

function renderReembolsosAto(){
  const alvo=document.getElementById('reembolsos-ato-content');
  if(!alvo) return;
  if(!atoPodeAcessar()){
    alvo.innerHTML='<div class="folha-locked"><div>🔒</div><strong>Acesso restrito</strong><span>Apenas Dono e Financeiro podem consultar os reembolsos de ATO.</span></div>';
    return;
  }
  if(!atoCarregada&&!atoCarregando&&!atoErro) setTimeout(()=>atoGarantirDadosProtegidos(),0);
  const lista=atoListaFiltrada();
  const hoje=atoHoje();
  const pendentes=REEMBOLSOS_ATO.filter(item=>atoStatus(item)!=='reembolsado');
  const atrasados=REEMBOLSOS_ATO.filter(item=>atoStatus(item,hoje)==='atrasado');
  const mesAtual=hoje.slice(0,7);
  const pagosMes=REEMBOLSOS_ATO.filter(item=>atoStatus(item)==='reembolsado'&&String(item.dataReembolso||'').startsWith(mesAtual));
  const somar=itens=>itens.reduce((total,item)=>total+(Number(item.valor)||0),0);
  const statusCarga=atoCarregando
    ? '<div class="folha-status loading"><span>⏳</span><div><strong>Carregando dados protegidos</strong><p>Validando sua sessão e buscando os reembolsos.</p></div></div>'
    : atoErro
      ? `<div class="folha-status error"><span>!</span><div><strong>Não foi possível carregar os reembolsos</strong><p>${atoEscape(atoErro)}</p></div><button type="button" class="folha-btn secondary" onclick="atoRecarregar()">Tentar novamente</button></div>`
      : '';
  const linhas=lista.map(item=>{
    const status=atoStatus(item,hoje);
    const pagando=String(atoPagamentoId)===String(item.id);
    const excluindo=String(atoExcluindoId)===String(item.id);
    const enviandoComprovante=String(atoComprovanteEnviandoId)===String(item.id);
    const abrindoComprovante=String(atoComprovanteAbrindoId)===String(item.id);
    const data=status==='reembolsado'?`<strong>${atoEscape(atoFormatarData(item.dataReembolso))}</strong><small>previsto: ${atoEscape(atoFormatarData(item.dataPrevista))}</small>`:atoEscape(atoFormatarData(item.dataPrevista));
    const statusLabel=status==='reembolsado'?'Reembolsado':status==='atrasado'?'Atrasado':'Pendente';
    const acoes=status==='reembolsado'
      ? `<div class="folha-actions ato-actions"><span class="ato-done-note">Concluído</span><button type="button" class="folha-action delete" onclick="atoExcluir('${atoEscape(item.id)}')" ${excluindo?'disabled':''}>${excluindo?'Excluindo...':'Excluir lançamento'}</button></div>`
      : `<div class="folha-actions ato-actions"><button type="button" class="folha-action ato-pay" onclick="atoMarcarReembolsado('${atoEscape(item.id)}')" ${pagando?'disabled':''}>${pagando?'Registrando...':'Marcar reembolsado'}</button><button type="button" class="folha-action edit" onclick="atoEditar('${atoEscape(item.id)}')">Editar</button><button type="button" class="folha-action delete" onclick="atoExcluir('${atoEscape(item.id)}')" ${excluindo?'disabled':''}>${excluindo?'Excluindo...':'Excluir'}</button></div>`;
    const comprovante=status!=='reembolsado'
      ? '<span class="ato-receipt-na">Disponível após a baixa</span>'
      : atoTemComprovante(item)
        ? `<div class="ato-receipt"><div><strong title="${atoEscape(item.comprovanteNome||'Comprovante')}">${atoEscape(item.comprovanteNome||'Comprovante')}</strong><small>${atoEscape(atoFormatarTamanhoArquivo(item.comprovanteSize))}</small></div><span><button type="button" class="folha-action ato-view" onclick="atoAbrirComprovante('${atoEscape(item.id)}')" ${abrindoComprovante?'disabled':''}>${abrindoComprovante?'Abrindo...':'Ver'}</button><button type="button" class="folha-action edit" onclick="atoSelecionarComprovante('${atoEscape(item.id)}')" ${enviandoComprovante?'disabled':''}>${enviandoComprovante?'Enviando...':'Substituir'}</button></span></div>`
        : `<div class="ato-receipt-missing"><span>Sem comprovante</span><button type="button" class="folha-action ato-receipt-add" onclick="atoSelecionarComprovante('${atoEscape(item.id)}')" ${enviandoComprovante?'disabled':''}>${enviandoComprovante?'Enviando...':'Anexar comprovante'}</button></div>`;
    const iniciais=String(item.cliente||'').split(/\s+/).filter(Boolean).slice(0,2).map(parte=>parte[0]).join('').toUpperCase();
    return `<tr>
      <td><div class="folha-person"><span>${atoEscape(iniciais)}</span><strong>${atoEscape(item.cliente)}</strong></div></td>
      <td class="folha-nowrap">${atoEscape(atoFormatarTelefone(item.telefone))}</td>
      <td class="folha-salary">${atoEscape(atoFormatarMoeda(item.valor))}</td>
      <td class="folha-nowrap ato-date-cell">${data}</td>
      <td><span class="ato-status ${status}">${statusLabel}</span></td>
      <td><div class="folha-pix-cell"><span title="${atoEscape(item.chavePix)}">${atoEscape(item.chavePix)}</span><button type="button" onclick="atoCopiarPix('${atoEscape(item.id)}')" title="Copiar chave PIX">📋</button></div></td>
      <td>${atoEscape(item.banco)}</td>
      <td>${comprovante}</td>
      <td>${acoes}</td>
    </tr>`;
  }).join('');
  alvo.innerHTML=`<div class="folha-shell ato-shell">
    <section class="folha-hero ato-hero">
      <div><span class="folha-eyebrow">CONTROLE FINANCEIRO</span><h2>Reembolsos de ATO</h2><p>Valores a devolver aos clientes, com vencimento e baixa automática no Financeiro.</p></div>
      <button type="button" class="folha-btn primary" onclick="atoAbrirNovo()"><b>＋</b> Adicionar reembolso</button>
    </section>
    ${statusCarga}
    <section class="folha-kpis ato-kpis">
      <article class="accent"><span>TOTAL PENDENTE</span><strong>${atoEscape(atoFormatarMoeda(somar(pendentes)))}</strong><small>${pendentes.length} reembolso${pendentes.length===1?'':'s'} em aberto</small></article>
      <article class="ato-kpi-danger"><span>ATRASADO</span><strong>${atoEscape(atoFormatarMoeda(somar(atrasados)))}</strong><small>${atrasados.length} reembolso${atrasados.length===1?'':'s'} vencido${atrasados.length===1?'':'s'}</small></article>
      <article><span>REEMBOLSADO NO MÊS</span><strong>${atoEscape(atoFormatarMoeda(somar(pagosMes)))}</strong><small>${pagosMes.length} baixa${pagosMes.length===1?'':'s'} concluída${pagosMes.length===1?'':'s'}</small></article>
    </section>
    <section class="folha-panel">
      <div class="folha-toolbar ato-toolbar">
        <div><h3>Reembolsos cadastrados</h3><p>${lista.length} de ${REEMBOLSOS_ATO.length} registro${REEMBOLSOS_ATO.length===1?'':'s'}</p></div>
        <div class="ato-filters">
          <select onchange="atoAtualizarFiltro(this.value)" aria-label="Filtrar por situação">
            <option value="todos" ${atoFiltro==='todos'?'selected':''}>Todas as situações</option>
            <option value="pendente" ${atoFiltro==='pendente'?'selected':''}>Pendentes</option>
            <option value="atrasado" ${atoFiltro==='atrasado'?'selected':''}>Atrasados</option>
            <option value="reembolsado" ${atoFiltro==='reembolsado'?'selected':''}>Reembolsados</option>
          </select>
          <label class="folha-search"><span>⌕</span><input id="ato-busca" type="search" value="${atoEscape(atoBusca)}" oninput="atoAtualizarBusca(this.value)" placeholder="Buscar cliente, telefone, PIX ou banco"></label>
        </div>
      </div>
      <div class="folha-table-wrap">
        <table class="folha-table ato-table">
          <thead><tr><th>CLIENTE</th><th>TELEFONE</th><th>VALOR</th><th>DATA</th><th>SITUAÇÃO</th><th>CHAVE PIX</th><th>BANCO</th><th>COMPROVANTE</th><th>AÇÕES</th></tr></thead>
          <tbody>${linhas||`<tr><td colspan="9"><div class="folha-empty"><span>${atoBusca||atoFiltro!=='todos'?'⌕':'＋'}</span><strong>${atoBusca||atoFiltro!=='todos'?'Nenhum resultado encontrado':'Nenhum reembolso cadastrado'}</strong><p>${atoBusca||atoFiltro!=='todos'?'Ajuste a busca ou o filtro.':'Use o botão “Adicionar reembolso” para começar.'}</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </section>
    <input id="ato-comprovante-input" class="ato-file-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onchange="atoComprovanteSelecionado(event)">
  </div>${atoModalHtml()}`;
}

zRegisterModule('reembolsosAto',{
  renderReembolsosAto,
  atoAbrirNovo,
  atoEditar,
  atoFecharModal,
  atoSalvar,
  atoExcluir,
  atoMarcarReembolsado,
  atoSelecionarComprovante,
  atoComprovanteSelecionado,
  atoAbrirComprovante,
  atoFormatarTelefone,
  atoParseValor,
  atoStatus,
  atoGarantirDadosProtegidos,
  atoResetarCargaProtegida
});
