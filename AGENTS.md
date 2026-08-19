# Instruções de trabalho — Balaio de Gato

Este repositório está em transição da estrutura entregue para a 801 Outlet para um produto novo. A documentação canônica está em `C:\dev\Renei-ecommerce\docs`.

Antes de alterar arquitetura, domínio, pagamento, conteúdo público ou painel:

1. leia `../docs/README.md` e os documentos `01` a `10`;
2. consulte o inventário de fase correspondente em `../docs/11` a `20`;
3. trate qualquer regra antiga da 801 Outlet como histórico, nunca como requisito vigente.

## Regras vigentes

- Marca: **Balaio de Gato — Papelaria e Material Escolar**.
- Mercado: Brasil, conteúdo `pt-BR` e valores em BRL.
- Empresa, site, catálogo lógico e operação são únicos. Não criar filial, seletor de unidade ou roteamento de estoque.
- O programa é municipal: Programa Material Escolar da Secretaria Municipal de Educação da Prefeitura de São Paulo.
- Shopify, Square, Supabase e a infraestrutura comercial da 801 Outlet foram removidos do repositório. Não reintroduza nenhum deles.
- O Neon PostgreSQL é a autoridade implementada para catálogo, estoque,
  pedidos e auditoria. O carrinho ainda é local ao navegador.
- O painel novo pertence a este app, sob `/admin`; `C:\dev\Renei-ecommerce\801-outlet-admin` é apenas legado.
- Até existir documentação atual e homologável da Personal Net, o DUEPAY usa pagamento por link assistido e auditado.
- Nunca coletar código do cartão virtual ou senha DUEPAY no site ou painel.
- Compras do benefício contêm somente itens autorizados, com documento fiscal exclusivo no CPF do responsável.
- A entrega da compra do benefício não pode ser cobrada da família nem destinada a escola, DRE ou unidade da SME.

## Cuidados com o worktree

As alterações preexistentes do usuário em `scripts/shipping-rates.ts`, `src/lib/analytics/funnel.ts` e `src/lib/content/delivery.ts` devem ser preservadas. Não reverta trabalho alheio nem use comandos destrutivos.

## Onde mexer no storefront

- catálogo e pedido nunca leem dados direto: passe por
  `src/lib/catalog/repository.ts` e `src/lib/orders/repository.ts`. Essas duas
  costuras já consultam PostgreSQL; não crie fallback para arquivo ou memória;
- `src/data/catalog.ts` existe somente como entrada do seed fictício. Não o
  trate como catálogo oficial nem o importe em código de runtime;
- alterações de esquema entram em `src/db/schema.ts`, geram migrations em
  `drizzle/` e usam a conexão direta. Não execute as migrations legadas de
  `db/migrations` contra o Neon;
- a criação de pedido deve preservar a transação única, a chave de
  idempotência, o bloqueio de concorrência, os snapshots e as trilhas de
  estoque/pagamento/auditoria;
- CPF persistido nunca fica em texto simples. Em deploy,
  `ORDER_DATA_ENCRYPTION_KEY` é obrigatório e não pode ser exposto em logs;
- regra de negócio nova entra num módulo puro com teste (`catalog/query.ts`,
  `cart/summary.ts`, `orders/cpf.ts`, `orders/order.ts`), não dentro de um
  componente;
- o carrinho no navegador guarda só slug e quantidade. Preço, estoque e limite
  vêm do servidor — se um valor de dinheiro vier do cliente, é bug;
- filtro de catálogo mora na URL, não em estado local;
- ao mudar `next.config.ts`, confira que nenhum redirect legado passa por cima
  de `/products/:slug`, `/cart`, `/checkout` ou `/pedido/:codigo`.

## Verificação mínima

Use, conforme a área alterada:

```powershell
npm run test:loja
npm run test:balaio
npm run typecheck
npm run lint
npm run build
npm run db:check
```

`npm test` roda tudo. Contra o banco, há ainda `npm run db:check`, `npm run db:smoke-order` e `npm run db:smoke-fulfillment` — este último cobre a baixa de estoque no pagamento.

`npm run db:smoke-order` cria e limpa dados próprios; use somente em banco de
desenvolvimento. O painel `/admin` atual continua legado e não deve ser
considerado conectado ao novo esquema só porque as tabelas administrativas já
existem.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
