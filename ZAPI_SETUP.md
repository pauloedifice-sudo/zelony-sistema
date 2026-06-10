# Z-API + Vendas

## O que esta estruturado

- Tabela `public.venda_notificacoes_zapi` para log por destinatario e etapa.
- Tabela `public.venda_notificacoes_zapi_eventos` para guardar os payloads crus dos webhooks.
- Edge Function `zapi-venda-etapa` para disparar a mensagem quando a venda avanca.
- Edge Function `zapi-webhook-delivery` para confirmar o envio da Z-API.
- Edge Function `zapi-webhook-status` para atualizar `SENT`, `RECEIVED` e `READ`.
- Modulo frontend `js/zapi.js` ligado ao fluxo de avancar etapa em vendas.

## 1. Rodar o SQL

Execute no SQL Editor do Supabase:

- `supabase-zapi-notificacoes.sql`

## 2. Configurar os secrets da Edge Function

No projeto Supabase, configure estes secrets:

- `ZAPI_INSTANCE_ID`
- `ZAPI_INSTANCE_TOKEN`
- `ZAPI_CLIENT_TOKEN`

Opcionais:

- `ZAPI_DELAY_MESSAGE`
- `ZAPI_DELAY_TYPING`

## 3. Deploy das funcoes

Faça o deploy destas funcoes:

- `zapi-venda-etapa`
- `zapi-webhook-delivery`
- `zapi-webhook-status`

Arquivos:

- `supabase/functions/zapi-venda-etapa/index.ts`
- `supabase/functions/zapi-webhook-delivery/index.ts`
- `supabase/functions/zapi-webhook-status/index.ts`

## 4. Configurar os webhooks na Z-API

Cadastre URLs HTTPS na sua instancia:

- Delivery webhook:
  `https://SEU-PROJETO.supabase.co/functions/v1/zapi-webhook-delivery`
- Message status webhook:
  `https://SEU-PROJETO.supabase.co/functions/v1/zapi-webhook-status`

## 5. Formato do envio

A integracao usa o endpoint oficial:

- `POST /instances/{instanceId}/token/{token}/send-text`

O telefone e enviado no formato:

- `55DDDNÚMERO`
- somente numeros, sem mascara

## 6. Como o fluxo ficou

1. O usuario avanca a etapa da venda.
2. A venda e salva no Supabase.
3. O frontend chama a Edge Function `zapi-venda-etapa`.
4. A funcao resolve corretor, gerente, diretor e diretor 2.
5. A funcao deduplica por telefone.
6. A funcao envia a mensagem pela Z-API.
7. O retorno entra em `venda_notificacoes_zapi`.
8. Os webhooks atualizam status de envio, recebimento e leitura.

## 7. Consultas uteis

Ultimas notificacoes:

```sql
select *
from public.venda_notificacoes_zapi
order by criado_em desc
limit 50;
```

Ultimos eventos crus dos webhooks:

```sql
select *
from public.venda_notificacoes_zapi_eventos
order by criado_em desc
limit 50;
```
