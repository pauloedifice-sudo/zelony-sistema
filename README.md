# Zelony Sistema

Sistema de gestão interno da Zelony Imóveis: vendas/carteira, financeiro, agendamentos,
treinamentos, RH/folha de pagamento, documentos, usuários e o monitor de envios de
WhatsApp (Z-API). É uma aplicação **front-end estática** (HTML + CSS + JavaScript puro,
sem build step) que fala diretamente com o [Supabase](https://supabase.com) (banco de
dados, autenticação de dados e Edge Functions).

- Produção (Vercel): https://zelony-sistema.vercel.app
- Produção (Netlify): https://zelony-sistema.netlify.app
- Repositório: https://github.com/pauloedifice-sudo/zelony-sistema

## Visão geral da stack

- **Front-end**: HTML/CSS/JS puro. Nenhum framework, nenhum bundler, nenhum passo de
  build — os arquivos em `js/` e `css/` são servidos exatamente como estão.
- **Back-end**: [Supabase](https://supabase.com) (Postgres + RLS + Storage + Edge
  Functions em `supabase/functions/`).
- **Hospedagem**: publicado em paralelo no Vercel e no Netlify, a partir do mesmo
  repositório e do mesmo branch `main`. Qualquer push em `main` dispara o deploy nos
  dois.
- **CI**: GitHub Actions (`.github/workflows/tests.yml`) roda em todo push/PR para
  `main`.

## Estrutura de pastas

```
index.html               Página única da aplicação (SPA simples, sem router)
css/styles.css            Todo o CSS do sistema (tema escuro/dourado)
js/                        Todo o JavaScript, um arquivo por módulo/domínio
tests/                     Testes automatizados (node:test)
supabase/
  migrations/              Migrações SQL do banco (Postgres)
  functions/                Edge Functions (Deno/TypeScript)
  config.toml               Configuração local do Supabase CLI
supabase-*.sql             Scripts SQL avulsos (setup inicial de cada módulo)
version.json               Versão atual do front-end (cache-busting)
vercel.json                 Headers de segurança usados no deploy Vercel
_headers                    Headers de cache/segurança usados no deploy Netlify
.github/workflows/tests.yml CI: sintaxe + testes automatizados
```

### Módulos em `js/`

Os módulos maiores foram divididos em vários arquivos por assunto, mas continuam
funcionando como um único script (todos os `<script>` de um mesmo módulo compartilham o
escopo global e são carregados em sequência, na mesma ordem em que apareciam no arquivo
original). Ao editar um desses módulos, a ordem dos `<script>` no `index.html` **precisa
ser preservada** — trocar a ordem pode quebrar funções que dependem de outras já
declaradas antes.

| Módulo | Arquivos |
|---|---|
| Carteira | `carteira-resumo.js`, `carteira-distratos.js`, `carteira-andamento.js`, `carteira-tabela.js` |
| Financeiro | `financeiro-base.js`, `financeiro-kpis.js`, `financeiro-lancamentos.js`, `financeiro-render.js` |
| Agendamentos | `agendamentos-base.js`, `agendamentos-relatorio-docs.js`, `agendamentos-calendario.js`, `agendamentos-render.js` |
| Treinamentos | `treinamentos-nucleo.js`, `treinamentos-paineis-legado.js`, `treinamentos-paineis.js`, `treinamentos-catalogo.js` |
| Supabase (dados) | `supabase-boot.js`, `supabase-mappers.js`, `supabase-mappers2.js`, `supabase-crud.js` |

Os demais módulos (`app.js`, `auth.js`, `dashboard.js`, `documentos.js`, `envios.js`,
`folha-pagamento.js`, `owner-report.js`, `reembolsos-ato.js`, `rh.js`, `usuarios.js`,
`utils.js`, `vendas.js`, `zapi.js`) continuam sendo um arquivo único cada.

## Rodando os testes localmente

Pré-requisito: Node.js 22+ (mesma versão usada no CI).

```bash
# checar a sintaxe de todos os arquivos JS (o mesmo que o CI roda)
for f in js/*.js; do node --check "$f"; done

# rodar toda a suite de testes automatizados
node --test tests/*.test.cjs
```

Os testes usam `node:test` + `node:vm` para carregar o código-fonte real (sem
transpilar) em um contexto isolado e testar funções puras, validar o conteúdo das
migrações SQL e conferir que o `index.html`/`version.json` estão com a versão de
cache-busting sincronizada. Não é necessário instalar dependências (`npm install`) para
rodar os testes — o projeto não usa nenhum pacote externo.

