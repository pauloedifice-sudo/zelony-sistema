const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const atoSource = fs.readFileSync(path.join(root, 'js/reembolsos-ato.js'), 'utf8');
const SUPABASE_PARTES = ['js/supabase-boot.js', 'js/supabase-mappers.js', 'js/supabase-mappers2.js', 'js/supabase-crud.js'];
const supabaseSource = SUPABASE_PARTES.map(p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')).join('\n');

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
    console, Intl, Date, clearTimeout,
    setTimeout: () => 0,
    role: 'dono', usuarioLogado: { id: 1, nome: 'PAULO', email: 'paulo@teste.local' },
    REEMBOLSOS_ATO: lista,
    zSetState() {}, zRegisterModule() {}, zNormalizarCampoTexto: valor => String(valor || '').replace(/\s+/g, ' ').trim(),
    showToast() {}, salvarLS() {}, appPodePersistirNoSupabase: () => true,
    recarregarReembolsosAtoProtegidos: async () => lista,
    window: { confirm: () => true }, navigator: { clipboard: { writeText: async () => {} } },
    document: { getElementById: () => null }
  });
  vm.runInContext(atoSource, ctx, { filename: 'js/reembolsos-ato.js' });
  return ctx;
}

test('formata telefone e converte valor brasileiro', () => {
  const ctx = makeContext();
  assert.equal(ctx.atoFormatarTelefone('41999998888'), '(41) 99999-8888');
  assert.equal(ctx.atoFormatarTelefone('4133334444'), '(41) 3333-4444');
  assert.equal(ctx.atoParseValor('R$ 1.250,90'), 1250.9);
});

test('identifica pendente, atrasado e reembolsado pela data', () => {
  const ctx = makeContext();
  assert.equal(ctx.atoStatus({ status: 'pendente', dataPrevista: '2026-09-09' }, '2026-09-10'), 'atrasado');
  assert.equal(ctx.atoStatus({ status: 'pendente', dataPrevista: '2026-09-10' }, '2026-09-10'), 'pendente');
  assert.equal(ctx.atoStatus({ status: 'reembolsado', dataPrevista: '2026-09-01' }, '2026-09-10'), 'reembolsado');
});

test('renderiza os campos e a baixa automatica do financeiro', () => {
  const ctx = makeContext([
    { id: 7, cliente: 'MARIA SILVA', telefone: '41999998888', valor: 850, dataPrevista: '2026-09-20', banco: 'NUBANK', chavePix: 'maria@pix.local', status: 'pendente' }
  ]);
  const target = { innerHTML: '' };
  ctx.document = { getElementById: id => id === 'reembolsos-ato-content' ? target : null };
  ctx.renderReembolsosAto();
  assert.match(target.innerHTML, /CLIENTE<\/th><th>TELEFONE<\/th><th>VALOR<\/th><th>DATA<\/th><th>SITUAÇÃO/);
  assert.match(target.innerHTML, /MARIA SILVA/);
  assert.match(target.innerHTML, /Marcar reembolsado/);
  assert.match(target.innerHTML, /baixa automática no Financeiro/);
});

test('mostra anexo pendente e comprovante salvo somente depois da baixa', () => {
  const ctx = makeContext([
    { id: 10, cliente: 'SEM ARQUIVO', telefone: '41999998888', valor: 100, dataPrevista: '2026-09-01', dataReembolso: '2026-09-11', banco: 'ITAU', chavePix: 'pix-1', status: 'reembolsado' },
    { id: 11, cliente: 'COM ARQUIVO', telefone: '41999997777', valor: 200, dataPrevista: '2026-09-02', dataReembolso: '2026-09-11', banco: 'C6', chavePix: 'pix-2', status: 'reembolsado', comprovanteNome: 'recibo.pdf', comprovanteSize: 2048, comprovanteStorageBucket: 'reembolsos-ato', comprovanteStoragePath: '11/arquivo.pdf' }
  ]);
  const target = { innerHTML: '' };
  ctx.document = { getElementById: id => id === 'reembolsos-ato-content' ? target : null };
  ctx.renderReembolsosAto();
  assert.match(target.innerHTML, /COMPROVANTE<\/th>/);
  assert.match(target.innerHTML, /Sem comprovante/);
  assert.match(target.innerHTML, /Anexar comprovante/);
  assert.match(target.innerHTML, /recibo\.pdf/);
  assert.match(target.innerHTML, />Ver<\/button>/);
  assert.match(target.innerHTML, />Substituir<\/button>/);
  assert.match(target.innerHTML, /Excluir lançamento/);
});

