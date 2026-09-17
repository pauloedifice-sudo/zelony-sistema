const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const utilsSource = fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8').replace(/\r\n/g, '\n');
const treinSource = fs.readFileSync(path.join(root, 'js/treinamentos.js'), 'utf8').replace(/\r\n/g, '\n');

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
    console, Date, Math, Array, Number, String, Object, JSON, URL, URLSearchParams,
    window: {}, localStorage: { getItem: () => null, setItem: () => {} },
    document: { addEventListener: () => {}, getElementById: () => null },
    role: 'dir',
    usuarioLogado: { id: 1, nome: 'Paulo Cesar', email: 'paulo@teste.local' },
    getPerfil: p => ({ cor: 'cor', cap: 'cap', ger: 'ger' }[p] || 'cor'),
    TREIN: [], TREIN_PROGRESSO: {}, TREIN_META: {},
    zSetState() {}, zRegisterModule() {}, showToast() {}, salvarLS() {},
    ...overrides
  });
  vm.runInContext(utilsSource, ctx, { filename: 'js/utils.js' });
  vm.runInContext(treinSource, ctx, { filename: 'js/treinamentos.js' });
  return ctx;
}

test('extrairTreinYoutubeVideoId reconhece youtu.be, watch?v= e /embed/', () => {
  const ctx = makeContext();
  assert.equal(ctx.extrairTreinYoutubeVideoId('https://youtu.be/abc123XYZ'), 'abc123XYZ');
  assert.equal(ctx.extrairTreinYoutubeVideoId('https://www.youtube.com/watch?v=abc123XYZ'), 'abc123XYZ');
  assert.equal(ctx.extrairTreinYoutubeVideoId('https://youtube.com/embed/abc123XYZ'), 'abc123XYZ');
  assert.equal(ctx.extrairTreinYoutubeVideoId(''), '');
  assert.equal(ctx.extrairTreinYoutubeVideoId('nao e uma url'), '');
});

test('getTreinVideoYoutubeId prioriza youtubeVideoId e depois extrai da url/embedUrl', () => {
  const ctx = makeContext();
  assert.equal(ctx.getTreinVideoYoutubeId({ youtubeVideoId: 'ID1' }), 'ID1');
  assert.equal(ctx.getTreinVideoYoutubeId({ youtubeUrl: 'https://youtu.be/ID2' }), 'ID2');
  assert.equal(ctx.getTreinVideoYoutubeId({ embedUrl: 'https://youtube.com/embed/ID3' }), 'ID3');
  assert.equal(ctx.getTreinVideoYoutubeId(null), '');
});

test('getTreinVideoEmbedUrl, getTreinVideoThumb e getTreinVideoYoutubeUrl montam as urls corretas', () => {
  const ctx = makeContext();
  const video = { youtubeVideoId: 'XYZ' };
  assert.equal(ctx.getTreinVideoEmbedUrl(video), 'https://www.youtube-nocookie.com/embed/XYZ');
  assert.equal(ctx.getTreinVideoThumb(video), 'https://img.youtube.com/vi/XYZ/hqdefault.jpg');
  assert.equal(ctx.getTreinVideoYoutubeUrl(video), 'https://youtu.be/XYZ');
  assert.equal(ctx.getTreinVideoEmbedUrl({}), '');
});

test('isTreinVideoYoutube distingue video do youtube de video enviado', () => {
  const ctx = makeContext();
  assert.equal(ctx.isTreinVideoYoutube({ youtubeVideoId: 'XYZ' }), true);
  assert.equal(ctx.isTreinVideoYoutube({ dataUrl: 'data:video/mp4;base64,AAA' }), false);
});

test('getTreinVideoSrc prioriza youtube, depois dataUrl, depois objectUrl', () => {
  const ctx = makeContext();
  assert.equal(ctx.getTreinVideoSrc({ youtubeVideoId: 'XYZ' }), 'https://www.youtube-nocookie.com/embed/XYZ');
  assert.equal(ctx.getTreinVideoSrc({ dataUrl: 'data:video/mp4;base64,AAA' }), 'data:video/mp4;base64,AAA');
  assert.equal(ctx.getTreinVideoSrc({ objectUrl: 'blob:xyz' }), 'blob:xyz');
  assert.equal(ctx.getTreinVideoSrc(null), '');
});

