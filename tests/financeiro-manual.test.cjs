const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const financeiroSource = fs.readFileSync(path.join(root, 'js/financeiro.js'), 'utf8');
const supabaseSource = fs.readFileSync(path.join(root, 'js/supabase.js'), 'utf8').replace(/\r\n/g, '\n');
const utilsSource = fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8').replace(/\r\n/g, '\n');
const vendasSource = fs.readFileSync(path.join(root, 'js/vendas.js'), 'utf8').replace(/\r\n/g, '\n');

// Executa as funcoes reais, isoladas de qualquer conexao com o banco.
function sourceFunction(source, name) {
  const declarations = [...source.matchAll(new RegExp('^(?:async )?function ' + name + '\\(', 'gm'))];
  assert.ok(declarations.length, `Funcao nao encontrada: ${name}`);
  const start = declarations.at(-1).index;
  const end = source.indexOf('\n}', start);
  assert.ok(end > start);
  return source.slice(start, end + 2);
}
const supabaseFunction = name => sourceFunction(supabaseSource, name);

function loadFinanceMappers(ctx) {
  for (const name of ['textoFinanceiroMaiusculo', 'prepararTextoLancamentoFinanceiro', 'gerarRefLocalFinanceiro', 'garantirRefLocalFinanceiro', 'mapLancamentoFinanceiroOut', 'mapLancamentoFinanceiroIn', 'preservarComprovanteFinanceiroLocal']) {
    vm.runInContext(supabaseFunction(name), ctx);
  }
}

function salesFixtures() {
  const sale = (id, data, valor = 100000, extras = {}) => ({
    id, cliente: `VENDA ${id}`, data: '01/08/2026', valor, pct: 0.05, etapa: 8,
    unidade: 'Centro', hist: [{ e: 8, d: data }], ...extras
  });
  return [
    sale(1, '26/08/2026', 500000, { pct: 0.06 }),
    sale(2, '01/08/2026', 400000, { etapa: 7, hist: [{ e: 7, d: '01/08/2026' }] }),
    sale(11, '25/08/2026'),
    sale(12, '10/07/2026', 160000),
    sale(13, '10/01/2020', 20000, { unidade: 'Unidade historica' })
  ];
}

function fixtures() {
  const manual = (id, tipo, valor, status, data, extras = {}) => ({
    id, refLocal: `fin-manual-${id}`, tipo, valor, status,
    categoria: tipo === 'entrada' ? 'COMISSAO' : 'REPASSE COMISSAO',
    descricao: `LANCAMENTO MANUAL ${id}`, unidade: 'Centro',
    dataPrevista: data, dataRealizada: status === 'realizado' ? data : '', ...extras
  });
  return [
    manual(1, 'entrada', 10000, 'realizado', '2026-08-26'),
    manual(2, 'entrada', 2500, 'previsto', '2026-08-28'),
    manual(3, 'saida', 1200, 'realizado', '2026-08-26'),
    manual(4, 'saida', 300, 'previsto', '2026-08-01', { categoria: 'ALUGUEL' }),
    manual(5, 'entrada', 400, 'realizado', '2026-08-26', { categoria: 'APORTE' }),
    manual(6, 'saida', 600, 'realizado', '2026-07-10'),
    manual(7, 'entrada', 2000, 'realizado', '2026-07-10'),
    manual(8, 'saida', 5000, 'realizado', '2026-08-26', { refLocal: 'fin-comissao-venda-1-corretor', syncPendente: true }),
    manual(9, 'saida', 9000, 'realizado', '2026-07-10', { refLocal: '', ref_local: 'fin-comissao-venda-1-diretor_2' }),
    manual(10, 'saida', 300000, 'previsto', '2018-08-01', { refLocal: ' FIN-COMISSAO-VENDA-9999-GERENTE ' })
  ];
}

function makeContext(lancamentos = fixtures()) {
  const ctx = vm.createContext({
    Date, console, setTimeout, clearTimeout,
    FINANCEIRO_LANCAMENTOS: lancamentos,
    FINANCEIRO_SALDOS_BANCARIOS: [],
    VENDAS: salesFixtures(), ETAPAS: Array.from({ length: 9 }, (_, index) => `Etapa ${index}`),
    zSetState() {}, zRegisterModule() {}, zUiText: text => String(text ?? ''),
    appExigirModoOnline() {}, showToast() {}, salvarLS() {},
    ehLancamentoFinanceiroTesteLegado: () => false,
    removerLancamentosFinanceirosTesteLegado: () => [],
    extrairColunaAusenteSupabase: () => '', mensagemErroSyncAgendamentos: error => error.message,
    role: 'dono'
  });
  vm.runInContext(sourceFunction(utilsSource, 'obterMomentoHistorico'), ctx);
  vm.runInContext(sourceFunction(vendasSource, 'histAfetaFluxo'), ctx);
  for (const name of ['tipoLancamentoFinanceiroNormalizado', 'statusLancamentoFinanceiroNormalizado', 'lancamentoFinanceiroAutomaticoLegado', 'lancamentoFinanceiroTemSyncPendente']) {
    vm.runInContext(supabaseFunction(name), ctx);
  }
  vm.runInContext(financeiroSource, ctx, { filename: 'js/financeiro.js' });
  vm.runInContext("finMesAtual = 7; finAnoAtual = 2026; finHojeRef = () => new Date(2026, 7, 26, 12);", ctx);
  return ctx;
}