test('restringe o modulo a Dono e Financeiro', () => {
  const ctx = makeContext([]);
  const target = { innerHTML: '' };
  ctx.role = 'dir';
  ctx.document = { getElementById: id => id === 'reembolsos-ato-content' ? target : null };
  ctx.renderReembolsosAto();
  assert.equal(ctx.atoPodeAcessar(), false);
  assert.match(target.innerHTML, /Acesso restrito/);
  assert.doesNotMatch(target.innerHTML, /Adicionar reembolso/);
});

test('mapeamento do Supabase preserva datas, status e PIX', () => {
  const ctx = vm.createContext({ Date, normalizarCampoSistema: valor => String(valor || '').trim().toUpperCase() });
  vm.runInContext(sourceFunction(supabaseSource, 'mapReembolsoAtoIn'), ctx);
  vm.runInContext(sourceFunction(supabaseSource, 'mapReembolsoAtoOut'), ctx);
  const interno = ctx.mapReembolsoAtoIn({
    id: '8', cliente: 'Maria', telefone: '(41) 99999-8888', valor: '850.75', data_prevista: '2026-09-20', banco: 'Nubank', chave_pix: 'maria@pix.local', status: 'reembolsado', data_reembolso: '2026-09-11', financeiro_lancamento_id: '99', comprovante_nome: 'recibo.pdf', comprovante_mime: 'application/pdf', comprovante_size: '2048', comprovante_storage_bucket: 'reembolsos-ato', comprovante_storage_path: '8/arquivo.pdf'
  });
  assert.equal(interno.id, 8);
  assert.equal(interno.valor, 850.75);
  assert.equal(interno.dataPrevista, '2026-09-20');
  assert.equal(interno.dataReembolso, '2026-09-11');
  assert.equal(interno.financeiroLancamentoId, 99);
  assert.equal(interno.comprovanteNome, 'recibo.pdf');
  assert.equal(interno.comprovanteSize, 2048);
  assert.equal(interno.comprovanteStoragePath, '8/arquivo.pdf');
  const banco = ctx.mapReembolsoAtoOut(interno);
  assert.equal(banco.chave_pix, 'maria@pix.local');
  assert.equal(banco.data_prevista, '2026-09-20');
});

