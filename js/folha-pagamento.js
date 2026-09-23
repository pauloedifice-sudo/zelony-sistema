// FOLHA DE PAGAMENTO
// Cadastro de colaboradores, salarios e dados essenciais para pagamento.

let folhaBusca='';
let folhaModalAberto=false;
let folhaModalId=null;
let folhaSalvando=false;
let folhaExcluindoId=null;
let folhaCarregando=false;
let folhaCarregada=false;
let folhaErro='';

zSetState('state.ui.folhaBusca',folhaBusca);
zSetState('state.ui.folhaModalAberto',folhaModalAberto);
zSetState('state.ui.folhaModalId',folhaModalId);

function folhaPodeAcessar(){
  return ['dono','fin'].includes(String(typeof role!=='undefined'?role:'').toLowerCase());
}

function folhaResetarCargaProtegida(){
  folhaCarregando=false;
  folhaCarregada=false;
  folhaErro='';
}

async function folhaGarantirDadosProtegidos(forcar=false){
  if(!folhaPodeAcessar()||folhaCarregando||(!forcar&&folhaCarregada)) return;
  folhaCarregando=true;
  folhaErro='';
  renderFolhaPagamento();
  try{
    if(typeof recarregarFolhaPagamentoProtegida!=='function') throw new Error('Serviço protegido da folha indisponível.');
    await recarregarFolhaPagamentoProtegida();
    folhaCarregada=true;
  }catch(erro){
    folhaCarregada=false;
    folhaErro=String(erro&&erro.message||erro||'Não foi possível carregar a folha de pagamento.');
    console.error('Falha ao carregar folha de pagamento:',erro);
  }finally{
    folhaCarregando=false;
    if(!document.getElementById('mod-folha-pagamento')?.classList.contains('hidden')) renderFolhaPagamento();
  }
}

function folhaRecarregar(){
  folhaErro='';
  folhaGarantirDadosProtegidos(true);
}

