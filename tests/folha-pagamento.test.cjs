const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const folhaSource = fs.readFileSync(path.join(root, 'js/folha-pagamento.js'), 'utf8');
const supabaseSource = fs.readFileSync(path.join(root, 'js/supabase.js'), 'utf8').replace(/\r\n/g, '\n');

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

function makeContext(lista = []) {
  const ctx = vm.createContext({
    console, Intl, Date, setTimeout, clearTimeout,
    role: 'dono', usuarioLogado: { id: 1, nome: 'PAULO', email: 'paulo@teste.local' },
    FOLHA_PAGAMENTO_COLABORADORES: lista,
    zSetState() {}, zRegisterModule() {}, zNormalizarCampoTexto: valor => String(valor || '').replace(/\s+/g, ' ').trim(),
    showToast() {}, salvarLS() {}, appPodePersistirNoSupabase: () => true,
    recarregarFolhaPagamentoProtegida: async () => lista,
    window: { confirm: () => true }, navigator: { clipboard: { writeText: async () => {} } },
    document: { getElementById: () => null }
  });
  vm.runInContext(folhaSource, ctx, { filename: 'js/folha-pagamento.js' });
  return ctx;
}

test('formata e valida CPF sem aceitar sequencias repetidas', () => {
  const ctx = makeContext();
  assert.equal(ctx.folhaFormatarCpf('52998224725'), '529.982.247-25');
  assert.equal(ctx.folhaCpfValido('529.982.247-25'), true);
  assert.equal(ctx.folhaCpfValido('111.111.111-11'), false);
  assert.equal(ctx.folhaCpfValido('529.982.247-24'), false);
});

test('converte valores brasileiros de salario', () => {
  const ctx = makeContext();
  assert.equal(ctx.folhaParseValor('R$ 4.500,90'), 4500.9);
  assert.equal(ctx.folhaParseValor('2500,00'), 2500);
  assert.equal(ctx.folhaParseValor(3100.25), 3100.25);
});

test('renderiza colunas solicitadas e total da folha', () => {
  const ctx = makeContext([
    { id: 1, nome: 'ANA SILVA', cpf: '52998224725', funcao: 'ASSISTENTE', salario: 2500, chavePix: 'ana@pix.local', banco: 'NUBANK' },
    { id: 2, nome: 'BRUNO LIMA', cpf: '11144477735', funcao: 'ANALISTA', salario: 3750, chavePix: '11144477735', banco: 'ITAU' }
  ]);
  const target = { innerHTML: '' };
  ctx.document = { getElementById: id => id === 'folha-pagamento-content' ? target : null };
  ctx.renderFolhaPagamento();
  assert.match(target.innerHTML, /NOME<\/th><th>CPF<\/th><th>FUNÇÃO<\/th><th>SALÁRIO<\/th><th>CHAVE PIX<\/th><th>BANCO/);
  assert.match(target.innerHTML, /R\$\s6\.250,00/);
  assert.match(target.innerHTML, /ANA SILVA/);
});

test('bloqueia a folha para perfis fora do financeiro', () => {
  const ctx = makeContext([]);
  const target = { innerHTML: '' };
  ctx.role = 'cor';
  ctx.document = { getElementById: id => id === 'folha-pagamento-content' ? target : null };
  ctx.renderFolhaPagamento();
  assert.match(target.innerHTML, /Acesso restrito/);
  assert.doesNotMatch(target.innerHTML, /Adicionar colaborador/);
});

test('diretor nao pode consultar a folha de pagamento', () => {
  const ctx = makeContext([]);
  const target = { innerHTML: '' };
  ctx.role = 'dir';
  ctx.document = { getElementById: id => id === 'folha-pagamento-content' ? target : null };
  ctx.renderFolhaPagamento();
  assert.equal(ctx.folhaPodeAcessar(), false);
  assert.match(target.innerHTML, /Apenas Dono e Financeiro/);
});

test('mapeamento do Supabase preserva salario e normaliza CPF', () => {
  const ctx = vm.createContext({ Date, normalizarCampoSistema: valor => String(valor || '').trim().toUpperCase() });
  vm.runInContext(sourceFunction(supabaseSource, 'mapFolhaPagamentoIn'), ctx);
  vm.runInContext(sourceFunction(supabaseSource, 'mapFolhaPagamentoOut'), ctx);
  const interno = ctx.mapFolhaPagamentoIn({
    id: '8', nome: 'Ana Silva', cpf: '529.982.247-25', funcao: 'Assistente', salario: '2450.75', chave_pix: 'ana@pix.local', banco: 'Nubank'
  });
  assert.equal(interno.id, 8);
  assert.equal(interno.cpf, '52998224725');
  assert.equal(interno.salario, 2450.75);
  assert.equal(interno.chavePix, 'ana@pix.local');
  const banco = ctx.mapFolhaPagamentoOut(interno);
  assert.equal(banco.cpf, '52998224725');
  assert.equal(banco.salario, 2450.75);
  assert.equal(banco.chave_pix, 'ana@pix.local');
});

test('cliente nao acessa a tabela sensivel diretamente e SQL revoga acesso publico', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260910120000_folha_pagamento_colaboradores.sql'), 'utf8');
  assert.doesNotMatch(supabaseSource, /\.from\(['"]folha_pagamento_colaboradores['"]\)/);
  assert.match(supabaseSource, /folhaPagamentoInvocarProtegido\('list_payroll'\)/);
  assert.match(migration, /revoke all on table public\.folha_pagamento_colaboradores from anon, authenticated/i);
  assert.doesNotMatch(migration, /using\s*\(true\)/i);
});

test('servidor autoriza somente Dono e Financeiro na folha', () => {
  const edgeSource = fs.readFileSync(path.join(root, 'supabase/functions/usuario-self-service/index.ts'), 'utf8');
  const canManageSource = sourceFunction(edgeSource, 'canManagePayroll');
  assert.match(canManageSource, /\["dono",\s*"financeiro"\]/);
  assert.doesNotMatch(canManageSource, /diretor/);
});

test('CRUD do cliente usa somente o servico protegido', async () => {
  const chamadas = [];
  const ctx = vm.createContext({
    Date,
    FOLHA_PAGAMENTO_COLABORADORES: [],
    normalizarCampoSistema: valor => String(valor || '').trim().toUpperCase(),
    appExigirModoOnline() {}, zSetState() {},
    async folhaPagamentoInvocarProtegido(action, payload) {
      chamadas.push({ action, payload });
      if (action === 'save_payroll') return { colaborador: { id: 9, ...payload.colaborador } };
      return { ok: true };
    }
  });
  for (const name of ['mapFolhaPagamentoIn', 'mapFolhaPagamentoOut', 'dbSalvarFolhaPagamentoColaborador', 'dbExcluirFolhaPagamentoColaborador']) {
    vm.runInContext(sourceFunction(supabaseSource, name), ctx);
  }
  const colaborador = { nome: 'Ana', cpf: '52998224725', funcao: 'Analista', salario: 3200, chavePix: 'ana@pix.local', banco: 'Nubank' };
  await ctx.dbSalvarFolhaPagamentoColaborador(colaborador, null);
  await ctx.dbExcluirFolhaPagamentoColaborador(9);
  assert.equal(colaborador.id, 9);
  assert.deepEqual(chamadas.map(item => item.action), ['save_payroll', 'delete_payroll']);
});
