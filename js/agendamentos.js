// AGENDAMENTOS
// Agenda comercial com visibilidade por perfil, calendario mensal e cadastro de visitas.

let nextAgendamentoId = 1;
let agMesRef = new Date();
agMesRef = new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0);
let agDataSelecionada = '';
let agBusca = '';
let agFiltroUnidade = '';
let agFiltroEquipe = '';
let agFiltroCorretor = '';
let agFiltroDataDe = '';
let agFiltroDataAte = '';
const AG_TIPOS_VISITA = ['Primeiro atendimento', 'Fechamento'];
const AG_SITUACOES = ['Agendado', 'Concluída', 'Reagendado', 'Cliente cancelou'];
let agTratativaFila = [];
let agTratativaAtualId = 0;
let agTratativaSelecao = '';
let agTratativaModo = '';
let agPendenciaTimer = null;
let agPendenciaEventosRegistrados = false;

zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
zSetState('state.ui.agMesRef', agMesRef);
zSetState('state.ui.agDataSelecionada', agDataSelecionada);
zSetState('state.ui.agBusca', agBusca);
zSetState('state.ui.agFiltroUnidade', agFiltroUnidade);
zSetState('state.ui.agFiltroEquipe', agFiltroEquipe);
zSetState('state.ui.agFiltroCorretor', agFiltroCorretor);
zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
zSetState('state.ui.agTratativaFila', agTratativaFila);
zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
zSetState('state.ui.agTratativaModo', agTratativaModo);

function agTexto(valor) {
  return zUiText(String(valor || '')).trim();
}

function agNormalizarTexto(valor) {
  return agTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function agAttr(valor) {
  return agTexto(valor)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function agSituacao(item) {
  const situacao = agTexto(item && item.situacao);
  return AG_SITUACOES.includes(situacao) ? situacao : 'Agendado';
}

function agSituacaoClasse(situacao) {
  const valor = agTexto(situacao || 'Agendado');
  if (valor === 'Concluída') return 'done';
  if (valor === 'Reagendado') return 'rescheduled';
  if (valor === 'Cliente cancelou') return 'cancelled';
  return 'pending';
}

function agHojeIso() {
  const hojeRef = new Date();
  return `${hojeRef.getFullYear()}-${pad2(hojeRef.getMonth() + 1)}-${pad2(hojeRef.getDate())}`;
}

function agIsoFromDate(ref) {
  return `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`;
}

function agDataValidaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '').trim());
}