function prepararFormularioLancamento(ctx, overrides = {}) {
  const campo = value => ({ value, disabled: false, textContent: '', focus() {} });
  const campos = {
    'fin-lanc-tipo': campo('saida'),
    'fin-lanc-categoria': campo('SERVICOS'),
    'fin-lanc-categoria-nova': campo(''),
    'fin-lanc-descricao': campo('PAGAMENTO DE TESTE'),
    'fin-lanc-unidade': campo('Centro'),
    'fin-lanc-data-prevista': campo('2026-09-04'),
    'fin-lanc-status': campo('realizado'),
    'fin-lanc-data-realizada': campo('2026-09-04'),
    'fin-lanc-valor': campo('123,45'),
    'fin-lanc-observacao': campo('CONFIRMACAO OBRIGATORIA'),
    'fin-lanc-save-btn': campo('')
  };
  Object.entries(overrides).forEach(([id, value]) => {
    if (campos[id]) campos[id].value = value;
  });
  ctx.document = {
    getElementById(id) {
      if (id === 'mod-financeiro') return { classList: { contains: () => true } };
      return campos[id] || null;
    },
    querySelectorAll() { return Object.values(campos); }
  };
  return campos;
}

test('vendas recebidas em 26/08 ou previstas nao geram novas entradas nem saidas', () => {
  const ctx = makeContext([]);
  ctx.VENDAS = ctx.VENDAS.slice(0, 2);
  for (const etapa of [0, 7, 8]) {
    ctx.VENDAS[0].etapa = etapa;
    const mes = ctx.finColetarMes(7, 2026);
    assert.equal(mes.todos.length, 0);
    assert.equal(mes.entradas.totalRealizado, 0);
    assert.equal(mes.entradas.totalPrevisto, 0);
    assert.equal(mes.saidas.totalRealizado, 0);
    assert.equal(ctx.finMontarDadosDre(ctx.finDreMetaAtual()).receita, 0);
  }
  assert.equal(typeof ctx.finSincronizarSaidasComissaoVenda, 'undefined');
});

test('caixa restaura recebimentos anteriores e todos os repasses gravados sem apagar nem duplicar', () => {
  const ctx = makeContext();
  const antes = JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS);
  const mes = ctx.finColetarMes(7, 2026);
  assert.equal(mes.entradas.totalRealizado, 15400);
  assert.equal(mes.entradas.totalPrevisto, 2500);
  assert.equal(mes.saidas.totalRealizado, 6200);
  assert.equal(mes.saidas.totalPrevisto, 300);
  assert.equal(mes.entradas.totalRealizado - mes.saidas.totalRealizado, 9200);
  assert.equal(mes.todos.length, 7);
  assert.equal(mes.todos.filter(item => item.historicoAutomatico).length, 2);
  assert.equal(mes.manuais.entradas.totalRealizado, 10400);
  assert.equal(mes.manuais.saidas.totalRealizado, 1200);
  assert.equal(ctx.finItensDoDia(mes, 26).length, 4);
  assert.equal(ctx.finItensDoDia(mes, 25).length, 1);
  assert.equal(ctx.finColetarSaidasVencidasHistorico(7, 2026).length, 2);
  assert.equal(ctx.finLancamentoPorChave('fin-comissao-venda-1-corretor').valor, 5000);
  assert.equal(ctx.finLancamentoPorChave('fin-comissao-venda-1-diretor_2').valor, 9000);
  assert.equal(ctx.finLancamentoPorChave('fin-manual-3').valor, 1200);
  assert.equal(JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS), antes);
  assert.equal(ctx.finColetarMes(7, 2026).todos.length, 7);
  ctx.VENDAS[0].valor = 9999999;
  assert.equal(ctx.finColetarMes(7, 2026).saidas.totalRealizado, 6200);
});

test('a categoria REPASSE COMISSAO nao exclui saidas manuais, mesmo sem referencia', () => {
  const ctx = makeContext();
  const item = { tipo: 'saida', categoria: 'REPASSE COMISSAO', descricao: 'REPASSE CORRETOR - ANA', valor: 800, status: 'realizado', dataPrevista: '2026-08-26' };
  assert.equal(ctx.lancamentoFinanceiroAutomaticoLegado(item), false);
  assert.equal(ctx.finNormalizarLancamentoManual(item).valorBruto, 800);
  ctx.FINANCEIRO_LANCAMENTOS.push(item);
  assert.equal(ctx.finColetarMes(7, 2026).saidas.totalRealizado, 7000);
});

