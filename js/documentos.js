// DOCUMENTOS
// Biblioteca de PDFs para consulta e download da equipe

let dBusca = '';
let dCategoria = 'todos';
let dSelectedToken = '';
let dEditToken = '';
let dViewToken = '';
let dViewBlobUrl = '';
let dFileObj = null;
let dFileDataUrl = '';
let dFileMeta = null;

const DOCUMENTO_ROLES_GESTAO = ['dono','dir','fin','rh'];
const DOCUMENTO_MAX_SIZE = 5 * 1024 * 1024;

zSetState('state.ui.documentosBusca', dBusca);
zSetState('state.ui.documentosCategoria', dCategoria);
zSetState('state.ui.documentosSelecionado', dSelectedToken);

function docsNorm(value){
  return zUiText(String(value || ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escHtml(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function documentoLocalKey(doc){
  if(!doc) return '';
  return [
    docsNorm(doc.titulo),
    docsNorm(doc.categoria),
    docsNorm(doc.arquivoNome)
  ].join('::');
}

function documentoToken(doc){
  if(!doc) return '';
  if(doc.id != null && String(doc.id) !== '') return `id:${doc.id}`;
  return `local:${encodeURIComponent(documentoLocalKey(doc))}`;
}

function getDocumentoPorToken(token){
  if(!token) return null;
  if(token.startsWith('id:')){
    const idTxt = token.slice(3);
    return DOCUMENTOS.find(doc => String(doc.id) === idTxt) || null;
  }
  if(token.startsWith('local:')){
    const key = decodeURIComponent(token.slice(6));
    return DOCUMENTOS.find(doc => documentoLocalKey(doc) === key) || null;
  }
  return null;
}

function documentoSorter(a, b){
  if(typeof ordenarDocumentos === 'function') return ordenarDocumentos(a, b);
  const dataA = Date.parse(a && a.atualizadoEm || '') || 0;
  const dataB = Date.parse(b && b.atualizadoEm || '') || 0;
  if(dataA !== dataB) return dataB - dataA;
  return String(a && a.titulo || '').localeCompare(String(b && b.titulo || ''), 'pt-BR');
}

function podeGerirDocumentos(){
  return DOCUMENTO_ROLES_GESTAO.includes(role);
}

function fmtDocumentoData(value){
  if(!value) return zUiText('Sem data');
  const data = new Date(value);
  if(Number.isNaN(data.getTime())) return zUiText('Sem data');
  return data.toLocaleDateString('pt-BR');
}

function getDocumentoStatusLabel(doc){
  if(doc && doc.storagePath) return zUiText('Compartilhado via Storage');
  if(doc && doc.id) return zUiText('Compartilhado via banco');
  return zUiText('Salvo localmente');
}

function getCategoriasDocumentos(){
  const categorias = new Set();
  DOCUMENTOS.forEach(doc => {
    const categoria = String(doc && doc.categoria || '').trim();
    if(categoria) categorias.add(categoria);
  });
  return ['todos', ...Array.from(categorias).sort((a,b)=>a.localeCompare(b, 'pt-BR'))];
}

function getDocumentosBase(){
  return DOCUMENTOS
    .filter(doc => doc && doc.publicado !== false)
    .slice()
    .sort(documentoSorter);
}

function getDocumentosVisiveis(){
  const busca = docsNorm(dBusca);
  const categoria = docsNorm(dCategoria);
  return getDocumentosBase().filter(doc => {
    if(categoria !== 'todos' && docsNorm(doc.categoria) !== categoria) return false;
    if(!busca) return true;
    const alvo = [
      doc.titulo,
      doc.categoria,
      doc.descricao,
      doc.arquivoNome,
      doc.criadoPor,
      getDocumentoStatusLabel(doc)
    ].map(docsNorm).join(' ');
    return alvo.includes(busca);
  });
}

function persistirDocumentosUI(){
  zSetState('state.data.documentos', DOCUMENTOS);
  zSetState('state.ui.documentosBusca', dBusca);
  zSetState('state.ui.documentosCategoria', dCategoria);
  zSetState('state.ui.documentosSelecionado', dSelectedToken);
  salvarLS();
}

function garantirDocumentoSelecionado(lista){
  if(!Array.isArray(lista) || !lista.length){
    dSelectedToken = '';
    zSetState('state.ui.documentosSelecionado', dSelectedToken);
    return null;
  }
  const atual = getDocumentoPorToken(dSelectedToken);
  if(atual){
    const tokenAtual = documentoToken(atual);
    if(lista.some(doc => documentoToken(doc) === tokenAtual)){
      dSelectedToken = tokenAtual;
      zSetState('state.ui.documentosSelecionado', dSelectedToken);
      return atual;
    }
  }
  dSelectedToken = documentoToken(lista[0]);
  zSetState('state.ui.documentosSelecionado', dSelectedToken);
  return lista[0];
}

function renderDocumentoCard(doc, ativo){
  const token = documentoToken(doc);
  const descricao = String(doc.descricao || '').trim();
  const tags = [
    `<span class="docs-card-tag cat">${escHtml(doc.categoria || 'Geral')}</span>`,
    doc.storagePath
      ? `<span class="docs-card-tag cat">${escHtml(zUiText('Storage'))}</span>`
      : !doc.id
        ? `<span class="docs-card-tag local">${escHtml(zUiText('Local'))}</span>`
        : ''
  ].join('');

  return `
    <button type="button" class="docs-card ${ativo ? 'active' : ''}" onclick="selecionarDocumento('${token}')">
      <div class="docs-card-top">
        <div class="docs-card-icon">PDF</div>
        <div class="docs-card-main">
          <div class="docs-card-tags">${tags}</div>
          <div class="docs-card-title">${escHtml(doc.titulo || 'Documento sem titulo')}</div>
          <div class="docs-card-desc">${escHtml(descricao || zUiText('Documento pronto para consulta da equipe.'))}</div>
          <div class="docs-card-meta">
            <span>${escHtml(fmtTamanho(doc.size || 0))}</span>
            <span>${escHtml(fmtDocumentoData(doc.atualizadoEm))}</span>
            <span>${escHtml(doc.arquivoNome || 'arquivo.pdf')}</span>
          </div>
        </div>
        <div class="docs-card-arrow">&rsaquo;</div>
      </div>
    </button>
  `;
}

function renderDocumentoPainel(doc){
  const token = documentoToken(doc);
  const criadoPor = String(doc.criadoPor || '').trim();
  const descricao = String(doc.descricao || '').trim();
  const statusArquivo = getDocumentoStatusLabel(doc);
  const notaStorage = doc.storagePath
    ? zUiText('Este arquivo esta sendo servido pelo Supabase Storage.')
    : doc.id
      ? zUiText('Este arquivo ainda esta salvo diretamente no banco e pode ser migrado ao editar o documento.')
      : zUiText('No momento ele tambem esta mantido no cache local deste navegador.');

  return `
    <div class="docs-detail-panel">
      <div class="docs-preview">
        <div class="docs-preview-main">
          <div class="docs-preview-badge">${zUiText('Biblioteca em PDF')}</div>
          <div class="docs-detail-title">${escHtml(doc.titulo || 'Documento sem titulo')}</div>
          <div class="docs-detail-copy">${escHtml(descricao || zUiText('Este arquivo esta disponivel para consulta e download pelos usuarios do sistema.'))}</div>
          <div class="docs-detail-meta">
            <span>${escHtml(doc.categoria || 'Geral')}</span>
            <span>${escHtml(fmtTamanho(doc.size || 0))}</span>
            <span>${escHtml(statusArquivo)}</span>
            <span>${escHtml(`${zUiText('Atualizado em')} ${fmtDocumentoData(doc.atualizadoEm)}`)}</span>
            ${criadoPor ? `<span>${escHtml(`${zUiText('Publicado por')} ${criadoPor}`)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="docs-detail-actions">
        <button class="btn-s" type="button" onclick="visualizarDocumento('${token}')">${zUiText('Visualizar PDF')}</button>
        <button class="btn-c" type="button" onclick="baixarDocumento('${token}')">${zUiText('Baixar arquivo')}</button>
        ${podeGerirDocumentos() ? `<button class="btn-c" type="button" onclick="abrirModalDocumento('${token}')">${zUiText('Editar')}</button>` : ''}
        ${podeGerirDocumentos() ? `<button class="btn-c" type="button" style="border-color:#E4B1A4;color:#B65239;background:#FFF8F5;" onclick="excluirDocumento('${token}')">${zUiText('Excluir')}</button>` : ''}
      </div>
      <div class="docs-note">
        <strong>${zUiText('Arquivo selecionado')}:</strong> ${escHtml(doc.arquivoNome || 'arquivo.pdf')}<br>
        ${zUiText('Os usuarios podem abrir este PDF no sistema ou baixar uma copia pronta para uso.')} ${escHtml(notaStorage)}
      </div>
    </div>
  `;
}

function renderDocumentos(options = {}){
  const wrap = document.getElementById('documentos-content');
  if(!wrap) return;

  const docs = getDocumentosVisiveis();
  const categorias = getCategoriasDocumentos();
  const selecionado = garantirDocumentoSelecionado(docs);
  const base = getDocumentosBase();
  const totalDocs = base.length;
  const totalCategorias = Math.max(0, categorias.length - 1);
  const totalBytes = base.reduce((acc, doc)=>acc + (parseInt(doc.size,10) || 0), 0);

  wrap.innerHTML = `
    <div class="docs-hero">
      <div>
        <div class="docs-eyebrow">${zUiText('Central de arquivos')}</div>
        <h2>${zUiText('Documentos prontos para a equipe')}</h2>
        <p>${zUiText('Organize PDFs oficiais em um unico lugar para que os usuarios possam consultar, visualizar e baixar sempre a versao mais atualizada.')}</p>
        <div class="docs-stats">
          <div class="docs-stat"><strong>${totalDocs}</strong><span>${zUiText('documentos publicados')}</span></div>
          <div class="docs-stat"><strong>${totalCategorias}</strong><span>${zUiText('categorias ativas')}</span></div>
          <div class="docs-stat"><strong>${escHtml(fmtTamanho(totalBytes))}</strong><span>${zUiText('volume total em PDF')}</span></div>
        </div>
      </div>
      <div class="docs-side">
        <div>
          <div class="docs-side-title">${zUiText('Biblioteca compartilhada')}</div>
          <div class="docs-side-copy">${zUiText(podeGerirDocumentos() ? 'Voce pode adicionar, atualizar ou remover arquivos da base sempre que precisar.' : 'Seu perfil pode consultar os documentos liberados e baixar os PDFs prontos para uso imediato.')}</div>
        </div>
        <div class="docs-side-foot">
          <span>${zUiText(`${docs.length} documento(s) no filtro atual`)}</span>
          ${podeGerirDocumentos()
            ? `<button type="button" class="btn-add-trein" onclick="abrirModalDocumento()">${zUiText('Novo PDF')}</button>`
            : `<span>${zUiText('Consulta liberada para todos os usuarios')}</span>`}
        </div>
      </div>
    </div>
    <div class="docs-toolbar">
      <div class="docs-search">
        <span>&#128270;</span>
        <input id="docs-busca" type="text" value="${escHtml(dBusca)}" placeholder="${zUiText('Buscar por titulo, categoria ou descricao...')}" oninput="setDBusca(this.value)">
      </div>
      <div class="docs-filter-actions">
        ${categorias.map(cat => `
          <button type="button" class="docs-cat ${docsNorm(dCategoria) === docsNorm(cat) ? 'active' : ''}" onclick="setDCategoria(decodeURIComponent('${encodeURIComponent(cat)}'))">
            ${escHtml(cat === 'todos' ? zUiText('Todas') : cat)}
          </button>
        `).join('')}
        ${(dBusca || docsNorm(dCategoria) !== 'todos') ? `<button type="button" class="docs-cat" onclick="limparFiltrosDocumentos()">${zUiText('Limpar filtros')}</button>` : ''}
      </div>
    </div>
    <div class="docs-shell">
      <div class="docs-list-col">
        ${docs.length ? `<div class="docs-list">${docs.map(doc => renderDocumentoCard(doc, selecionado && documentoToken(doc) === documentoToken(selecionado))).join('')}</div>` : `
          <div class="docs-empty-state">
            <div class="docs-empty-icon">&#128236;</div>
            <div class="docs-empty-title">${zUiText('Nenhum documento encontrado')}</div>
            <div class="docs-empty-copy">${zUiText(dBusca || docsNorm(dCategoria) !== 'todos' ? 'Ajuste a busca ou troque a categoria selecionada para encontrar outro arquivo.' : 'Assim que os PDFs forem cadastrados, eles aparecerao aqui para consulta da equipe.')}</div>
          </div>
        `}
      </div>
      <div class="docs-detail-col">
        ${selecionado ? renderDocumentoPainel(selecionado) : `
          <div class="docs-detail-empty">
            <div class="docs-empty-icon">&#128196;</div>
            <div class="docs-empty-title">${zUiText('Selecione um documento')}</div>
            <div class="docs-empty-copy">${zUiText('Escolha um item da lista para ver os detalhes, abrir o PDF no sistema ou baixar o arquivo.')}</div>
          </div>
        `}
      </div>
    </div>
  `;

  if(options.focusSearch){
    setTimeout(() => {
      const input = document.getElementById('docs-busca');
      if(input){
        input.focus();
        const pos = input.value.length;
        input.setSelectionRange(pos, pos);
      }
    }, 0);
  }
}

function setDBusca(value){
  dBusca = String(value || '');
  zSetState('state.ui.documentosBusca', dBusca);
  renderDocumentos({ focusSearch:true });
}

function setDCategoria(value){
  dCategoria = value || 'todos';
  zSetState('state.ui.documentosCategoria', dCategoria);
  renderDocumentos();
}

function limparFiltrosDocumentos(){
  dBusca = '';
  dCategoria = 'todos';
  zSetState('state.ui.documentosBusca', dBusca);
  zSetState('state.ui.documentosCategoria', dCategoria);
  renderDocumentos();
}

function selecionarDocumento(token){
  dSelectedToken = token || '';
  zSetState('state.ui.documentosSelecionado', dSelectedToken);
  renderDocumentos();
}

function preencherModalDocumento(doc){
  document.getElementById('md-title').textContent = zUiText(doc ? 'Editar documento' : 'Novo documento');
  document.getElementById('md-titulo').value = doc ? (doc.titulo || '') : '';
  document.getElementById('md-categoria').value = doc ? (doc.categoria || '') : '';
  document.getElementById('md-descricao').value = doc ? (doc.descricao || '') : '';
  dFileObj = null;
  dFileDataUrl = doc ? (doc.dataUrl || '') : '';
  dFileMeta = doc ? {
    name: doc.arquivoNome || 'arquivo.pdf',
    size: parseInt(doc.size, 10) || 0,
    type: doc.mime || 'application/pdf'
  } : null;
  document.getElementById('md-arquivo').value = '';
  renderResumoArquivoDocumento();
}

function abrirModalDocumento(token = ''){
  if(!podeGerirDocumentos()){
    showToast(zUiText('⚠️'), zUiText('Seu perfil nao tem permissao para gerenciar documentos.'));
    return;
  }
  const doc = token ? getDocumentoPorToken(token) : null;
  dEditToken = doc ? documentoToken(doc) : '';
  preencherModalDocumento(doc);
  document.getElementById('m-doc').classList.add('show');
  setTimeout(()=>{
    const campo = document.getElementById('md-titulo');
    if(campo) campo.focus();
  },60);
}

function fecharModalDocumento(){
  document.getElementById('m-doc').classList.remove('show');
  dEditToken = '';
  dFileObj = null;
  dFileDataUrl = '';
  dFileMeta = null;
  toggleSalvarDocumento(false);
}

function handleBackdropDocumento(event){
  if(event.target === document.getElementById('m-doc')) fecharModalDocumento();
}

function renderResumoArquivoDocumento(){
  const badge = document.getElementById('md-file-badge');
  const drop = document.getElementById('md-file-drop');
  const summary = document.getElementById('md-file-summary');
  if(!badge || !drop || !summary) return;

  if(dFileMeta){
    badge.textContent = dFileMeta.name;
    summary.textContent = `${zUiText('Arquivo pronto')}: ${dFileMeta.name} | ${fmtTamanho(dFileMeta.size || 0)}`;
    drop.classList.add('has-file');
  }else{
    badge.textContent = zUiText('Nenhum PDF selecionado');
    summary.textContent = zUiText('Selecione um PDF de ate 5 MB.');
    drop.classList.remove('has-file');
  }
}

function toggleSalvarDocumento(loading){
  const btn = document.getElementById('md-save-btn');
  if(!btn) return;
  btn.disabled = !!loading;
  btn.textContent = loading ? zUiText('Salvando...') : zUiText('Salvar documento');
  btn.style.opacity = loading ? '0.8' : '1';
  btn.style.cursor = loading ? 'wait' : 'pointer';
}

function lerArquivoComoDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('file-read-error'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl, mimeFallback='application/pdf'){
  if(!dataUrl || typeof dataUrl !== 'string') return null;
  const partes = dataUrl.split(',');
  if(partes.length < 2) return null;
  const meta = partes[0] || '';
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : mimeFallback;
  const bin = atob(partes[1]);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToNamedFile(blob, fileName='documento.pdf', mimeFallback='application/pdf'){
  if(!blob) return null;
  try{
    return new File([blob], fileName, { type: blob.type || mimeFallback });
  }catch(e){
    blob.name = fileName;
    return blob;
  }
}

async function obterBlobDocumento(doc){
  if(!doc) return null;
  return await dbBaixarDocumentoArquivo(doc);
}

function liberarBlobViewerDocumento(){
  if(dViewBlobUrl){
    URL.revokeObjectURL(dViewBlobUrl);
    dViewBlobUrl = '';
  }
}

async function onDocumentoFileChange(event){
  const input = event && event.target;
  const file = input && input.files && input.files[0];
  if(!file) return;

  const isPdf = /pdf/i.test(file.type || '') || /\.pdf$/i.test(file.name || '');
  if(!isPdf){
    if(input) input.value = '';
    showToast(zUiText('⚠️'), zUiText('Selecione apenas arquivos em PDF.'));
    return;
  }

  if(file.size > DOCUMENTO_MAX_SIZE){
    if(input) input.value = '';
    showToast(zUiText('⚠️'), zUiText('O PDF ultrapassa o limite de 5 MB para este modulo.'));
    return;
  }

  try{
    dFileObj = file;
    dFileDataUrl = await lerArquivoComoDataUrl(file);
    dFileMeta = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf'
    };
    renderResumoArquivoDocumento();
    showToast(zUiText('✅'), zUiText('PDF carregado com sucesso.'));
  }catch(e){
    console.error('Erro ao ler PDF:', e);
    dFileObj = null;
    dFileDataUrl = '';
    dFileMeta = null;
    renderResumoArquivoDocumento();
    showToast(zUiText('❌'), zUiText('Nao foi possivel carregar o PDF selecionado.'));
  }
}

async function salvarDocumento(){
  if(!podeGerirDocumentos()){
    showToast(zUiText('⚠️'), zUiText('Seu perfil nao tem permissao para gerenciar documentos.'));
    return;
  }

  const titulo = document.getElementById('md-titulo').value.trim();
  const categoria = document.getElementById('md-categoria').value.trim() || 'Geral';
  const descricao = document.getElementById('md-descricao').value.trim();
  const atual = dEditToken ? getDocumentoPorToken(dEditToken) : null;
  const arquivoAtual = atual ? {
    dataUrl: atual.dataUrl || '',
    arquivoNome: atual.arquivoNome || '',
    mime: atual.mime || 'application/pdf',
    size: parseInt(atual.size, 10) || 0,
    storageBucket: atual.storageBucket || '',
    storagePath: atual.storagePath || ''
  } : null;
  const precisaArquivo = !!dFileDataUrl || !!(arquivoAtual && (arquivoAtual.dataUrl || arquivoAtual.storagePath));
  const fileFoiAlterado = !!dFileObj;
  const precisaMigrarStorage = !fileFoiAlterado && !!(atual && !atual.storagePath && atual.dataUrl);

  if(!titulo){
    showToast(zUiText('⚠️'), zUiText('Informe o titulo do documento.'));
    document.getElementById('md-titulo').focus();
    return;
  }

  if(!categoria){
    showToast(zUiText('⚠️'), zUiText('Informe a categoria do documento.'));
    document.getElementById('md-categoria').focus();
    return;
  }

  if(!precisaArquivo){
    showToast(zUiText('⚠️'), zUiText('Selecione um arquivo PDF antes de salvar.'));
    return;
  }

  toggleSalvarDocumento(true);

  const destino = atual || {};
  const eraNovo = !atual;
  const dataUrlFallback = dFileDataUrl || (arquivoAtual ? arquivoAtual.dataUrl : '');
  let uploadRealizado = false;
  let storageNovo = null;
  let storageAntigoParaExcluir = null;
  let arquivoUpload = null;

  if(eraNovo) DOCUMENTOS.push(destino);

  Object.assign(destino, {
    titulo,
    categoria,
    descricao,
    arquivoNome: dFileMeta ? dFileMeta.name : (arquivoAtual ? arquivoAtual.arquivoNome : `${titulo}.pdf`),
    mime: dFileMeta ? dFileMeta.type : (arquivoAtual ? arquivoAtual.mime : 'application/pdf'),
    size: dFileMeta ? dFileMeta.size : (arquivoAtual ? arquivoAtual.size : 0),
    dataUrl: dataUrlFallback,
    storageBucket: arquivoAtual ? arquivoAtual.storageBucket : '',
    storagePath: arquivoAtual ? arquivoAtual.storagePath : '',
    criadoPor: atual && atual.criadoPor ? atual.criadoPor : (usuarioLogado && usuarioLogado.nome ? usuarioLogado.nome : 'Sistema'),
    atualizadoEm: new Date().toISOString(),
    publicado: true
  });

  if(fileFoiAlterado){
    arquivoUpload = dFileObj;
  }else if(precisaMigrarStorage){
    const blobLegacy = dataUrlToBlob(atual.dataUrl, atual.mime || 'application/pdf');
    arquivoUpload = blobToNamedFile(blobLegacy, atual.arquivoNome || `${titulo}.pdf`, atual.mime || 'application/pdf');
  }

  if(arquivoUpload){
    try{
      storageNovo = await dbUploadDocumentoArquivo(arquivoUpload);
      uploadRealizado = true;
      if(destino.storageBucket && destino.storagePath && (destino.storageBucket !== storageNovo.bucket || destino.storagePath !== storageNovo.path)){
        storageAntigoParaExcluir = {
          storageBucket: destino.storageBucket,
          storagePath: destino.storagePath
        };
      }
      destino.storageBucket = storageNovo.bucket;
      destino.storagePath = storageNovo.path;
      destino.dataUrl = '';
    }catch(e){
      console.warn('Falha ao enviar PDF para o Supabase Storage:', e);
      destino.storageBucket = '';
      destino.storagePath = '';
      DOCUMENTOS.sort(documentoSorter);
      dSelectedToken = documentoToken(destino);
      persistirDocumentosUI();
      toggleSalvarDocumento(false);
      fecharModalDocumento();
      renderDocumentos();
      showToast(zUiText('⚠️'), zUiText('Nao foi possivel enviar o PDF para o Supabase Storage. O documento ficou salvo apenas localmente neste navegador.'));
      return;
    }
  }

  DOCUMENTOS.sort(documentoSorter);
  dSelectedToken = documentoToken(destino);
  persistirDocumentosUI();

  let toastIcon = zUiText('✅');
  let toastMsg = zUiText(eraNovo ? 'Documento cadastrado com sucesso.' : 'Documento atualizado com sucesso.');

  try{
    await dbSalvarDocumento(destino, atual && atual.id ? atual.id : null);
    if(destino.storagePath) destino.dataUrl = '';
    dSelectedToken = documentoToken(destino);
    persistirDocumentosUI();
    if(storageAntigoParaExcluir){
      dbExcluirDocumentoArquivo(storageAntigoParaExcluir).catch(err=>console.warn('Falha ao excluir PDF antigo do Storage:', err));
    }
  }catch(e){
    console.warn('Falha ao sincronizar documento com Supabase:', e);
    if(uploadRealizado && storageNovo){
      dbExcluirDocumentoArquivo(storageNovo.bucket, storageNovo.path).catch(err=>console.warn('Falha ao limpar upload orfao do Storage:', err));
      destino.storageBucket = arquivoAtual ? arquivoAtual.storageBucket : '';
      destino.storagePath = arquivoAtual ? arquivoAtual.storagePath : '';
      destino.dataUrl = dataUrlFallback;
    }
    toastIcon = zUiText('⚠️');
    toastMsg = zUiText(eraNovo
      ? 'Documento salvo localmente. Se quiser compartilhar com todos os usuarios, confirme a tabela documentos e o bucket no Supabase.'
      : 'Documento atualizado localmente. A sincronizacao com o banco nao foi concluida.');
    persistirDocumentosUI();
  }

  toggleSalvarDocumento(false);
  fecharModalDocumento();
  renderDocumentos();
  showToast(toastIcon, toastMsg);
}

async function excluirDocumento(token){
  if(!podeGerirDocumentos()){
    showToast(zUiText('⚠️'), zUiText('Seu perfil nao tem permissao para excluir documentos.'));
    return;
  }

  const doc = getDocumentoPorToken(token);
  if(!doc) return;
  if(!confirm(zUiText(`Excluir o documento "${doc.titulo}"?`))) return;

  const idx = DOCUMENTOS.indexOf(doc);
  if(idx < 0) return;

  DOCUMENTOS.splice(idx, 1);
  if(dSelectedToken === token) dSelectedToken = '';
  persistirDocumentosUI();
  renderDocumentos();

  try{
    await dbExcluirDocumento(doc);
    if(doc.storageBucket && doc.storagePath){
      dbExcluirDocumentoArquivo(doc).catch(err=>console.warn('Falha ao excluir PDF do Storage:', err));
    }
    showToast(zUiText('✅'), zUiText('Documento excluido com sucesso.'));
  }catch(e){
    console.warn('Falha ao excluir documento do Supabase:', e);
    showToast(zUiText('⚠️'), zUiText('Documento removido localmente, mas nao foi possivel excluir do banco.'));
  }
}

async function visualizarDocumento(token){
  const doc = getDocumentoPorToken(token);
  if(!doc){
    showToast(zUiText('⚠️'), zUiText('Nao foi possivel localizar o PDF deste documento.'));
    return;
  }

  const frame = document.getElementById('doc-view-frame');
  const modal = document.getElementById('m-doc-view');
  const subtitulo = `${doc.categoria || 'Geral'} | ${fmtTamanho(doc.size || 0)} | ${zUiText('Atualizado em')} ${fmtDocumentoData(doc.atualizadoEm)}`;

  dViewToken = token;
  document.getElementById('doc-view-title').textContent = zUiText(doc.titulo || 'Documento');
  document.getElementById('doc-view-sub').textContent = subtitulo;
  if(frame) frame.src = 'about:blank';
  if(modal) modal.classList.add('show');

  try{
    const blob = await obterBlobDocumento(doc);
    if(!blob) throw new Error('pdf-blob-empty');
    liberarBlobViewerDocumento();
    dViewBlobUrl = URL.createObjectURL(blob);
    if(frame) frame.src = `${dViewBlobUrl}#toolbar=1&navpanes=0&scrollbar=1`;
  }catch(e){
    console.warn('Falha ao preparar preview do PDF:', e);
    if(frame) frame.src = 'about:blank';
    showToast(zUiText('⚠️'), zUiText('Nao foi possivel abrir este PDF para visualizacao.'));
  }
}

function fecharViewerDocumento(){
  document.getElementById('m-doc-view').classList.remove('show');
  document.getElementById('doc-view-frame').src = 'about:blank';
  liberarBlobViewerDocumento();
  dViewToken = '';
}

function handleBackdropViewerDocumento(event){
  if(event.target === document.getElementById('m-doc-view')) fecharViewerDocumento();
}

async function baixarDocumento(token){
  const doc = getDocumentoPorToken(token);
  if(!doc){
    showToast(zUiText('⚠️'), zUiText('Nao foi possivel localizar o PDF para download.'));
    return;
  }

  try{
    const blob = await obterBlobDocumento(doc);
    if(!blob) throw new Error('pdf-download-empty');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.arquivoNome || `${doc.titulo || 'documento'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }catch(e){
    console.warn('Falha ao baixar documento:', e);
    showToast(zUiText('⚠️'), zUiText('Nao foi possivel baixar este PDF agora.'));
  }
}

async function baixarDocumentoAtual(){
  if(dViewToken) await baixarDocumento(dViewToken);
}

zRegisterModule('documentos', {
  renderDocumentos,
  abrirModalDocumento,
  fecharModalDocumento,
  salvarDocumento,
  excluirDocumento,
  visualizarDocumento,
  baixarDocumento
});
