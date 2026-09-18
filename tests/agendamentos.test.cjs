const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const utilsSource = fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8').replace(/\r\n/g, '\n');
const AGENDAMENTOS_PARTES = ['js/agendamentos-base.js', 'js/agendamentos-relatorio-docs.js', 'js/agendamentos-calendario.js', 'js/agendamentos-render.js'];
const agSource = AGENDAMENTOS_PARTES.map(p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')).join('\n')
  // let torna essas variaveis inacessiveis para o teste ajustar o estado do modulo antes de chamar
  // uma funcao; convertendo so essas duas declaracoes de topo de arquivo para var elas passam a
  // ser propriedades reais do contexto vm, que o teste pode ler/escrever entre as chamadas.
  .replace('let agFiltroDataDe = \'\';', 'var agFiltroDataDe = \'\';')
  .replace('let agFiltroDataAte = \'\';', 'var agFiltroDataAte = \'\';');

function sourceFunction(source, name) {
  const declarations = [...source.matchAll(new RegExp('^(?:async )?function ' + name + '\\(', 'gm'))];
  assert.ok(declarations.length, `Funcao nao encontrada: ${name}`);
  const start = declarations.at(-1).index;
  let depth = 0;
  let iniciou = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') { depth++; iniciou = true; }
    if (source[i] === '}') depth--;
    if (iniciou && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Fim da funcao nao encontrado: ${name}`);
}

function makeContext(overrides = {}) {
  const ctx = vm.createContext({
    console, Date, Math, Array, Number, String, Object, JSON,
    window: {}, localStorage: { getItem: () => null, setItem: () => {} },
    document: { addEventListener: () => {}, getElementById: () => null },
    role: 'dir',
    usuarioLogado: { id: 1, nome: 'Paulo Cesar', email: 'paulo@teste.local', unidade: 'Centro' },
    zSetState() {}, zRegisterModule() {}, showToast() {}, salvarLS() {},
    ...overrides
  });
  vm.runInContext(utilsSource, ctx, { filename: 'js/utils.js' });
  vm.runInContext(agSource, ctx, { filename: 'js/agendamentos-base.js' });
  return ctx;
}

test('agFormatarTelefone formata progressivamente conforme os digitos digitados', () => {
  const ctx = makeContext();
  assert.equal(ctx.agFormatarTelefone('41'), '(41');
  assert.equal(ctx.agFormatarTelefone('41999'), '(41) 999');
  assert.equal(ctx.agFormatarTelefone('4133334444'), '(41) 3333-4444');
  assert.equal(ctx.agFormatarTelefone('41999998888'), '(41) 99999-8888');
});

test('agTelefoneDigitos remove o codigo do pais 55 e caracteres nao numericos', () => {
  const ctx = makeContext();
  assert.equal(ctx.agTelefoneDigitos('+55 (41) 99999-8888'), '41999998888');
  assert.equal(ctx.agTelefoneDigitos('4199999888899999'), '41999998888');
});

test('agHojeIso e agIsoFromDate formatam AAAA-MM-DD', () => {
  const ctx = makeContext();
  assert.equal(ctx.agIsoFromDate(new Date(2026, 0, 5)), '2026-01-05');
  assert.match(ctx.agHojeIso(), /^\d{4}-\d{2}-\d{2}$/);
});

test('agDataPartesIso valida datas reais e rejeita datas inexistentes', () => {
  const ctx = makeContext();
  const partes = ctx.agDataPartesIso('2026-03-15');
  assert.equal(partes.ano, 2026);
  assert.equal(partes.mes, 3);
  assert.equal(partes.dia, 15);
  assert.equal(ctx.agDataPartesIso('2026-02-30'), null);
  assert.equal(ctx.agDataPartesIso('data-invalida'), null);
  assert.equal(ctx.agDataValidaIso('2026-03-15'), true);
  assert.equal(ctx.agDataValidaIso(''), false);
});

test('agDataOperacionalValida respeita a faixa min/max operacional', () => {
  const ctx = makeContext();
  assert.equal(ctx.agDataOperacionalValida('2026-06-01'), true);
  assert.equal(ctx.agDataOperacionalValida('2010-01-01'), false);
  assert.equal(ctx.agDataOperacionalValida('2099-01-01'), false);
});

test('agHoraNormalizada aceita HH:MM e rejeita texto invalido', () => {
  const ctx = makeContext();
  assert.equal(ctx.agHoraNormalizada('9:05'), '09:05');
  assert.equal(ctx.agHoraNormalizada('14:30'), '14:30');
  assert.equal(ctx.agHoraNormalizada('nao e hora'), '');
});

test('agNormalizarTexto remove acentos, baixa a caixa e colapsa espacos', () => {
  const ctx = makeContext();
  assert.equal(ctx.agNormalizarTexto('  João da Silva  '), 'joao da silva');
});

test('agAttr escapa os caracteres perigosos para atributos HTML', () => {
  const ctx = makeContext();
  assert.equal(ctx.agAttr(`<script>&"</script>`), '&lt;script>&amp;&quot;&lt;/script>');
});

test('agCanalPadraoPorTipo e agCanalAgendamentoValor escolhem o canal certo', () => {
  const ctx = makeContext();
  assert.equal(ctx.agCanalPadraoPorTipo('Envio de documentacao online'), 'Online - WhatsApp');
  assert.equal(ctx.agCanalPadraoPorTipo('Primeiro atendimento'), 'Presencial - escritorio');
  assert.equal(ctx.agCanalAgendamentoValor('Online - WhatsApp', 'Primeiro atendimento'), 'Online - WhatsApp');
  assert.equal(ctx.agCanalAgendamentoValor('canal-invalido', 'Primeiro atendimento'), 'Presencial - escritorio');
});

test('agCanalBadgeClasse e agCanalBadgeRotulo refletem o canal do item', () => {
  const ctx = makeContext();
  const online = { canalAgendamento: 'Online - WhatsApp', tipoVisita: 'Primeiro atendimento' };
  const presencial = { canalAgendamento: 'Presencial - escritorio', tipoVisita: 'Primeiro atendimento' };
  assert.equal(ctx.agCanalBadgeClasse(online), 'online');
  assert.equal(ctx.agCanalBadgeRotulo(online), 'WhatsApp');
  assert.equal(ctx.agCanalBadgeClasse(presencial), 'office');
  assert.equal(ctx.agCanalBadgeRotulo(presencial), 'Presencial');
});

test('agPeriodoNormalizado troca as datas quando o inicio e depois do fim', () => {
  const ctx = makeContext();
  ctx.agFiltroDataDe = '2026-06-10';
  ctx.agFiltroDataAte = '2026-06-01';
  let periodo = ctx.agPeriodoNormalizado();
  assert.equal(periodo.dataDe, '2026-06-01');
  assert.equal(periodo.dataAte, '2026-06-10');

  ctx.agFiltroDataDe = '2026-06-01';
  ctx.agFiltroDataAte = '2026-06-10';
  periodo = ctx.agPeriodoNormalizado();
  assert.equal(periodo.dataDe, '2026-06-01');
  assert.equal(periodo.dataAte, '2026-06-10');

  ctx.agFiltroDataDe = 'data-invalida';
  ctx.agFiltroDataAte = '';
  periodo = ctx.agPeriodoNormalizado();
  assert.equal(periodo.dataDe, '');
  assert.equal(periodo.dataAte, '');
});

test('agMesmoUsuario compara por id, depois email, depois nome normalizado', () => {
  const ctx = makeContext();
  const usuario = { id: 5, email: 'ana@teste.local', nome: 'Ana Souza' };
  assert.equal(ctx.agMesmoUsuario({ corretorId: 5 }, usuario), true);
  assert.equal(ctx.agMesmoUsuario({ corretorEmail: 'ANA@teste.local' }, usuario), true);
  assert.equal(ctx.agMesmoUsuario({ corretor: 'ana souza' }, usuario), true);
  assert.equal(ctx.agMesmoUsuario({ corretorId: 99 }, usuario), false);
  assert.equal(ctx.agMesmoUsuario(null, usuario), false);
});

test('agMesmoTime e agMesmoTimeNaUnidade comparam equipe e respeitam a unidade', () => {
  const ctx = makeContext();
  const usuario = { equipe: 'Equipe A', unidade: 'Centro' };
  assert.equal(ctx.agMesmoTime({ equipe: 'equipe a' }, usuario), true);
  assert.equal(ctx.agMesmoTime({ equipe: 'Equipe B' }, usuario), false);
  assert.equal(ctx.agMesmoTimeNaUnidade({ equipe: 'Equipe A', unidade: 'Centro' }, usuario), true);
  assert.equal(ctx.agMesmoTimeNaUnidade({ equipe: 'Equipe A', unidade: 'Cristo Rei' }, usuario), false);
  assert.equal(ctx.agMesmoTimeNaUnidade({ equipe: 'Equipe A', unidade: 'Ambas' }, usuario), true);
});

test('atualizarCorretoresAgendamentoModal escapa o nome do corretor contra XSS armazenado (regressao)', () => {
  const body = sourceFunction(agSource, 'atualizarCorretoresAgendamentoModal');
  assert.match(body, /zUiHtml\(usuario\.nome\)/);
  assert.doesNotMatch(body, /\$\{agTexto\(usuario\.nome\)\}<\/option>/);
});

test('agResumoPorCorretor agrupa por corretorId, mesmo com grafias diferentes do nome (migracao nome->id)', () => {
  const ctx = makeContext();
  const lista = [
    { situacao: 'agendado', corretorId: 7, corretor: 'Ana Souza' },
    { situacao: 'concluida', corretorId: 7, corretor: 'ana  souza' },
    { situacao: 'agendado', corretorId: 9, corretor: 'Bruno Lima' }
  ];
  const resumo = ctx.agResumoPorCorretor(lista);
  assert.equal(resumo.length, 2);
  const ana = resumo.find(item => item.nome === 'Ana Souza');
  assert.ok(ana, 'os dois registros do corretorId 7 deveriam virar uma unica linha');
  assert.equal(ana.primeiraTotal, 2);
  assert.equal(ana.totalGeral, 2);
});

test('agResumoPorCorretor cai de volta para o nome normalizado quando o registro nao tem corretorId (legado)', () => {
  const ctx = makeContext();
  const lista = [
    { situacao: 'agendado', corretor: 'Carla Reis' },
    { situacao: 'agendado', corretor: 'carla  reis' },
    { situacao: 'agendado', corretor: 'Outra Pessoa' }
  ];
  const resumo = ctx.agResumoPorCorretor(lista);
  assert.equal(resumo.length, 2);
  const carla = resumo.find(item => item.nome === 'Carla Reis');
  assert.equal(carla.totalGeral, 2);
});

test('agResumoPorEquipe continua agrupando so por nome normalizado (sem id de equipe)', () => {
  const ctx = makeContext();
  const lista = [
    { situacao: 'agendado', equipe: 'Equipe A' },
    { situacao: 'agendado', equipe: 'equipe  a' }
  ];
  const resumo = ctx.agResumoPorEquipe(lista);
  assert.equal(resumo.length, 1);
  assert.equal(resumo[0].totalGeral, 2);
});

test('agResumoDocumentacaoPorCampo e agResumoFechamentoPorCampo agrupam corretor por id quando informado', () => {
  const ctx = makeContext();
  const lista = [
    { corretorId: 3, corretor: 'Duda Alves', rendaBrutaFamiliar: '5000' },
    { corretorId: 3, corretor: 'Duda  Alves', rendaBrutaFamiliar: '7000' }
  ];
  const obterNome = item => item && item.corretor;
  const obterChave = item => ctx.agCorretorFiltroValor(item);

  const resumoDoc = ctx.agResumoDocumentacaoPorCampo(lista, obterNome, obterChave);
  assert.equal(resumoDoc.length, 1);
  assert.equal(resumoDoc[0].total, 2);

  const resumoFec = ctx.agResumoFechamentoPorCampo(lista, obterNome, obterChave);
  assert.equal(resumoFec.length, 1);
  assert.equal(resumoFec[0].total, 2);
});