test('DRE mensal, trimestral, semestral e anual preservam receitas e repasses historicos', () => {
  const ctx = makeContext();
  for (const escopo of ['mes', 'trimestre', 'semestre', 'anual']) {
    vm.runInContext(`finDreEscopo = '${escopo}'; finMesAtual = 7;`, ctx);
    const dre = ctx.finMontarDadosDre(ctx.finDreMetaAtual());
    assert.equal(dre.receita, escopo === 'mes' ? 15000 : 25000);
    assert.equal(dre.despesa, escopo === 'mes' ? 6200 : 15800);
    assert.equal(dre.foraReceita, 400);
    assert.equal(dre.variacaoCaixa, escopo === 'mes' ? 9200 : 9600);
    assert.ok(dre.linhas.some(item => item.origem === 'venda'));
    assert.ok(dre.linhas.some(item => item.origem === 'venda_comissao_saida'));
  }
  assert.equal(ctx.finDreAnosDisponiveis().includes(2018), true);
  assert.equal(ctx.finDreAnosDisponiveis().includes(2020), true);
  assert.ok(ctx.finUnidadesDisponiveis().includes('Unidade historica'));
});

test('filtros de categoria, unidade e situacao continuam funcionando para lancamentos manuais', () => {
  const ctx = makeContext();
  vm.runInContext("finVisao = 'saidas'; finFiltroCategoria = 'REPASSE COMISSAO'; finFiltroSituacao = 'realizado';", ctx);
  assert.equal(ctx.finColetarMes(7, 2026).saidas.totalRealizado, 6200);
  vm.runInContext("finFiltroUnidade = 'Cristo Rei';", ctx);
  assert.equal(ctx.finColetarMes(7, 2026).todos.length, 0);
});

test('recebimento manual usa a data realizada e nao a data prevista', () => {
  const ctx = makeContext([{ tipo: 'entrada', valor: 700, status: 'realizado', dataPrevista: '2026-08-20', dataRealizada: '2026-09-01' }]);
  ctx.VENDAS = [];
  assert.equal(ctx.finColetarMes(7, 2026).entradas.totalRealizado, 0);
  assert.equal(ctx.finColetarMes(8, 2026).entradas.totalRealizado, 700);
});

test('dar como pago antecipado usa o dia da baixa e preserva a data prevista', () => {
  const ctx = makeContext([]);
  const campos = prepararFormularioLancamento(ctx, {
    'fin-lanc-status': 'previsto',
    'fin-lanc-data-prevista': '2026-09-20',
    'fin-lanc-data-realizada': '2026-09-20'
  });
  ctx.finMarcarModalComoRealizado(false);
  assert.equal(campos['fin-lanc-status'].value, 'realizado');
  assert.equal(campos['fin-lanc-data-prevista'].value, '2026-09-20');
  assert.equal(campos['fin-lanc-data-realizada'].value, '2026-08-26');
});

test('saldo esperado usa a abertura do mes e inclui todos os movimentos realizados do mes', () => {
  const ctx = makeContext([
    { id: 31, tipo: 'entrada', valor: 1000, status: 'realizado', dataPrevista: '2026-09-01', dataRealizada: '2026-09-01' },
    { id: 32, tipo: 'saida', valor: 200, status: 'realizado', dataPrevista: '2026-09-02', dataRealizada: '2026-09-02' },
    { id: 33, tipo: 'saida', valor: 900, status: 'previsto', dataPrevista: '2026-09-03', dataRealizada: '' }
  ]);
  ctx.VENDAS = [];
  ctx.FINANCEIRO_SALDOS_BANCARIOS.push(
    { id: 1, conta: 'CONTA PRINCIPAL', dataReferencia: '2026-08-31', saldo: 5000 },
    { id: 2, conta: 'CONTA PRINCIPAL', dataReferencia: '2026-09-02', saldo: 5500 }
  );
  vm.runInContext("finMesAtual = 8; finAnoAtual = 2026; finHojeRef = () => new Date(2026, 8, 5, 12); finFiltroUnidade = 'Cristo Rei'; finFiltroCategoria = 'ALUGUEL';", ctx);
  assert.equal(ctx.finConciliacaoMes(8, 2026).saldoSistema, 5800);

  ctx.FINANCEIRO_LANCAMENTOS.push(
    { id: 34, tipo: 'entrada', valor: 300, status: 'realizado', dataPrevista: '2026-09-03', dataRealizada: '2026-09-03' }
  );
  assert.equal(ctx.finConciliacaoMes(8, 2026).saldoSistema, 6100);

  ctx.FINANCEIRO_LANCAMENTOS.push(
    { id: 35, tipo: 'saida', valor: 50, status: 'realizado', dataPrevista: '2026-09-04', dataRealizada: '2026-09-04' }
  );
  const conciliacao = ctx.finConciliacaoMes(8, 2026);
  assert.equal(conciliacao.saldoBase.saldo, 5000);
  assert.equal(conciliacao.movimentoSistema, 1050);
  assert.equal(conciliacao.saldoSistema, 6050);
  assert.equal(conciliacao.saldoBancario.saldo, 5500);
  assert.equal(conciliacao.saldoBancarioAtualizado, false);
  assert.equal(conciliacao.diferenca, null);
  assert.equal(conciliacao.conciliado, false);
  assert.match(ctx.finBuildConciliacaoBancaria(conciliacao), /Saldo bancario desatualizado/);
  assert.match(ctx.finBuildConciliacaoBancaria(conciliacao), /Saldo esperado hoje/);

  ctx.FINANCEIRO_SALDOS_BANCARIOS.push(
    { id: 3, conta: 'CONTA PRINCIPAL', dataReferencia: '2026-09-05', saldo: 6050 }
  );
  const atualizado = ctx.finConciliacaoMes(8, 2026);
  assert.equal(atualizado.saldoSistema, 6050);
  assert.equal(atualizado.saldoBancarioAtualizado, true);
  assert.equal(atualizado.diferenca, 0);
  assert.equal(atualizado.conciliado, true);
});