function agHoraNormalizada(valor) {
  const bruto = String(valor || '').trim();
  const match = bruto.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${pad2(match[1])}:${match[2]}`;
}

function agDataHoraRef(dataIso, hora) {
  if (!agDataValidaIso(dataIso)) return null;
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const horaBase = agHoraNormalizada(hora) || '12:00';
  const [h, m] = horaBase.split(':').map(Number);
  const ref = new Date(ano, mes - 1, dia, h, m, 0, 0);
  return Number.isNaN(ref.getTime()) ? null : ref;
}

function agFormatoDataCurta(dataIso) {
  const ref = agDataHoraRef(dataIso, '12:00');
  if (!ref) return '—';
  return ref.toLocaleDateString('pt-BR');
}

function agPeriodoNormalizado() {
  let dataDe = agDataValidaIso(agFiltroDataDe) ? agFiltroDataDe : '';
  let dataAte = agDataValidaIso(agFiltroDataAte) ? agFiltroDataAte : '';
  if (dataDe && dataAte && dataDe > dataAte) {
    const tmp = dataDe;
    dataDe = dataAte;
    dataAte = tmp;
  }
  return { dataDe, dataAte };
}

function agItemDentroPeriodo(item, periodo = agPeriodoNormalizado()) {
  if (!item) return false;
  const data = agTexto(item.dataAgendamento);
  if (!data) return false;
  if (periodo.dataDe && data < periodo.dataDe) return false;
  if (periodo.dataAte && data > periodo.dataAte) return false;
  return true;
}

function agFiltrarPeriodo(lista, periodo = agPeriodoNormalizado()) {
  return (Array.isArray(lista) ? lista : []).filter(item => agItemDentroPeriodo(item, periodo));
}

function agAgendamentoAtivo(item) {
  return agSituacao(item) === 'Agendado';
}

function agAgendamentoAtivoFuturo(item) {
  if (!agAgendamentoAtivo(item)) return false;
  const ref = agDataHoraRef(item && item.dataAgendamento, item && item.horarioAgendamento);
  return !!(ref && ref.getTime() >= Date.now());
}

function agPeriodoResumo(periodo = agPeriodoNormalizado()) {
  if (periodo.dataDe && periodo.dataAte) return `${agFormatoDataCurta(periodo.dataDe)} até ${agFormatoDataCurta(periodo.dataAte)}`;
  if (periodo.dataDe) return `A partir de ${agFormatoDataCurta(periodo.dataDe)}`;
  if (periodo.dataAte) return `Até ${agFormatoDataCurta(periodo.dataAte)}`;
  return 'Todo o histórico visível';
}

function agDataNoMes(dataIso, refMes) {
  const ref = agDataHoraRef(dataIso, '12:00');
  if (!ref || !refMes) return false;
  return ref.getFullYear() === refMes.getFullYear() && ref.getMonth() === refMes.getMonth();
}

function agFormatarMesAno(refMes) {
  return refMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, letra => letra.toUpperCase());
}

function agFormatarDiaPainel(dataIso) {
  const ref = agDataHoraRef(dataIso, '12:00');
  if (!ref) return 'Selecione um dia';
  return ref.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).replace(/^./, letra => letra.toUpperCase());
}

function agMomentoLimiteTratativa(item) {
  const base = agDataHoraRef(item && item.dataAgendamento, item && item.horarioAgendamento);
  if (!base) return null;
  return new Date(base.getTime() + (30 * 60 * 1000));
}

function agTratativaPendente(item) {
  if (!item || agSituacao(item) !== 'Agendado') return false;
  if (!agMesmoLancador(item)) return false;
  const limite = agMomentoLimiteTratativa(item);
  if (!limite) return false;
  return Date.now() >= limite.getTime();
}

function agFormatarPrazoTratativa(item) {
  const limite = agMomentoLimiteTratativa(item);
  if (!limite) return '—';
  return formatarDataLocal(limite, { comAno: true, comHora: true });
}

function agEquipeValor(item) {
  return agTexto(item && item.equipe) || 'Sem equipe';
}

function agCorretorFiltroValor(item) {
  if (!item) return '';
  const id = parseInt(item.corretorId || item.id, 10) || 0;
  if (id) return `id:${id}`;
  const email = agTexto(item.corretorEmail || item.email).toLowerCase();
  if (email) return `mail:${email}`;
  const nome = agNormalizarTexto(item.corretor || item.nome);
  return nome ? `nome:${nome}` : '';
}

function agMesmoUsuario(alvo, usuario = usuarioLogado) {
  if (!alvo || !usuario) return false;
  const alvoId = parseInt(alvo.corretorId || alvo.id, 10) || 0;
  const usuarioId = parseInt(usuario.id, 10) || 0;
  if (alvoId && usuarioId && alvoId === usuarioId) return true;

  const alvoEmail = agTexto(alvo.corretorEmail || alvo.email).toLowerCase();
  const usuarioEmail = agTexto(usuario.email).toLowerCase();
  if (alvoEmail && usuarioEmail && alvoEmail === usuarioEmail) return true;

  const alvoNome = agNormalizarTexto(alvo.corretor || alvo.nome);
  const usuarioNome = agNormalizarTexto(usuario.nome);
  return !!(alvoNome && usuarioNome && alvoNome === usuarioNome);
}

function agMesmoLancador(item, usuario = usuarioLogado) {
  if (!item || !usuario) return false;
  const lancadorId = parseInt(item.criadoPorId, 10) || 0;
  const usuarioId = parseInt(usuario.id, 10) || 0;
  if (lancadorId && usuarioId && lancadorId === usuarioId) return true;

  const lancadorEmail = agTexto(item.criadoPorEmail).toLowerCase();
  const usuarioEmail = agTexto(usuario.email).toLowerCase();
  if (lancadorEmail && usuarioEmail && lancadorEmail === usuarioEmail) return true;

  const lancadorNome = agNormalizarTexto(item.criadoPor);
  const usuarioNome = agNormalizarTexto(usuario.nome);
  return !!(lancadorNome && usuarioNome && lancadorNome === usuarioNome);
}

function agPodeTratarManual(item, usuario = usuarioLogado) {
  if (!item || !usuario) return false;
  if (!agendamentoVisivel(item)) return false;
  if (agSituacao(item) !== 'Agendado') return false;
  if (['dono', 'fin', 'rh', 'dir', 'ger', 'cap'].includes(role)) return true;
  return agMesmoUsuario(item, usuario) || agMesmoLancador(item, usuario);
}

function agMesmoTime(alvo, usuario = usuarioLogado) {
  const equipeAlvo = agNormalizarTexto(agEquipeValor(alvo));
  const equipeUsuario = agNormalizarTexto(agEquipeValor(usuario));
  return !!(equipeAlvo && equipeUsuario && equipeAlvo === equipeUsuario);
}

function agMesmoTimeNaUnidade(alvo, usuario = usuarioLogado) {
  if (!agMesmoTime(alvo, usuario)) return false;
  const unidadeUsuario = agTexto(usuario && usuario.unidade);
  if (!unidadeUsuario || unidadeUsuario === 'Ambas') return true;
  const unidadeAlvo = agTexto(alvo && alvo.unidade);
  return !unidadeAlvo || unidadeAlvo === unidadeUsuario || unidadeAlvo === 'Ambas';
}

function agPerfilUsuario(item) {
  return typeof getPerfil === 'function'
    ? getPerfil(item && item.perfil)
    : agNormalizarTexto(item && item.perfil);
}

function agUsuarioDisponivelNaUnidade(usuario, unidade) {
  const unidadeUsuario = agTexto(usuario && usuario.unidade);
  if (!unidade) return true;
  if (!unidadeUsuario || unidadeUsuario === 'Ambas') return true;
  return unidadeUsuario === unidade;
}

function agPermiteTodasUnidades() {
  return ['dono', 'fin', 'rh'].includes(role)
    || (role === 'dir' && usuarioLogado && agTexto(usuarioLogado.unidade) === 'Ambas');
}

function agUnidadesPermitidasCriacao() {
  if (agPermiteTodasUnidades()) return ['Centro', 'Cristo Rei'];
  const unidadeUsuario = agTexto(usuarioLogado && usuarioLogado.unidade);
  if (unidadeUsuario === 'Centro' || unidadeUsuario === 'Cristo Rei') return [unidadeUsuario];
  return ['Centro', 'Cristo Rei'];
}

function agUsuariosComerciaisBase() {
  const perfisPermitidos = new Set(['cor', 'cap', 'ger', 'dir']);
  return (Array.isArray(USUARIOS) ? USUARIOS : []).filter(usuario => {
    const status = agTexto(usuario.status || 'Ativo');
    return perfisPermitidos.has(agPerfilUsuario(usuario)) && status !== 'Pendente';
  });
}

function agUsuarioPodeGerenciarCorretor(usuario) {
  if (!usuario || !usuarioLogado) return false;
  if (['dono', 'fin', 'rh'].includes(role)) return true;
  if (role === 'dir') {
    return agPermiteTodasUnidades() || agTexto(usuario.unidade) === agTexto(usuarioLogado.unidade);
  }
  if (role === 'ger' || role === 'cap') {
    return agMesmoUsuario(usuario) || agMesmoTimeNaUnidade(usuario);
  }
  if (role === 'cor') return agMesmoUsuario(usuario);
  return false;
}

function agUsuariosPermitidosCadastro() {
  return agUsuariosComerciaisBase()
    .filter(usuario => agTexto(usuario.status || 'Ativo') === 'Ativo')
    .filter(agUsuarioPodeGerenciarCorretor)
    .sort((a, b) => agTexto(a.nome).localeCompare(agTexto(b.nome), 'pt-BR'));
}

function agendamentoVisivel(item) {
  if (!usuarioLogado) return false;
  if (['dono', 'fin', 'rh'].includes(role)) return true;
  if (role === 'dir') {
    return agPermiteTodasUnidades() || agTexto(item.unidade) === agTexto(usuarioLogado.unidade);
  }
  if (role === 'ger' || role === 'cap') {
    return agMesmoUsuario(item) || agMesmoTimeNaUnidade(item);
  }
  if (role === 'cor') return agMesmoUsuario(item);
  return false;
}

function agOrdenarLista(lista) {
  return [...(Array.isArray(lista) ? lista : [])].sort((a, b) => {
    const refA = agDataHoraRef(a && a.dataAgendamento, a && a.horarioAgendamento);
    const refB = agDataHoraRef(b && b.dataAgendamento, b && b.horarioAgendamento);
    const timeA = refA ? refA.getTime() : 0;
    const timeB = refB ? refB.getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    return agTexto(a && a.cliente).localeCompare(agTexto(b && b.cliente), 'pt-BR');
  });
}

function agFiltrarLista(lista, incluirBusca = true) {
  let out = agOrdenarLista(lista);
  if (agFiltroUnidade) out = out.filter(item => agTexto(item.unidade) === agFiltroUnidade);
  if (agFiltroEquipe) out = out.filter(item => agEquipeValor(item) === agFiltroEquipe);
  if (agFiltroCorretor) out = out.filter(item => agCorretorFiltroValor(item) === agFiltroCorretor);
  if (incluirBusca && agBusca.trim()) {
    const termo = agNormalizarTexto(agBusca);
    out = out.filter(item => {
      const pilha = [
        item.cliente,
        item.telefone,
        item.corretor,
        item.unidade,
        item.equipe,
        item.tipoVisita
      ].map(agNormalizarTexto).join(' ');
      return pilha.includes(termo);
    });
  }
  return out;
}

function agResumoPermissao() {
  if (role === 'cor') return 'Você visualiza apenas os seus próprios agendamentos.';
  if (role === 'cap') return 'Você visualiza os seus agendamentos e os da sua equipe.';
  if (role === 'ger') return 'Você acompanha os agendamentos da sua equipe com visão de gestão.';
  if (role === 'dir' && usuarioLogado && agTexto(usuarioLogado.unidade) && agTexto(usuarioLogado.unidade) !== 'Ambas') {
    return `Você visualiza todos os agendamentos da unidade ${agTexto(usuarioLogado.unidade)}.`;
  }
  if (role === 'dir') return 'Você visualiza os agendamentos das duas unidades.';
  return 'Você tem visão ampliada da agenda comercial.';
}

function agStatusSyncInfo() {
  if (typeof getStatusAgendamentosSync === 'function') return getStatusAgendamentosSync();
  const pendentes = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(item => !!(item && item.syncPendente)).length;
  return {
    tabela: 'desconhecida',
    erro: '',
    sincronizando: false,
    pendentes,
    tabelaDisponivel: false,
    tabelaAusente: false
  };
}

function agCompartilhamentoDisponivel() {
  return !!agStatusSyncInfo().tabelaDisponivel;
}

function agMutacaoBloqueada() {
  return !agCompartilhamentoDisponivel();
}

function agPendentesSyncLista() {
  return agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(item => !!(item && item.syncPendente)));
}

async function agTentarSincronizarPendentes() {
  if (typeof sincronizarAgendamentosPendentes !== 'function') {
    showToast('⚠️', 'Sincronização de agendamentos indisponível neste momento.');
    return;
  }
  const resultado = await sincronizarAgendamentosPendentes({ silencioso: false, renderizar: true });
  if (resultado && resultado.bloqueado) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'A sincronização continua bloqueada porque a tabela de agendamentos ainda não existe no Supabase.'
      : 'A sincronização compartilhada ainda não está disponível.');
  }
}

function exportarAgendamentosPendentes() {
  const pendentes = agPendentesSyncLista();
  if (!pendentes.length) {
    showToast('ℹ️', 'Não há agendamentos pendentes neste navegador.');
    return;
  }
  const payload = JSON.stringify(pendentes, null, 2);
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agendamentos-pendentes-${agHojeIso()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('✅', 'Arquivo com agendamentos pendentes exportado.');
}

function agGarantirDataSelecionada() {
  const fallback = agDataNoMes(agHojeIso(), agMesRef)
    ? agHojeIso()
    : agIsoFromDate(new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0));
  if (!agDataValidaIso(agDataSelecionada) || !agDataNoMes(agDataSelecionada, agMesRef)) {
    agDataSelecionada = fallback;
    zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  }
}

function agContarProximosDias(lista, dias) {
  const agora = new Date();
  if (Number.isNaN(agora.getTime())) return 0;
  const limite = new Date(agora.getTime());
  limite.setDate(limite.getDate() + dias);
  return lista.filter(item => {
    const ref = agDataHoraRef(item.dataAgendamento, item.horarioAgendamento || '00:00');
    return ref && ref.getTime() >= agora.getTime() && ref < limite;
  }).length;
}

function agRenderCalendario(listaMes) {
  const eventosPorDia = {};
  agOrdenarLista(listaMes).forEach(item => {
    const chave = item.dataAgendamento;
    if (!eventosPorDia[chave]) eventosPorDia[chave] = [];
    eventosPorDia[chave].push(item);
  });

  const primeiroDia = new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0);
  const ultimoDia = new Date(agMesRef.getFullYear(), agMesRef.getMonth() + 1, 0, 12, 0, 0, 0);
  const offset = primeiroDia.getDay();
  const totalCelulas = Math.ceil((offset + ultimoDia.getDate()) / 7) * 7;
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const cabecalho = diasSemana.map(dia => `<div class="ag-weekday">${agTexto(dia)}</div>`).join('');
  const hojeIso = agHojeIso();
  let corpo = '';

  for (let indice = 0; indice < totalCelulas; indice++) {
    const ref = new Date(agMesRef.getFullYear(), agMesRef.getMonth(), indice - offset + 1, 12, 0, 0, 0);
    const iso = agIsoFromDate(ref);
    const dentroDoMes = ref.getMonth() === agMesRef.getMonth();
    const eventos = dentroDoMes ? (eventosPorDia[iso] || []) : [];
    const classes = ['ag-day'];
    if (!dentroDoMes) classes.push('outside');
    if (dentroDoMes && iso === hojeIso) classes.push('today');
    if (dentroDoMes && iso === agDataSelecionada) classes.push('selected');

    const topo = `<div class="ag-day-top"><span class="ag-day-number">${ref.getDate()}</span>${eventos.length ? `<span class="ag-day-pill">${eventos.length}</span>` : ''}</div>`;
    const previews = eventos.slice(0, 2).map(item =>
      `<div class="ag-day-event"><strong>${agTexto(item.horarioAgendamento || '—')}</strong>${agTexto(item.cliente)}</div>`
    ).join('');
    const mais = eventos.length > 2 ? `<div class="ag-day-more">+${eventos.length - 2} compromissos</div>` : '';

    if (dentroDoMes) {
      corpo += `<button type="button" class="${classes.join(' ')}" onclick="selecionarAgendamentoData('${iso}')">${topo}<div class="ag-day-list">${previews}${mais}</div></button>`;
    } else {
      corpo += `<div class="${classes.join(' ')}">${topo}</div>`;
    }
  }

  return `<div class="ag-weekdays">${cabecalho}</div><div class="ag-grid">${corpo}</div>`;
}

function agRenderItem(item, opcoes = {}) {
  const mostrarData = !!opcoes.mostrarData;
  const telefoneEncoded = encodeURIComponent(String(item.telefone || ''));
  const tipoClass = agTexto(item.tipoVisita) === 'Fechamento' ? 'close' : 'first';
  const situacao = agSituacao(item);
  const situacaoClasse = agSituacaoClasse(situacao);
  const itemId = parseInt(item && item.id, 10) || 0;
  const podeTratar = !!itemId && agPodeTratarManual(item);
  const dataRef = agDataHoraRef(item.dataAgendamento, item.horarioAgendamento || '12:00');
  const dataLabel = dataRef
    ? dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    : '';
  return `<div class="ag-item ${podeTratar ? 'clickable' : ''}" ${podeTratar ? `role="button" tabindex="0" onclick="abrirTratativaAgendamentoManual(${itemId})" onkeydown="handleAgendamentoCardKeydown(event,${itemId})"` : ''}>
    <div class="ag-item-main">
      <div class="ag-item-timebox">
        <div class="ag-item-kicker">${mostrarData ? 'Data' : 'Horário'}</div>
        ${mostrarData ? `<div class="ag-item-date">${agTexto(dataLabel || '—')}</div>` : ''}
        <div class="ag-item-hour">${agTexto(item.horarioAgendamento || '—')}</div>
      </div>
      <div class="ag-item-body">
        <div class="ag-item-top">
          <div class="ag-client">${agTexto(item.cliente || 'Cliente não informado')}</div>
          <div class="ag-item-badges">
            <span class="ag-badge ${tipoClass}">${agTexto(item.tipoVisita || 'Primeiro atendimento')}</span>
            <span class="ag-badge status ${situacaoClasse}">${agTexto(situacao)}</span>
            ${agTratativaPendente(item) ? `<span class="ag-badge warn">Tratativa pendente</span>` : ''}
          </div>
        </div>
        <div class="ag-meta">
          <span>📍 ${agTexto(item.unidade || '—')}</span>
          <span>👥 ${agTexto(agEquipeValor(item))}</span>
          <span>🧑‍💼 ${agTexto(item.corretor || '—')}</span>
        </div>
        <div class="ag-item-actions">
          <div class="ag-phone">
            <span class="ag-phone-text">📞 ${agTexto(item.telefone || 'Telefone não informado')}</span>
          </div>
          ${item.telefone ? `<button class="ag-copy-btn" type="button" onclick="event.stopPropagation();copiarTexto(decodeURIComponent('${telefoneEncoded}'),'Telefone do cliente')">Copiar telefone</button>` : ''}
        </div>
        ${podeTratar ? `<div class="ag-item-hint">Clique no agendamento para registrar visita concluída, reagendamento ou cancelamento.</div>` : ''}
      </div>
    </div>
  </div>`;
}

function agPendenciasTratativa() {
  return agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(agTratativaPendente));
}

function agTratativaAtual() {
  return (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => item.id === agTratativaAtualId) || null;
}

function temTratativaAgendamentoAberta() {
  const modal = document.getElementById('m-agendamento-tratativa');
  return !!(modal && modal.classList.contains('show'));
}

function temTratativaAgendamentoObrigatoriaAberta() {
  return temTratativaAgendamentoAberta() && agTratativaModo === 'obrigatoria';
}

function agAtualizarFilaTratativa() {
  agTratativaFila = agPendenciasTratativa().map(item => item.id);
  zSetState('state.ui.agTratativaFila', agTratativaFila);
  return agTratativaFila;
}

function renderTratativaAgendamentoModal() {
  const corpo = document.getElementById('mat-body');
  const atual = agTratativaAtual();
  if (!corpo || !atual) return;

  const modoObrigatorio = agTratativaModo === 'obrigatoria';
  const botaoFechar = document.getElementById('mat-cancel-btn');
  const botaoSalvar = document.getElementById('mat-save-btn');

  const idxAtual = Math.max(agTratativaFila.indexOf(atual.id), 0);
  const totalFila = agTratativaFila.length || 1;
  const infoAgendamento = `${agTexto(atual.cliente)} • ${agTexto(atual.dataAgendamento)} às ${agTexto(atual.horarioAgendamento)}`;
  const tituloFila = totalFila > 1 ? `Pendência ${idxAtual + 1} de ${totalFila}` : 'Pendência de tratativa';

  document.getElementById('mat-title').textContent = zUiText(modoObrigatorio ? 'Tratativa obrigatória do agendamento' : 'Atualizar agendamento');
  document.getElementById('mat-sub').textContent = zUiText(modoObrigatorio ? `${tituloFila} • ${infoAgendamento}` : `Escolha como este compromisso deve ficar registrado. • ${infoAgendamento}`);
  if (botaoFechar) botaoFechar.style.display = modoObrigatorio ? 'none' : 'inline-flex';
  if (botaoSalvar) botaoSalvar.textContent = zUiText(modoObrigatorio ? 'Confirmar tratativa' : 'Salvar atualização');

  corpo.innerHTML = `
    <div class="agt-alert">
      ${modoObrigatorio
        ? 'Este agendamento passou do horário há mais de 30 minutos. Para seguir usando o sistema, registre a tratativa agora.'
        : 'Se o cliente já foi atendido, cancelou ou precisou remarcar, registre aqui sem precisar esperar o horário vencer.'}
    </div>

    <div class="agt-info-grid">
      <div class="agt-info-card">
        <span>Cliente</span>
        <strong>${agTexto(atual.cliente)}</strong>
        <small>${agTexto(atual.telefone || 'Telefone não informado')}</small>
      </div>
      <div class="agt-info-card">
        <span>Agendamento</span>
        <strong>${agTexto(atual.dataAgendamento)}</strong>
        <small>${agTexto(atual.horarioAgendamento)} • ${agTexto(atual.tipoVisita)}</small>
      </div>
      <div class="agt-info-card">
        <span>Equipe</span>
        <strong>${agTexto(agEquipeValor(atual))}</strong>
        <small>${agTexto(atual.unidade)} • ${agTexto(atual.corretor)}</small>
      </div>
      <div class="agt-info-card">
        <span>${modoObrigatorio ? 'Prazo da tratativa' : 'Status atual'}</span>
        <strong>${agTexto(modoObrigatorio ? agFormatarPrazoTratativa(atual) : agSituacao(atual))}</strong>
        <small>Lançado por ${agTexto(atual.criadoPor || 'Sistema')}</small>
      </div>
    </div>

    <div class="agt-section">
      <div class="agt-label">Escolha a tratativa</div>
      <div class="agt-options">
        <button type="button" class="agt-option ${agTratativaSelecao === 'Concluída' ? 'active' : ''}" onclick="selecionarTratativaAgendamento('Concluída')">
          <strong>Visita concluída</strong>
          <span>O cliente foi atendido normalmente.</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === 'Reagendado' ? 'active' : ''}" onclick="selecionarTratativaAgendamento('Reagendado')">
          <strong>Reagendamento</strong>
          <span>Cria automaticamente um novo agendamento com nova data e horário.</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === 'Cliente cancelou' ? 'active' : ''}" onclick="selecionarTratativaAgendamento('Cliente cancelou')">
          <strong>Cliente cancelou</strong>
          <span>Fecha este compromisso como cancelado pelo cliente.</span>
        </button>
      </div>
    </div>

    <div id="agt-reagendar-box" class="agt-reagendar-box ${agTratativaSelecao === 'Reagendado' ? 'show' : ''}">
      <div class="agt-label">Novo horário do compromisso</div>
      <div class="f-row">
        <div class="f-field">
          <label>Nova data *</label>
          <input type="date" id="agt-nova-data" value="${agAttr(atual.reagendadoParaData || '')}">
        </div>
        <div class="f-field">
          <label>Novo horário *</label>
          <input type="time" id="agt-novo-horario" value="${agAttr(atual.reagendadoParaHorario || '')}">
        </div>
      </div>
      <div class="agt-help">Ao confirmar, este agendamento atual fica marcado como reagendado e um novo compromisso será criado automaticamente.</div>
    </div>
  `;
}

function abrirTratativaAgendamentoModal(item, opcoes = {}) {
  if (!item) return;
  agAtualizarFilaTratativa();
  agTratativaModo = opcoes.modo === 'obrigatoria' ? 'obrigatoria' : 'manual';
  agTratativaAtualId = item.id;
  agTratativaSelecao = '';
  zSetState('state.ui.agTratativaModo', agTratativaModo);
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  renderTratativaAgendamentoModal();
  const modal = document.getElementById('m-agendamento-tratativa');
  if (modal) modal.classList.add('show');
}

function abrirTratativaAgendamentoManual(id) {
  const item = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(agendamento => agendamento.id === id);
  if (!item) return;
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Tratativas bloqueadas até aplicar a tabela de agendamentos no Supabase.'
      : 'Tratativas temporariamente bloqueadas enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }
  if (agPendenciasTratativa().length) {
    verificarPendenciasAgendamento({ forcar: true });
    return;
  }
  if (temTratativaAgendamentoObrigatoriaAberta()) {
    showToast('⚠️', 'Finalize primeiro a tratativa obrigatória que está pendente.');
    return;
  }
  if (!agPodeTratarManual(item)) {
    const situacao = agSituacao(item);
    showToast('⚠️', situacao === 'Agendado'
      ? 'Você não tem permissão para alterar este agendamento.'
      : `Esse agendamento já está marcado como ${situacao.toLowerCase()}.`);
    return;
  }
  abrirTratativaAgendamentoModal(item, { modo: 'manual' });
}

function handleAgendamentoCardKeydown(event, id) {
  if (!event || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  abrirTratativaAgendamentoManual(id);
}

function selecionarTratativaAgendamento(valor) {
  agTratativaSelecao = valor;
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  renderTratativaAgendamentoModal();
}

function fecharTratativaAgendamentoModal(forcado = false) {
  const modal = document.getElementById('m-agendamento-tratativa');
  if (!modal) return;
  if (!forcado && temTratativaAgendamentoObrigatoriaAberta()) return;
  if (modal) modal.classList.remove('show');
  agTratativaAtualId = 0;
  agTratativaSelecao = '';
  agTratativaModo = '';
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  zSetState('state.ui.agTratativaModo', agTratativaModo);
}

function handleBackdropAgendamentoTratativa(event) {
  if (event.target === document.getElementById('m-agendamento-tratativa')) {
    if (temTratativaAgendamentoObrigatoriaAberta()) {
      showToast('⚠️', 'Esse agendamento precisa de tratativa antes de continuar.');
      return;
    }
    fecharTratativaAgendamentoModal();
  }
}

function verificarPendenciasAgendamento(opcoes = {}) {
  if (!usuarioLogado) return;
  const telaLogin = document.getElementById('login-screen');
  if (telaLogin && !telaLogin.classList.contains('hidden')) return;

  const fila = agAtualizarFilaTratativa();
  if (!fila.length) {
    if (agTratativaModo === 'manual' && temTratativaAgendamentoAberta() && !opcoes.forcar) return;
    agTratativaAtualId = 0;
    agTratativaSelecao = '';
    agTratativaModo = '';
    zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    zSetState('state.ui.agTratativaModo', agTratativaModo);
    fecharTratativaAgendamentoModal(true);
    return;
  }

  if (temTratativaAgendamentoObrigatoriaAberta() && !opcoes.forcar) return;
  const atual = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => item.id === fila[0]);
  if (atual) abrirTratativaAgendamentoModal(atual, { modo: 'obrigatoria' });
}

function iniciarMonitorTratativaAgendamento() {
  encerrarMonitorTratativaAgendamento();
  verificarPendenciasAgendamento({ forcar: true });
  agPendenciaTimer = window.setInterval(() => verificarPendenciasAgendamento(), 60000);
  if (!agPendenciaEventosRegistrados) {
    window.addEventListener('focus', () => verificarPendenciasAgendamento());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) verificarPendenciasAgendamento();
    });
    agPendenciaEventosRegistrados = true;
  }
}

function encerrarMonitorTratativaAgendamento() {
  if (agPendenciaTimer) {
    window.clearInterval(agPendenciaTimer);
    agPendenciaTimer = null;
  }
  agTratativaFila = [];
  agTratativaAtualId = 0;
  agTratativaSelecao = '';
  agTratativaModo = '';
  zSetState('state.ui.agTratativaFila', agTratativaFila);
  zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
  zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
  zSetState('state.ui.agTratativaModo', agTratativaModo);
  fecharTratativaAgendamentoModal(true);
}

async function confirmarTratativaAgendamento() {
  const atual = agTratativaAtual();
  if (!atual) {
    fecharTratativaAgendamentoModal(true);
    return;
  }
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Tratativas bloqueadas até aplicar a tabela de agendamentos no Supabase.'
      : 'Tratativas temporariamente bloqueadas enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }
  if (!AG_SITUACOES.includes(agTratativaSelecao) || agTratativaSelecao === 'Agendado') {
    showToast('⚠️', 'Escolha a tratativa deste agendamento.');
    return;
  }

  const agoraIso = new Date().toISOString();
  const usuarioAtual = usuarioLogado || {};
  const btn = document.getElementById('mat-save-btn');
  const modoTratativa = agTratativaModo || 'manual';
  const novosAgendamentos = [];

  if (agTratativaSelecao === 'Reagendado') {
    const novaData = document.getElementById('agt-nova-data') ? document.getElementById('agt-nova-data').value : '';
    const novoHorario = document.getElementById('agt-novo-horario') ? agHoraNormalizada(document.getElementById('agt-novo-horario').value) : '';
    const novoRef = agDataHoraRef(novaData, novoHorario);
    if (!novoRef) {
      showToast('⚠️', 'Informe a nova data e horário do reagendamento.');
      return;
    }
    if (novoRef.getTime() <= Date.now()) {
      showToast('⚠️', 'O novo agendamento precisa ficar em um horário futuro.');
      return;
    }

    const novoAgendamento = {
      id: nextAgendamentoId++,
      preenchidoEm: agHojeIso(),
      unidade: atual.unidade,
      equipe: atual.equipe,
      corretorId: atual.corretorId || 0,
      corretor: atual.corretor || '',
      corretorEmail: atual.corretorEmail || '',
      cliente: atual.cliente || '',
      telefone: atual.telefone || '',
      dataAgendamento: novaData,
      horarioAgendamento: novoHorario,
      tipoVisita: atual.tipoVisita || 'Primeiro atendimento',
      criadoPor: agTexto(usuarioAtual.nome || atual.criadoPor || 'Sistema'),
      criadoPorId: parseInt(usuarioAtual.id, 10) || 0,
      criadoPorEmail: agTexto(usuarioAtual.email).toLowerCase(),
      situacao: 'Agendado',
      tratativaEm: '',
      tratativaPor: '',
      tratativaPorId: 0,
      tratativaPorEmail: '',
      reagendadoParaData: '',
      reagendadoParaHorario: '',
      origemAgendamentoId: atual.id || 0,
      novoAgendamentoId: 0,
      atualizadoEm: agoraIso,
      refLocal: typeof gerarRefLocalAgendamento === 'function' ? gerarRefLocalAgendamento() : '',
      syncPendente: true,
      syncErro: ''
    };
    novosAgendamentos.push(novoAgendamento);
    atual.reagendadoParaData = novaData;
    atual.reagendadoParaHorario = novoHorario;
  }

  atual.situacao = agTratativaSelecao;
  atual.tratativaEm = agoraIso;
  atual.tratativaPor = agTexto(usuarioAtual.nome || 'Sistema');
  atual.tratativaPorId = parseInt(usuarioAtual.id, 10) || 0;
  atual.tratativaPorEmail = agTexto(usuarioAtual.email).toLowerCase();
  atual.atualizadoEm = agoraIso;
  if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(atual);
  novosAgendamentos.forEach(item => {
    if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(item);
  });

  if (novosAgendamentos.length) {
    atual.novoAgendamentoId = novosAgendamentos[0].id;
  }

  AGENDAMENTOS.push(...novosAgendamentos);
  const ordenados = agOrdenarLista(AGENDAMENTOS);
  AGENDAMENTOS.splice(0, AGENDAMENTOS.length, ...ordenados);
  zSetState('state.data.agendamentos', AGENDAMENTOS);
  zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
  salvarLS();

  if (btn) {
    btn.disabled = true;
    btn.textContent = zUiText(modoTratativa === 'obrigatoria' ? 'Salvando tratativa...' : 'Salvando atualização...');
  }

  try {
    await dbSalvarAgendamento(atual, atual.id);
    for (const item of novosAgendamentos) {
      item.origemAgendamentoId = atual.id || item.origemAgendamentoId || 0;
      await dbSalvarAgendamento(item);
    }
    if (novosAgendamentos.length) {
      atual.novoAgendamentoId = novosAgendamentos[0].id;
      await dbSalvarAgendamento(atual, atual.id);
      if (parseInt(novosAgendamentos[0].id, 10) >= nextAgendamentoId) {
        nextAgendamentoId = parseInt(novosAgendamentos[0].id, 10) + 1;
        zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
      }
    }
    salvarLS();
    showToast('✅', modoTratativa === 'obrigatoria' ? 'Tratativa registrada com sucesso.' : 'Atualização registrada com sucesso.');
  } catch (erro) {
    console.warn('Falha ao sincronizar tratativa do agendamento:', erro && erro.message ? erro.message : erro);
    salvarLS();
    showToast('⚠️', 'A tratativa não foi sincronizada com o Supabase. Este ajuste ficou pendente apenas neste navegador.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText(modoTratativa === 'obrigatoria' ? 'Confirmar tratativa' : 'Salvar atualização');
    }
    agTratativaSelecao = '';
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    renderAgendamentos();
    verificarPendenciasAgendamento({ forcar: true });
  }
}

function renderAgendamentos() {
  const cont = document.getElementById('agendamentos-content');
  if (!cont) return;

  const syncInfo = agStatusSyncInfo();
  const pendentesSync = agPendentesSyncLista();
  const pendentesQtd = pendentesSync.length;
  const mutacaoBloqueada = agMutacaoBloqueada();
  const periodo = agPeriodoNormalizado();
  const base = agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(agendamentoVisivel));
  const basePeriodo = agFiltrarPeriodo(base, periodo);
  const unidadesOpcoes = [...new Set(basePeriodo.map(item => agTexto(item.unidade)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (agFiltroUnidade && !unidadesOpcoes.includes(agFiltroUnidade)) agFiltroUnidade = '';

  const baseEquipe = basePeriodo.filter(item => !agFiltroUnidade || agTexto(item.unidade) === agFiltroUnidade);
  const equipesOpcoes = [...new Set(baseEquipe.map(item => agEquipeValor(item)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (agFiltroEquipe && !equipesOpcoes.includes(agFiltroEquipe)) agFiltroEquipe = '';

  const baseCorretor = baseEquipe.filter(item => !agFiltroEquipe || agEquipeValor(item) === agFiltroEquipe);
  const corretoresMap = new Map();
  baseCorretor.forEach(item => {
    const chave = agCorretorFiltroValor(item);
    if (chave && !corretoresMap.has(chave)) {
      corretoresMap.set(chave, { value: chave, label: agTexto(item.corretor || 'Não informado') });
    }
  });
  const corretoresOpcoes = Array.from(corretoresMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  if (agFiltroCorretor && !corretoresOpcoes.some(item => item.value === agFiltroCorretor)) agFiltroCorretor = '';

  const lista = agFiltrarLista(basePeriodo, true);
  const listaAgenda = lista.filter(agAgendamentoAtivo);
  const listaAtivos = lista.filter(agAgendamentoAtivoFuturo);
  agGarantirDataSelecionada();

  const listaMes = listaAgenda.filter(item => agDataNoMes(item.dataAgendamento, agMesRef));
  const listaDia = agOrdenarLista(listaAgenda.filter(item => item.dataAgendamento === agDataSelecionada));
  const proximos = agOrdenarLista(listaAtivos).slice(0, 5);

  const totalFeitos = lista.length;
  const totalAtivos = listaAtivos.length;
  const totalConcluidos = lista.filter(item => agSituacao(item) === 'Concluída').length;
  const totalPrimeirosAtivos = listaAtivos.filter(item => agTexto(item.tipoVisita) !== 'Fechamento').length;
  const totalFechamentosAtivos = listaAtivos.filter(item => agTexto(item.tipoVisita) === 'Fechamento').length;
  const totalPrimeirosProximos7 = agContarProximosDias(listaAtivos.filter(item => agTexto(item.tipoVisita) !== 'Fechamento'), 7);
  const totalFechamentosProximos7 = agContarProximosDias(listaAtivos.filter(item => agTexto(item.tipoVisita) === 'Fechamento'), 7);
  const periodoResumo = agPeriodoResumo(periodo);
  const resumoDiaPrimeiro = listaDia.filter(item => agTexto(item.tipoVisita) !== 'Fechamento').length;
  const resumoDiaFechamento = listaDia.filter(item => agTexto(item.tipoVisita) === 'Fechamento').length;
  const resumoProximosPrimeiro = proximos.filter(item => agTexto(item.tipoVisita) !== 'Fechamento').length;
  const resumoProximosFechamento = proximos.filter(item => agTexto(item.tipoVisita) === 'Fechamento').length;
  const orientacaoSync = encodeURIComponent('Aplicar o arquivo supabase-agendamentos.sql no SQL Editor do Supabase antes de liberar novamente o módulo de agendamentos.');
  const avisoSync = syncInfo.tabelaAusente
    ? `<div class="ag-sync-banner danger">
        <div class="ag-sync-banner-main">
          <strong>Sincronização compartilhada indisponível</strong>
          <span>A tabela de agendamentos ainda não existe no Supabase. Novos lançamentos e tratativas foram bloqueados para evitar perda operacional.</span>
          <small>${agTexto(syncInfo.erro || 'A aplicação não encontrou a tabela public.agendamentos no banco compartilhado.')}</small>
        </div>
        <div class="ag-sync-banner-actions">
          <button class="ag-sync-btn" type="button" onclick="copiarTexto(decodeURIComponent('${orientacaoSync}'),'Orientação do Supabase')">Copiar orientação</button>
          ${pendentesQtd ? `<button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes (${pendentesQtd})</button>` : ''}
        </div>
      </div>`
    : !syncInfo.tabelaDisponivel
      ? `<div class="ag-sync-banner warn">
          <div class="ag-sync-banner-main">
            <strong>Sincronização temporariamente indisponível</strong>
            <span>Enquanto o Supabase não responder com segurança, o módulo fica em modo protegido e bloqueia novos lançamentos e tratativas.</span>
            <small>${agTexto(syncInfo.erro || 'Tente novamente em alguns instantes.')}</small>
          </div>
          <div class="ag-sync-banner-actions">
            <button class="ag-sync-btn" type="button" onclick="agTentarSincronizarPendentes()">Tentar novamente</button>
            ${pendentesQtd ? `<button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes (${pendentesQtd})</button>` : ''}
          </div>
        </div>`
      : pendentesQtd
        ? `<div class="ag-sync-banner info">
            <div class="ag-sync-banner-main">
              <strong>${syncInfo.sincronizando ? 'Sincronizando agendamentos pendentes' : 'Agendamentos pendentes de sincronização'}</strong>
              <span>${pendentesQtd} registro${pendentesQtd !== 1 ? 's' : ''} deste navegador ainda precisa${pendentesQtd !== 1 ? 'm' : ''} subir para o Supabase.</span>
              <small>${syncInfo.ultimaSync ? `Última sincronização: ${formatarDataLocal(new Date(syncInfo.ultimaSync), { comAno: true, comHora: true })}` : 'Assim que a sincronização concluir, eles passam a ficar visíveis para toda a equipe.'}</small>
            </div>
            <div class="ag-sync-banner-actions">
              <button class="ag-sync-btn" type="button" onclick="agTentarSincronizarPendentes()" ${syncInfo.sincronizando ? 'disabled' : ''}>${syncInfo.sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}</button>
              <button class="ag-sync-btn" type="button" onclick="exportarAgendamentosPendentes()">Exportar pendentes</button>
            </div>
          </div>`
        : '';

  cont.innerHTML = `<div class="ag-wrap">
    <div class="ag-top">
      <div class="ag-title-wrap">
        <div class="ag-title">Agenda comercial</div>
        <div class="ag-sub">${agTexto(agResumoPermissao())}</div>
      </div>
      <button class="btn-add-trein" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada || agHojeIso()}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        Novo agendamento
      </button>
    </div>

    ${avisoSync}

    <div class="ag-stat-grid">
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos feitos</div>
        <div class="ag-stat-value">${totalFeitos}</div>
        <div class="ag-stat-copy">${agTexto(periodoResumo)}</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos ativos</div>
        <div class="ag-stat-value">${totalAtivos}</div>
        <div class="ag-stat-copy">Somente compromissos futuros ainda sem conclusão ou cancelamento.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Agendamentos concluídos</div>
        <div class="ag-stat-value">${totalConcluidos}</div>
        <div class="ag-stat-copy">Visitas já marcadas como concluídas dentro do período analisado.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Primeiro atendimento ativos</div>
        <div class="ag-stat-value">${totalPrimeirosAtivos}</div>
        <div class="ag-stat-copy">${totalPrimeirosProximos7} primeiros atendimentos ativos previstos nos próximos 7 dias.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Fechamentos ativos</div>
        <div class="ag-stat-value">${totalFechamentosAtivos}</div>
        <div class="ag-stat-copy">${totalFechamentosProximos7} fechamentos ativos previstos nos próximos 7 dias.</div>
      </div>
    </div>

    <div class="ag-toolbar">
      <div class="ag-search">
        <span class="ag-search-icon">🔍</span>
        <input type="text" value="${agAttr(agBusca)}" placeholder="Buscar cliente, telefone ou corretor..." oninput="agBusca=this.value;zSetState('state.ui.agBusca',agBusca);renderAgendamentos()">
      </div>
      <div class="ag-date-range">
        <div class="ag-date-field">
          <label>De</label>
          <input type="date" value="${agAttr(agFiltroDataDe)}" onchange="agAtualizarFiltroPeriodo('de',this.value)">
        </div>
        <div class="ag-date-field">
          <label>Até</label>
          <input type="date" value="${agAttr(agFiltroDataAte)}" onchange="agAtualizarFiltroPeriodo('ate',this.value)">
        </div>
      </div>
      <select class="ag-filter" onchange="agFiltroUnidade=this.value;agFiltroEquipe='';agFiltroCorretor='';zSetState('state.ui.agFiltroUnidade',agFiltroUnidade);zSetState('state.ui.agFiltroEquipe',agFiltroEquipe);zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todas as unidades</option>
        ${unidadesOpcoes.map(unidade => `<option value="${agTexto(unidade)}" ${agFiltroUnidade === unidade ? 'selected' : ''}>${agTexto(unidade)}</option>`).join('')}
      </select>
      <select class="ag-filter" onchange="agFiltroEquipe=this.value;agFiltroCorretor='';zSetState('state.ui.agFiltroEquipe',agFiltroEquipe);zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todas as equipes</option>
        ${equipesOpcoes.map(equipe => `<option value="${agTexto(equipe)}" ${agFiltroEquipe === equipe ? 'selected' : ''}>${agTexto(equipe)}</option>`).join('')}
      </select>
      <select class="ag-filter" onchange="agFiltroCorretor=this.value;zSetState('state.ui.agFiltroCorretor',agFiltroCorretor);renderAgendamentos()">
        <option value="">Todos os corretores</option>
        ${corretoresOpcoes.map(item => `<option value="${agTexto(item.value)}" ${agFiltroCorretor === item.value ? 'selected' : ''}>${agTexto(item.label)}</option>`).join('')}
      </select>
      ${(agBusca || agFiltroUnidade || agFiltroEquipe || agFiltroCorretor || agFiltroDataDe || agFiltroDataAte) ? `<button class="ag-clear-btn" type="button" onclick="limparFiltrosAgendamento()">Limpar filtros</button>` : ''}
    </div>

    <div class="ag-layout">
      <div class="ag-card">
        <div class="ag-card-head">
          <div>
            <div class="ag-card-title">${agTexto(agFormatarMesAno(agMesRef))}</div>
            <div class="ag-card-sub">Calendário da agenda ativa dentro do período analisado.</div>
          </div>
          <div class="ag-month-nav">
            <button class="ag-month-btn" type="button" onclick="mudarMesAgendamento(-1)">‹</button>
            <button class="ag-month-btn" type="button" onclick="mudarMesAgendamento(1)">›</button>
          </div>
        </div>
        <div class="ag-calendar-body">
          ${agRenderCalendario(listaMes)}
        </div>
      </div>

      <div class="ag-side">
        <div class="ag-card">
          <div class="ag-card-head">
            <div>
              <div class="ag-card-title-row">
                <div class="ag-card-title">${agTexto(agFormatarDiaPainel(agDataSelecionada))}</div>
                <span class="ag-count-chip">${listaDia.length}</span>
              </div>
              <div class="ag-card-sub">${listaDia.length} compromisso${listaDia.length !== 1 ? 's' : ''} ativo${listaDia.length !== 1 ? 's' : ''} para esta data</div>
            </div>
            <button class="ag-clear-btn" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">Agendar neste dia</button>
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">Compromissos do dia</div>
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoDiaPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Fechamento</span>
                  <strong>${resumoDiaFechamento}</strong>
                </div>
              </div>
              <div class="ag-list">
                ${listaDia.length ? listaDia.map(item => agRenderItem(item)).join('') : `<div class="ag-empty"><strong>Sem compromissos ativos neste dia</strong>Use o botão acima para registrar um novo agendamento na data selecionada.</div>`}
              </div>
            </div>
          </div>
        </div>

        <div class="ag-card">
          <div class="ag-card-head">
            <div>
              <div class="ag-card-title-row">
                <div class="ag-card-title">Próximos compromissos</div>
                <span class="ag-count-chip">${proximos.length}</span>
              </div>
              <div class="ag-card-sub">Visão rápida dos próximos agendamentos ativos dentro do período.</div>
            </div>
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">Próximos 5 registros</div>
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoProximosPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Fechamento</span>
                  <strong>${resumoProximosFechamento}</strong>
                </div>
              </div>
              <div class="ag-list">
                ${proximos.length ? proximos.map(item => agRenderItem(item, { mostrarData: true })).join('') : `<div class="ag-empty"><strong>Nenhum agendamento ativo no período</strong>Assim que houver novos compromissos futuros, eles aparecem aqui.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function agAtualizarFiltroPeriodo(campo, valor) {
  const data = agDataValidaIso(valor) ? valor : '';
  if (campo === 'de') agFiltroDataDe = data;
  if (campo === 'ate') agFiltroDataAte = data;

  if (agFiltroDataDe && agFiltroDataAte && agFiltroDataDe > agFiltroDataAte) {
    if (campo === 'de') agFiltroDataAte = agFiltroDataDe;
    else agFiltroDataDe = agFiltroDataAte;
  }

  const dataBase = agFiltroDataDe || agFiltroDataAte || agHojeIso();
  const refBase = agDataHoraRef(dataBase, '12:00');
  if (refBase) {
    agMesRef = new Date(refBase.getFullYear(), refBase.getMonth(), 1, 12, 0, 0, 0);
    agDataSelecionada = agIsoFromDate(refBase);
    zSetState('state.ui.agMesRef', agMesRef);
    zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  }

  zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
  zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
  renderAgendamentos();
}

function limparFiltrosAgendamento() {
  agBusca = '';
  agFiltroUnidade = '';
  agFiltroEquipe = '';
  agFiltroCorretor = '';
  agFiltroDataDe = '';
  agFiltroDataAte = '';
  agMesRef = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0, 0);
  agDataSelecionada = agHojeIso();
  zSetState('state.ui.agBusca', agBusca);
  zSetState('state.ui.agFiltroUnidade', agFiltroUnidade);
  zSetState('state.ui.agFiltroEquipe', agFiltroEquipe);
  zSetState('state.ui.agFiltroCorretor', agFiltroCorretor);
  zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
  zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function selecionarAgendamentoData(dataIso) {
  if (!agDataValidaIso(dataIso)) return;
  agDataSelecionada = dataIso;
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function mudarMesAgendamento(delta) {
  agMesRef = new Date(agMesRef.getFullYear(), agMesRef.getMonth() + delta, 1, 12, 0, 0, 0);
  agDataSelecionada = agDataNoMes(agHojeIso(), agMesRef)
    ? agHojeIso()
    : agIsoFromDate(new Date(agMesRef.getFullYear(), agMesRef.getMonth(), 1, 12, 0, 0, 0));
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);
  renderAgendamentos();
}

function abrirAgendamentoModal(dataIso) {
  const corretorSelect = document.getElementById('ma-corretor');
  if (!corretorSelect) return;
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Novos agendamentos estão bloqueados até aplicar a tabela no Supabase.'
      : 'Novos agendamentos estão temporariamente bloqueados enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }

  const usuariosPermitidos = agUsuariosPermitidosCadastro();
  if (!usuariosPermitidos.length) {
    showToast('⚠️', 'Não há corretores disponíveis para o seu perfil cadastrar agendamentos.');
    return;
  }

  document.getElementById('ma-title').textContent = zUiText('Novo agendamento');
  document.getElementById('ma-preenchimento').value = agHojeIso();
  document.getElementById('ma-cliente').value = '';
  document.getElementById('ma-telefone').value = '';
  document.getElementById('ma-horario').value = '09:00';
  document.getElementById('ma-tipo').value = AG_TIPOS_VISITA[0];
  document.getElementById('ma-data').value = agDataValidaIso(dataIso) ? dataIso : (agDataSelecionada || agHojeIso());

  atualizarCamposAgendamentoModal();

  if (role === 'cor' && usuarioLogado) {
    const usuarioAtual = usuariosPermitidos.find(usuario => agMesmoUsuario(usuario, usuarioLogado));
    if (usuarioAtual) corretorSelect.value = String(usuarioAtual.id);
  }

  document.getElementById('m-agendamento').classList.add('show');
  setTimeout(() => document.getElementById('ma-cliente').focus(), 100);
}

function fecharAgendamentoModal() {
  const modal = document.getElementById('m-agendamento');
  if (modal) modal.classList.remove('show');
}

function handleBackdropAgendamento(event) {
  if (event.target === document.getElementById('m-agendamento')) fecharAgendamentoModal();
}

function atualizarCamposAgendamentoModal() {
  const unidadeSelect = document.getElementById('ma-unidade');
  const equipeSelect = document.getElementById('ma-equipe');
  if (!unidadeSelect || !equipeSelect) return;

  const unidades = agUnidadesPermitidasCriacao();
  const unidadeAtual = unidades.includes(unidadeSelect.value) ? unidadeSelect.value : (unidades[0] || '');
  unidadeSelect.innerHTML = unidades.map(unidade => `<option value="${agTexto(unidade)}">${agTexto(unidade)}</option>`).join('');
  unidadeSelect.value = unidadeAtual;
  unidadeSelect.disabled = unidades.length <= 1;

  const usuariosUnidade = agUsuariosPermitidosCadastro().filter(usuario => agUsuarioDisponivelNaUnidade(usuario, unidadeSelect.value));
  const equipes = [...new Set(usuariosUnidade.map(agEquipeValor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const equipeAtual = equipes.includes(equipeSelect.value) ? equipeSelect.value : (equipes[0] || '');

  if (equipes.length) {
    equipeSelect.innerHTML = equipes.map(equipe => `<option value="${agTexto(equipe)}">${agTexto(equipe)}</option>`).join('');
    equipeSelect.value = equipeAtual;
  } else {
    equipeSelect.innerHTML = '<option value="">Sem equipe disponível</option>';
    equipeSelect.value = '';
  }

  equipeSelect.disabled = equipes.length <= 1;
  atualizarCorretoresAgendamentoModal();
}

function atualizarCorretoresAgendamentoModal() {
  const unidade = document.getElementById('ma-unidade');
  const equipe = document.getElementById('ma-equipe');
  const corretor = document.getElementById('ma-corretor');
  if (!unidade || !equipe || !corretor) return;

  const atual = corretor.value;
  const usuarios = agUsuariosPermitidosCadastro()
    .filter(usuario => agUsuarioDisponivelNaUnidade(usuario, unidade.value))
    .filter(usuario => !equipe.value || agEquipeValor(usuario) === equipe.value)
    .sort((a, b) => agTexto(a.nome).localeCompare(agTexto(b.nome), 'pt-BR'));

  if (usuarios.length) {
    corretor.innerHTML = usuarios.map(usuario => `<option value="${usuario.id}">${agTexto(usuario.nome)}</option>`).join('');
    const opcaoAtual = usuarios.some(usuario => String(usuario.id) === String(atual)) ? atual : String(usuarios[0].id);
    corretor.value = opcaoAtual;
  } else {
    corretor.innerHTML = '<option value="">Nenhum corretor disponível</option>';
    corretor.value = '';
  }

  corretor.disabled = role === 'cor' || usuarios.length <= 1;
}

async function salvarAgendamento() {
  if (agMutacaoBloqueada()) {
    const info = agStatusSyncInfo();
    showToast('⚠️', info.tabelaAusente
      ? 'Novos agendamentos estão bloqueados até aplicar a tabela no Supabase.'
      : 'Novos agendamentos estão temporariamente bloqueados enquanto a sincronização compartilhada estiver indisponível.');
    return;
  }
  const btn = document.getElementById('ma-save-btn');
  const preenchidoEm = document.getElementById('ma-preenchimento').value;
  const unidade = document.getElementById('ma-unidade').value;
  const equipe = document.getElementById('ma-equipe').value;
  const corretorId = document.getElementById('ma-corretor').value;
  const cliente = agTexto(document.getElementById('ma-cliente').value).toUpperCase();
  const telefone = agTexto(document.getElementById('ma-telefone').value);
  const dataAgendamento = document.getElementById('ma-data').value;
  const horarioAgendamento = agHoraNormalizada(document.getElementById('ma-horario').value);
  const tipoVisita = document.getElementById('ma-tipo').value;
  const corretorUsuario = agUsuariosPermitidosCadastro().find(usuario => String(usuario.id) === String(corretorId));

  if (!agDataValidaIso(preenchidoEm)) { showToast('⚠️', 'Informe a data do preenchimento.'); return; }
  if (!unidade) { showToast('⚠️', 'Selecione a unidade.'); return; }
  if (!equipe) { showToast('⚠️', 'Selecione a equipe.'); return; }
  if (!corretorUsuario) { showToast('⚠️', 'Selecione o corretor responsável.'); return; }
  if (!cliente) { showToast('⚠️', 'Informe o nome do cliente.'); return; }
  if (!telefone) { showToast('⚠️', 'Informe o telefone do cliente.'); return; }
  if (!agDataValidaIso(dataAgendamento)) { showToast('⚠️', 'Informe a data do agendamento.'); return; }
  if (!horarioAgendamento) { showToast('⚠️', 'Informe o horário do agendamento.'); return; }
  if (!AG_TIPOS_VISITA.includes(tipoVisita)) { showToast('⚠️', 'Selecione o tipo de visita.'); return; }

  const novo = {
    id: nextAgendamentoId++,
    preenchidoEm,
    unidade,
    equipe,
    corretorId: parseInt(corretorUsuario.id, 10) || 0,
    corretor: agTexto(corretorUsuario.nome),
    corretorEmail: agTexto(corretorUsuario.email).toLowerCase(),
    cliente,
    telefone,
    dataAgendamento,
    horarioAgendamento,
    tipoVisita,
    criadoPor: usuarioLogado ? agTexto(usuarioLogado.nome) : 'Sistema',
    criadoPorId: usuarioLogado ? (parseInt(usuarioLogado.id, 10) || 0) : 0,
    criadoPorEmail: usuarioLogado ? agTexto(usuarioLogado.email).toLowerCase() : '',
    situacao: 'Agendado',
    tratativaEm: '',
    tratativaPor: '',
    tratativaPorId: 0,
    tratativaPorEmail: '',
    reagendadoParaData: '',
    reagendadoParaHorario: '',
    origemAgendamentoId: 0,
    novoAgendamentoId: 0,
    atualizadoEm: new Date().toISOString(),
    refLocal: typeof gerarRefLocalAgendamento === 'function' ? gerarRefLocalAgendamento() : '',
    syncPendente: true,
    syncErro: ''
  };
  if (typeof marcarAgendamentoSyncPendente === 'function') marcarAgendamentoSyncPendente(novo);

  AGENDAMENTOS.push(novo);
  const ordenados = agOrdenarLista(AGENDAMENTOS);
  AGENDAMENTOS.splice(0, AGENDAMENTOS.length, ...ordenados);
  zSetState('state.data.agendamentos', AGENDAMENTOS);
  zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
  salvarLS();

  agMesRef = new Date(agDataHoraRef(novo.dataAgendamento, '12:00').getFullYear(), agDataHoraRef(novo.dataAgendamento, '12:00').getMonth(), 1, 12, 0, 0, 0);
  agDataSelecionada = novo.dataAgendamento;
  zSetState('state.ui.agMesRef', agMesRef);
  zSetState('state.ui.agDataSelecionada', agDataSelecionada);

  if (btn) {
    btn.disabled = true;
    btn.textContent = zUiText('💾 Salvando...');
  }

  fecharAgendamentoModal();
  renderAgendamentos();
  verificarPendenciasAgendamento();

  try {
    await dbSalvarAgendamento(novo);
    if (parseInt(novo.id, 10) >= nextAgendamentoId) {
      nextAgendamentoId = parseInt(novo.id, 10) + 1;
      zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
    }
    salvarLS();
    renderAgendamentos();
    showToast('✅', 'Agendamento salvo com sucesso.');
  } catch (erro) {
    console.warn('Falha ao sincronizar agendamento no banco:', erro && erro.message ? erro.message : erro);
    salvarLS();
    renderAgendamentos();
    showToast('⚠️', 'O agendamento não foi sincronizado com o Supabase. Este registro ficou pendente apenas neste navegador.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText('✓ Salvar agendamento');
    }
  }
}

zRegisterModule('agendamentos', {
  renderAgendamentos,
  abrirAgendamentoModal,
  fecharAgendamentoModal,
  handleBackdropAgendamento,
  atualizarCamposAgendamentoModal,
  atualizarCorretoresAgendamentoModal,
  selecionarAgendamentoData,
  mudarMesAgendamento,
  agAtualizarFiltroPeriodo,
  limparFiltrosAgendamento,
  salvarAgendamento,
  temTratativaAgendamentoObrigatoriaAberta,
  verificarPendenciasAgendamento,
  iniciarMonitorTratativaAgendamento,
  encerrarMonitorTratativaAgendamento,
  selecionarTratativaAgendamento,
  confirmarTratativaAgendamento,
  handleBackdropAgendamentoTratativa,
  abrirTratativaAgendamentoManual,
  handleAgendamentoCardKeydown,
  fecharTratativaAgendamentoModal
});
