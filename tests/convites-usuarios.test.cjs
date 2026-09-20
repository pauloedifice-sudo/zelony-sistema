const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const usuariosSource = fs.readFileSync(path.join(root, 'js/usuarios.js'), 'utf8').replace(/\r\n/g, '\n');
const SUPABASE_PARTES = ['js/supabase-boot.js', 'js/supabase-mappers.js', 'js/supabase-mappers2.js', 'js/supabase-crud.js'];
const supabaseSource = SUPABASE_PARTES.map(p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')).join('\n');
const edgeSource = fs.readFileSync(path.join(root, 'supabase/functions/usuario-self-service/index.ts'), 'utf8').replace(/\r\n/g, '\n');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260914120000_convites_usuarios_seguros.sql'), 'utf8').replace(/\r\n/g, '\n');
const completionFixMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20260914140000_corrige_conclusao_convite_usuario.sql'), 'utf8').replace(/\r\n/g, '\n');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const versionInfo = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
const netlifyHeaders = fs.readFileSync(path.join(root, '_headers'), 'utf8').replace(/\r\n/g, '\n');

function sourceFunction(source, name) {
  const declarations = [...source.matchAll(new RegExp('^(?:async )?function ' + name + '\\(', 'gm'))];
  assert.ok(declarations.length, `Funcao nao encontrada: ${name}`);
  const start = declarations.at(-1).index;
  let depth = 0;
  let started = false;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') { depth++; started = true; }
    if (source[index] === '}') depth--;
    if (started && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Fim da funcao nao encontrado: ${name}`);
}

test('link de convite usa sempre o endereco oficial e nunca o caminho local', () => {
  const context = vm.createContext({
    CONVITE_URL_PUBLICA: 'https://zelony-sistema.netlify.app/',
    URL,
  });
  vm.runInContext(sourceFunction(usuariosSource, 'gerarLinkConvite'), context);
  const link = context.gerarLinkConvite('a'.repeat(64));
  assert.equal(link, `https://zelony-sistema.netlify.app/?c=${'a'.repeat(64)}`);
  assert.doesNotMatch(sourceFunction(usuariosSource, 'gerarLinkConvite'), /window\.location/);
});

test('convite e cadastrado no servidor antes do envio do email', () => {
  const sendSource = sourceFunction(usuariosSource, 'enviarConvite');
  const versionIndex = sendSource.indexOf('await garantirVersaoAtualConvites');
  const createIndex = sendSource.indexOf('await dbCriarConviteUsuarioProtegido');
  const emailIndex = sendSource.indexOf('await emailjs.send');
  assert.ok(versionIndex >= 0);
  assert.ok(createIndex > versionIndex);
  assert.ok(createIndex >= 0);
  assert.ok(emailIndex > createIndex);
  assert.doesNotMatch(sendSource, /await dbSalvarUsuario/);
  assert.match(sendSource, /usuarioStatusPadrao\(usuarioExistente\.status\) !== 'Pendente'/);
});

test('pagina forca assets atuais e bloqueia convite enviado por aba desatualizada', () => {
  assert.equal(versionInfo.version, '20260920.1');
  assert.match(indexSource, /js\/supabase-boot\.js\?v=20260920.1/);
  assert.match(indexSource, /js\/usuarios\.js\?v=20260920.1/);
  assert.match(indexSource, /css\/styles\.css\?v=20260920.1/);
  assert.match(sourceFunction(usuariosSource, 'garantirVersaoAtualConvites'), /cache:\s*'no-store'/);
  assert.match(sourceFunction(usuariosSource, 'garantirVersaoAtualConvites'), /O sistema foi atualizado/);
  assert.match(netlifyHeaders, /\/index\.html[\s\S]*Cache-Control: no-store, max-age=0/);
  assert.match(netlifyHeaders, /\/version\.json[\s\S]*Cache-Control: no-store, max-age=0/);
});

test('cadastro pelo convite aguarda confirmacao atomica antes de mostrar sucesso', () => {
  const completeSource = sourceFunction(usuariosSource, 'concluirCadastro');
  const saveIndex = completeSource.indexOf('await dbConcluirConviteUsuarioSeguro');
  const successIndex = completeSource.indexOf("document.getElementById('conv-success').style.display = 'block'");
  assert.ok(saveIndex >= 0);
  assert.ok(successIndex > saveIndex);
  assert.doesNotMatch(completeSource, /dbSalvarUsuario\(/);
  assert.doesNotMatch(completeSource, /dbSalvarSenha\(/);
});

test('cliente usa somente as acoes seguras para criar, validar e concluir convites', () => {
  assert.match(supabaseSource, /folhaPagamentoInvocarProtegido\('create_user_invite'/);
  assert.match(supabaseSource, /usuarioSelfServiceInvocar\('get_user_invite'/);
  assert.match(supabaseSource, /usuarioSelfServiceInvocar\('complete_user_invite'/);
  assert.match(edgeSource, /action === "create_user_invite"/);
  assert.match(edgeSource, /action === "get_user_invite"/);
  assert.match(edgeSource, /action === "complete_user_invite"/);
});

test('tokens sao aleatorios, armazenados como hash, expiram e nao carregam o perfil na URL', () => {
  assert.match(edgeSource, /new Uint8Array\(32\)/);
  assert.match(edgeSource, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(edgeSource, /USER_INVITE_DURATION_DAYS = 7/);
  assert.match(edgeSource, /url\.searchParams\.set\("c", token\)/);
  assert.doesNotMatch(usuariosSource, /btoa\(.*JSON\.stringify/);
  assert.match(migration, /token_hash text not null unique/i);
  assert.match(migration, /expira_em timestamptz not null/i);
});

test('tabela e funcoes de convite nao podem ser usadas diretamente pelo navegador', () => {
  assert.match(migration, /alter table public\.convites_usuarios enable row level security/i);
  assert.match(migration, /revoke all on table public\.convites_usuarios from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.registrar_convite_usuario[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /revoke all on function public\.concluir_convite_usuario[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.registrar_convite_usuario[\s\S]*to service_role/i);
  assert.match(migration, /grant execute on function public\.concluir_convite_usuario[\s\S]*to service_role/i);
});

test('conclusao de convite atualiza usuario, senha e consumo na mesma transacao', () => {
  assert.match(migration, /update public\.usuarios[\s\S]*set nome =[\s\S]*status = 'Ativo'/i);
  assert.match(migration, /update public\.senhas s[\s\S]*where s\.email =/i);
  assert.match(migration, /if not found then[\s\S]*insert into public\.senhas/i);
  assert.match(migration, /update public\.convites_usuarios[\s\S]*set usado_em = now\(\)/i);
});

test('correcao de conclusao remove ambiguidade do email e preserva a transacao', () => {
  assert.match(completionFixMigration, /update public\.senhas s[\s\S]*where s\.email =/i);
  assert.match(completionFixMigration, /if not found then[\s\S]*insert into public\.senhas/i);
  assert.doesNotMatch(completionFixMigration, /on conflict \(email\)/i);
  assert.match(completionFixMigration, /update public\.convites_usuarios c[\s\S]*set usado_em = now\(\)/i);
  assert.match(edgeSource, /function normalizeErrorMessage/);
  assert.match(edgeSource, /error: normalizeErrorMessage\(error\)/);
  assert.doesNotMatch(supabaseSource, /String\(data\.error\|\|data\.message\)/);
});
