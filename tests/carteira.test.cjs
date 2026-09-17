const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const utilsSource = fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8').replace(/\r\n/g, '\n');
const carteiraSource = fs.readFileSync(path.join(root, 'js/carteira.js'), 'utf8').replace(/\r\n/g, '\n');

const ETAPAS = ['Aguardando demanda', 'Entrevista', 'Ass. formulários', 'Envio CEHOP', 'Entrevista Caixa', 'Aguard. Ass. CEF', 'Assinado CEF', 'Nota emitida', 'Comissão recebida'];

function makeContext(overrides = {}) {
  const ctx = vm.createContext({
    console, Intl, Date, Math, Array, Number, String, Object, JSON,
    window: {}, localStorage: { getItem: () => null, setItem: () => {} },
    document: { addEventListener: () => {}, getElementById: () => null },
    role: 'dono',
    usuarioLogado: { id: 1, nome: 'Paulo Cesar', email: 'paulo@teste.local' },
    ETAPAS,
    zSetState() {}, zRegisterModule() {}, showToast() {},
    ...overrides
  });
  vm.runInContext(utilsSource, ctx, { filename: 'js/utils.js' });
  vm.runInContext(carteiraSource, ctx, { filename: 'js/carteira.js' });
  return ctx;
}

test('fmtCarteiraValor formata em BRL e trata valores invalidos', () => {
  const ctx = makeContext();
  assert.equal(ctx.fmtCarteiraValor(1234.5), 'R$ 1.234,50');
  assert.equal(ctx.fmtCarteiraValor(undefined), 'R$ 0,00');
  assert.equal(ctx.fmtCarteiraValor(NaN), 'R$ 0,00');
});

test('fmtPctCarteira formata percentual com virgula', () => {
  const ctx = makeContext();
  assert.equal(ctx.fmtPctCarteira(12.345), '12,3%');
  assert.equal(ctx.fmtPctCarteira(undefined), '0,0%');
});

test('fmtDeltaCarteira e fmtDeltaPctCarteira tratam base ausente e sinal', () => {
  const ctx = makeContext();
  assert.equal(ctx.fmtDeltaCarteira({ possuiBase: false }), 'Sem base');
  assert.equal(ctx.fmtDeltaCarteira({ possuiBase: true, delta: 5000 }), '+R$ 5k');
  assert.equal(ctx.fmtDeltaCarteira({ possuiBase: true, delta: -5000 }), '-R$ 5k');
  assert.equal(ctx.fmtDeltaPctCarteira({ possuiBase: false }), 'sem base anterior');
  assert.equal(ctx.fmtDeltaPctCarteira({ possuiBase: true, pct: 12.3 }), '+12,3%');
  assert.equal(ctx.fmtDeltaPctCarteira({ possuiBase: true, pct: -12.3 }), '-12,3%');
});

test('carteiraFmtDias trata singular, plural e fallback', () => {
  const ctx = makeContext();
  assert.equal(ctx.carteiraFmtDias(1), '1 dia');
  assert.equal(ctx.carteiraFmtDias(5), '5 dias');
  assert.equal(ctx.carteiraFmtDias(NaN), 'Sem base');
  assert.equal(ctx.carteiraFmtDias(NaN, 'Nunca'), 'Nunca');
});

test('carteiraDiffDias calcula diferenca de dias ignorando hora', () => {
  const ctx = makeContext();
  const inicio = new Date(2026, 8, 1, 23, 59);
  const fim = new Date(2026, 8, 4, 0, 1);
  assert.equal(ctx.carteiraDiffDias(inicio, fim), 3);
  assert.equal(ctx.carteiraDiffDias(fim, inicio), 0);
  assert.equal(ctx.carteiraDiffDias(null, fim), null);
  assert.equal(ctx.carteiraDiffDias(inicio, new Date('invalido')), null);
});

