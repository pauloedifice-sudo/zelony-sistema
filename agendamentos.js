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
let agMostrarTodosProximos = false;
const AG_TIPOS_VISITA = ['Primeiro atendimento', 'Fechamento', 'Envio de documentacao online'];
const AG_CANAIS_AGENDAMENTO = ['Presencial - escritorio', 'Online - WhatsApp'];
const AG_SITUACOES = ['Agendado', 'Concluída', 'Reagendado', 'Cliente cancelou'];
const AG_SITUACAO_AGENDADO = AG_SITUACOES[0];
const AG_SITUACAO_CONCLUIDA = AG_SITUACOES[1];
const AG_SITUACAO_REAGENDADO = AG_SITUACOES[2];
const AG_SITUACAO_CANCELADO = AG_SITUACOES[3];
const AG_DATA_MIN_OPERACIONAL = '2020-01-01';
const AG_DATA_MAX_OPERACIONAL = '2035-12-31';
let agTratativaFila = [];
let agTratativaAtualId = 0;
let agTratativaSelecao = '';
let agTratativaModo = '';
let agPendenciaTimer = null;
let agPendenciaEventosRegistrados = false;
const AG_REFRESH_INTERVAL_MS = 60000;
const AG_REFRESH_COOLDOWN_MS = 15000;
const AG_TRATATIVA_BLOQUEIO_AVISO_MS = 45000;
let agUltimaTentativaRecargaEm = 0;
let agUltimoAvisoTratativaBloqueadaEm = 0;

zSetState('state.ui.nextAgendamentoId', nextAgendamentoId);
zSetState('state.ui.agMesRef', agMesRef);
zSetState('state.ui.agDataSelecionada', agDataSelecionada);
zSetState('state.ui.agBusca', agBusca);
zSetState('state.ui.agFiltroUnidade', agFiltroUnidade);
zSetState('state.ui.agFiltroEquipe', agFiltroEquipe);
zSetState('state.ui.agFiltroCorretor', agFiltroCorretor);
zSetState('state.ui.agFiltroDataDe', agFiltroDataDe);
zSetState('state.ui.agFiltroDataAte', agFiltroDataAte);
zSetState('state.ui.agMostrarTodosProximos', agMostrarTodosProximos);
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

function agTelefoneDigitos(valor) {
  let digitos = agTexto(valor).replace(/\D/g, '');
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    digitos = digitos.slice(2);
  }
  return digitos.slice(0, 11);
}