test('dados sensiveis usam servico protegido e RLS fechado', () => {
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260911120000_reembolsos_ato.sql'), 'utf8');
  assert.doesNotMatch(supabaseSource, /\.from\(['"]reembolsos_ato['"]\)/);
  assert.match(supabaseSource, /folhaPagamentoInvocarProtegido\('list_ato_refunds'\)/);
  assert.match(migration, /revoke all on table public\.reembolsos_ato from anon, authenticated/i);
  assert.doesNotMatch(migration, /using\s*\(true\)/i);
});

test('servidor limita acesso e usa referencia financeira idempotente', () => {
  const edgeSource = fs.readFileSync(path.join(root, 'supabase/functions/usuario-self-service/index.ts'), 'utf8');
  const canManageSource = sourceFunction(edgeSource, 'canManageAtoRefunds');
  const markSource = sourceFunction(edgeSource, 'markAtoRefunded');
  assert.match(canManageSource, /\["dono",\s*"financeiro"\]/);
  assert.doesNotMatch(canManageSource, /diretor/);
  assert.match(markSource, /fin-reembolso-ato-\$\{id\}/);
  assert.match(markSource, /categoria:\s*"REEMBOLSO"/);
  assert.match(markSource, /data_realizada:\s*dataReembolso/);
  assert.match(markSource, /financeiro_lancamento_id:\s*lancamento\.id/);
});

test('comprovantes usam bucket privado e links assinados protegidos', () => {
  const edgeSource = fs.readFileSync(path.join(root, 'supabase/functions/usuario-self-service/index.ts'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260911130000_reembolsos_ato_comprovantes.sql'), 'utf8');
  const createSource = sourceFunction(edgeSource, 'createAtoReceiptUpload');
  const confirmSource = sourceFunction(edgeSource, 'confirmAtoReceiptUpload');
  const getSource = sourceFunction(edgeSource, 'getAtoReceiptUrl');
  assert.match(migration, /'reembolsos-ato',[\s\S]*?false,[\s\S]*?10485760/);
  assert.doesNotMatch(migration, /create policy/i);
  assert.match(createSource, /status\)\s*!==\s*"reembolsado"/);
  assert.match(createSource, /createSignedUploadUrl/);
  assert.match(confirmSource, /comprovante_storage_path:\s*path/);
  assert.match(confirmSource, /remove\(\[oldPath\]\)/);
  assert.match(getSource, /createSignedUrl\(path, 300\)/);
});

test('exclusao completa remove reembolso, financeiro e comprovante no servidor', () => {
  const edgeSource = fs.readFileSync(path.join(root, 'supabase/functions/usuario-self-service/index.ts'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260911140000_excluir_reembolso_ato_completo.sql'), 'utf8');
  const deleteSource = sourceFunction(edgeSource, 'deleteAtoRefund');
  const uiDeleteSource = sourceFunction(atoSource, 'atoExcluir');
  assert.match(migration, /delete from public\.financeiro_lancamentos/i);
  assert.match(migration, /delete from public\.reembolsos_ato/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /revoke all on function public\.excluir_reembolso_ato_completo\(bigint\)[\s\S]*from public, anon, authenticated/i);
  assert.match(deleteSource, /rpc\("excluir_reembolso_ato_completo"/);
  assert.match(deleteSource, /storage\.from\(ATO_RECEIPT_BUCKET\)\.remove\(\[receiptPath\]\)/);
  assert.doesNotMatch(deleteSource, /concluído não pode ser excluído/);
  assert.match(uiDeleteSource, /saída automática/);
  assert.match(uiDeleteSource, /Esta ação não pode ser desfeita/);
});

test('cliente remove da memoria a saida financeira ligada ao reembolso excluido', async () => {
  const financeiro = [
    { id: 77, refLocal: 'fin-reembolso-ato-9' },
    { id: 88, refLocal: 'fin-manual-outra-saida' }
  ];
  const ctx = vm.createContext({
    FINANCEIRO_LANCAMENTOS: financeiro,
    appExigirModoOnline() {}, zSetState() {},
    async folhaPagamentoInvocarProtegido(action) {
      assert.equal(action, 'delete_ato_refund');
      return { ok: true, financeiroLancamentoId: 77, financeiroRefLocal: 'fin-reembolso-ato-9' };
    }
  });
  vm.runInContext(sourceFunction(supabaseSource, 'dbExcluirReembolsoAto'), ctx);
  await ctx.dbExcluirReembolsoAto(9);
  assert.equal(financeiro.length, 1);
  assert.equal(financeiro[0].id, 88);
});

test('cliente envia arquivo com URL assinada e confirma os metadados', async () => {
  const chamadas = [];
  const uploads = [];
  const ctx = vm.createContext({
    Date,
    normalizarCampoSistema: valor => String(valor || '').trim().toUpperCase(),
    appExigirModoOnline() {},
    sb: { storage: { from(bucket) { return { async uploadToSignedUrl(path, token, file, options) { uploads.push({ bucket, path, token, file, options }); return { error: null }; } }; } } },
    async folhaPagamentoInvocarProtegido(action, payload) {
      chamadas.push({ action, payload });
      if (action === 'create_ato_receipt_upload') return { upload: { bucket: 'reembolsos-ato', path: '9/uuid.pdf', token: 'token-seguro' } };
      if (action === 'confirm_ato_receipt_upload') return { reembolso: { id: 9, cliente: 'MARIA', status: 'reembolsado', comprovante_nome: payload.nome, comprovante_mime: payload.mime, comprovante_size: payload.size, comprovante_storage_bucket: payload.bucket, comprovante_storage_path: payload.path } };
      if (action === 'get_ato_receipt_url') return { url: 'https://storage.test/signed', expiresIn: 300 };
      return {};
    }
  });
  for (const name of ['mapReembolsoAtoIn', 'tipoComprovanteReembolsoAto', 'dbEnviarComprovanteReembolsoAto', 'dbObterUrlComprovanteReembolsoAto']) {
    vm.runInContext(sourceFunction(supabaseSource, name), ctx);
  }
  const file = { name: 'recibo.pdf', type: 'application/pdf', size: 4096 };
  const atualizado = await ctx.dbEnviarComprovanteReembolsoAto(9, file);
  const acesso = await ctx.dbObterUrlComprovanteReembolsoAto(9);
  assert.equal(atualizado.comprovanteNome, 'recibo.pdf');
  assert.equal(atualizado.comprovanteStoragePath, '9/uuid.pdf');
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].token, 'token-seguro');
  assert.equal(acesso.url, 'https://storage.test/signed');
  assert.deepEqual(chamadas.map(item => item.action), ['create_ato_receipt_upload', 'confirm_ato_receipt_upload', 'get_ato_receipt_url']);
});

test('CRUD e baixa do cliente chamam apenas as acoes protegidas', async () => {
  const chamadas = [];
  const ctx = vm.createContext({
    Date,
    REEMBOLSOS_ATO: [], FINANCEIRO_LANCAMENTOS: [],
    normalizarCampoSistema: valor => String(valor || '').trim().toUpperCase(),
    appExigirModoOnline() {}, zSetState() {}, ordenarFinanceiroLancamentos: () => 0,
    mapLancamentoFinanceiroIn: item => ({ id: item.id, refLocal: item.ref_local }),
    async folhaPagamentoInvocarProtegido(action, payload) {
      chamadas.push({ action, payload });
      if (action === 'save_ato_refund') return { reembolso: { id: 9, status: 'pendente', ...payload.reembolso } };
      if (action === 'mark_ato_refunded') return {
        reembolso: { id: 9, cliente: 'MARIA', telefone: '41999998888', valor: 850, data_prevista: '2026-09-20', banco: 'NUBANK', chave_pix: 'pix', status: 'reembolsado', data_reembolso: payload.data_reembolso, financeiro_lancamento_id: 77 },
        lancamento: { id: 77, ref_local: 'fin-reembolso-ato-9' }
      };
      return { ok: true };
    }
  });
  for (const name of ['mapReembolsoAtoIn', 'mapReembolsoAtoOut', 'dbSalvarReembolsoAto', 'dbExcluirReembolsoAto', 'dbMarcarReembolsoAtoPago']) {
    vm.runInContext(sourceFunction(supabaseSource, name), ctx);
  }
  const reembolso = { cliente: 'Maria', telefone: '41999998888', valor: 850, dataPrevista: '2026-09-20', banco: 'Nubank', chavePix: 'pix' };
  await ctx.dbSalvarReembolsoAto(reembolso, null);
  await ctx.dbExcluirReembolsoAto(9);
  const pago = await ctx.dbMarcarReembolsoAtoPago(9, '2026-09-11');
  assert.equal(pago.status, 'reembolsado');
  assert.equal(ctx.FINANCEIRO_LANCAMENTOS.length, 1);
  assert.deepEqual(chamadas.map(item => item.action), ['save_ato_refund', 'delete_ato_refund', 'mark_ato_refunded']);
});
