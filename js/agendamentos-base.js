// AGENDAMENTOS - parte 1/4: texto/telefone/situacao/tipo/canal, datas/periodo, permissoes de visibilidade e sincronizacao
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
const AG_LOCAIS_COMPRA = ['Curitiba', 'Região metropolitana'];
const AG_TIPOS_IMOVEL_INTERESSE = ['Casa', 'Apartamento'];
const AG_FINALIDADES_IMOVEL = ['Moradia', 'Investimento'];
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

function agRendaBrutaFamiliarNumero(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : 0;
  }
  let texto = agTexto(valor)
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!texto) return 0;
  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  }
  const numero = Number(texto);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : 0;
}

function agFormatarRendaBrutaFamiliar(valor) {
  const numero = agRendaBrutaFamiliarNumero(valor);
  return numero ? numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function formatarRendaBrutaFamiliarAgendamento(input) {
  if (!input) return;
  input.value = agFormatarRendaBrutaFamiliar(input.value);
}

function agRespostaBooleana(valor) {
  if (typeof valor === 'boolean') return valor;
  const texto = String(valor == null ? '' : valor).trim().toLowerCase();
  if (['sim', 'true', '1'].includes(texto)) return true;
  if (['não', 'nao', 'false', '0'].includes(texto)) return false;
  return null;
}

function agRespostaSimNaoValor(valor) {
  const resposta = agRespostaBooleana(valor);
  return resposta === true ? 'sim' : (resposta === false ? 'nao' : '');
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
  if (agTipoDocumentacao(item)) return 'Documentacao recebida';
  if (agTipoFechamento(item)) return 'Fechamento concluído';
  return 'Visita concluida';
}

function agDescricaoConclusao(item) {
  if (agTipoDocumentacao(item)) return 'O cliente enviou a documentacao para analise online.';
  if (agTipoFechamento(item)) return 'O atendimento de fechamento foi concluído.';
  return 'O cliente foi atendido normalmente.';
}

function agSituacaoExibicao(item) {
  return agSituacaoNormalizada(item) === 'concluida' ? agRotuloConclusao(item) : agTexto(agSituacao(item));
}

function agHintTratativa(item) {
  if (agTipoDocumentacao(item)) return 'Clique no compromisso para registrar documentacao recebida, reagendamento ou cancelamento.';
  if (agTipoFechamento(item)) return 'Clique no compromisso para registrar fechamento concluído, reagendamento ou cancelamento.';
  return 'Clique no compromisso para registrar visita concluida, reagendamento ou cancelamento.';
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

// Agrupa uma lista já ordenada por data/hora em blocos por dia, para exibir
// um cabeçalho de data uma única vez por grupo em vez de repeti-la em cada
// card (usado na lista "Próximos compromissos", que mistura várias datas).
function agAgruparPorDia(lista) {
  const grupos = [];
  let atual = null;
  (Array.isArray(lista) ? lista : []).forEach(item => {
    const chave = agTexto(item && item.dataAgendamento);
    if (!atual || atual.chave !== chave) {
      atual = { chave, items: [] };
      grupos.push(atual);
    }
    atual.items.push(item);
  });
  return grupos;
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

function agResumoRelatorioPorCampo(lista, obterNome, obterChave) {
  const mapa = new Map();
  (Array.isArray(lista) ? lista : []).forEach(item => {
    const nome = agTexto(obterNome(item)) || 'Nao informado';
    const chave = (obterChave && agTexto(obterChave(item))) || agNormalizarTexto(nome) || nome;
    if (!mapa.has(chave)) {
      mapa.set(chave, agNovoResumoTipoRelatorio(nome));
    }
    agAtualizarResumoTipoRelatorio(mapa.get(chave), item);
  });
  return Array.from(mapa.values())
    .sort((a, b) => b.totalGeral - a.totalGeral || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function agResumoPorCorretor(lista) {
  return agResumoRelatorioPorCampo(lista, item => item && item.corretor, item => agCorretorFiltroValor(item));
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

