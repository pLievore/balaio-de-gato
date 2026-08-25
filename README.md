# Balaio de Gato

Novo ecommerce de materiais escolares da Balaio de Gato, criado a partir da base técnica do frontend entregue para a 801 Outlet, mas com marca, domínio de negócio, conteúdo e arquitetura próprios.

## Estado atual

A jornada pública e a persistência, verificadas em **24/08/2026**, já contêm:

- identidade oficial com o logo `public/brand/balaio-de-gato.jpg` e paleta
  derivada do laranja `#A84B08`;
- nitidez do logo corrigida com derivado quadrado do mascote para espaços
  pequenos, mantendo o JPG oficial intacto, além de card social próprio;
- imagens editoriais de apoio em `/sobre` e `/programa`, sem apresentá-las como
  fotografias das lojas;
- movimento progressivo: conteúdo essencial permanece visível antes da
  hidratação, respeita redução de movimento e o vídeo pode ser pausado;
- home, escolha de etapa escolar, página explicativa do programa e landing
  institucional em `/sobre`;
- valores oficiais de referência do Programa Material Escolar 2026;
- catálogo navegável, busca, produto, carrinho do benefício e checkout;
- carrinho e checkout liberam o estado de hidratação via ação do Zustand, sem
  skeleton permanente quando o armazenamento local termina de carregar;
- PostgreSQL Neon em `sa-east-1`, acessado por Drizzle ORM e `pg`;
- 26 tabelas em três migrations versionadas em `drizzle/` e seed de
  desenvolvimento idempotente;
- criação transacional de pedido, snapshots, reserva de estoque, tentativa de
  pagamento manual, eventos e auditoria;
- idempotência do checkout, proteção do CPF e acompanhamento por código;
- fluxo DUEPAY representado como processo assistido, sem simular API;
- máquina de estados inicial de pagamento e referências públicas sem dados pessoais;
- expiração preguiçosa e idempotente de reservas vencidas, acionada na leitura
  operacional do catálogo pelo painel e antes da persistência do checkout;
- sitemap e páginas institucionais gerados a partir do catálogo no PostgreSQL.

O catálogo atual é **provisório para desenvolvimento**: `src/data/catalog.ts`
alimenta somente o seed `development_seed`, mantido em `draft` e com vínculos
não aprovados. O storefront lê exclusivamente o PostgreSQL, sem fallback para o
arquivo. Catálogo, SKUs, preços, fotos e estoque oficiais ainda precisam ser
carregados e aprovados antes do go-live.

O fluxo que altera `isApproved` ainda não existe e é **bloqueador de
lançamento**: publicar um catálogo oficial sem essa aprovação deixaria a
vitrine sem vínculos elegíveis por etapa.

O painel `/admin` já roda sobre o PostgreSQL deste app: visão geral, pedidos
com as transições permitidas, autoria de catálogo (cadastro, edição, estoque,
fotos, importação de planilha e exportação CSV) e funil. A confirmação de
pagamento baixa o estoque de verdade. As comunicações transacionais saem pela
Resend quando `RESEND_API_KEY` e `EMAIL_FROM` estão configuradas.

O carrinho continua no navegador. A operação completa do link, a homologação
Personal Net, os backups e o hardening/E2E de lançamento permanecem pendentes.

## Presença institucional

Os três endereços abaixo são conteúdo institucional da mesma operação. Eles
**não** representam filiais, estoques separados, seletor de unidade ou promessa
de retirada:

- Vila Isa — Av. Nossa Senhora do Sabará, 1382 — CEP 04686-001 —
  (11) 98035-6453 — seg–sex 08h–18h; sáb 09h–16h;
- Jardim da Pedreira — Estrada do Alvarenga, 772 — CEP 04462-000 —
  (11) 91330-8379 — seg–sex 08h–18h; sáb 09h–16h;
- Jequirituba — Rua Jequirituba, 1530 — CEP 04822-000 —
  (11) 99429-0398 — seg–sáb 08h–19h.

Endereços e telefones foram verificados em 24/08/2026; os horários foram
fornecidos diretamente pela empresa na mesma data, não extraídos das fontes
públicas. Para Jequirituba, a comunicação não deve afirmar bairro. Evidências e
limites de uso estão registrados em
[`../docs/21-inventario-identidade-landing-page.md`](../docs/21-inventario-identidade-landing-page.md).

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

Os smokes de concorrência e expiração de reserva, que criam e removem seus
próprios dados, podem ser executados somente em banco de desenvolvimento com
`npm run db:smoke-order` e `npm run db:smoke-expiry`.

## Documentação

A fonte de verdade está em [`../docs/README.md`](../docs/README.md). Leia também [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md), [`PROJECT_SPEC.md`](./PROJECT_SPEC.md), [`ENV.md`](./ENV.md) e [`NEXT_STEPS.md`](./NEXT_STEPS.md).

O diretório `801-outlet-admin` não é o novo backoffice; ele permanece somente como referência histórica do projeto anterior.
