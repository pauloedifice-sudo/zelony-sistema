// ENVIOS
// Monitor de notificacoes WhatsApp disparadas pela integracao Z-API

let enviosBusca = '';
let enviosStatus = 'todos';
let enviosPapel = 'todos';
let enviosSelecionadoId = '';
let enviosLista = [];
let enviosEventos = [];
let enviosCarregando = false;
let enviosErro = '';
let enviosUltimaAtualizacao = '';
let enviosTimer = null;
let enviosCargaPromise = null;

const ENVIOS_LIMIT = 180;
const ENVIOS_CACHE_KEY = 'zel_envios_zapi_cache';
const ENVIOS_EVENTOS_CACHE_KEY = 'zel_envios_zapi_eventos_cache';
const ENVIOS_SYNC_CACHE_KEY = 'zel_envios_zapi_sync';
const ENVIOS_ROLES_ACESSO = ['dono', 'dir', 'fin', 'rh', 'ger'];
const ENVIOS_STATUS_META = {
  pendente: { label: 'Pendente', color: '#8A6A25', bg: '#FFF7E3', bd: '#E8D39B' },
  sem_telefone: { label: 'Sem telefone', color: '#B15B1F', bg: '#FFF1E7', bd: '#EAB89A' },
  usuario_inativo: { label: 'Usuario inativo', color: '#A25A3C', bg: '#FFF0EB', bd: '#E5B2A2' },
  ignorado: { label: 'Ignorado', color: '#6E6E6E', bg: '#F4F4F4', bd: '#D9D9D9' },
  enfileirada: { label: 'Enfileirada', color: '#1E5BB8', bg: '#EDF4FF', bd: '#A7C4F1' },
  enviada: { label: 'Enviada', color: '#2D7A59', bg: '#ECF8F1', bd: '#A8DCBE' },
  recebida: { label: 'Recebida', color: '#1D7D8F', bg: '#EAF8FB', bd: '#A4D9E3' },
  lida: { label: 'Lida', color: '#4F46E5', bg: '#EEF1FF', bd: '#C3BFF8' },
  falha: { label: 'Falha', color: '#B94E2C', bg: '#FFF2EE', bd: '#E8B1A1' }
};
const ENVIOS_PAPEL_META = {
  corretor: { label: 'Corretor', color: '#1A56C4', bg: '#EEF4FE', bd: '#A6C2F0' },
  capitao: { label: 'Capitao', color: '#7A5A24', bg: '#FBF6EA', bd: '#DEC896' },
  gerente: { label: 'Gerente', color: '#2E7E5E', bg: '#EDF8F1', bd: '#A9DDBE' },
  diretor: { label: 'Diretor', color: '#8C5A17', bg: '#FFF7E5', bd: '#E5D09A' },
  diretor2: { label: 'Diretor 2', color: '#7A4BA8', bg: '#F4EEFF', bd: '#D6C1F0' }
};

function enviosSyncState() {
  zSetState('state.ui.enviosBusca', enviosBusca);
  zSetState('state.ui.enviosStatus', enviosStatus);
  zSetState('state.ui.enviosPapel', enviosPapel);
  zSetState('state.ui.enviosSelecionadoId', enviosSelecionadoId);
  zSetState('state.ui.enviosCarregando', enviosCarregando);
  zSetState('state.ui.enviosErro', enviosErro);
  zSetState('state.ui.enviosUltimaAtualizacao', enviosUltimaAtualizacao);
  zSetState('state.data.enviosZapi', enviosLista);
  zSetState('state.data.enviosZapiEventos', enviosEventos);
}

function enviosPodeAcessar() {
  return ENVIOS_ROLES_ACESSO.includes(role);
}