test('primeiro saldo bancario vira base do saldo esperado', () => {
  const ctx = makeContext([]);
  ctx.VENDAS = [];
  ctx.FINANCEIRO_SALDOS_BANCARIOS.push(
    { id: 1, conta: 'CONTA PRINCIPAL', dataReferencia: '2026-09-02', saldo: 5500 }
  );
  vm.runInContext("finMesAtual = 8; finAnoAtual = 2026; finHojeRef = () => new Date(2026, 8, 2, 12);", ctx);
  const conciliacao = ctx.finConciliacaoMes(8, 2026);
  assert.equal(conciliacao.saldoBase.saldo, 5500);
  assert.equal(conciliacao.saldoSistema, 5500);
  assert.equal(conciliacao.diferenca, 0);
  assert.match(ctx.finBuildConciliacaoBancaria(conciliacao), /Conciliado/);
});

test('painel financeiro renderiza conciliacao e distingue movimento mensal de saldo bancario', () => {
  const ctx = makeContext([]);
  ctx.VENDAS = [];
  const target = { style: {}, innerHTML: '', querySelector: () => null };
  ctx.document = { getElementById: id => id === 'financeiro-content' ? target : null };
  vm.runInContext("role = 'dono'; finVisao = 'geral'; finMesAtual = 8; finAnoAtual = 2026; finHojeRef = () => new Date(2026, 8, 2, 12);", ctx);
  ctx.renderFinanceiro();
  assert.match(target.innerHTML, /CONCILIACAO BANCARIA/);
  assert.match(target.innerHTML, /Movimento liquido/);
  assert.match(target.innerHTML, /Saldo bancario/);
  assert.match(target.innerHTML, /Cadastrar saldo anterior/);
});

test('mapeamento do saldo bancario preserva data, valor negativo e auditoria', () => {
  const ctx = vm.createContext({ Date });
  vm.runInContext(supabaseFunction('mapSaldoBancarioIn'), ctx);
  vm.runInContext(supabaseFunction('mapSaldoBancarioOut'), ctx);
  const interno = ctx.mapSaldoBancarioIn({
    id: '7', conta: 'Conta principal', data_referencia: '2026-08-31T00:00:00Z',
    saldo_bancario: '-125.50', observacao: 'fechamento', criado_por: 'Paulo', criado_por_id: '1'
  });
  assert.equal(interno.id, 7);
  assert.equal(interno.conta, 'CONTA PRINCIPAL');
  assert.equal(interno.dataReferencia, '2026-08-31');
  assert.equal(interno.saldo, -125.5);
  assert.equal(interno.observacao, 'FECHAMENTO');
  const banco = ctx.mapSaldoBancarioOut(interno);
  assert.equal(banco.data_referencia, '2026-08-31');
  assert.equal(banco.saldo_bancario, -125.5);
  assert.equal(banco.criado_por_id, 1);
});

test('nenhuma falha financeira antiga e reenviada automaticamente', async () => {
  const ctx = makeContext();
  assert.equal(ctx.lancamentoFinanceiroTemSyncPendente(ctx.FINANCEIRO_LANCAMENTOS[7]), false);
  assert.equal(ctx.lancamentoFinanceiroTemSyncPendente({ refLocal: 'fin-manual-20', syncPendente: true }), false);
  vm.runInContext(supabaseFunction('sincronizarFinanceiroPendentes'), ctx);
  const antes = JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS);
  const resultado = await ctx.sincronizarFinanceiroPendentes();
  assert.equal(resultado.pendentes, 0);
  assert.equal(resultado.desativado, true);
  assert.equal(JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS), antes);
});