test('carteiraMediana calcula mediana para listas pares, impares e vazias', () => {
  const ctx = makeContext();
  assert.equal(ctx.carteiraMediana([1, 3, 5]), 3);
  assert.equal(ctx.carteiraMediana([1, 2, 3, 4]), 3);
  assert.equal(ctx.carteiraMediana([]), null);
  assert.equal(ctx.carteiraMediana('nao-array'), null);
  assert.equal(ctx.carteiraMediana([10, NaN, 20]), 15);
});

test('carteiraMesAnoLabel formata mes/ano curto e trata data invalida', () => {
  const ctx = makeContext();
  assert.equal(ctx.carteiraMesAnoLabel(new Date(2026, 0, 15)), 'JAN 26');
  assert.equal(ctx.carteiraMesAnoLabel(new Date('invalido')), 'Sem data');
  assert.equal(ctx.carteiraMesAnoLabel(null), 'Sem data');
});

test('normalizarCarteiraTexto remove acentos e caixa para comparacao', () => {
  const ctx = makeContext();
  assert.equal(ctx.normalizarCarteiraTexto('Indicação'), 'INDICACAO');
  assert.equal(ctx.normalizarCarteiraTexto('  oferta ativa  '), 'OFERTA ATIVA');
});

test('carteiraRotuloPadrao corrige rotulos conhecidos e preserva o resto', () => {
  const ctx = makeContext();
  assert.equal(ctx.carteiraRotuloPadrao('indicacao'), 'Indicação');
  assert.equal(ctx.carteiraRotuloPadrao(''), '');
  assert.equal(ctx.carteiraRotuloPadrao('', 'nao informado'), 'Não informado');
});

test('ordemMesCarteira ordena pelos meses do ano e usa 99 para desconhecido', () => {
  const ctx = makeContext();
  assert.equal(ctx.ordemMesCarteira('Janeiro'), 0);
  assert.equal(ctx.ordemMesCarteira('Dezembro'), 11);
  assert.equal(ctx.ordemMesCarteira('Mes Estranho'), 99);
});

test('carteiraMatchUsuarioCampo compara nome completo e primeiro nome do usuario logado', () => {
  const ctx = makeContext({ usuarioLogado: { id: 1, nome: 'Paulo Cesar', email: 'p@teste.local' } });
  assert.equal(ctx.carteiraMatchUsuarioCampo('paulo cesar'), true);
  assert.equal(ctx.carteiraMatchUsuarioCampo('Paulo'), true);
  assert.equal(ctx.carteiraMatchUsuarioCampo('Outra Pessoa'), false);
  assert.equal(ctx.carteiraMatchUsuarioCampo(''), false);
});

test('escapeHtmlCarteira escapa os cinco caracteres perigosos de HTML', () => {
  const ctx = makeContext();
  const payload = `<img src=x onerror=alert(1)>"'&`;
  assert.equal(ctx.escapeHtmlCarteira(payload), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
  assert.equal(ctx.escapeHtmlCarteira(null), '');
});

test('carteiraUiHtml conserta mojibake e escapa HTML no mesmo valor (regressao XSS)', () => {
  const ctx = makeContext();
  const malicioso = 'ComissÃ£o <script>alert(1)</script>';
  const resultado = ctx.carteiraUiHtml(malicioso);
  assert.doesNotMatch(resultado, /<script>/);
  assert.match(resultado, /Comissão/);
  assert.match(resultado, /&lt;script&gt;/);
});

test('getCols retorna as colunas certas por perfil', () => {
  const ctx = makeContext({ role: 'cor' });
  assert.deepEqual(Array.from(ctx.getCols()), ['data', 'cliente', 'produto', 'corretor', 'gerente', 'vgv', 'com_cor', 'minha', 'bonus_cor', 'etapa']);
  const ctxDono = makeContext({ role: 'dono' });
  assert.ok(ctxDono.getCols().includes('com_zel'));
  assert.ok(!ctx.getCols().includes('com_zel'));
});