test('normalizarCatTrein mapeia perfis conhecidos e usa Corretor como padrao', () => {
  const ctx = makeContext();
  assert.equal(ctx.normalizarCatTrein('cor'), 'Corretor');
  assert.equal(ctx.normalizarCatTrein('cap'), 'Capitão');
  assert.equal(ctx.normalizarCatTrein('ger'), 'Gerente');
  assert.equal(ctx.normalizarCatTrein('perfil-desconhecido'), 'Corretor');
});

test('treinKey usa o id quando existe e cai para categoria+titulo quando nao existe', () => {
  const ctx = makeContext();
  assert.equal(ctx.treinKey({ id: 42, titulo: 'Qualquer' }), 'id:42');
  assert.equal(ctx.treinKey({ cat: 'cor', titulo: '  Onboarding  ' }), 'Corretor::ONBOARDING');
});

test('treinToken/decodeTreinToken fazem o roundtrip e decode tolera token invalido', () => {
  const ctx = makeContext();
  const t = { cat: 'cor', titulo: 'Título com espaço & símbolo' };
  const token = ctx.treinToken(t);
  assert.equal(ctx.decodeTreinToken(token), ctx.treinKey(t));
  assert.equal(ctx.decodeTreinToken('%'), '%');
});

test('getTreinAulasFallback calcula aulas concluidas a partir do percentual salvo', () => {
  const ctx = makeContext();
  assert.deepEqual(ctx.getTreinAulasFallback({ prog: 50 }, 4), [0, 1]);
  assert.deepEqual(ctx.getTreinAulasFallback({ prog: 100 }, 4), [0, 1, 2, 3]);
  assert.deepEqual(ctx.getTreinAulasFallback({ prog: 0 }, 4), []);
});

test('criarTreinProgressoInicial usa getTreinAulasFallback e marca conclusao quando 100%', () => {
  const ctx = makeContext();
  const inicial = ctx.criarTreinProgressoInicial({ prog: 100, aulas: 3 });
  assert.equal(inicial.aulas.length, 3);
  assert.ok(inicial.concluidaEm);
  const parcial = ctx.criarTreinProgressoInicial({ prog: 50, aulas: 4 });
  assert.equal(parcial.concluidaEm, null);
});

test('isTreinAprovado/isTreinBloqueado respeitam status e pre-requisito', () => {
  const prereq = { cat: 'cor', titulo: 'Pre-requisito', aulas: 0 };
  const avancado = { cat: 'cor', titulo: 'Avancado', aulas: 0 };
  const ctx = makeContext({
    TREIN: [prereq, avancado],
    TREIN_PROGRESSO: { 'id:1': { 'Corretor::PRE-REQUISITO': { aulas: [], iniciadaEm: null, atualizadaEm: null, certificadoEm: '2026-01-01T00:00:00.000Z' } } }
  });
  assert.equal(ctx.isTreinAprovado(prereq), false);
  avancado.prerequisito = ctx.treinKey(prereq);
  assert.equal(ctx.isTreinBloqueado(avancado), true);
  const semPrereq = { cat: 'cor', titulo: 'Independente' };
  assert.equal(ctx.isTreinBloqueado(semPrereq), false);
});

test('renderMtVideos escapa o nome do arquivo de video contra XSS armazenado (regressao)', () => {
  const body = sourceFunction(treinSource, 'renderMtVideos');
  assert.match(body, /zUiHtml\(video\.nome\)/);
  assert.doesNotMatch(body, /\$\{zUiText\(video\.nome\)\}/);
});

test('zUiHtml realmente escapa um nome de arquivo malicioso (integracao com utils.js)', () => {
  const ctx = makeContext();
  const escapado = ctx.zUiHtml('<img src=x onerror=alert(1)>.mp4');
  assert.doesNotMatch(escapado, /<img/);
  assert.match(escapado, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