function enviosNorm(valor) {
  if (typeof normalizarTextoBusca === 'function') return normalizarTextoBusca(valor);
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function enviosEsc(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function enviosAttr(valor) {
  return enviosEsc(valor);
}

function enviosTexto(valor, fallback = '') {
  const bruto = String(valor || '').trim();
  if (!bruto) return fallback;
  return typeof zUiText === 'function' ? zUiText(bruto) : bruto;
}

function enviosFmtData(valor, comHora = true) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return enviosTexto(valor, '—');
  return typeof formatarDataLocal === 'function'
    ? formatarDataLocal(data, { comHora, comAno: true })
    : data.toLocaleString('pt-BR');
}

function enviosFmtHoraCurta(valor) {
  if (!valor) return enviosTexto('Aguardando atualização');
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return enviosTexto('Aguardando atualização');
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function enviosStatusInfo(status) {
  const chave = String(status || '').trim().toLowerCase();
  return ENVIOS_STATUS_META[chave] || {
    label: enviosTexto(chave || 'Desconhecido', 'Desconhecido'),
    color: '#6E6E6E',
    bg: '#F4F4F4',
    bd: '#D9D9D9'
  };
}

function enviosPapelInfo(papel) {
  const chave = String(papel || '').trim().toLowerCase();
  return ENVIOS_PAPEL_META[chave] || {
    label: enviosTexto(chave || 'Responsavel', 'Responsavel'),
    color: '#6E6E6E',
    bg: '#F4F4F4',
    bd: '#D9D9D9'
  };
}

function enviosStatusChip(status) {
  const meta = enviosStatusInfo(status);
  return `<span class="envios-chip" style="color:${meta.color};background:${meta.bg};border-color:${meta.bd};">${enviosEsc(zUiText(meta.label))}</span>`;
}

function enviosPapelChip(papel) {
  const meta = enviosPapelInfo(papel);
  return `<span class="envios-chip" style="color:${meta.color};background:${meta.bg};border-color:${meta.bd};">${enviosEsc(zUiText(meta.label))}</span>`;
}

function enviosResumoMensagem(texto) {
  const bruto = enviosTexto(texto, '');
  if (!bruto) return zUiText('Sem mensagem registrada.');
  return bruto.length > 150 ? `${bruto.slice(0, 147)}...` : bruto;
}

function enviosTelefoneExibicao(item) {
  return enviosTexto(item && (item.telefone_e164 || item.telefone_bruto), 'Sem telefone');
}

function enviosIdToken(item) {
  if (!item || item.id == null) return '';
  return String(item.id);
}

function enviosSort(a, b) {
  const dataA = Date.parse(a && (a.criado_em || a.atualizado_em) || '') || 0;
  const dataB = Date.parse(b && (b.criado_em || b.atualizado_em) || '') || 0;
  if (dataA !== dataB) return dataB - dataA;
  return (parseInt(b && b.id, 10) || 0) - (parseInt(a && a.id, 10) || 0);
}

function enviosSalvarCache() {
  try {
    localStorage.setItem(ENVIOS_CACHE_KEY, JSON.stringify(enviosLista));
    localStorage.setItem(ENVIOS_EVENTOS_CACHE_KEY, JSON.stringify(enviosEventos));
    localStorage.setItem(ENVIOS_SYNC_CACHE_KEY, JSON.stringify({ ultimaAtualizacao: enviosUltimaAtualizacao }));
  } catch (e) {
    console.warn('Falha ao salvar cache de envios:', e.message || e);
  }
}

function enviosCarregarCache() {
  try {
    const lista = JSON.parse(localStorage.getItem(ENVIOS_CACHE_KEY) || '[]');
    const eventos = JSON.parse(localStorage.getItem(ENVIOS_EVENTOS_CACHE_KEY) || '[]');
    const sync = JSON.parse(localStorage.getItem(ENVIOS_SYNC_CACHE_KEY) || '{}');
    enviosLista = Array.isArray(lista) ? lista.slice().sort(enviosSort) : [];
    enviosEventos = Array.isArray(eventos) ? eventos.slice().sort(enviosSort) : [];
    enviosUltimaAtualizacao = String(sync && sync.ultimaAtualizacao || '').trim();
  } catch (e) {
    enviosLista = [];
    enviosEventos = [];
    enviosUltimaAtualizacao = '';
  }
}

function enviosClient() {
  if (typeof sbLong !== 'undefined' && sbLong) return sbLong;
  if (typeof sb !== 'undefined' && sb) return sb;
  if (window.ZelonyApp && ZelonyApp.modules && ZelonyApp.modules.supabase && ZelonyApp.modules.supabase.client) {
    return ZelonyApp.modules.supabase.client;
  }
  return null;
}

function enviosModuloVisivel() {
  const el = document.getElementById('mod-envios');
  return !!(el && !el.classList.contains('hidden'));
}

function enviosIniciarAutoRefresh() {
  if (enviosTimer) return;
  enviosTimer = setInterval(() => {
    if (enviosModuloVisivel()) void enviosCarregar({ silencioso: true, force: true });
  }, 60000);
}

function enviosPrecisaAtualizar() {
  if (!enviosUltimaAtualizacao) return true;
  const diff = Date.now() - (Date.parse(enviosUltimaAtualizacao) || 0);
  return diff > 60000;
}

async function enviosCarregar(opcoes = {}) {
  if (enviosCargaPromise) return enviosCargaPromise;
  const client = enviosClient();
  if (!client) {
    enviosErro = 'Cliente do Supabase indisponivel para carregar os envios.';
    enviosSyncState();
    return { ok: false };
  }

  enviosCarregando = true;
  enviosErro = '';
  enviosSyncState();
  if (enviosModuloVisivel()) renderEnvios();

  enviosCargaPromise = (async () => {
    try {
      const [notificacoesResp, eventosResp] = await Promise.all([
        client
          .from('venda_notificacoes_zapi')
          .select('id,venda_id,venda_ref_local,etapa_anterior,etapa_anterior_nome,etapa_nova,etapa_nova_nome,responsavel_avanco,destinatario_usuario_id,destinatario_nome,destinatario_perfil,destinatario_papel,destinatario_papeis,telefone_bruto,telefone_e164,mensagem,canal,status,tentativas,dedupe_key,zapi_instance_id,zapi_zaap_id,zapi_message_id,erro,enviado_em,recebido_em,lido_em,criado_em,atualizado_em')
          .order('criado_em', { ascending: false })
          .range(0, ENVIOS_LIMIT - 1),
        client
          .from('venda_notificacoes_zapi_eventos')
          .select('id,tipo,instance_id,phone,message_id,criado_em')
          .order('criado_em', { ascending: false })
          .range(0, 24)
      ]);

      if (notificacoesResp.error) throw notificacoesResp.error;
      if (eventosResp.error) throw eventosResp.error;

      enviosLista = Array.isArray(notificacoesResp.data) ? notificacoesResp.data.slice().sort(enviosSort) : [];
      enviosEventos = Array.isArray(eventosResp.data) ? eventosResp.data.slice().sort(enviosSort) : [];
      enviosUltimaAtualizacao = new Date().toISOString();
      enviosErro = '';
      enviosSalvarCache();
      enviosGarantirSelecionado();
      if (!opcoes.silencioso && typeof showToast === 'function') {
        showToast('📣', zUiText('Monitor de envios atualizado com sucesso.'));
      }
      return { ok: true, total: enviosLista.length };
    } catch (e) {
      enviosErro = String(
        (e && (e.message || e.details || e.hint || e.error_description || e.code)) || e || 'Falha ao carregar os envios.'
      ).trim() || 'Falha ao carregar os envios.';
      if (!opcoes.silencioso && typeof showToast === 'function') {
        showToast('⚠️', zUiText('Nao foi possivel atualizar o monitor de envios agora.'));
      }
      console.warn('Falha ao carregar monitor de envios:', e);
      return { ok: false, error: enviosErro };
    } finally {
      enviosCarregando = false;
      enviosCargaPromise = null;
      enviosSyncState();
      if (enviosModuloVisivel()) renderEnvios();
    }
  })();

  return enviosCargaPromise;
}

function enviosSetBusca(valor) {
  enviosBusca = String(valor || '');
  enviosSyncState();
  renderEnvios();
}

function enviosSetStatus(valor) {
  enviosStatus = valor || 'todos';
  enviosSyncState();
  renderEnvios();
}

function enviosSetPapel(valor) {
  enviosPapel = valor || 'todos';
  enviosSyncState();
  renderEnvios();
}

function enviosLimparFiltros() {
  enviosBusca = '';
  enviosStatus = 'todos';
  enviosPapel = 'todos';
  enviosSyncState();
  renderEnvios();
}

function enviosListaFiltrada() {
  const busca = enviosNorm(enviosBusca);
  return enviosLista.filter(item => {
    const status = String(item && item.status || '').trim().toLowerCase();
    const papel = String(item && item.destinatario_papel || '').trim().toLowerCase();
    if (enviosStatus !== 'todos' && status !== enviosStatus) return false;
    if (enviosPapel !== 'todos' && papel !== enviosPapel) return false;
    if (!busca) return true;
    const venda = enviosBuscarVenda(item);
    const alvo = [
      item && item.destinatario_nome,
      item && item.destinatario_perfil,
      item && item.destinatario_papel,
      item && item.telefone_bruto,
      item && item.telefone_e164,
      item && item.mensagem,
      item && item.erro,
      item && item.etapa_nova_nome,
      item && item.etapa_anterior_nome,
      item && item.venda_id,
      item && item.venda_ref_local,
      venda && venda.cliente,
      venda && venda.produto,
      venda && venda.construtora,
      venda && venda.corretor
    ].map(enviosNorm).join(' ');
    return alvo.includes(busca);
  });
}

function enviosGarantirSelecionado(listaAtual) {
  const lista = Array.isArray(listaAtual) ? listaAtual : enviosListaFiltrada();
  if (!lista.length) {
    enviosSelecionadoId = '';
    enviosSyncState();
    return null;
  }
  const selecionado = lista.find(item => enviosIdToken(item) === String(enviosSelecionadoId || ''));
  if (selecionado) return selecionado;
  enviosSelecionadoId = enviosIdToken(lista[0]);
  enviosSyncState();
  return lista[0];
}

function enviosSelecionar(id) {
  enviosSelecionadoId = String(id || '');
  enviosSyncState();
  renderEnvios();
}

function enviosBuscarVenda(item) {
  if (!item || !Array.isArray(VENDAS)) return null;
  return VENDAS.find(venda => String(venda && venda.id) === String(item.venda_id || '')) || null;
}

function enviosClienteVenda(item) {
  const venda = enviosBuscarVenda(item);
  if (!venda) return '';
  if (typeof clienteVendaTexto === 'function') return clienteVendaTexto(venda.cliente) || '';
  return String(venda.cliente || '').trim();
}

function enviosTituloVenda(item) {
  const cliente = enviosClienteVenda(item);
  if (cliente) return cliente;
  if (item && item.venda_id != null) return `Venda #${item.venda_id}`;
  return zUiText('Venda sem referencia');
}

function enviosResumoVenda(item) {
  const venda = enviosBuscarVenda(item);
  if (!venda) {
    return item && item.venda_ref_local
      ? `Ref. ${enviosTexto(item.venda_ref_local)}`
      : zUiText('Sem detalhes locais da venda.');
  }
  const partes = [venda.produto, venda.construtora, venda.unidade].filter(Boolean).map(enviosTexto);
  return partes.join(' · ') || zUiText('Venda carregada sem detalhes adicionais.');
}

function enviosAbrirVenda(vendaId) {
  if (!vendaId || typeof setMod !== 'function') return;
  const btn = document.getElementById('sb-vendas') || document.querySelector(".sb-item[onclick*=\"setMod('vendas'\"]");
  setMod('vendas', btn || undefined);
  setTimeout(() => {
    if (typeof showVDetail === 'function') showVDetail(vendaId);
  }, 30);
}

function enviosEventosRelacionados(item) {
  const ids = [item && item.zapi_message_id, item && item.zapi_zaap_id]
    .map(valor => String(valor || '').trim())
    .filter(Boolean);
  if (!ids.length) return [];
  return enviosEventos.filter(evento => ids.includes(String(evento && evento.message_id || '').trim())).slice(0, 8);
}

function enviosResumoStats() {
  const total = enviosLista.length;
  const comRetorno = enviosLista.filter(item => ['enviada', 'recebida', 'lida'].includes(String(item.status || '').toLowerCase())).length;
  const alertas = enviosLista.filter(item => ['falha', 'sem_telefone', 'usuario_inativo'].includes(String(item.status || '').toLowerCase())).length;
  const aguardando = enviosLista.filter(item => ['pendente', 'enfileirada'].includes(String(item.status || '').toLowerCase())).length;
  return { total, comRetorno, alertas, aguardando };
}

function enviosStatusOptions() {
  const usados = new Set(enviosLista.map(item => String(item && item.status || '').trim().toLowerCase()).filter(Boolean));
  const base = ['todos', ...Object.keys(ENVIOS_STATUS_META).filter(chave => usados.has(chave) || chave === enviosStatus)];
  return Array.from(new Set(base));
}

function enviosPapelOptions() {
  const usados = new Set(enviosLista.map(item => String(item && item.destinatario_papel || '').trim().toLowerCase()).filter(Boolean));
  const base = ['todos', ...Object.keys(ENVIOS_PAPEL_META).filter(chave => usados.has(chave) || chave === enviosPapel)];
  return Array.from(new Set(base));
}

function enviosRenderCard(item, ativo) {
  const vendaTitulo = enviosTituloVenda(item);
  const vendaResumo = enviosResumoVenda(item);
  const etapaNova = enviosTexto(item && item.etapa_nova_nome, `Etapa ${item && item.etapa_nova != null ? item.etapa_nova : '—'}`);
  const etapaAnterior = enviosTexto(item && item.etapa_anterior_nome, '');
  const etapaTexto = etapaAnterior ? `${etapaAnterior} → ${etapaNova}` : etapaNova;
  const telefone = enviosTelefoneExibicao(item);
  const status = enviosStatusChip(item && item.status);
  const papel = enviosPapelChip(item && item.destinatario_papel);

  return `
    <button type="button" class="envios-card ${ativo ? 'active' : ''}" onclick="enviosSelecionar('${enviosAttr(enviosIdToken(item))}')">
      <div class="envios-card-top">
        <div class="envios-card-main">
          <div class="envios-card-kicker">${enviosEsc(vendaTitulo)}</div>
          <div class="envios-card-dest">${enviosEsc(enviosTexto(item && item.destinatario_nome, 'Destinatario sem nome'))}</div>
          <div class="envios-card-sub">${enviosEsc(vendaResumo)}</div>
        </div>
        <div class="envios-card-tags">
          ${status}
          ${papel}
        </div>
      </div>
      <div class="envios-card-line">
        <span>${enviosEsc(etapaTexto)}</span>
        <strong>${enviosEsc(telefone)}</strong>
      </div>
      <div class="envios-card-msg">${enviosEsc(enviosResumoMensagem(item && item.mensagem))}</div>
      <div class="envios-card-foot">
        <span>${enviosEsc(enviosFmtData(item && item.criado_em))}</span>
        <span>${enviosEsc(item && item.venda_id != null ? `Venda #${item.venda_id}` : 'Sem venda')}</span>
      </div>
    </button>
  `;
}

function enviosRenderEventos(item) {
  const relacionados = enviosEventosRelacionados(item);
  const lista = relacionados.length ? relacionados : enviosEventos.slice(0, 6);
  const titulo = relacionados.length ? 'Webhooks relacionados' : 'Ultimos webhooks do sistema';
  if (!lista.length) {
    return `
      <div class="envios-detail-block">
        <div class="envios-detail-title">${zUiText(titulo)}</div>
        <div class="envios-empty-mini">${zUiText('Nenhum webhook recente registrado ainda.')}</div>
      </div>
    `;
  }
  return `
    <div class="envios-detail-block">
      <div class="envios-detail-title">${zUiText(titulo)}</div>
      <div class="envios-event-list">
        ${lista.map(evento => `
          <div class="envios-event-item">
            <div>
              <strong>${enviosEsc(enviosTexto(evento && evento.tipo, 'evento'))}</strong>
              <span>${enviosEsc(enviosTexto(evento && evento.message_id, 'sem messageId'))}</span>
            </div>
            <div>${enviosEsc(enviosFmtData(evento && evento.criado_em))}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function enviosRenderDetalhe(item) {
  if (!item) {
    return `
      <div class="envios-detail-empty">
        <div class="envios-empty-icon">📤</div>
        <div class="envios-empty-title">${zUiText('Selecione um envio')}</div>
        <div class="envios-empty-copy">${zUiText('Escolha um registro da lista para ver a mensagem enviada, os status e os identificadores da Z-API.')}</div>
      </div>
    `;
  }

  const venda = enviosBuscarVenda(item);
  const etapaAnterior = enviosTexto(item.etapa_anterior_nome, item.etapa_anterior != null ? `Etapa ${item.etapa_anterior}` : '');
  const etapaNova = enviosTexto(item.etapa_nova_nome, item.etapa_nova != null ? `Etapa ${item.etapa_nova}` : 'Etapa');
  const mensagem = enviosTexto(item.mensagem, 'Sem mensagem registrada.');
  const erro = enviosTexto(item.erro, '');
  const telefone = enviosTelefoneExibicao(item);
  const perfis = Array.isArray(item.destinatario_papeis) ? item.destinatario_papeis : [];
  const perfisTexto = perfis.length ? perfis.map(enviosTexto).join(', ') : enviosTexto(item.destinatario_papel, 'Responsavel');
  const responsavel = enviosTexto(item.responsavel_avanco, 'Sistema');
  const phoneCopy = encodeURIComponent(telefone);
  const messageIdCopy = encodeURIComponent(String(item.zapi_message_id || ''));
  const zaapIdCopy = encodeURIComponent(String(item.zapi_zaap_id || ''));

  return `
    <div class="envios-detail-panel">
      <div class="envios-detail-hero">
        <div>
          <div class="envios-detail-kicker">${enviosEsc(enviosTituloVenda(item))}</div>
          <h3>${enviosEsc(enviosTexto(item.destinatario_nome, 'Destinatario sem nome'))}</h3>
          <p>${enviosEsc(enviosResumoVenda(item))}</p>
        </div>
        <div class="envios-detail-tags">
          ${enviosStatusChip(item.status)}
          ${enviosPapelChip(item.destinatario_papel)}
        </div>
      </div>

      <div class="envios-detail-actions">
        ${item.venda_id != null ? `<button class="btn-s" type="button" onclick="enviosAbrirVenda(${parseInt(item.venda_id, 10) || 0})">${zUiText('Abrir venda')}</button>` : ''}
        <button class="btn-c" type="button" onclick="enviosCarregar({ force:true })">${zUiText('Atualizar agora')}</button>
        ${telefone && telefone !== 'Sem telefone' ? `<button class="btn-c" type="button" onclick="copiarTexto(decodeURIComponent('${phoneCopy}'),'Telefone')">${zUiText('Copiar telefone')}</button>` : ''}
      </div>

      <div class="envios-detail-grid">
        <div class="envios-detail-block">
          <div class="envios-detail-title">${zUiText('Resumo do envio')}</div>
          <div class="envios-meta-list">
            <div><span>${zUiText('Fluxo')}</span><strong>${enviosEsc(etapaAnterior ? `${etapaAnterior} → ${etapaNova}` : etapaNova)}</strong></div>
            <div><span>${zUiText('Telefone')}</span><strong>${enviosEsc(telefone)}</strong></div>
            <div><span>${zUiText('Papeis')}</span><strong>${enviosEsc(perfisTexto)}</strong></div>
            <div><span>${zUiText('Responsavel pelo avanco')}</span><strong>${enviosEsc(responsavel)}</strong></div>
            ${venda ? `<div><span>${zUiText('Corretor da venda')}</span><strong>${enviosEsc(enviosTexto(venda.corretor, '—'))}</strong></div>` : ''}
            ${venda ? `<div><span>${zUiText('Gerente da venda')}</span><strong>${enviosEsc(enviosTexto(venda.gerente, '—'))}</strong></div>` : ''}
          </div>
        </div>

        <div class="envios-detail-block">
          <div class="envios-detail-title">${zUiText('Linha do tempo')}</div>
          <div class="envios-meta-list">
            <div><span>${zUiText('Criado')}</span><strong>${enviosEsc(enviosFmtData(item.criado_em))}</strong></div>
            <div><span>${zUiText('Enviado')}</span><strong>${enviosEsc(enviosFmtData(item.enviado_em))}</strong></div>
            <div><span>${zUiText('Recebido')}</span><strong>${enviosEsc(enviosFmtData(item.recebido_em))}</strong></div>
            <div><span>${zUiText('Lido')}</span><strong>${enviosEsc(enviosFmtData(item.lido_em))}</strong></div>
            <div><span>${zUiText('Atualizado')}</span><strong>${enviosEsc(enviosFmtData(item.atualizado_em))}</strong></div>
            <div><span>${zUiText('Tentativas')}</span><strong>${enviosEsc(String(item.tentativas || 0))}</strong></div>
          </div>
        </div>
      </div>

      <div class="envios-detail-block">
        <div class="envios-detail-title">${zUiText('Mensagem enviada')}</div>
        <div class="envios-message-box">${enviosEsc(mensagem)}</div>
      </div>

      ${erro ? `
        <div class="envios-detail-block envios-alert">
          <div class="envios-detail-title">${zUiText('Motivo do alerta')}</div>
          <div class="envios-alert-copy">${enviosEsc(erro)}</div>
        </div>
      ` : ''}

      <div class="envios-detail-block">
        <div class="envios-detail-title">${zUiText('Identificadores tecnicos')}</div>
        <div class="envios-id-grid">
          <div class="envios-id-card">
            <span>${zUiText('Registro interno')}</span>
            <strong>#${enviosEsc(String(item.id || ''))}</strong>
          </div>
          <div class="envios-id-card">
            <span>${zUiText('Venda')}</span>
            <strong>${enviosEsc(item.venda_id != null ? `#${item.venda_id}` : '—')}</strong>
          </div>
          <div class="envios-id-card">
            <span>${zUiText('Message ID')}</span>
            <strong>${enviosEsc(enviosTexto(item.zapi_message_id, '—'))}</strong>
            ${item.zapi_message_id ? `<button type="button" class="copy-chip-btn" onclick="copiarTexto(decodeURIComponent('${messageIdCopy}'),'Message ID')">${zUiText('📋')} ${zUiText('Copiar')}</button>` : ''}
          </div>
          <div class="envios-id-card">
            <span>${zUiText('Zaap ID')}</span>
            <strong>${enviosEsc(enviosTexto(item.zapi_zaap_id, '—'))}</strong>
            ${item.zapi_zaap_id ? `<button type="button" class="copy-chip-btn" onclick="copiarTexto(decodeURIComponent('${zaapIdCopy}'),'Zaap ID')">${zUiText('📋')} ${zUiText('Copiar')}</button>` : ''}
          </div>
        </div>
      </div>

      ${enviosRenderEventos(item)}
    </div>
  `;
}

function enviosRenderLocked() {
  return `
    <div class="envios-locked">
      <div class="envios-empty-icon">🔒</div>
      <div class="envios-empty-title">${zUiText('Acesso restrito')}</div>
      <div class="envios-empty-copy">${zUiText('Esse painel concentra dados operacionais da Z-API. O acesso fica liberado apenas para diretoria, financeiro, RH e gerencia.')}</div>
    </div>
  `;
}

function enviosGarantirStyles() {
  if (document.getElementById('envios-monitor-style')) return;
  const style = document.createElement('style');
  style.id = 'envios-monitor-style';
  style.textContent = `
    .envios-wrap{display:flex;flex-direction:column;gap:16px;width:100%;}
    .envios-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,0.95fr);gap:16px;padding:20px;border:1px solid var(--bd);border-radius:20px;background:
      radial-gradient(circle at top left,rgba(184,144,42,0.16),transparent 36%),
      linear-gradient(135deg,#120D03 0%,#20170B 36%,#FAF7F1 190%);}
    .envios-hero-copy{display:flex;flex-direction:column;gap:10px;color:#FFF9EE;}
    .envios-eyebrow{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#E8C975;}
    .envios-hero-copy h2{margin:0;font-family:'Playfair Display',serif;font-size:28px;font-weight:600;line-height:1.1;color:#FFF6E5;}
    .envios-hero-copy p{margin:0;font-size:13px;line-height:1.6;color:rgba(255,247,232,.8);max-width:720px;}
    .envios-hero-note{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;color:#F0E4BF;}
    .envios-live-dot{width:9px;height:9px;border-radius:50%;background:#2ECC71;box-shadow:0 0 0 6px rgba(46,204,113,.14);}
    .envios-hero-side{display:flex;flex-direction:column;gap:14px;padding:18px;border-radius:18px;background:rgba(255,249,235,.92);border:1px solid rgba(184,144,42,.18);}
    .envios-side-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
    .envios-side-title{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);}
    .envios-side-copy{font-size:13px;color:var(--ts);line-height:1.55;margin-top:5px;}
    .envios-side-status{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border-radius:999px;background:#F3F8FF;color:#1A56C4;border:1px solid #A6C2F0;font-size:11px;font-weight:700;}
    .envios-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
    .envios-kpi{padding:14px 15px;border-radius:16px;background:#fff;border:1px solid rgba(184,144,42,.14);}
    .envios-kpi strong{display:block;font-family:'Playfair Display',serif;font-size:24px;color:var(--gold);line-height:1;}
    .envios-kpi span{display:block;margin-top:5px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tm);}
    .envios-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--bd);border-radius:16px;background:linear-gradient(180deg,#FFFDF9 0%,#FFF8EE 100%);}
    .envios-search{position:relative;flex:1 1 320px;min-width:240px;}
    .envios-search input{width:100%;background:#fff;border:1px solid rgba(184,144,42,.18);border-radius:12px;padding:12px 14px 12px 40px;font-size:12px;color:var(--ts);outline:none;font-family:'Inter',sans-serif;}
    .envios-search input:focus,.envios-select:focus{border-color:var(--gold-l);}
    .envios-search span{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--gold);}
    .envios-select{background:#fff;border:1px solid rgba(184,144,42,.18);border-radius:12px;padding:11px 12px;font-size:12px;color:var(--ts);outline:none;font-family:'Inter',sans-serif;min-width:168px;}
    .envios-toolbar-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;}
    .envios-counter{font-size:11px;color:var(--tm);white-space:nowrap;}
    .envios-shell{display:grid;grid-template-columns:minmax(0,0.95fr) minmax(320px,1.05fr);gap:16px;min-height:540px;}
    .envios-list-col,.envios-detail-col{min-width:0;}
    .envios-list-panel,.envios-detail-panel,.envios-list-empty,.envios-detail-empty,.envios-locked{height:100%;border:1px solid var(--bd);border-radius:18px;background:#fff;}
    .envios-list-panel{display:flex;flex-direction:column;overflow:hidden;}
    .envios-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid var(--bd);}
    .envios-list-title{font-family:'Playfair Display',serif;font-size:19px;color:var(--ts);}
    .envios-list-sub{font-size:11px;color:var(--tm);margin-top:4px;}
    .envios-list-body{display:flex;flex-direction:column;gap:10px;padding:14px;overflow:auto;}
    .envios-card{width:100%;text-align:left;border:1px solid rgba(184,144,42,.16);border-radius:16px;background:linear-gradient(180deg,#FFFDF8 0%,#FFF8EC 100%);padding:14px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;font-family:'Inter',sans-serif;}
    .envios-card:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(184,144,42,.08);border-color:rgba(184,144,42,.28);}
    .envios-card.active{border-color:rgba(184,144,42,.45);box-shadow:0 18px 34px rgba(184,144,42,.12);}
    .envios-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
    .envios-card-main{min-width:0;flex:1;}
    .envios-card-kicker{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);}
    .envios-card-dest{font-size:15px;font-weight:700;color:var(--ts);line-height:1.25;margin-top:3px;}
    .envios-card-sub{font-size:11px;color:var(--tm);line-height:1.45;margin-top:4px;}
    .envios-card-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
    .envios-chip{display:inline-flex;align-items:center;min-height:22px;padding:0 9px;border-radius:999px;border:1px solid transparent;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}
    .envios-card-line{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;color:var(--ts);}
    .envios-card-line strong{font-size:11px;color:var(--gold);}
    .envios-card-msg{font-size:11px;color:var(--ts);line-height:1.55;padding:10px 11px;border-radius:12px;background:#fff;border:1px dashed rgba(184,144,42,.22);}
    .envios-card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:var(--tm);}
    .envios-detail-panel{display:flex;flex-direction:column;gap:16px;padding:18px;overflow:auto;}
    .envios-detail-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px;border-radius:18px;background:linear-gradient(135deg,#FFFBF1 0%,#FFF3D6 100%);border:1px solid rgba(184,144,42,.18);}
    .envios-detail-kicker{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);}
    .envios-detail-hero h3{margin:5px 0 0;font-family:'Playfair Display',serif;font-size:26px;line-height:1.1;color:var(--ts);}
    .envios-detail-hero p{margin:8px 0 0;font-size:12px;line-height:1.55;color:var(--tm);}
    .envios-detail-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:220px;}
    .envios-detail-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .envios-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
    .envios-detail-block{display:flex;flex-direction:column;gap:10px;padding:16px;border:1px solid var(--bd);border-radius:16px;background:#fff;}
    .envios-detail-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);}
    .envios-meta-list{display:flex;flex-direction:column;gap:8px;}
    .envios-meta-list div{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px dashed rgba(184,144,42,.16);}
    .envios-meta-list div:last-child{padding-bottom:0;border-bottom:0;}
    .envios-meta-list span{font-size:11px;color:var(--tm);}
    .envios-meta-list strong{font-size:11px;color:var(--ts);text-align:right;}
    .envios-message-box{padding:14px;border-radius:14px;background:#FFFDF8;border:1px dashed rgba(184,144,42,.22);font-size:12px;line-height:1.7;color:var(--ts);white-space:pre-wrap;}
    .envios-alert{background:#FFF6F2;border-color:#E7B4A5;}
    .envios-alert-copy{font-size:12px;color:#B65239;line-height:1.6;}
    .envios-id-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
    .envios-id-card{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:14px;background:#FFFEFB;border:1px solid rgba(184,144,42,.14);}
    .envios-id-card span{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tm);}
    .envios-id-card strong{font-size:12px;color:var(--ts);word-break:break-word;}
    .envios-event-list{display:flex;flex-direction:column;gap:8px;}
    .envios-event-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;background:#FFFEFB;border:1px solid rgba(184,144,42,.14);}
    .envios-event-item strong{display:block;font-size:11px;color:var(--ts);text-transform:capitalize;}
    .envios-event-item span,.envios-event-item div:last-child{font-size:10px;color:var(--tm);line-height:1.45;word-break:break-word;}
    .envios-list-empty,.envios-detail-empty,.envios-locked{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px;text-align:center;gap:10px;}
    .envios-empty-icon{font-size:32px;color:var(--gold);}
    .envios-empty-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--ts);}
    .envios-empty-copy,.envios-empty-mini{font-size:12px;line-height:1.6;color:var(--tm);max-width:520px;}
    .envios-detail-empty{min-height:100%;}
    .envios-empty-mini{padding:6px 0 2px;}
    @media (max-width:1120px){
      .envios-hero{grid-template-columns:1fr;}
      .envios-shell{grid-template-columns:1fr;}
      .envios-detail-grid,.envios-id-grid{grid-template-columns:1fr;}
    }
    @media (max-width:760px){
      .envios-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
      .envios-toolbar{padding:12px;}
      .envios-select{min-width:100%;width:100%;}
      .envios-toolbar-actions{margin-left:0;width:100%;justify-content:space-between;}
      .envios-detail-hero,.envios-card-top,.envios-card-line,.envios-list-head,.envios-side-top,.envios-event-item{flex-direction:column;align-items:flex-start;}
      .envios-card-tags,.envios-detail-tags{justify-content:flex-start;max-width:none;}
    }
    @media (max-width:560px){
      .envios-kpis{grid-template-columns:1fr;}
      .envios-hero{padding:16px;}
      .envios-hero-copy h2{font-size:24px;}
      .envios-detail-panel{padding:14px;}
    }
  `;
  document.head.appendChild(style);
}

function renderEnvios() {
  const cont = document.getElementById('envios-content');
  if (!cont) return;

  enviosGarantirStyles();
  enviosIniciarAutoRefresh();

  if (!enviosPodeAcessar()) {
    cont.innerHTML = enviosRenderLocked();
    return;
  }

  if (!enviosLista.length && !enviosCarregando && !enviosErro) {
    void enviosCarregar({ silencioso: true });
  } else if (!enviosCarregando && enviosPrecisaAtualizar()) {
    void enviosCarregar({ silencioso: true, force: true });
  }

  const lista = enviosListaFiltrada();
  const selecionado = enviosGarantirSelecionado(lista);
  const stats = enviosResumoStats();
  const statusOptions = enviosStatusOptions();
  const papelOptions = enviosPapelOptions();
  const atualizacaoTxt = enviosUltimaAtualizacao
    ? `${zUiText('Atualizado às')} ${enviosFmtHoraCurta(enviosUltimaAtualizacao)}`
    : zUiText('Aguardando primeira sincronização');
  const syncBadge = enviosCarregando
    ? zUiText('Atualizando...')
    : enviosErro
      ? zUiText('Com alerta')
      : zUiText('Sincronizado');

  cont.innerHTML = `
    <div class="envios-wrap">
      <div class="envios-hero">
        <div class="envios-hero-copy">
          <div class="envios-eyebrow">${zUiText('Monitor Z-API')}</div>
          <h2>${zUiText('Acompanhe os envios de WhatsApp sem sair do sistema')}</h2>
          <p>${zUiText('Aqui voce enxerga os ultimos disparos das vendas, quem recebeu, em que status a mensagem ficou e qualquer alerta da integracao.')}</p>
          <div class="envios-hero-note">
            <span class="envios-live-dot"></span>
            <strong>${zUiText('Ultimos registros carregados:')} ${enviosLista.length}</strong>
            <span>${enviosEsc(atualizacaoTxt)}</span>
          </div>
        </div>

        <div class="envios-hero-side">
          <div class="envios-side-top">
            <div>
              <div class="envios-side-title">${zUiText('Visao operacional')}</div>
              <div class="envios-side-copy">${zUiText('Use os filtros para localizar falhas, usuarios sem telefone ou acompanhar a leitura das mensagens por etapa.')}</div>
            </div>
            <div class="envios-side-status">${enviosEsc(syncBadge)}</div>
          </div>
          <div class="envios-kpis">
            <div class="envios-kpi"><strong>${enviosEsc(String(stats.total))}</strong><span>${zUiText('Registros carregados')}</span></div>
            <div class="envios-kpi"><strong>${enviosEsc(String(stats.comRetorno))}</strong><span>${zUiText('Com retorno')}</span></div>
            <div class="envios-kpi"><strong>${enviosEsc(String(stats.alertas))}</strong><span>${zUiText('Alertas')}</span></div>
            <div class="envios-kpi"><strong>${enviosEsc(String(stats.aguardando))}</strong><span>${zUiText('Aguardando retorno')}</span></div>
          </div>
        </div>
      </div>

      <div class="envios-toolbar">
        <div class="envios-search">
          <span>🔎</span>
          <input type="text" value="${enviosAttr(enviosBusca)}" placeholder="${enviosAttr(zUiText('Buscar por venda, destinatario, telefone ou erro...'))}" oninput="enviosSetBusca(this.value)">
        </div>
        <select class="envios-select" onchange="enviosSetStatus(this.value)">
          ${statusOptions.map(opcao => {
            const label = opcao === 'todos' ? zUiText('Todos os status') : zUiText(enviosStatusInfo(opcao).label);
            return `<option value="${enviosAttr(opcao)}" ${enviosStatus === opcao ? 'selected' : ''}>${enviosEsc(label)}</option>`;
          }).join('')}
        </select>
        <select class="envios-select" onchange="enviosSetPapel(this.value)">
          ${papelOptions.map(opcao => {
            const label = opcao === 'todos' ? zUiText('Todos os papeis') : zUiText(enviosPapelInfo(opcao).label);
            return `<option value="${enviosAttr(opcao)}" ${enviosPapel === opcao ? 'selected' : ''}>${enviosEsc(label)}</option>`;
          }).join('')}
        </select>
        <div class="envios-toolbar-actions">
          <span class="envios-counter">${enviosEsc(`${lista.length} de ${enviosLista.length} registros`)}</span>
          ${(enviosBusca || enviosStatus !== 'todos' || enviosPapel !== 'todos') ? `<button class="btn-c" type="button" onclick="enviosLimparFiltros()">${zUiText('Limpar filtros')}</button>` : ''}
          <button class="btn-s" type="button" onclick="enviosCarregar({ force:true })">${zUiText('Atualizar agora')}</button>
        </div>
      </div>

      <div class="envios-shell">
        <div class="envios-list-col">
          ${lista.length ? `
            <div class="envios-list-panel">
              <div class="envios-list-head">
                <div>
                  <div class="envios-list-title">${zUiText('Ultimos envios')}</div>
                  <div class="envios-list-sub">${zUiText(`Exibindo os ultimos ${ENVIOS_LIMIT} registros sincronizados`)}</div>
                </div>
                ${enviosErro ? `<span class="envios-chip" style="color:#B65239;background:#FFF2EE;border-color:#E8B1A1;">${enviosEsc(zUiText('Cache em uso'))}</span>` : ''}
              </div>
              <div class="envios-list-body">
                ${lista.map(item => enviosRenderCard(item, selecionado && enviosIdToken(item) === enviosIdToken(selecionado))).join('')}
              </div>
            </div>
          ` : `
            <div class="envios-list-empty">
              <div class="envios-empty-icon">📭</div>
              <div class="envios-empty-title">${zUiText('Nenhum envio encontrado')}</div>
              <div class="envios-empty-copy">${zUiText(enviosErro ? 'O monitor nao conseguiu atualizar agora. Se necessario, confira os filtros ou tente sincronizar novamente.' : (enviosLista.length ? 'Os filtros atuais nao retornaram resultados. Tente limpar os filtros.' : 'Assim que as vendas avancarem de etapa, os registros aparecerao aqui automaticamente.'))}</div>
            </div>
          `}
        </div>

        <div class="envios-detail-col">
          ${renderEnviosDetalheComErro(selecionado)}
        </div>
      </div>
    </div>
  `;
}

function renderEnviosDetalheComErro(item) {
  const detalhe = enviosRenderDetalhe(item);
  if (!enviosErro) return detalhe;
  return `
    <div style="display:flex;flex-direction:column;gap:16px;height:100%;">
      <div class="envios-detail-block envios-alert">
        <div class="envios-detail-title">${zUiText('Ultimo alerta de sincronizacao')}</div>
        <div class="envios-alert-copy">${enviosEsc(enviosErro)}</div>
      </div>
      ${detalhe}
    </div>
  `;
}

enviosCarregarCache();
enviosSyncState();

zRegisterModule('envios', {
  renderEnvios,
  enviosCarregar,
  enviosAbrirVenda
});