test('falha de gravacao nao inclui lancamento no caixa e nova tentativa reutiliza a mesma referencia', async () => {
  const ctx = makeContext([]);
  prepararFormularioLancamento(ctx);
  const avisos = [];
  const referencias = [];
  let salvarCache = 0;
  Object.assign(ctx, {
    usuarioLogado: { id: 7, nome: 'FINANCEIRO', email: 'financeiro@teste.local' },
    showToast: (_icone, mensagem) => avisos.push(mensagem),
    salvarLS: () => { salvarCache++; },
    dbSalvarLancamentoFinanceiro: async item => {
      referencias.push(item.refLocal);
      throw new Error('Supabase timeout apos 20000ms');
    }
  });
  vm.runInContext("finModalAberto = true; finModalRefLocal = 'fin-tentativa-estavel';", ctx);

  await ctx.finSalvarLancamento();

  assert.equal(ctx.FINANCEIRO_LANCAMENTOS.length, 0);
  assert.equal(salvarCache, 0);
  assert.equal(vm.runInContext('finModalAberto', ctx), true);
  assert.equal(vm.runInContext('finModalRefLocal', ctx), 'fin-tentativa-estavel');
  assert.match(avisos.at(-1), /nao foi incluido no caixa/i);

  ctx.dbSalvarLancamentoFinanceiro = async item => {
    referencias.push(item.refLocal);
    Object.assign(item, { id: 9001, syncPendente: false, syncErro: '' });
    return item;
  };
  await ctx.finSalvarLancamento();

  assert.deepEqual(referencias, ['fin-tentativa-estavel', 'fin-tentativa-estavel']);
  assert.equal(ctx.FINANCEIRO_LANCAMENTOS.length, 1);
  assert.equal(ctx.FINANCEIRO_LANCAMENTOS[0].id, 9001);
  assert.equal(salvarCache, 1);
  assert.equal(vm.runInContext('finModalAberto', ctx), false);
});

test('edicao com falha nao altera o lancamento confirmado que ja esta no caixa', async () => {
  const original = fixtures()[2];
  const ctx = makeContext([original]);
  prepararFormularioLancamento(ctx, {
    'fin-lanc-descricao': 'ALTERACAO NAO CONFIRMADA',
    'fin-lanc-valor': '9.999,99'
  });
  Object.assign(ctx, {
    usuarioLogado: { id: 7, nome: 'FINANCEIRO', email: 'financeiro@teste.local' },
    dbSalvarLancamentoFinanceiro: async () => { throw new Error('Failed to fetch'); },
    showToast() {}
  });
  vm.runInContext("finModalAberto = true; finModalLancamentoId = 'fin-manual-3'; finModalRefLocal = 'fin-manual-3';", ctx);

  await ctx.finSalvarLancamento();

  assert.equal(ctx.FINANCEIRO_LANCAMENTOS[0], original);
  assert.equal(ctx.FINANCEIRO_LANCAMENTOS[0].valor, 1200);
  assert.equal(ctx.FINANCEIRO_LANCAMENTOS[0].descricao, 'LANCAMENTO MANUAL 3');
  assert.equal(vm.runInContext('finModalAberto', ctx), true);
});

test('mescla do financeiro descarta falha apenas local e sempre prefere o banco', () => {
  const ctx = makeContext([]);
  loadFinanceMappers(ctx);
  for (const name of ['getFinanceiroLancamentoMergeKey', 'ordenarFinanceiroLancamentos', 'preferirLancamentoFinanceiroMaisRecente', 'mesclarFinanceiroLancamentosBancoComLocal']) {
    vm.runInContext(supabaseFunction(name), ctx);
  }
  const banco = [{ id: 10, ref_local: 'fin-confirmado', tipo: 'saida', categoria: 'SERVICOS', descricao: 'CONFIRMADO', status: 'realizado', valor: 100, data_prevista: '2026-09-04', data_realizada: '2026-09-04', atualizado_em: '2026-09-04T12:00:00Z' }];
  const local = [
    { ...banco[0], refLocal: 'fin-confirmado', descricao: 'VERSAO LOCAL', valor: 999, syncPendente: true, atualizadoEm: '2026-09-04T13:00:00Z' },
    { id: 11, refLocal: 'fin-so-local', tipo: 'saida', categoria: 'SERVICOS', descricao: 'NAO CONFIRMADO', status: 'realizado', valor: 555, dataPrevista: '2026-09-04', dataRealizada: '2026-09-04', syncPendente: true }
  ];

  const resultado = ctx.mesclarFinanceiroLancamentosBancoComLocal(banco, local);

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].refLocal, 'fin-confirmado');
  assert.equal(resultado[0].descricao, 'CONFIRMADO');
  assert.equal(resultado[0].valor, 100);
  assert.equal(resultado[0].confirmadoSupabase, true);
  assert.equal(resultado[0].syncPendente, false);
});

test('cache financeiro ignora gravacao pendente que nunca foi confirmada pelo banco', () => {
  const ctx = makeContext([]);
  loadFinanceMappers(ctx);
  ctx.localStorage = {
    getItem: () => JSON.stringify([
      { refLocal: 'fin-falhou-local', tipo: 'saida', categoria: 'SERVICOS', descricao: 'NAO CONFIRMADO', valor: 500, dataPrevista: '2026-09-04', syncPendente: true },
      { refLocal: 'fin-confirmado-cache', confirmadoSupabase: true, tipo: 'saida', categoria: 'SERVICOS', descricao: 'CONFIRMADO', valor: 100, dataPrevista: '2026-09-04', syncPendente: true },
      { refLocal: 'fin-normal-cache', tipo: 'saida', categoria: 'SERVICOS', descricao: 'NORMAL', valor: 50, dataPrevista: '2026-09-04', syncPendente: false }
    ])
  };
  vm.runInContext(supabaseFunction('carregarFinanceiroLancamentosLS'), ctx);

  const cache = ctx.carregarFinanceiroLancamentosLS();

  assert.deepEqual(Array.from(cache, item => item.refLocal), ['fin-confirmado-cache', 'fin-normal-cache']);
});