function folhaEscape(valor){
  return String(valor==null?'':valor)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function folhaSomenteDigitos(valor){
  return String(valor||'').replace(/\D/g,'');
}

function folhaFormatarCpf(valor){
  const cpf=folhaSomenteDigitos(valor).slice(0,11);
  if(cpf.length<=3) return cpf;
  if(cpf.length<=6) return `${cpf.slice(0,3)}.${cpf.slice(3)}`;
  if(cpf.length<=9) return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`;
}

function folhaCpfValido(valor){
  const cpf=folhaSomenteDigitos(valor);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf)) return false;
  const calcular=tamanho=>{
    let soma=0;
    for(let i=0;i<tamanho;i++) soma+=Number(cpf[i])*(tamanho+1-i);
    const resto=(soma*10)%11;
    return resto===10?0:resto;
  };
  return calcular(9)===Number(cpf[9])&&calcular(10)===Number(cpf[10]);
}

function folhaParseValor(valor){
  if(typeof valor==='number') return Number.isFinite(valor)?valor:0;
  const bruto=String(valor||'').trim().replace(/R\$\s?/gi,'').replace(/\s/g,'');
  if(!bruto) return 0;
  const normalizado=bruto.includes(',')?bruto.replace(/\./g,'').replace(',','.'):bruto;
  const numero=Number(normalizado);
  return Number.isFinite(numero)?numero:0;
}

function folhaFormatarMoeda(valor){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(valor)||0);
}

function folhaValorCampo(valor){
  return (Number(valor)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function folhaNormalizarTexto(valor){
  const texto=typeof zNormalizarCampoTexto==='function'?zNormalizarCampoTexto(valor):String(valor||'').trim();
  return texto.toUpperCase();
}

function folhaColaboradorPorId(id){
  return FOLHA_PAGAMENTO_COLABORADORES.find(item=>String(item.id)===String(id))||null;
}

function folhaListaFiltrada(){
  const busca=String(folhaBusca||'').trim().toLocaleLowerCase('pt-BR');
  const lista=[...FOLHA_PAGAMENTO_COLABORADORES].sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
  if(!busca) return lista;
  const digitos=folhaSomenteDigitos(busca);
  return lista.filter(item=>{
    const campos=[item.nome,item.funcao,item.banco,item.chavePix,folhaFormatarCpf(item.cpf)]
      .map(valor=>String(valor||'').toLocaleLowerCase('pt-BR'));
    return campos.some(valor=>valor.includes(busca))||(digitos&&folhaSomenteDigitos(item.cpf).includes(digitos));
  });
}

function folhaAbrirNovo(){
  if(!folhaPodeAcessar()) return;
  folhaModalId=null;
  folhaModalAberto=true;
  zSetState('state.ui.folhaModalId',folhaModalId);
  zSetState('state.ui.folhaModalAberto',folhaModalAberto);
  renderFolhaPagamento();
  setTimeout(()=>document.getElementById('folha-nome')?.focus(),50);
}

function folhaEditar(id){
  if(!folhaPodeAcessar()||!folhaColaboradorPorId(id)) return;
  folhaModalId=id;
  folhaModalAberto=true;
  zSetState('state.ui.folhaModalId',folhaModalId);
  zSetState('state.ui.folhaModalAberto',folhaModalAberto);
  renderFolhaPagamento();
  setTimeout(()=>document.getElementById('folha-nome')?.focus(),50);
}

function folhaFecharModal(){
  if(folhaSalvando) return;
  folhaModalAberto=false;
  folhaModalId=null;
  zSetState('state.ui.folhaModalAberto',folhaModalAberto);
  zSetState('state.ui.folhaModalId',folhaModalId);
  renderFolhaPagamento();
}

function folhaFecharModalBackdrop(event){
  if(event&&event.target&&event.target.id==='folha-modal-backdrop') folhaFecharModal();
}

function folhaAtualizarBusca(valor){
  folhaBusca=String(valor||'');
  zSetState('state.ui.folhaBusca',folhaBusca);
  renderFolhaPagamento();
  const campo=document.getElementById('folha-busca');
  if(campo){
    campo.focus();
    campo.setSelectionRange(campo.value.length,campo.value.length);
  }
}

function folhaMascaraCpfCampo(campo){
  if(campo) campo.value=folhaFormatarCpf(campo.value);
}

async function folhaCopiarPix(id){
  const item=folhaColaboradorPorId(id);
  if(!item||!item.chavePix) return;
  if(typeof copiarTexto==='function'){
    copiarTexto(item.chavePix,'Chave PIX');
    return;
  }
  try{
    await navigator.clipboard.writeText(item.chavePix);
    if(typeof showToast==='function') showToast('📋','Chave PIX copiada.');
  }catch(e){
    if(typeof showToast==='function') showToast('⚠️','Não foi possível copiar a chave PIX.');
  }
}

function folhaMensagemErroDuplicidade(erro){
  const texto=String(erro&&(erro.message||erro.details||erro.hint||erro.code)||'').toLowerCase();
  return texto.includes('23505')||texto.includes('duplicate')||texto.includes('unique');
}

function folhaMensagemErroSalvar(erro){
  if(folhaMensagemErroDuplicidade(erro)) return 'Este CPF já está cadastrado na folha de pagamento.';
  const texto=String(erro&&(erro.message||erro.details||erro.hint)||erro||'').trim();
  if(/a[cç][aã]o inv[aá]lida|list_payroll|save_payroll/i.test(texto)) return 'O serviço da folha de pagamento ainda não está atualizado no servidor.';
  if(/folha_pagamento_colaboradores|schema cache|PGRST205/i.test(texto)) return 'A estrutura da folha de pagamento ainda não está disponível no banco.';
  if(/sess[aã]o|session|token/i.test(texto)) return 'Sua sessão protegida expirou. Entre novamente no sistema e tente salvar.';
  if(/perfil|acesso|permission|permiss[aã]o|403/i.test(texto)) return 'Seu perfil não possui permissão para alterar a folha de pagamento.';
  return texto||'Não foi possível salvar o colaborador no banco.';
}

async function folhaSalvar(event){
  if(event&&typeof event.preventDefault==='function') event.preventDefault();
  if(folhaSalvando||!folhaPodeAcessar()) return;
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. A folha de pagamento está em modo consulta.'})) return;

  const campo=id=>document.getElementById(id);
  const nome=folhaNormalizarTexto(campo('folha-nome')?.value||'');
  const cpf=folhaSomenteDigitos(campo('folha-cpf')?.value||'');
  const funcao=folhaNormalizarTexto(campo('folha-funcao')?.value||'');
  const salario=folhaParseValor(campo('folha-salario')?.value||'');
  const chavePix=String(campo('folha-pix')?.value||'').trim();
  const banco=folhaNormalizarTexto(campo('folha-banco')?.value||'');

  const exigir=(condicao,id,mensagem)=>{
    if(condicao) return false;
    campo(id)?.focus();
    if(typeof showToast==='function') showToast('⚠️',mensagem);
    return true;
  };
  if(exigir(nome,'folha-nome','Informe o nome do colaborador.')) return;
  if(exigir(folhaCpfValido(cpf),'folha-cpf','Informe um CPF válido.')) return;
  if(exigir(funcao,'folha-funcao','Informe a função do colaborador.')) return;
  if(exigir(salario>0,'folha-salario','Informe um salário maior que zero.')) return;
  if(exigir(chavePix,'folha-pix','Informe a chave PIX.')) return;
  if(exigir(banco,'folha-banco','Informe o banco.')) return;
  const duplicado=FOLHA_PAGAMENTO_COLABORADORES.some(item=>String(item.id)!==String(folhaModalId)&&folhaSomenteDigitos(item.cpf)===cpf);
  if(duplicado){
    campo('folha-cpf')?.focus();
    if(typeof showToast==='function') showToast('⚠️','Este CPF já está cadastrado na folha de pagamento.');
    return;
  }

  const original=folhaModalId==null?null:folhaColaboradorPorId(folhaModalId);
  const candidato={
    ...(original||{}),
    nome,cpf,funcao,salario,chavePix,banco,
    criadoPor:original&&original.criadoPor||(usuarioLogado&&usuarioLogado.nome)||'',
    criadoPorId:original&&original.criadoPorId||(usuarioLogado&&usuarioLogado.id)||null,
    criadoPorEmail:original&&original.criadoPorEmail||(usuarioLogado&&usuarioLogado.email)||''
  };
  const botao=campo('folha-save-btn');
  folhaSalvando=true;
  if(botao){
    botao.disabled=true;
    botao.textContent=original?'Salvando alterações...':'Cadastrando...';
  }
  try{
    await dbSalvarFolhaPagamentoColaborador(candidato,original&&original.id);
    if(original){
      const idx=FOLHA_PAGAMENTO_COLABORADORES.indexOf(original);
      if(idx>=0) FOLHA_PAGAMENTO_COLABORADORES[idx]=candidato;
    }else{
      FOLHA_PAGAMENTO_COLABORADORES.push(candidato);
    }
    FOLHA_PAGAMENTO_COLABORADORES.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    zSetState('state.data.folhaPagamentoColaboradores',FOLHA_PAGAMENTO_COLABORADORES);
    folhaModalAberto=false;
    folhaModalId=null;
    zSetState('state.ui.folhaModalAberto',folhaModalAberto);
    zSetState('state.ui.folhaModalId',folhaModalId);
    salvarLS();
    renderFolhaPagamento();
    if(typeof showToast==='function') showToast('✅',original?'Colaborador atualizado na folha.':'Colaborador adicionado à folha.');
  }catch(erro){
    console.error('Falha ao salvar colaborador da folha:',erro);
    if(typeof showToast==='function') showToast('❌',folhaMensagemErroSalvar(erro));
    if(botao){
      botao.disabled=false;
      botao.textContent=original?'Salvar alterações':'Adicionar colaborador';
    }
  }finally{
    folhaSalvando=false;
  }
}

async function folhaExcluir(id){
  if(!folhaPodeAcessar()||folhaExcluindoId!=null) return;
  const item=folhaColaboradorPorId(id);
  if(!item) return;
  if(typeof appPodePersistirNoSupabase==='function'&&!appPodePersistirNoSupabase({mensagem:'Sem conexão com o Supabase. A folha de pagamento está em modo consulta.'})) return;
  if(!window.confirm(`Excluir ${item.nome} da folha de pagamento?`)) return;
  folhaExcluindoId=id;
  renderFolhaPagamento();
  try{
    await dbExcluirFolhaPagamentoColaborador(item.id);
    const idx=FOLHA_PAGAMENTO_COLABORADORES.indexOf(item);
    if(idx>=0) FOLHA_PAGAMENTO_COLABORADORES.splice(idx,1);
    zSetState('state.data.folhaPagamentoColaboradores',FOLHA_PAGAMENTO_COLABORADORES);
    salvarLS();
    if(typeof showToast==='function') showToast('✅','Colaborador excluído da folha.');
  }catch(erro){
    console.error('Falha ao excluir colaborador da folha:',erro);
    if(typeof showToast==='function') showToast('❌','Não foi possível excluir o colaborador do banco.');
  }finally{
    folhaExcluindoId=null;
    renderFolhaPagamento();
  }
}

function folhaModalHtml(){
  if(!folhaModalAberto) return '';
  const item=folhaModalId==null?null:folhaColaboradorPorId(folhaModalId);
  return `<div class="folha-modal-backdrop" id="folha-modal-backdrop" onclick="folhaFecharModalBackdrop(event)">
    <form class="folha-modal" onsubmit="folhaSalvar(event)">
      <div class="folha-modal-head">
        <div>
          <span>${item?'Editar cadastro':'Novo cadastro'}</span>
          <h3>${item?'Atualizar colaborador':'Adicionar à folha de pagamento'}</h3>
        </div>
        <button type="button" class="folha-icon-btn" onclick="folhaFecharModal()" aria-label="Fechar">✕</button>
      </div>
      <div class="folha-form-grid">
        <label class="folha-field folha-field-wide">
          <span>Nome completo</span>
          <input id="folha-nome" type="text" maxlength="160" value="${folhaEscape(item&&item.nome||'')}" placeholder="NOME DO COLABORADOR" autocomplete="off" required>
        </label>
        <label class="folha-field">
          <span>CPF</span>
          <input id="folha-cpf" type="text" inputmode="numeric" maxlength="14" value="${folhaEscape(folhaFormatarCpf(item&&item.cpf||''))}" oninput="folhaMascaraCpfCampo(this)" placeholder="000.000.000-00" autocomplete="off" required>
        </label>
        <label class="folha-field">
          <span>Função</span>
          <input id="folha-funcao" type="text" maxlength="100" value="${folhaEscape(item&&item.funcao||'')}" placeholder="EX.: ASSISTENTE ADMINISTRATIVO" autocomplete="off" required>
        </label>
        <label class="folha-field">
          <span>Salário</span>
          <div class="folha-money-input"><b>R$</b><input id="folha-salario" type="text" inputmode="decimal" value="${folhaEscape(item?folhaValorCampo(item.salario):'')}" placeholder="0,00" autocomplete="off" required oninput="zMascararValorMonetario(this)" onblur="zFinalizarValorMonetario(this,false)"></div>
        </label>
        <label class="folha-field">
          <span>Banco</span>
          <input id="folha-banco" type="text" maxlength="100" value="${folhaEscape(item&&item.banco||'')}" placeholder="EX.: NUBANK" autocomplete="off" required>
        </label>
        <label class="folha-field folha-field-wide">
          <span>Chave PIX</span>
          <input id="folha-pix" type="text" maxlength="180" value="${folhaEscape(item&&item.chavePix||'')}" placeholder="CPF, E-MAIL, TELEFONE OU CHAVE ALEATÓRIA" autocomplete="off" required>
        </label>
      </div>
      <div class="folha-modal-foot">
        <button type="button" class="folha-btn secondary" onclick="folhaFecharModal()">Cancelar</button>
        <button type="submit" class="folha-btn primary" id="folha-save-btn">${item?'Salvar alterações':'Adicionar colaborador'}</button>
      </div>
    </form>
  </div>`;
}

function renderFolhaPagamento(){
  const alvo=document.getElementById('folha-pagamento-content');
  if(!alvo) return;
  if(!folhaPodeAcessar()){
    alvo.innerHTML=`<div class="folha-locked"><div>🔒</div><strong>Acesso restrito</strong><span>Apenas Dono e Financeiro podem consultar a folha de pagamento.</span></div>`;
    return;
  }
  if(!folhaCarregada&&!folhaCarregando&&!folhaErro){
    setTimeout(()=>folhaGarantirDadosProtegidos(),0);
  }
  const lista=folhaListaFiltrada();
  const total=FOLHA_PAGAMENTO_COLABORADORES.reduce((s,item)=>s+(Number(item.salario)||0),0);
  const maior=FOLHA_PAGAMENTO_COLABORADORES.reduce((atual,item)=>(Number(item.salario)||0)>(Number(atual&&atual.salario)||0)?item:atual,null);
  const statusCarga=folhaCarregando
    ? `<div class="folha-status loading"><span>⏳</span><div><strong>Carregando dados protegidos</strong><p>Validando sua sessão e buscando a folha de pagamento.</p></div></div>`
    : folhaErro
      ? `<div class="folha-status error"><span>!</span><div><strong>Não foi possível carregar a folha</strong><p>${folhaEscape(folhaErro)}</p></div><button type="button" class="folha-btn secondary" onclick="folhaRecarregar()">Tentar novamente</button></div>`
      : '';
  const linhas=lista.map(item=>{
    const excluindo=String(folhaExcluindoId)===String(item.id);
    return `<tr>
      <td><div class="folha-person"><span>${folhaEscape(String(item.nome||'').split(/\s+/).filter(Boolean).slice(0,2).map(parte=>parte[0]).join('').toUpperCase())}</span><strong>${folhaEscape(item.nome)}</strong></div></td>
      <td class="folha-nowrap">${folhaEscape(folhaFormatarCpf(item.cpf))}</td>
      <td>${folhaEscape(item.funcao)}</td>
      <td class="folha-salary">${folhaEscape(folhaFormatarMoeda(item.salario))}</td>
      <td><div class="folha-pix-cell"><span title="${folhaEscape(item.chavePix)}">${folhaEscape(item.chavePix)}</span><button type="button" onclick="folhaCopiarPix('${folhaEscape(item.id)}')" title="Copiar chave PIX">📋</button></div></td>
      <td>${folhaEscape(item.banco)}</td>
      <td><div class="folha-actions"><button type="button" class="folha-action edit" onclick="folhaEditar('${folhaEscape(item.id)}')">Editar</button><button type="button" class="folha-action delete" onclick="folhaExcluir('${folhaEscape(item.id)}')" ${excluindo?'disabled':''}>${excluindo?'Excluindo...':'Excluir'}</button></div></td>
    </tr>`;
  }).join('');
  alvo.innerHTML=`<div class="folha-shell">
    <section class="folha-hero">
      <div>
        <span class="folha-eyebrow">GESTÃO DE PESSOAS</span>
        <h2>Folha de Pagamento</h2>
        <p>Dados essenciais dos colaboradores e valores atuais de salário em um só lugar.</p>
      </div>
      <button type="button" class="folha-btn primary" onclick="folhaAbrirNovo()"><b>＋</b> Adicionar colaborador</button>
    </section>
    ${statusCarga}
    <section class="folha-kpis">
      <article><span>COLABORADORES</span><strong>${FOLHA_PAGAMENTO_COLABORADORES.length}</strong><small>cadastros na folha</small></article>
      <article class="accent"><span>VALOR TOTAL DA FOLHA</span><strong>${folhaEscape(folhaFormatarMoeda(total))}</strong><small>soma dos salários atuais</small></article>
      <article><span>MAIOR SALÁRIO</span><strong>${maior?folhaEscape(folhaFormatarMoeda(maior.salario)):'R$ 0,00'}</strong><small>${maior?folhaEscape(maior.nome):'nenhum cadastro'}</small></article>
    </section>
    <section class="folha-panel">
      <div class="folha-toolbar">
        <div>
          <h3>Colaboradores cadastrados</h3>
          <p>${lista.length} de ${FOLHA_PAGAMENTO_COLABORADORES.length} colaborador${FOLHA_PAGAMENTO_COLABORADORES.length===1?'':'es'}</p>
        </div>
        <label class="folha-search"><span>⌕</span><input id="folha-busca" type="search" value="${folhaEscape(folhaBusca)}" oninput="folhaAtualizarBusca(this.value)" placeholder="Buscar nome, CPF, função, PIX ou banco"></label>
      </div>
      <div class="folha-table-wrap">
        <table class="folha-table">
          <thead><tr><th>NOME</th><th>CPF</th><th>FUNÇÃO</th><th>SALÁRIO</th><th>CHAVE PIX</th><th>BANCO</th><th>AÇÕES</th></tr></thead>
          <tbody>${linhas||`<tr><td colspan="7"><div class="folha-empty"><span>${folhaBusca?'⌕':'＋'}</span><strong>${folhaBusca?'Nenhum resultado encontrado':'Nenhum colaborador cadastrado'}</strong><p>${folhaBusca?'Tente buscar por outro termo.':'Use o botão “Adicionar colaborador” para começar.'}</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </section>
  </div>${folhaModalHtml()}`;
}

zRegisterModule('folhaPagamento',{
  renderFolhaPagamento,
  folhaAbrirNovo,
  folhaEditar,
  folhaFecharModal,
  folhaSalvar,
  folhaExcluir,
  folhaFormatarCpf,
  folhaCpfValido,
  folhaParseValor,
  folhaGarantirDadosProtegidos,
  folhaResetarCargaProtegida
});
