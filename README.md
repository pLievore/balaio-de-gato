# Balaio de Gato

Novo ecommerce de materiais escolares da Balaio de Gato, criado a partir da base técnica do frontend entregue para a 801 Outlet, mas com marca, domínio de negócio, conteúdo e arquitetura próprios.

## Estado atual

A jornada pública e a primeira fatia de persistência já contêm:

- nova identidade visual provisória e conteúdo em português;
- home, escolha de etapa escolar e página explicativa do programa;
- valores oficiais de referência do Programa Material Escolar 2026;
- catálogo navegável, busca, produto, carrinho do benefício e checkout;
- PostgreSQL Neon em `sa-east-1`, acessado por Drizzle ORM e `pg`;
- migration versionada em `drizzle/` e seed de desenvolvimento idempotente;
- criação transacional de pedido, snapshots, reserva de estoque, tentativa de
  pagamento manual, eventos e auditoria;
- idempotência do checkout, proteção do CPF e acompanhamento por código;
- fluxo DUEPAY representado como processo assistido, sem simular API;
- máquina de estados inicial de pagamento e referências públicas sem dados pessoais;
- sitemap e páginas institucionais desacoplados do Shopify.

O catálogo atual é **provisório para desenvolvimento**: `src/data/catalog.ts`
alimenta somente o seed `development_seed`, mantido em `draft` e com vínculos
não aprovados. O storefront lê exclusivamente o PostgreSQL, sem fallback para o
arquivo. Catálogo, SKUs, preços, fotos e estoque oficiais ainda precisam ser
carregados e aprovados antes do go-live.

O carrinho continua no navegador. O novo painel `/admin`, a operação completa
do link, as comunicações transacionais, a homologação Personal Net, os backups
e o hardening/E2E de lançamento permanecem pendentes. O painel legado não foi
migrado para o novo banco.

## Desenvolvimento

Requisitos: Node.js 24 e npm.

```powershell
npm install
npm run dev
```

Configure o banco conforme [`ENV.md`](./ENV.md) e prepare um ambiente novo com:

```powershell
npm run db:migrate
npm run db:seed
npm run db:check
```

`db:migrate` usa preferencialmente a conexão direta; o aplicativo usa a
conexão pooled. O seed só representa dados fictícios de desenvolvimento e não
publica um catálogo oficial.

Validações principais:

```powershell
npm run test:balaio
npm run typecheck
npm run lint
npm run build
```

O smoke de concorrência de pedido, que cria e remove seus próprios dados de
teste, pode ser executado somente em banco de desenvolvimento com
`npm run db:smoke-order`.

## Documentação

A fonte de verdade está em [`../docs/README.md`](../docs/README.md). Leia também [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md), [`PROJECT_SPEC.md`](./PROJECT_SPEC.md), [`ENV.md`](./ENV.md) e [`NEXT_STEPS.md`](./NEXT_STEPS.md).

O diretório `801-outlet-admin` não é o novo backoffice; ele permanece somente como referência histórica do projeto anterior.