test('salvar ou atualizar venda recebida nao chama a geracao de repasses', async () => {
  const ctx = makeContext();
  let repasses = 0;
  const gravacoes = [];
  Object.assign(ctx, {
    finSincronizarSaidasComissaoVenda: async () => { repasses++; },
    garantirRefLocalVenda() {}, mapVendaOut: venda => ({ ...venda }), mapVendaAnexos: anexos => anexos || [],
    salvarVendaComFallbackSchema: async (payload, modo) => {
      gravacoes.push({ modo, etapa: payload.etapa });
      return { data: { id: payload.id }, payloadReduzido: false };
    }
  });
  vm.runInContext(supabaseFunction('dbSalvarVenda') + '\n' + supabaseFunction('dbAtualizarVenda'), ctx);
  const antes = JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS);
  assert.equal(await ctx.dbSalvarVenda(ctx.VENDAS[0]), true);
  assert.equal(await ctx.dbAtualizarVenda(ctx.VENDAS[0]), true);
  assert.deepEqual(gravacoes, [{ modo: 'insert', etapa: 8 }, { modo: 'update', etapa: 8 }]);
  assert.equal(repasses, 0);
  assert.equal(JSON.stringify(ctx.FINANCEIRO_LANCAMENTOS), antes);
});

test('persistencia bloqueia novas tentativas de gravar referencias automaticas', async () => {
  const ctx = makeContext();
  vm.runInContext(supabaseFunction('dbSalvarLancamentoFinanceiro'), ctx);
  await assert.rejects(ctx.dbSalvarLancamentoFinanceiro(ctx.FINANCEIRO_LANCAMENTOS[7]), /Repasses automaticos foram desativados/);
});

test('persistencia continua aceitando um repasse cadastrado manualmente', async () => {
  const ctx = makeContext();
  const item = { tipo: 'saida', categoria: 'REPASSE COMISSAO', descricao: 'REPASSE MANUAL ANA', valor: 800, status: 'realizado', dataPrevista: '2026-08-26' };
  const tabelas = [];
  const query = {
    update() { return query; }, insert() { return query; }, eq() { return query; }, select() { return query; },
    async maybeSingle() { return { data: null }; },
    async single() { return { data: { ...item, id: 1234 } }; }
  };
  Object.assign(ctx, {
    garantirRefLocalFinanceiro: alvo => { alvo.refLocal ||= 'fin-manual-novo'; },
    mapLancamentoFinanceiroOut: alvo => ({ ...alvo, ref_local: alvo.refLocal }),
    mapLancamentoFinanceiroIn: alvo => ({ ...alvo }),
    preservarComprovanteFinanceiroLocal() {},
    sb: { from(tabela) { tabelas.push(tabela); return query; } }
  });
  vm.runInContext(supabaseFunction('dbSalvarLancamentoFinanceiro'), ctx);
  const salvo = await ctx.dbSalvarLancamentoFinanceiro(item);
  assert.equal(salvo.id, 1234);
  assert.equal(salvo.valor, 800);
  assert.equal(salvo.categoria, 'REPASSE COMISSAO');
  assert.equal(salvo.syncPendente, false);
  assert.ok(tabelas.length > 0 && tabelas.every(tabela => tabela === 'financeiro_lancamentos'));
});

test('persistencia financeira usa cliente longo e nunca grava marcador de pendencia', async () => {
  const ctx = makeContext([]);
  loadFinanceMappers(ctx);
  const payloads = [];
  const query = {
    update(payload) { payloads.push({ operacao: 'update', payload: { ...payload } }); return query; },
    insert(payload) { payloads.push({ operacao: 'insert', payload: { ...payload } }); return query; },
    eq() { return query; }, select() { return query; },
    async maybeSingle() { return { data: null }; },
    async single() { return { data: { ...payloads.at(-1).payload, id: 777 } }; }
  };
  Object.assign(ctx, {
    sb: { from() { throw new Error('cliente curto nao deveria ser usado'); } },
    sbLong: { from: () => query }
  });
  vm.runInContext(supabaseFunction('dbSalvarLancamentoFinanceiro'), ctx);
  const item = {
    refLocal: 'fin-confirmacao-longa', tipo: 'saida', categoria: 'SERVICOS', descricao: 'TESTE',
    status: 'realizado', valor: 50, dataPrevista: '2026-09-04', dataRealizada: '2026-09-04',
    syncPendente: true, syncErro: 'Failed to fetch'
  };

  const salvo = await ctx.dbSalvarLancamentoFinanceiro(item);

  assert.equal(salvo.id, 777);
  assert.equal(salvo.syncPendente, false);
  assert.equal(salvo.syncErro, '');
  assert.ok(payloads.length >= 2);
  assert.ok(payloads.every(({ payload }) => payload.sync_pendente === false && payload.sync_erro === ''));
});