function agTelefoneValido(valor) {
  const digitos = agTelefoneDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

function agFormatarTelefone(valor) {
  const digitos = agTelefoneDigitos(valor);
  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function agEncontrarConflitoTelefoneAgendamento(telefone, opcoes = {}) {
  const telefoneChave = agTelefoneDigitos(telefone);
  if (!telefoneChave) return null;
  const ignorarId = parseInt(opcoes.ignorarId, 10) || 0;
  const ignorarRefLocal = agTexto(opcoes.ignorarRefLocal || '');
  return (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => {
    if (!item) return false;
    if (agSituacao(item) !== AG_SITUACAO_AGENDADO) return false;
    if (agTelefoneDigitos(item.telefone) !== telefoneChave) return false;
    if (ignorarId && (parseInt(item.id, 10) || 0) === ignorarId) return false;
    if (ignorarRefLocal && agTexto(item.refLocal || item.ref_local) === ignorarRefLocal) return false;
    return true;
  }) || null;
}

function agMensagemConflitoTelefoneAgendamento(item) {
  const cliente = agTexto(item && item.cliente || 'este cliente');
  const corretor = agTexto(item && item.corretor || '');
  const data = agDataValidaIso(item && item.dataAgendamento) ? agFormatoDataCurta(item.dataAgendamento) : '';
  const hora = agHoraNormalizada(item && item.horarioAgendamento || '');
  let msg = `Ja existe um compromisso em aberto para ${cliente}`;
  if (corretor) msg += ` com ${corretor}`;
  if (data) msg += ` em ${data}`;
  if (hora) msg += ` as ${hora}`;
  return `${msg}. Finalize ou reagende o agendamento atual antes de criar outro.`;
}

function formatarTelefoneAgendamento(input) {
  if (!input) return;
  input.value = agFormatarTelefone(input.value);
}

function agSituacao(item) {
  const situacao = agTexto(item && item.situacao);
  return AG_SITUACOES.includes(situacao) ? situacao : AG_SITUACAO_AGENDADO;
}

function agSituacaoClasse(situacao) {
  const valor = agTexto(situacao || AG_SITUACAO_AGENDADO);
  if (valor === AG_SITUACAO_CONCLUIDA) return 'done';
  if (valor === AG_SITUACAO_REAGENDADO) return 'rescheduled';
  if (valor === AG_SITUACAO_CANCELADO) return 'cancelled';
  return 'pending';
}

function agTipoVisitaValor(valor) {
  const tipo = agTexto(valor);
  return AG_TIPOS_VISITA.includes(tipo) ? tipo : AG_TIPOS_VISITA[0];
}

function agTipoPrimeiro(item) {
  return agTipoVisitaValor(item && item.tipoVisita) === 'Primeiro atendimento';
}

function agTipoFechamento(item) {
  return agTipoVisitaValor(item && item.tipoVisita) === 'Fechamento';
}

function agTipoDocumentacao(item) {
  return agTipoVisitaValor(item && item.tipoVisita) === 'Envio de documentacao online';
}

function agCanalPadraoPorTipo(tipoVisita) {
  return agTipoVisitaValor(tipoVisita) === 'Envio de documentacao online'
    ? 'Online - WhatsApp'
    : 'Presencial - escritorio';
}

function agCanalAgendamentoValor(valor, tipoVisita = '') {
  const canal = agTexto(valor);
  return AG_CANAIS_AGENDAMENTO.includes(canal) ? canal : agCanalPadraoPorTipo(tipoVisita);
}

function agTipoBadgeClasse(item) {
  if (agTipoDocumentacao(item)) return 'docs';
  if (agTipoFechamento(item)) return 'close';
  return 'first';
}

function agTipoBadgeRotulo(item) {
  const tipo = agTipoVisitaValor(item && item.tipoVisita);
  return tipo === 'Envio de documentacao online' ? 'Docs online' : tipo;
}

function agCanalBadgeClasse(item) {
  return agCanalAgendamentoValor(item && item.canalAgendamento, item && item.tipoVisita) === 'Online - WhatsApp'
    ? 'online'
    : 'office';
}

function agCanalBadgeRotulo(item) {
  return agCanalAgendamentoValor(item && item.canalAgendamento, item && item.tipoVisita) === 'Online - WhatsApp'
    ? 'WhatsApp'
    : 'Presencial';
}

function agRotuloConclusao(item) {
  return agTipoDocumentacao(item) ? 'Documentacao recebida' : 'Visita concluida';
}

function agDescricaoConclusao(item) {
  return agTipoDocumentacao(item)
    ? 'O cliente enviou a documentacao para analise online.'
    : 'O cliente foi atendido normalmente.';
}

function agSituacaoExibicao(item) {
  return agSituacaoNormalizada(item) === 'concluida' ? agRotuloConclusao(item) : agTexto(agSituacao(item));
}

function agHintTratativa(item) {
  return agTipoDocumentacao(item)
    ? 'Clique no compromisso para registrar documentacao recebida, reagendamento ou cancelamento.'
    : 'Clique no compromisso para registrar visita concluida, reagendamento ou cancelamento.';
}

function agHojeIso() {
  const hojeRef = new Date();
  return `${hojeRef.getFullYear()}-${pad2(hojeRef.getMonth() + 1)}-${pad2(hojeRef.getDate())}`;
}

function agIsoFromDate(ref) {
  return `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`;
}

function agDataPartesIso(valor) {
  const texto = String(valor || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const ref = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  if (Number.isNaN(ref.getTime())) return null;
  if (ref.getFullYear() !== ano || (ref.getMonth() + 1) !== mes || ref.getDate() !== dia) return null;
  return { texto, ano, mes, dia, ref };
}

function agDataValidaIso(valor) {
  return !!agDataPartesIso(valor);
}

function agDataOperacionalValida(valor) {
  const partes = agDataPartesIso(valor);
  if (!partes) return false;
  return partes.texto >= AG_DATA_MIN_OPERACIONAL && partes.texto <= AG_DATA_MAX_OPERACIONAL;
}

function agHoraNormalizada(valor) {
  const bruto = String(valor || '').trim();
  const match = bruto.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${pad2(match[1])}:${match[2]}`;
}

function agDataHoraRef(dataIso, hora) {
  const partes = agDataPartesIso(dataIso);
  if (!partes) return null;
  const horaBase = agHoraNormalizada(hora) || '12:00';
  const [h, m] = horaBase.split(':').map(Number);
  const ref = new Date(partes.ano, partes.mes - 1, partes.dia, h, m, 0, 0);
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

function agPodeReceberTratativaObrigatoria(item, usuario = usuarioLogado) {
  if (!item || !usuario) return false;
  if (!agendamentoVisivel(item)) return false;
  if (agSituacao(item) !== AG_SITUACAO_AGENDADO) return false;
  return agMesmoLancador(item, usuario);
}

function agTratativaPendente(item) {
  if (!agPodeReceberTratativaObrigatoria(item)) return false;
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
  const lancadorEmail = agTexto(item.criadoPorEmail).toLowerCase();
  const usuarioEmail = agTexto(usuario.email).toLowerCase();
  if (lancadorEmail && usuarioEmail) return lancadorEmail === usuarioEmail;

  const lancadorNome = agNormalizarTexto(item.criadoPor);
  const usuarioNome = agNormalizarTexto(usuario.nome);
  if (lancadorNome && usuarioNome) return lancadorNome === usuarioNome;

  const lancadorId = parseInt(item.criadoPorId, 10) || 0;
  const usuarioId = parseInt(usuario.id, 10) || 0;
  return !!(lancadorId && usuarioId && lancadorId === usuarioId);
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
        item.tipoVisita,
        item.canalAgendamento
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

function agAvisarTratativaBloqueada() {
  const agora = Date.now();
  if (agUltimoAvisoTratativaBloqueadaEm && (agora - agUltimoAvisoTratativaBloqueadaEm) < AG_TRATATIVA_BLOQUEIO_AVISO_MS) return;
  agUltimoAvisoTratativaBloqueadaEm = agora;

  const info = agStatusSyncInfo();
  showToast('ALERTA', info.tabelaAusente
    ? 'Existe uma tratativa pendente, mas a base compartilhada de agendamentos ainda nao esta disponivel. A navegacao foi liberada para nao prender voce nessa tela.'
    : 'Existe uma tratativa pendente, mas a sincronizacao dos agendamentos esta indisponivel agora. A navegacao foi liberada para nao prender voce nessa tela.');
}

function agModuloVisivel() {
  const modulo = document.getElementById('mod-agendamentos');
  return !!(modulo && !modulo.classList.contains('hidden'));
}

async function agAtualizarDadosCompartilhados(opcoes = {}) {
  const telaLogin = document.getElementById('login-screen');
  if (!usuarioLogado || (telaLogin && !telaLogin.classList.contains('hidden'))) {
    return { ignorado: true, motivo: 'sessao' };
  }
  if (typeof recarregarAgendamentosCompartilhados !== 'function') {
    return { ignorado: true, motivo: 'indisponivel' };
  }

  const cooldownInformado = parseInt(opcoes.cooldownMs, 10);
  const cooldownMs = Number.isFinite(cooldownInformado) ? Math.max(0, cooldownInformado) : AG_REFRESH_COOLDOWN_MS;
  const agora = Date.now();
  if (!opcoes.forcar && agUltimaTentativaRecargaEm && (agora - agUltimaTentativaRecargaEm) < cooldownMs) {
    return { ignorado: true, motivo: 'cooldown' };
  }

  agUltimaTentativaRecargaEm = agora;
  return recarregarAgendamentosCompartilhados({
    salvarCache: opcoes.salvarCache !== false,
    renderizar: opcoes.renderizar !== false && agModuloVisivel(),
    renderizarDashboard: opcoes.renderizarDashboard !== false,
    atualizarNotificacoes: opcoes.atualizarNotificacoes !== false
  });
}

function agAtualizarDadosCompartilhadosEmSegundoPlano(opcoes = {}) {
  agAtualizarDadosCompartilhados(opcoes).catch(error => {
    console.warn('Falha ao recarregar agenda compartilhada:', error && error.message ? error.message : error);
  });
}

function agMonitorarAgendaCompartilhada(opcoes = {}) {
  const opcoesTratativa = opcoes.forcarPendencias ? { forcar: true } : {};
  agAtualizarDadosCompartilhados(opcoes)
    .catch(error => {
      console.warn('Falha ao atualizar agenda compartilhada:', error && error.message ? error.message : error);
    })
    .finally(() => {
      if (opcoes.verificarPendencias !== false) {
        verificarPendenciasAgendamento(opcoesTratativa);
      }
    });
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

function agFormatarDataRelatorio(valor, opcoes = {}) {
  if (!valor) return '—';
  if (agDataValidaIso(valor)) return agFormatoDataCurta(valor);
  const data = new Date(valor);
  if (!Number.isNaN(data.getTime())) {
    return formatarDataLocal(data, {
      comAno: opcoes.comAno !== false,
      comHora: !!opcoes.comHora
    });
  }
  return agTexto(valor);
}

function agFormatarDataHoraRelatorio(dataIso, hora) {
  const dataTxt = dataIso ? agFormatarDataRelatorio(dataIso) : '';
  const horaTxt = agTexto(hora || '');
  if (dataTxt && horaTxt) return `${dataTxt} ${horaTxt}`;
  return dataTxt || horaTxt || '—';
}

function agSituacaoNormalizada(item) {
  return agNormalizarTexto(agSituacao(item));
}

function agResumoDashboardTipo(lista, filtroTipo) {
  const filtrados = (Array.isArray(lista) ? lista : []).filter(filtroTipo);
  return {
    total: filtrados.length,
    concluidos: filtrados.filter(item => agSituacaoNormalizada(item) === 'concluida').length,
    reagendados: filtrados.filter(item => agSituacaoNormalizada(item) === 'reagendado').length,
    cancelados: filtrados.filter(item => agSituacaoNormalizada(item) === 'cliente cancelou').length
  };
}

function agAtivoRelatorio(item) {
  return agSituacaoNormalizada(item) === 'agendado' && agAgendamentoAtivoFuturo(item);
}

function agResumoTratativaRelatorio(item) {
  const partes = [];
  const por = agTexto(item && item.tratativaPor);
  if (por) partes.push(por);
  const em = agFormatarDataRelatorio(item && item.tratativaEm, { comHora: true });
  if (em && em !== '—') partes.push(em);
  if (partes.length) return partes.join(' | ');
  return agSituacaoNormalizada(item) === 'agendado' ? 'Sem tratativa' : agSituacaoExibicao(item);
}

function agResumoReagendamentoRelatorio(item) {
  const resumo = agFormatarDataHoraRelatorio(item && item.reagendadoParaData, item && item.reagendadoParaHorario);
  if (resumo === '—') return '—';
  const novoId = parseInt(item && item.novoAgendamentoId, 10) || 0;
  return novoId ? `${resumo} | novo #${novoId}` : resumo;
}

function agFiltrosResumoRelatorio() {
  const filtros = [];
  const periodo = agPeriodoNormalizado();
  filtros.push(`Periodo: ${agPeriodoResumo(periodo)}`);
  if (agBusca.trim()) filtros.push(`Busca: ${agTexto(agBusca)}`);
  if (agFiltroUnidade) filtros.push(`Unidade: ${agTexto(agFiltroUnidade)}`);
  if (agFiltroEquipe) filtros.push(`Equipe: ${agTexto(agFiltroEquipe)}`);
  if (agFiltroCorretor) {
    const corretorAtual = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : [])
      .find(item => agCorretorFiltroValor(item) === agFiltroCorretor);
    filtros.push(`Corretor: ${agTexto(corretorAtual && corretorAtual.corretor || agFiltroCorretor)}`);
  }
  return filtros;
}

function agColetarDadosRelatorio() {
  const periodo = agPeriodoNormalizado();
  const base = agOrdenarLista((Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).filter(agendamentoVisivel));
  const basePeriodo = agFiltrarPeriodo(base, periodo);
  const lista = agFiltrarLista(basePeriodo, true);
  return {
    periodo,
    lista,
    periodoResumo: agPeriodoResumo(periodo),
    filtrosResumo: agFiltrosResumoRelatorio(),
    total: lista.length,
    ativos: lista.filter(agAgendamentoAtivoFuturo).length,
    concluidos: lista.filter(item => agSituacaoNormalizada(item) === 'concluida').length,
    reagendados: lista.filter(item => agSituacaoNormalizada(item) === 'reagendado').length,
    cancelados: lista.filter(item => agSituacaoNormalizada(item) === 'cliente cancelou').length,
    primeiros: lista.filter(agTipoPrimeiro).length,
    documentacaoOnline: lista.filter(agTipoDocumentacao).length,
    fechamentos: lista.filter(agTipoFechamento).length,
    proximos7Dias: agContarProximosDias(lista.filter(agAgendamentoAtivoFuturo), 7),
    tratativasPendentes: lista.filter(agTratativaPendente).length,
    pendentesSync: lista.filter(item => !!(item && item.syncPendente)).length
  };
}

function agNovoResumoTipoRelatorio(nome) {
  return {
    nome,
    primeiraAtivos: 0,
    primeiraConcluida: 0,
    primeiraCancelada: 0,
    primeiraTotal: 0,
    documentacaoAtivos: 0,
    documentacaoConcluida: 0,
    documentacaoCancelada: 0,
    documentacaoTotal: 0,
    fechamentoAtivos: 0,
    fechamentoConcluida: 0,
    fechamentoCancelada: 0,
    fechamentoTotal: 0,
    totalGeral: 0
  };
}

function agAtualizarResumoTipoRelatorio(registro, item) {
  const situacao = agSituacaoNormalizada(item);
  const prefixo = agTipoDocumentacao(item) ? 'documentacao' : (agTipoFechamento(item) ? 'fechamento' : 'primeira');
  registro[`${prefixo}Total`] += 1;
  registro.totalGeral += 1;
  if (agAtivoRelatorio(item)) registro[`${prefixo}Ativos`] += 1;
  if (situacao === 'concluida') registro[`${prefixo}Concluida`] += 1;
  if (situacao === 'cliente cancelou') registro[`${prefixo}Cancelada`] += 1;
}

function agResumoRelatorioPorCampo(lista, obterNome) {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach(item => {
    const nome = agTexto(obterNome(item)) || 'Nao informado';
    const chave = agNormalizarTexto(nome) || nome;
    if (!mapa.has(chave)) {
      mapa.set(chave, agNovoResumoTipoRelatorio(nome));
    }
    agAtualizarResumoTipoRelatorio(mapa.get(chave), item);
  });
  return Array.from(mapa.values())
    .sort((a, b) => b.totalGeral - a.totalGeral || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function agResumoPorCorretor(lista) {
  return agResumoRelatorioPorCampo(lista, item => item && item.corretor);
}

function agResumoPorEquipe(lista) {
  return agResumoRelatorioPorCampo(lista, item => agEquipeValor(item));
}

function agLinhaResumoTipoRelatorio(item) {
  return [
    item.nome,
    item.primeiraAtivos,
    item.primeiraConcluida,
    item.primeiraCancelada,
    item.primeiraTotal,
    item.documentacaoAtivos,
    item.documentacaoConcluida,
    item.documentacaoCancelada,
    item.documentacaoTotal,
    item.fechamentoAtivos,
    item.fechamentoConcluida,
    item.fechamentoCancelada,
    item.fechamentoTotal
  ];
}

function agDesenharTabelaResumoTipo(doc, config) {
  const head = [
    [
      { content: config.titulo, rowSpan: 2 },
      { content: 'Primeiro atendimento', colSpan: 4 },
      { content: 'Documentacao online', colSpan: 4 },
      { content: 'Fechamento', colSpan: 4 }
    ],
    ['Ativos', 'Concluida', 'Cancelada', 'Total', 'Ativos', 'Concluida', 'Cancelada', 'Total', 'Ativos', 'Concluida', 'Cancelada', 'Total']
  ];
  const numeroWidth = config.numeroWidth || 17;
  doc.autoTable({
    startY: config.startY,
    tableWidth: config.tableWidth,
    margin: { left: config.left, right: config.right || 10 },
    head,
    body: (config.lista || []).map(agLinhaResumoTipoRelatorio),
    theme: 'plain',
    headStyles: { fillColor: [253, 248, 238], textColor: [184, 144, 42], fontSize: 6.6, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 6.4, textColor: [60, 48, 30], valign: 'middle' },
    alternateRowStyles: { fillColor: [250, 245, 236] },
    styles: { cellPadding: 1.5, overflow: 'linebreak', lineColor: [232, 220, 192], lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: config.nomeWidth || 58, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: numeroWidth, halign: 'center' },
      2: { cellWidth: numeroWidth, halign: 'center' },
      3: { cellWidth: numeroWidth, halign: 'center' },
      4: { cellWidth: numeroWidth, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: numeroWidth, halign: 'center' },
      6: { cellWidth: numeroWidth, halign: 'center' },
      7: { cellWidth: numeroWidth, halign: 'center' },
      8: { cellWidth: numeroWidth, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: numeroWidth, halign: 'center' },
      10: { cellWidth: numeroWidth, halign: 'center' },
      11: { cellWidth: numeroWidth, halign: 'center' },
      12: { cellWidth: numeroWidth, halign: 'center', fontStyle: 'bold' }
    }
  });
  return doc.lastAutoTable.finalY;
}

function exportarRelatorioAgendamentos() {
  const btn = document.getElementById('ag-report-btn');
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando relatorio...';
  }

  setTimeout(() => {
    try {
      const dados = agColetarDadosRelatorio();
      if (!dados.lista.length) {
        showToast('PDF', 'Nao ha agendamentos visiveis com os filtros atuais para gerar o relatorio.');
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca PDF indisponivel.');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      if (typeof doc.autoTable !== 'function') throw new Error('Plugin de tabelas do PDF indisponivel.');

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const filtrosLinha = dados.filtrosResumo.join(' | ');
      const resumoCorretor = agResumoPorCorretor(dados.lista);
      const resumoEquipe = agResumoPorEquipe(dados.lista);

      doc.setFillColor(184, 144, 42);
      doc.rect(0, 0, W, 24, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('ZELONY IMOVEIS', 12, 10);
      doc.setFontSize(11);
      doc.text('RELATORIO DE AGENDAMENTOS', 12, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Gerado em ${hoje()} | ${dados.total} registro(s)`, W - 12, 16, { align: 'right' });

      doc.setFillColor(253, 248, 238);
      doc.roundedRect(10, 29, W - 20, 22, 3, 3, 'F');
      doc.setDrawColor(220, 185, 100);
      doc.roundedRect(10, 29, W - 20, 22, 3, 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Escopo visivel', 14, 35);
      doc.text('Filtros aplicados', 14, 43);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(70, 56, 32);
      doc.text(doc.splitTextToSize(agResumoPermissao(), W - 44), 42, 35);
      doc.text(doc.splitTextToSize(filtrosLinha, W - 44), 42, 43);

      const kpis = [
        ['Total', String(dados.total)],
        ['Ativos', String(dados.ativos)],
        ['Concluidos', String(dados.concluidos)],
        ['Reagendados', String(dados.reagendados)],
        ['Cancelados', String(dados.cancelados)],
        ['1o atendimento', String(dados.primeiros)],
        ['Docs online', String(dados.documentacaoOnline)],
        ['Fechamentos', String(dados.fechamentos)],
        ['Prox. 7 dias', String(dados.proximos7Dias)]
      ];
      const kpiY = 56;
      const kpiW = (W - 20) / kpis.length;
      kpis.forEach(([label, value], index) => {
        const x = 10 + (index * kpiW);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5, 'F');
        doc.setDrawColor(220, 185, 100);
        doc.roundedRect(x, kpiY, kpiW - 2, 19, 2.5, 2.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(135, 108, 58);
        doc.text(label.toUpperCase(), x + ((kpiW - 2) / 2), kpiY + 6, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(184, 144, 42);
        doc.text(value, x + ((kpiW - 2) / 2), kpiY + 14, { align: 'center' });
      });

      let tabelaResumoY = 81;
      const tabelaResumoW = W - 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Resumo por corretor', 10, tabelaResumoY - 3);
      let resumoCorretorFinalY = agDesenharTabelaResumoTipo(doc, {
        titulo: 'Corretor',
        lista: resumoCorretor,
        startY: tabelaResumoY,
        tableWidth: tabelaResumoW,
        left: 10,
        nomeWidth: 60,
        numeroWidth: 17
      });

      tabelaResumoY = resumoCorretorFinalY + 11;
      if (tabelaResumoY > H - 58) {
        doc.addPage();
        tabelaResumoY = 24;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(120, 92, 46);
      doc.text('Resumo por equipe', 10, tabelaResumoY - 3);
      let resumoEquipeFinalY = agDesenharTabelaResumoTipo(doc, {
        titulo: 'Equipe',
        lista: resumoEquipe,
        startY: tabelaResumoY,
        tableWidth: tabelaResumoW,
        left: 10,
        nomeWidth: 60,
        numeroWidth: 17
      });

      let infoY = resumoEquipeFinalY + 6;
      if (infoY > H - 22) {
        doc.addPage();
        infoY = 18;
      }
      doc.setFillColor(253, 248, 238);
      doc.roundedRect(10, infoY, W - 20, 15, 2.5, 2.5, 'F');
      doc.setDrawColor(220, 185, 100);
      doc.roundedRect(10, infoY, W - 20, 15, 2.5, 2.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(120, 92, 46);
      doc.text('Leitura rapida do periodo', 14, infoY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      doc.setTextColor(70, 56, 32);
      const linhaInfo = `Ativos = agendados com data/hora futura. Concluidos = visita concluida ou documentacao recebida. Cancelados = cliente cancelou. Pendentes de tratativa: ${dados.tratativasPendentes}. Pendentes de sincronizacao: ${dados.pendentesSync}.`;
      doc.text(doc.splitTextToSize(linhaInfo, W - 28), 14, infoY + 10.8);

      doc.addPage();
      doc.setFillColor(184, 144, 42);
      doc.rect(0, 0, W, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('Detalhamento completo dos agendamentos', 12, 10);

      doc.autoTable({
        startY: 22,
        tableWidth: W - 14,
        margin: { left: 7, right: 7 },
        head: [[
          '#',
          'Preench.',
          'Data',
          'Hora',
          'Tipo',
          'Canal',
          'Situacao',
          'Unidade',
          'Equipe',
          'Corretor',
          'Cliente',
          'Telefone',
          'Lancado',
          'Tratativa',
          'Reag.'
        ]],
        body: dados.lista.map(item => [
          item.id || '',
          agFormatarDataRelatorio(item.preenchidoEm),
          agFormatarDataRelatorio(item.dataAgendamento),
          agTexto(item.horarioAgendamento || '—'),
          agTexto(agTipoVisitaValor(item && item.tipoVisita)),
          agTexto(agCanalAgendamentoValor(item && item.canalAgendamento, item && item.tipoVisita)),
          agTexto(agSituacaoExibicao(item)),
          agTexto(item.unidade || '—'),
          agTexto(agEquipeValor(item)),
          agTexto(item.corretor || '—'),
          agTexto(item.cliente || '—'),
          agTexto(agFormatarTelefone(item.telefone || '') || item.telefone || '—'),
          agTexto(item.criadoPor || 'Sistema'),
          agTexto(agResumoTratativaRelatorio(item)),
          agTexto(agResumoReagendamentoRelatorio(item))
        ]),
        theme: 'plain',
        headStyles: { fillColor: [253, 248, 238], textColor: [184, 144, 42], fontSize: 6.2, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 5.9, textColor: [60, 48, 30], valign: 'top' },
        alternateRowStyles: { fillColor: [250, 245, 236] },
        styles: { cellPadding: 1.3, overflow: 'linebreak', lineColor: [232, 220, 192], lineWidth: 0.12 },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 12 },
          2: { cellWidth: 12 },
          3: { cellWidth: 9 },
          4: { cellWidth: 20 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
          7: { cellWidth: 12 },
          8: { cellWidth: 15 },
          9: { cellWidth: 22 },
          10: { cellWidth: 24 },
          11: { cellWidth: 17 },
          12: { cellWidth: 18 },
          13: { cellWidth: 30 },
          14: { cellWidth: 20 }
        },
        didDrawPage: data => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(140, 110, 60);
          doc.text(`Relatorio de agendamentos | ${hoje()} | Pag. ${data.pageNumber}`, W / 2, H - 4, { align: 'center' });
        }
      });

      doc.save(`agendamentos-relatorio-${agHojeIso()}.pdf`);
      showToast('OK', 'Relatorio de agendamentos gerado com sucesso.');
    } catch (erro) {
      console.error('Erro ao gerar relatorio de agendamentos:', erro);
      showToast('ERRO', 'Nao foi possivel gerar o relatorio dos agendamentos.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal || 'Relatorio PDF';
      }
    }
  }, 80);
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

function alternarListaProximosAgendamentos() {
  agMostrarTodosProximos = !agMostrarTodosProximos;
  zSetState('state.ui.agMostrarTodosProximos', agMostrarTodosProximos);
  renderAgendamentos();
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
    const mais = eventos.length > 2
      ? `<div class="ag-day-more">+${eventos.length - 2} compromisso${eventos.length - 2 !== 1 ? 's' : ''} • clique no dia para ver todos</div>`
      : '';
    const rotuloDia = eventos.length
      ? `Ver agenda completa de ${agFormatoDataCurta(iso)} com ${eventos.length} compromisso${eventos.length !== 1 ? 's' : ''}`
      : `Selecionar ${agFormatoDataCurta(iso)}`;

    if (dentroDoMes) {
      corpo += `<button type="button" class="${classes.join(' ')}" title="${agAttr(rotuloDia)}" aria-label="${agAttr(rotuloDia)}" onclick="selecionarAgendamentoData('${iso}')">${topo}<div class="ag-day-list">${previews}${mais}</div></button>`;
    } else {
      corpo += `<div class="${classes.join(' ')}">${topo}</div>`;
    }
  }

  return `<div class="ag-calendar-scroll"><div class="ag-calendar-shell"><div class="ag-weekdays">${cabecalho}</div><div class="ag-grid">${corpo}</div></div></div>`;
}

function agRenderItem(item, opcoes = {}) {
  const mostrarData = !!opcoes.mostrarData;
  const telefoneExibicao = agFormatarTelefone(item.telefone || '') || agTexto(item.telefone || 'Telefone nÃ£o informado');
  const telefoneEncoded = encodeURIComponent(String(telefoneExibicao || ''));
  const tipoClass = agTipoBadgeClasse(item);
  const situacaoClasse = agSituacaoClasse(agSituacao(item));
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
            <span class="ag-badge ${tipoClass}">${agTipoBadgeRotulo(item)}</span>
            <span class="ag-badge channel ${agCanalBadgeClasse(item)}">${agCanalBadgeRotulo(item)}</span>
            <span class="ag-badge status ${situacaoClasse}">${agSituacaoExibicao(item)}</span>
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
        ${podeTratar ? `<div class="ag-item-hint">${agHintTratativa(item)}</div>` : ''}
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
  const rotuloConclusao = agRotuloConclusao(atual);
  const descricaoConclusao = agDescricaoConclusao(atual);
  const canalAgendamento = agCanalAgendamentoValor(atual && atual.canalAgendamento, atual && atual.tipoVisita);

  const idxAtual = Math.max(agTratativaFila.indexOf(atual.id), 0);
  const totalFila = agTratativaFila.length || 1;
  const infoAgendamento = `${agTexto(atual.cliente)} • ${agTexto(atual.dataAgendamento)} às ${agTexto(atual.horarioAgendamento)}`;
  const tituloFila = totalFila > 1 ? `Pendência ${idxAtual + 1} de ${totalFila}` : 'Pendência de tratativa';

  document.getElementById('mat-title').textContent = zUiText(modoObrigatorio ? 'Tratativa obrigatoria do compromisso' : 'Atualizar compromisso');
  document.getElementById('mat-sub').textContent = zUiText(modoObrigatorio ? `${tituloFila} • ${infoAgendamento}` : `Escolha como este compromisso deve ficar registrado. • ${infoAgendamento}`);
  if (botaoFechar) botaoFechar.style.display = modoObrigatorio ? 'none' : 'inline-flex';
  if (botaoSalvar) botaoSalvar.textContent = zUiText(modoObrigatorio ? 'Confirmar tratativa' : 'Salvar atualização');

  corpo.innerHTML = `
    <div class="agt-alert">
      ${modoObrigatorio
        ? 'Este compromisso passou do horario ha mais de 30 minutos. Para seguir usando o sistema, registre a tratativa agora.'
        : 'Se o cliente ja foi atendido, enviou a documentacao, cancelou ou precisou remarcar, registre aqui sem precisar esperar o horario vencer.'}
    </div>

    <div class="agt-info-grid">
      <div class="agt-info-card">
        <span>Cliente</span>
        <strong>${agTexto(atual.cliente)}</strong>
        <small>${agTexto(atual.telefone || 'Telefone não informado')}</small>
      </div>
      <div class="agt-info-card">
        <span>Compromisso</span>
        <strong>${agTexto(atual.dataAgendamento)}</strong>
        <small>${agTexto(atual.horarioAgendamento)} • ${agTexto(agTipoVisitaValor(atual && atual.tipoVisita))} • ${agTexto(canalAgendamento)}</small>
      </div>
      <div class="agt-info-card">
        <span>Equipe</span>
        <strong>${agTexto(agEquipeValor(atual))}</strong>
        <small>${agTexto(atual.unidade)} • ${agTexto(atual.corretor)}</small>
      </div>
      <div class="agt-info-card">
        <span>${modoObrigatorio ? 'Prazo da tratativa' : 'Status atual'}</span>
        <strong>${agTexto(modoObrigatorio ? agFormatarPrazoTratativa(atual) : agSituacaoExibicao(atual))}</strong>
        <small>Lançado por ${agTexto(atual.criadoPor || 'Sistema')}</small>
      </div>
    </div>

    <div class="agt-section">
      <div class="agt-label">Escolha a tratativa</div>
      <div class="agt-options">
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_CONCLUIDA ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_CONCLUIDA)}')">
          <strong>${rotuloConclusao}</strong>
          <span>${descricaoConclusao}</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_REAGENDADO ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_REAGENDADO)}')">
          <strong>Reagendamento</strong>
          <span>Cria automaticamente um novo compromisso com nova data e horario.</span>
        </button>
        <button type="button" class="agt-option ${agTratativaSelecao === AG_SITUACAO_CANCELADO ? 'active' : ''}" onclick="selecionarTratativaAgendamento('${agAttr(AG_SITUACAO_CANCELADO)}')">
          <strong>Cliente cancelou</strong>
          <span>Fecha este compromisso como cancelado pelo cliente.</span>
        </button>
      </div>
    </div>

    <div id="agt-reagendar-box" class="agt-reagendar-box ${agTratativaSelecao === AG_SITUACAO_REAGENDADO ? 'show' : ''}">
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
      <div class="agt-help">Ao confirmar, este compromisso atual fica marcado como reagendado e um novo compromisso sera criado automaticamente.</div>
    </div>
  `;
}

function abrirTratativaAgendamentoModal(item, opcoes = {}) {
  if (!item) return;
  if (opcoes.modo === 'obrigatoria' && agMutacaoBloqueada()) {
    agAvisarTratativaBloqueada();
    return;
  }
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
    const situacao = agSituacaoExibicao(item);
    showToast('⚠️', situacao === 'Agendado'
      ? 'Voce nao tem permissao para alterar este compromisso.'
      : `Esse compromisso ja esta marcado como ${situacao.toLowerCase()}.`);
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

  if (agMutacaoBloqueada()) {
    agTratativaAtualId = 0;
    agTratativaSelecao = '';
    agTratativaModo = '';
    zSetState('state.ui.agTratativaAtualId', agTratativaAtualId);
    zSetState('state.ui.agTratativaSelecao', agTratativaSelecao);
    zSetState('state.ui.agTratativaModo', agTratativaModo);
    fecharTratativaAgendamentoModal(true);
    agAvisarTratativaBloqueada();
    return;
  }

  if (temTratativaAgendamentoObrigatoriaAberta() && !opcoes.forcar) return;
  const atual = (Array.isArray(AGENDAMENTOS) ? AGENDAMENTOS : []).find(item => item.id === fila[0]);
  if (!atual || !agPodeReceberTratativaObrigatoria(atual)) {
    fecharTratativaAgendamentoModal(true);
    return;
  }
  if (atual) abrirTratativaAgendamentoModal(atual, { modo: 'obrigatoria' });
}

function iniciarMonitorTratativaAgendamento() {
  encerrarMonitorTratativaAgendamento();
  agMonitorarAgendaCompartilhada({
    forcar: true,
    renderizar: agModuloVisivel(),
    verificarPendencias: true,
    forcarPendencias: true
  });
  agPendenciaTimer = window.setInterval(() => {
    agMonitorarAgendaCompartilhada({
      renderizar: agModuloVisivel(),
      verificarPendencias: true
    });
  }, AG_REFRESH_INTERVAL_MS);
  if (!agPendenciaEventosRegistrados) {
    window.addEventListener('focus', () => {
      agMonitorarAgendaCompartilhada({
        renderizar: agModuloVisivel(),
        verificarPendencias: true
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        agMonitorarAgendaCompartilhada({
          renderizar: agModuloVisivel(),
          verificarPendencias: true
        });
      }
    });
    agPendenciaEventosRegistrados = true;
  }
}

function encerrarMonitorTratativaAgendamento() {
  if (agPendenciaTimer) {
    window.clearInterval(agPendenciaTimer);
    agPendenciaTimer = null;
  }
  agUltimoAvisoTratativaBloqueadaEm = 0;
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
  if (!AG_SITUACOES.includes(agTratativaSelecao) || agTratativaSelecao === AG_SITUACAO_AGENDADO) {
    showToast('⚠️', 'Escolha a tratativa deste compromisso.');
    return;
  }

  const agoraIso = new Date().toISOString();
  const usuarioAtual = usuarioLogado || {};
  const btn = document.getElementById('mat-save-btn');
  const modoTratativa = agTratativaModo || 'manual';
  const novosAgendamentos = [];

  if (agTratativaSelecao === AG_SITUACAO_REAGENDADO) {
    const novaData = document.getElementById('agt-nova-data') ? document.getElementById('agt-nova-data').value : '';
    const novoHorario = document.getElementById('agt-novo-horario') ? agHoraNormalizada(document.getElementById('agt-novo-horario').value) : '';
    if (!agDataOperacionalValida(novaData)) {
      showToast('âš ï¸', 'Informe uma nova data valida para o reagendamento.');
      return;
    }
    const novoRef = agDataHoraRef(novaData, novoHorario);
    if (!novoRef) {
      showToast('⚠️', 'Informe a nova data e horário do reagendamento.');
      return;
    }
    if (novoRef.getTime() <= Date.now()) {
      showToast('⚠️', 'O novo compromisso precisa ficar em um horario futuro.');
      return;
    }

    const conflitoTelefone = agEncontrarConflitoTelefoneAgendamento(atual.telefone, {
      ignorarId: atual.id,
      ignorarRefLocal: atual.refLocal || atual.ref_local || ''
    });
    if (conflitoTelefone) {
      showToast('âš ï¸', agMensagemConflitoTelefoneAgendamento(conflitoTelefone));
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
      canalAgendamento: agCanalAgendamentoValor(atual.canalAgendamento, atual.tipoVisita),
      criadoPor: agTexto(usuarioAtual.nome || atual.criadoPor || 'Sistema'),
      criadoPorId: parseInt(usuarioAtual.id, 10) || 0,
      criadoPorEmail: agTexto(usuarioAtual.email).toLowerCase(),
      situacao: AG_SITUACAO_AGENDADO,
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
    if (typeof erroAgendamentoTelefoneDuplicado === 'function' && erroAgendamentoTelefoneDuplicado(erro)) {
      const refsNovas = novosAgendamentos
        .map(item => agTexto(item && (item.refLocal || item.ref_local || '')))
        .filter(Boolean);
      for (let i = AGENDAMENTOS.length - 1; i >= 0; i--) {
        const refItem = agTexto(AGENDAMENTOS[i] && (AGENDAMENTOS[i].refLocal || AGENDAMENTOS[i].ref_local || ''));
        if (refsNovas.includes(refItem)) AGENDAMENTOS.splice(i, 1);
      }
      atual.novoAgendamentoId = 0;
      zSetState('state.data.agendamentos', AGENDAMENTOS);
      salvarLS();
      agAtualizarDadosCompartilhadosEmSegundoPlano({ forcar: true });
      showToast('âš ï¸', typeof mensagemErroAgendamentoTelefoneDuplicado === 'function'
        ? mensagemErroAgendamentoTelefoneDuplicado(erro)
        : 'Ja existe um compromisso em aberto para este telefone.');
      return;
    }
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
  if (agModuloVisivel()) {
    agAtualizarDadosCompartilhadosEmSegundoPlano({
      cooldownMs: AG_REFRESH_COOLDOWN_MS,
      renderizar: true
    });
  }

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
  const limiteProximos = 5;
  const proximosTodos = agOrdenarLista(listaAtivos);
  const mostrarTodosProximos = agMostrarTodosProximos || proximosTodos.length <= limiteProximos;
  const proximos = mostrarTodosProximos ? proximosTodos : proximosTodos.slice(0, limiteProximos);
  const proximosRestantes = Math.max(proximosTodos.length - proximos.length, 0);

  const totalFeitos = lista.length;
  const totalAtivos = listaAtivos.length;
  const listaConcluidos = lista.filter(item => agSituacaoNormalizada(item) === 'concluida');
  const listaCancelados = lista.filter(item => agSituacaoNormalizada(item) === 'cliente cancelou');
  const totalConcluidos = listaConcluidos.length;
  const totalPrimeirosAtivos = listaAtivos.filter(agTipoPrimeiro).length;
  const totalDocumentacaoAtivos = listaAtivos.filter(agTipoDocumentacao).length;
  const totalFechamentosAtivos = listaAtivos.filter(agTipoFechamento).length;
  const totalPrimeirosCancelados = listaCancelados.filter(agTipoPrimeiro).length;
  const totalDocumentacaoCancelada = listaCancelados.filter(agTipoDocumentacao).length;
  const totalFechamentosCancelados = listaCancelados.filter(agTipoFechamento).length;
  const totalPrimeirosProximos7 = agContarProximosDias(listaAtivos.filter(agTipoPrimeiro), 7);
  const totalDocumentacaoProximos7 = agContarProximosDias(listaAtivos.filter(agTipoDocumentacao), 7);
  const totalFechamentosProximos7 = agContarProximosDias(listaAtivos.filter(agTipoFechamento), 7);
  const periodoResumo = agPeriodoResumo(periodo);
  const resumoPrimeiroDashboard = agResumoDashboardTipo(lista, agTipoPrimeiro);
  const resumoFechamentoDashboard = agResumoDashboardTipo(lista, agTipoFechamento);
  const resumoDocumentacaoDashboard = agResumoDashboardTipo(lista, agTipoDocumentacao);
  const resumoDiaPrimeiro = listaDia.filter(agTipoPrimeiro).length;
  const resumoDiaDocumentacao = listaDia.filter(agTipoDocumentacao).length;
  const resumoDiaFechamento = listaDia.filter(agTipoFechamento).length;
  const resumoProximosPrimeiro = proximos.filter(agTipoPrimeiro).length;
  const resumoProximosDocumentacao = proximos.filter(agTipoDocumentacao).length;
  const resumoProximosFechamento = proximos.filter(agTipoFechamento).length;
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
      <div class="ag-top-actions">
        <div class="ag-report-range">
          <div class="ag-report-date-field">
            <label>De</label>
            <input type="date" value="${agAttr(agFiltroDataDe)}" onchange="agAtualizarFiltroPeriodo('de',this.value)">
          </div>
          <div class="ag-report-date-field">
            <label>Ate</label>
            <input type="date" value="${agAttr(agFiltroDataAte)}" onchange="agAtualizarFiltroPeriodo('ate',this.value)">
          </div>
        </div>
        <button class="ag-clear-btn ag-report-btn" id="ag-report-btn" type="button" onclick="exportarRelatorioAgendamentos()">
          Relatorio PDF
        </button>
        <button class="btn-add-trein" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada || agHojeIso()}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          Novo compromisso
        </button>
      </div>
    </div>

    ${avisoSync}

    <div class="ag-stat-grid agenda-dashboard-grid">
      <div class="ag-stat-group first">
        <div class="ag-stat-group-title">Primeiro atendimento</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de agendamentos feitos</span>
            <strong>${resumoPrimeiroDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos concluidos</span>
            <strong>${resumoPrimeiroDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos reagendados</span>
            <strong>${resumoPrimeiroDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos cancelados</span>
            <strong>${resumoPrimeiroDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
      <div class="ag-stat-group close">
        <div class="ag-stat-group-title">Fechamento</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de agendamentos feitos</span>
            <strong>${resumoFechamentoDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos concluidos</span>
            <strong>${resumoFechamentoDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos reagendados</span>
            <strong>${resumoFechamentoDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Agendamentos cancelados</span>
            <strong>${resumoFechamentoDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
      <div class="ag-stat-group docs">
        <div class="ag-stat-group-title">Documentacao</div>
        <div class="ag-stat-group-body">
          <div class="ag-stat-row">
            <span>Total de agendamentos feitos</span>
            <strong>${resumoDocumentacaoDashboard.total}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao recebida</span>
            <strong>${resumoDocumentacaoDashboard.concluidos}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao reagendada</span>
            <strong>${resumoDocumentacaoDashboard.reagendados}</strong>
          </div>
          <div class="ag-stat-row">
            <span>Documentacao cancelada</span>
            <strong>${resumoDocumentacaoDashboard.cancelados}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="ag-stat-grid" style="display:none;">
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
        <div class="ag-stat-copy">Compromissos finalizados como visita concluida ou documentacao recebida dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Primeiro atendimento ativos</div>
        <div class="ag-stat-value">${totalPrimeirosAtivos}</div>
        <div class="ag-stat-copy">${totalPrimeirosProximos7} primeiros atendimentos ativos previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Documentacao online ativa</div>
        <div class="ag-stat-value">${totalDocumentacaoAtivos}</div>
        <div class="ag-stat-copy">${totalDocumentacaoProximos7} envios de documentacao online previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat">
        <div class="ag-stat-tag">Fechamentos ativos</div>
        <div class="ag-stat-value">${totalFechamentosAtivos}</div>
        <div class="ag-stat-copy">${totalFechamentosProximos7} fechamentos ativos previstos nos proximos 7 dias.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Primeiro atendimento cancelado</div>
        <div class="ag-stat-value">${totalPrimeirosCancelados}</div>
        <div class="ag-stat-copy">${totalPrimeirosCancelados} cancelamento${totalPrimeirosCancelados !== 1 ? 's' : ''} de primeiro atendimento dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Documentacao cancelada</div>
        <div class="ag-stat-value">${totalDocumentacaoCancelada}</div>
        <div class="ag-stat-copy">${totalDocumentacaoCancelada} cancelamento${totalDocumentacaoCancelada !== 1 ? 's' : ''} de documentacao online dentro do periodo analisado.</div>
      </div>
      <div class="ag-stat cancelled">
        <div class="ag-stat-tag">Fechamento cancelado</div>
        <div class="ag-stat-value">${totalFechamentosCancelados}</div>
        <div class="ag-stat-copy">${totalFechamentosCancelados} cancelamento${totalFechamentosCancelados !== 1 ? 's' : ''} de fechamento dentro do periodo analisado.</div>
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
            <div class="ag-card-sub">Cada dia mostra uma prévia de até 2 compromissos. Clique na data para ver a lista completa ao lado.</div>
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
              <div class="ag-card-sub">Lista completa do dia selecionado com ${listaDia.length} compromisso${listaDia.length !== 1 ? 's' : ''} ativo${listaDia.length !== 1 ? 's' : ''}.</div>
            </div>
            <button class="ag-clear-btn" type="button" onclick="abrirAgendamentoModal('${agDataSelecionada}')" ${mutacaoBloqueada ? 'disabled' : ''} style="${mutacaoBloqueada ? 'opacity:0.55;cursor:not-allowed;' : ''}">Agendar neste dia</button>
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">Compromissos do dia</div>
              <div class="ag-inline-note">O calendário mostra apenas um resumo visual. Todos os compromissos ativos da data selecionada aparecem nesta lista.</div>
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoDiaPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Docs online</span>
                  <strong>${resumoDiaDocumentacao}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Fechamento</span>
                  <strong>${resumoDiaFechamento}</strong>
                </div>
              </div>
              <div class="ag-list">
                ${listaDia.length ? listaDia.map(item => agRenderItem(item)).join('') : `<div class="ag-empty"><strong>Sem compromissos ativos neste dia</strong>Use o botao acima para registrar um novo compromisso na data selecionada.</div>`}
              </div>
            </div>
          </div>
        </div>

        <div class="ag-card">
          <div class="ag-card-head">
            <div>
              <div class="ag-card-title-row">
                <div class="ag-card-title">Próximos compromissos</div>
                <span class="ag-count-chip">${mostrarTodosProximos ? proximosTodos.length : `${proximos.length}/${proximosTodos.length}`}</span>
              </div>
              <div class="ag-card-sub">${mostrarTodosProximos ? 'Lista completa dos compromissos ativos futuros dentro do período filtrado.' : `Mostrando os próximos ${limiteProximos} de ${proximosTodos.length} compromissos ativos futuros.`}</div>
            </div>
            ${proximosTodos.length > limiteProximos ? `<button class="ag-clear-btn" type="button" onclick="alternarListaProximosAgendamentos()">${mostrarTodosProximos ? `Mostrar só ${limiteProximos}` : `Ver todos (${proximosTodos.length})`}</button>` : ''}
          </div>
          <div class="ag-side-body">
            <div class="ag-side-section">
              <div class="ag-side-label">${mostrarTodosProximos ? 'Lista completa do período' : `Prévia dos próximos ${limiteProximos} registros`}</div>
              ${proximosTodos.length ? `<div class="ag-inline-note compact">${mostrarTodosProximos ? 'Você está vendo todos os compromissos ativos futuros deste período.' : `Ainda existem mais ${proximosRestantes} compromisso${proximosRestantes !== 1 ? 's' : ''} fora desta prévia. Use "Ver todos" para abrir a lista completa.`}</div>` : ''}
              <div class="ag-panel-stats">
                <div class="ag-panel-stat">
                  <span>Primeiro atendimento</span>
                  <strong>${resumoProximosPrimeiro}</strong>
                </div>
                <div class="ag-panel-stat">
                  <span>Docs online</span>
                  <strong>${resumoProximosDocumentacao}</strong>
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
      ? 'Novos compromissos estao bloqueados ate aplicar a tabela no Supabase.'
      : 'Novos compromissos estao temporariamente bloqueados enquanto a sincronizacao compartilhada estiver indisponivel.');
    return;
  }

  const usuariosPermitidos = agUsuariosPermitidosCadastro();
  if (!usuariosPermitidos.length) {
    showToast('⚠️', 'Nao ha corretores disponiveis para o seu perfil cadastrar compromissos.');
    return;
  }

  document.getElementById('ma-title').textContent = zUiText('Novo compromisso');
  document.getElementById('ma-preenchimento').value = agHojeIso();
  document.getElementById('ma-cliente').value = '';
  document.getElementById('ma-telefone').value = '';
  document.getElementById('ma-horario').value = '';
  document.getElementById('ma-tipo').value = '';
  document.getElementById('ma-canal').value = '';
  document.getElementById('ma-data').value = '';

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
  const tipoSelect = document.getElementById('ma-tipo');
  const canalSelect = document.getElementById('ma-canal');
  if (!unidadeSelect || !equipeSelect || !tipoSelect || !canalSelect) return;

  const tipoAtual = AG_TIPOS_VISITA.includes(tipoSelect.value) ? tipoSelect.value : '';
  tipoSelect.innerHTML = ['<option value="">Selecione o tipo</option>']
    .concat(AG_TIPOS_VISITA.map(tipo => `<option value="${agTexto(tipo)}">${agTexto(tipo)}</option>`))
    .join('');
  tipoSelect.value = tipoAtual;

  const canalAtual = AG_CANAIS_AGENDAMENTO.includes(canalSelect.value) ? canalSelect.value : '';
  canalSelect.innerHTML = ['<option value="">Selecione o canal</option>']
    .concat(AG_CANAIS_AGENDAMENTO.map(canal => `<option value="${agTexto(canal)}">${agTexto(canal)}</option>`))
    .join('');
  canalSelect.value = agTipoDocumentacao({ tipoVisita: tipoSelect.value }) ? 'Online - WhatsApp' : canalAtual;
  canalSelect.disabled = agTipoDocumentacao({ tipoVisita: tipoSelect.value });

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
      ? 'Novos compromissos estao bloqueados ate aplicar a tabela no Supabase.'
      : 'Novos compromissos estao temporariamente bloqueados enquanto a sincronizacao compartilhada estiver indisponivel.');
    return;
  }
  const btn = document.getElementById('ma-save-btn');
  const preenchidoEm = document.getElementById('ma-preenchimento').value;
  const unidade = document.getElementById('ma-unidade').value;
  const equipe = document.getElementById('ma-equipe').value;
  const corretorId = document.getElementById('ma-corretor').value;
  const cliente = agTexto(document.getElementById('ma-cliente').value).toUpperCase();
  const telefoneInput = document.getElementById('ma-telefone');
  const telefone = agFormatarTelefone(telefoneInput ? telefoneInput.value : '');
  const dataAgendamento = document.getElementById('ma-data').value;
  const horarioAgendamento = agHoraNormalizada(document.getElementById('ma-horario').value);
  const tipoVisita = document.getElementById('ma-tipo').value;
  const canalSelecionado = document.getElementById('ma-canal').value;
  const canalAgendamento = agCanalAgendamentoValor(canalSelecionado, tipoVisita);
  const corretorUsuario = agUsuariosPermitidosCadastro().find(usuario => String(usuario.id) === String(corretorId));

  if (!agDataValidaIso(preenchidoEm)) { showToast('⚠️', 'Informe a data do preenchimento.'); return; }
  if (!unidade) { showToast('⚠️', 'Selecione a unidade.'); return; }
  if (!equipe) { showToast('⚠️', 'Selecione a equipe.'); return; }
  if (!corretorUsuario) { showToast('⚠️', 'Selecione o corretor responsável.'); return; }
  if (!cliente) { showToast('⚠️', 'Informe o nome do cliente.'); return; }
  if (!telefone) { showToast('⚠️', 'Informe o telefone do cliente.'); return; }
  if (!agDataValidaIso(dataAgendamento)) { showToast('⚠️', 'Informe a data do compromisso.'); return; }
  if (!horarioAgendamento) { showToast('⚠️', 'Informe o horario do compromisso.'); return; }
  if (!AG_TIPOS_VISITA.includes(tipoVisita)) { showToast('⚠️', 'Selecione o tipo de compromisso.'); return; }
  if (!AG_CANAIS_AGENDAMENTO.includes(canalSelecionado || canalAgendamento)) { showToast('⚠️', 'Selecione o canal do compromisso.'); return; }

  const conflitoTelefone = agEncontrarConflitoTelefoneAgendamento(telefone);
  if (conflitoTelefone) {
    if (telefoneInput) telefoneInput.focus();
    showToast('âš ï¸', agMensagemConflitoTelefoneAgendamento(conflitoTelefone));
    return;
  }

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
    canalAgendamento,
    criadoPor: usuarioLogado ? agTexto(usuarioLogado.nome) : 'Sistema',
    criadoPorId: usuarioLogado ? (parseInt(usuarioLogado.id, 10) || 0) : 0,
    criadoPorEmail: usuarioLogado ? agTexto(usuarioLogado.email).toLowerCase() : '',
    situacao: AG_SITUACAO_AGENDADO,
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
    showToast('✅', 'Compromisso salvo com sucesso.');
  } catch (erro) {
    if (typeof erroAgendamentoTelefoneDuplicado === 'function' && erroAgendamentoTelefoneDuplicado(erro)) {
      const refLocalNovo = agTexto(novo.refLocal || novo.ref_local || '');
      const indiceLocal = AGENDAMENTOS.findIndex(item => item && (
        item === novo
        || (refLocalNovo && agTexto(item.refLocal || item.ref_local || '') === refLocalNovo)
      ));
      if (indiceLocal >= 0) AGENDAMENTOS.splice(indiceLocal, 1);
      zSetState('state.data.agendamentos', AGENDAMENTOS);
      salvarLS();
      renderAgendamentos();
      agAtualizarDadosCompartilhadosEmSegundoPlano({ forcar: true });
      if (telefoneInput) telefoneInput.focus();
      showToast('âš ï¸', typeof mensagemErroAgendamentoTelefoneDuplicado === 'function'
        ? mensagemErroAgendamentoTelefoneDuplicado(erro)
        : 'Ja existe um compromisso em aberto para este telefone.');
      return;
    }
    console.warn('Falha ao sincronizar agendamento no banco:', erro && erro.message ? erro.message : erro);
    salvarLS();
    renderAgendamentos();
    showToast('⚠️', 'O compromisso nao foi sincronizado com o Supabase. Este registro ficou pendente apenas neste navegador.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = zUiText('✓ Salvar compromisso');
    }
  }
}

const salvarAgendamentoOriginal = salvarAgendamento;
salvarAgendamento = async function salvarAgendamentoComTelefoneObrigatorio() {
  const preenchimentoInput = document.getElementById('ma-preenchimento');
  const dataInput = document.getElementById('ma-data');
  if (preenchimentoInput && !agDataOperacionalValida(preenchimentoInput.value)) {
    showToast('!', 'Informe uma data de preenchimento valida.');
    preenchimentoInput.focus();
    return;
  }
  if (dataInput && !agDataOperacionalValida(dataInput.value)) {
    showToast('!', 'Informe uma data do compromisso valida.');
    dataInput.focus();
    return;
  }
  const telefoneInput = document.getElementById('ma-telefone');
  if (telefoneInput) {
    telefoneInput.value = agFormatarTelefone(telefoneInput.value);
    if (telefoneInput.value && !agTelefoneValido(telefoneInput.value)) {
      telefoneInput.focus();
      showToast('!', 'Informe o telefone com DDD. Ex.: (41) 99999-9999.');
      return;
    }
  }
  return salvarAgendamentoOriginal();
};

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
  exportarRelatorioAgendamentos,
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