## Convenção de cache-busting

Como o front-end é servido sem build step, o navegador poderia continuar usando uma
versão antiga de `js/*.js` ou `css/styles.css` em cache. Para evitar isso, todo arquivo
carregado no `index.html` leva uma query string `?v=AAAAMMDD.N`, por exemplo:

```html
<script src="js/app.js?v=20260918.6"></script>
```

Sempre que qualquer arquivo `.js` ou `.css` for alterado, **três lugares precisam ser
atualizados juntos, com o mesmo valor**:

1. Todos os `?v=...` em `index.html` (todas as tags `<script>` e `<link>`).
2. O campo `"version"` em `version.json`.
3. A constante `CONVITE_CLIENT_VERSION` em `js/usuarios.js`.

O teste `tests/convites-usuarios.test.cjs` falha se esses três valores ficarem fora de
sincronia. Ao subir de versão, use busca-e-substituição no formato `AAAAMMDD.N` →
`AAAAMMDD.N+1` (ou a data do dia, reiniciando o contador em `.1`).

O front-end também checa essa versão em tempo de execução (`garantirVersaoAtualConvites`
em `js/usuarios.js`): se uma aba antiga, com JS desatualizado, tentar enviar um convite
de usuário, o sistema força um refresh antes de continuar, evitando enviar um convite
gerado por código incompatível com o banco atual.

## Deploy

Não existe passo de build: o deploy é a publicação direta dos arquivos estáticos.

- **Vercel** e **Netlify** observam o branch `main` do repositório no GitHub. Qualquer
  `git push` para `main` dispara os dois deploys automaticamente, em paralelo.
- `vercel.json` define os headers de segurança usados no deploy Vercel (CSP, X-Frame-
  Options, etc.).
- `_headers` define os headers de cache usados no deploy Netlify — em particular,
  `index.html` e `version.json` são servidos sempre com `Cache-Control: no-store`, para
  que o mecanismo de cache-busting acima funcione mesmo em CDN.

## Como atualizar o sistema (fluxo usado neste projeto)

Este projeto é mantido com apoio do Claude (Cowork). O fluxo de trabalho padrão é:

1. As alterações são feitas e testadas em um clone de trabalho.
2. Roda-se a suite de testes completa (`node --test tests/*.test.cjs`) e confere-se o
   `diff` antes de qualquer commit.
3. O commit é criado em um clone git autenticado (`gh auth login`) no Mac do usuário —
   é esse clone que efetivamente faz `git push` para o GitHub, já que o ambiente de
   nuvem do Cowork não tem permissão de push persistente no repositório.
4. Depois do push, Vercel e Netlify publicam automaticamente a partir de `main`, e o CI
   do GitHub Actions roda a suite de testes sobre o commit.
5. Verificação final: CI verde + checagem ao vivo do site em produção.

Qualquer pessoa também pode contribuir manualmente sem esse fluxo assistido: basta
clonar o repositório, criar um branch, rodar os testes localmente e abrir um Pull
Request para `main` — o CI valida automaticamente sintaxe e testes antes do merge.

## Banco de dados (Supabase)

- As migrações em `supabase/migrations/` são a fonte de verdade do schema e devem ser
  aplicadas em ordem cronológica (o nome do arquivo começa com a data/hora).
- Os arquivos `supabase-*.sql` na raiz do projeto são scripts de setup inicial por
  módulo (útil para recriar um ambiente do zero); as migrações em
  `supabase/migrations/` são os ajustes incrementais feitos depois.
- As Edge Functions em `supabase/functions/` concentram operações sensíveis que não
  podem rodar direto no navegador (ex.: convites de usuário com token, webhooks da
  Z-API) — o front-end nunca acessa essas tabelas/RPCs diretamente, apenas via as
  funções, que rodam com a service role key no servidor do Supabase.

## Segurança e acesso

- Não há chaves secretas no repositório: a chave usada no front-end (`SB_KEY` em
  `js/supabase-boot.js`) é a chave pública (anon) do Supabase, protegida por Row Level
  Security (RLS) nas tabelas.
- Operações sensíveis (convite de usuário, ações de folha de pagamento, etc.) passam
  por Edge Functions protegidas, nunca por acesso direto às tabelas a partir do
  navegador.