test('resumo dos donos restaura historico, comparativo, reserva e contas vencidas', async () => {
  const { buildOwnerReportSnapshot } = await import(pathToFileURL(path.join(root, 'supabase/functions/_shared/owner-report.ts')).href);
  const ctx = makeContext();
  const base = { vendas: ctx.VENDAS, financeiro: fixtures(), usuarios: [], agendamentos: [], owners: [], now: new Date(2026, 7, 26, 12) };
  const snapshot = buildOwnerReportSnapshot(base);
  const semVendas = buildOwnerReportSnapshot({ ...base, vendas: [] });
  assert.equal(snapshot.finance.entries_realized - semVendas.finance.entries_realized, 5000);
  assert.equal(snapshot.finance.entries_realized, 15400);
  assert.equal(snapshot.finance.entries_projected, 2500);
  assert.equal(snapshot.finance.exits_paid, 6200);
  assert.equal(snapshot.finance.exits_projected, 300);
  assert.equal(snapshot.finance.net_cash, 9200);
  assert.equal(snapshot.finance.vs_previous_month_pct, 2200);
  assert.equal(snapshot.finance.reserve_goal.target_amount, 9600);
  assert.equal(snapshot.finance.critical_accounts.items.length, 2);
  const semVendasNovas = buildOwnerReportSnapshot({ ...base, vendas: ctx.VENDAS.slice(2) });
  assert.deepEqual(snapshot.finance, semVendasNovas.finance);
  assert.notDeepEqual(snapshot.dashboard, semVendas.dashboard);
});

test('corte fixo respeita data comercial e meia-noite em Sao Paulo no caixa e no resumo', async () => {
  const { buildOwnerReportSnapshot } = await import(pathToFileURL(path.join(root, 'supabase/functions/_shared/owner-report.ts')).href);
  const casos = [
    { hist: [{ e: 8, d: '25/08/2026' }], esperado: 5000 },
    { hist: [{ e: 8, d: '26/08/2026' }], esperado: 0 },
    { hist: [{ e: 8, d: '27/08/2026' }], esperado: 0 },
    { hist: [{ e: 8, ts: '2026-08-26T02:59:59Z' }], esperado: 5000 },
    { hist: [{ e: 8, ts: '2026-08-26T03:00:00Z' }], esperado: 0 },
    { hist: [{ e: 8, d: '25/08/2026', ts: '2026-08-26T12:00:00Z' }], esperado: 5000 },
    { hist: [{ e: 8, d: '26/08/2026', ts: '2026-08-25T12:00:00Z' }], esperado: 0 },
    { hist: [{ e: 8, d: '25/08/2026' }, { e: 8, d: '27/08/2026', tipo: 'edicao' }], esperado: 5000 },
    { hist: [{ e: 8, d: '25/08/2026' }, { e: 8, d: '27/08/2026', tipo: 'bonus_gestao' }], esperado: 5000 },
    { hist: [{ e: 8, d: '25/08/2026' }, { e: 8, d: '27/08/2026' }], esperado: 0 },
    { hist: [{ e: 8, d: '25/08' }], esperado: 0 },
    { hist: [{ e: 8, d: 'invalido' }], esperado: 0 },
    { hist: [], esperado: 0 },
    { hist: [{ e: 7, d: '25/08/2026' }], esperado: 5000 }, // Fallback de importacoes legadas concluidas.
    { hist: [{ e: 8, d: '25/08/2026' }], distratada: true, esperado: 0 },
    { hist: [{ e: 8, d: '25/08/2026' }], etapa: 7, esperado: 0 }
  ];
  for (const caso of casos) {
    const ctx = makeContext([]);
    ctx.VENDAS = [{ ...salesFixtures()[2], ...caso }];
    const antes = JSON.stringify(ctx.VENDAS);
    vm.runInContext('finHojeRef = () => new Date(2027, 0, 10, 12);', ctx);
    assert.equal(ctx.finColetarMes(7, 2026).entradas.totalRealizado, caso.esperado, JSON.stringify(caso));
    const snapshot = buildOwnerReportSnapshot({ vendas: ctx.VENDAS, financeiro: [], usuarios: [], agendamentos: [], owners: [], now: new Date(2026, 7, 26, 12) });
    assert.equal(snapshot.finance.entries_realized, caso.esperado, JSON.stringify(caso));
    assert.equal(snapshot.finance.entries_projected, 0);
    assert.equal(snapshot.finance.exits_paid, 0);
    assert.equal(snapshot.finance.exits_projected, 0);
    assert.equal(JSON.stringify(ctx.VENDAS), antes);
  }
});

test('historico no calendario abre venda; repasse gravado permite baixa e comprovante no proprio registro', () => {
  const ctx = makeContext();
  ctx.FINANCEIRO_LANCAMENTOS[7].comprovanteNome = 'recibo.pdf';
  ctx.FINANCEIRO_LANCAMENTOS[7].comprovanteStorageBucket = 'documentos';
  ctx.FINANCEIRO_LANCAMENTOS[7].comprovanteStoragePath = 'financeiro/recibo.pdf';
  const mes = ctx.finColetarMes(7, 2026);
  const receita = mes.entradas.realizadas.find(item => item.origem === 'venda');
  const repasse = mes.saidas.realizadas.find(item => item.historicoAutomatico);
  assert.match(ctx.finAcaoItem(receita), /irParaVenda\(11\)/);
  assert.match(ctx.finAcaoItem(repasse), /finEditarLancamentoManual\('fin-comissao-venda-1-corretor'\)/);
  assert.equal(ctx.finTemComprovante(repasse), true);
  assert.equal(ctx.finPodeBaixaRapida(repasse), false);
  assert.equal(ctx.finPodeBaixaRapida(ctx.finColetarSaidasVencidasHistorico(7, 2026)[0]), true);
  assert.match(ctx.finSubtituloVisao(), /26\/08\/2026/);
  assert.match(ctx.finMetaItem(repasse), /historico automatico/);
});

test('baixa manual de repasse antigo atualiza por referencia sem inserir nem reabrir geracao automatica', async () => {
  const ctx = makeContext();
  loadFinanceMappers(ctx);
  const item = { ...ctx.FINANCEIRO_LANCAMENTOS[7], edicaoManualLegado: true };
  let inserts = 0;
  const filtros = [];
  const query = {
    update() { return query; }, insert() { inserts++; return query; },
    eq(coluna, valor) { filtros.push([coluna, valor]); return query; }, select() { return query; },
    async maybeSingle() { return { data: { ...ctx.mapLancamentoFinanceiroOut(item), id: item.id } }; }
  };
  Object.assign(ctx, {
    sb: { from: () => query }
  });
  assert.equal(ctx.lancamentoFinanceiroTemSyncPendente(item), false);
  vm.runInContext(supabaseFunction('dbSalvarLancamentoFinanceiro'), ctx);
  const salvo = await ctx.dbSalvarLancamentoFinanceiro(item, item.id);
  assert.equal(salvo.id, 8);
  assert.equal(salvo.syncPendente, false);
  assert.equal(salvo.edicaoManualLegado, true);
  assert.equal(salvo.valor, 5000);
  assert.deepEqual(filtros, [['ref_local', 'fin-comissao-venda-1-corretor']]);
  assert.equal(inserts, 0);
  query.maybeSingle = async () => ({ data: null });
  await assert.rejects(ctx.dbSalvarLancamentoFinanceiro(item, item.id), /Repasse historico nao encontrado/);
  assert.equal(inserts, 0);
  assert.ok(filtros.every(([coluna]) => coluna === 'ref_local'));
});

test('marcador de baixa manual sobrevive ao cache mas nao exige coluna nova no Supabase', () => {
  const ctx = makeContext();
  loadFinanceMappers(ctx);
  const item = { ...ctx.FINANCEIRO_LANCAMENTOS[7], edicaoManualLegado: true, syncPendente: true };
  const recarregado = ctx.mapLancamentoFinanceiroIn(JSON.parse(JSON.stringify(item)));
  assert.equal(recarregado.edicaoManualLegado, true);
  assert.equal(ctx.lancamentoFinanceiroTemSyncPendente(recarregado), false);
  assert.equal(Object.hasOwn(ctx.mapLancamentoFinanceiroOut(recarregado), 'edicaoManualLegado'), false);
  const apenasAntigo = ctx.mapLancamentoFinanceiroIn(ctx.FINANCEIRO_LANCAMENTOS[7]);
  assert.equal(ctx.lancamentoFinanceiroTemSyncPendente(apenasAntigo), false);
});

test('resumo dos donos le o historico tambem no formato de colunas do Supabase', async () => {
  const { buildOwnerReportSnapshot } = await import(pathToFileURL(path.join(root, 'supabase/functions/_shared/owner-report.ts')).href);
  const ctx = makeContext();
  loadFinanceMappers(ctx);
  const banco = ctx.FINANCEIRO_LANCAMENTOS.map(item => ctx.mapLancamentoFinanceiroOut({ ...item }));
  const snapshot = buildOwnerReportSnapshot({ vendas: ctx.VENDAS, financeiro: banco, usuarios: [], agendamentos: [], owners: [], now: new Date(2026, 7, 26, 12) });
  const caixa = ctx.finColetarMes(7, 2026);
  assert.equal(snapshot.finance.entries_realized, caixa.entradas.totalRealizado);
  assert.equal(snapshot.finance.exits_paid, caixa.saidas.totalRealizado);
  assert.equal(snapshot.finance.entries_projected, caixa.entradas.totalPrevisto);
  assert.equal(snapshot.finance.exits_projected, caixa.saidas.totalPrevisto);
});
