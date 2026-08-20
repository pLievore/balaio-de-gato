# CLAUDE.md

Guia para assistentes de IA que trabalham neste repositório. Escrito em pt-BR
porque toda a documentação, o produto e boa parte dos comentários de código
estão em português.

Leia também [`AGENTS.md`](./AGENTS.md) — ele traz as regras de negócio
inegociáveis e os cuidados com o worktree. Em caso de conflito entre os dois,
`AGENTS.md` e os documentos `01` a `10` de `../docs` prevalecem.

## O que é este projeto

**Balaio de Gato — Papelaria e Material Escolar.** Ecommerce de materiais
escolares para responsáveis atendidos pelo Programa Material Escolar da
Secretaria Municipal de Educação da Prefeitura de São Paulo.

- Brasil, `pt-BR`, valores em BRL (sempre inteiros em centavos).
- Uma empresa, um site, um catálogo e um estoque lógico. **Não existe filial,
  seletor de unidade ou roteamento de estoque.**
- Pagamento no MVP é **link DUEPAY assistido**: o site nunca chama API de
  pagamento e nunca coleta senha ou código do cartão virtual.
- O código da 801 Outlet (Shopify, Square, Supabase, USD, móveis, showroom)
  foi **removido**. Não reintroduza nada disso.

## Stack

| Peça | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Linguagem | TypeScript estrito (`strict: true`, `noEmit`) |
| Estilo | Tailwind CSS 4 via `@tailwindcss/postcss`, tokens em `app/globals.css` |
| Banco | Neon PostgreSQL (`sa-east-1`), Drizzle ORM + `pg` |
| Estado do carrinho | Zustand, só no navegador |
| Formulários | react-hook-form + Zod 4 |
| Gráficos do painel | Recharts |
| Fotos de produto | Vercel Blob |
| E-mail | Resend, via `fetch` puro |
| Testes | `node:test` rodado por `tsx --test` |
| Node | 24.x (`.nvmrc`, `engines`) |

## Estrutura

```
app/                    rotas do App Router (fora de src/, de propósito)
  (public)/             storefront: home, produtos, carrinho, checkout, pedido
  admin/                painel protegido por sessão de cookie
  api/events/route.ts   beacon de funil (primeira parte, sem cookie)
  components/           componentes do storefront (ui/, shop/)
  globals.css           tokens de cor, tipografia e texturas
proxy.ts                middleware: gate de manutenção + header x-pathname
src/
  db/schema.ts          esquema Drizzle inteiro (~1150 linhas, autoridade)
  db/client.ts          pool único de conexão, server-only
  lib/catalog/          costura de leitura do catálogo
  lib/orders/           costura de gravação/leitura de pedido
  lib/cart/             regras puras do carrinho
  lib/program/          crédito e etapas do Programa Material Escolar
  lib/panel/            leitura/escrita do painel, sessão, CSV
  lib/payments/duepay.ts  máquina de estados do pagamento assistido
  lib/security/         cifra de dado protegido e rate limit
  lib/analytics/funnel.ts  contadores agregados do funil
  lib/email/            cliente Resend e templates
  data/catalog.ts       APENAS fonte do seed de desenvolvimento
drizzle/                migrations versionadas + snapshots
scripts/                seed, check e smokes contra o banco
```

### Convenções de import

O alias `@/*` existe no `tsconfig.json` mas **não é usado em lugar nenhum**:
todo import de `app/` para `src/` é relativo (`../../../src/lib/...`). Siga o
padrão do arquivo vizinho em vez de introduzir o alias.

## Costuras: onde os dados entram e saem

Nenhuma página lê o banco direto. Existem exatamente duas costuras de runtime,
e ambas já são PostgreSQL puro — **não crie fallback para arquivo ou memória**:

| Costura | Responsabilidade |
| --- | --- |
| `src/lib/catalog/repository.ts` | catálogo, ficha, home, sitemap, carrinho |
| `src/lib/orders/repository.ts` | criação, leitura e transição de pedido, estoque |

Para escrita de catálogo pelo painel existe uma terceira: `src/lib/panel/catalog-write.ts`
é o **único** lugar que monta um produto inteiro (produto + categoria +
variante + item do programa com etapas + estoque), sempre em transação, para
nunca existir produto pela metade.

`src/data/catalog.ts` **não é catálogo oficial**. Serve só ao seed
`development_seed`, que fica `draft` e com vínculos não aprovados. Nunca o
importe em código de runtime.

## Regras que o código precisa respeitar

Essas não são preferências de estilo; são requisitos do programa municipal e
da segurança dos dados. Quebrar qualquer uma delas é bug.

- **Dinheiro é inteiro em centavos** (`src/lib/money.ts`). Nada de float.
- **O cliente nunca define preço.** O carrinho no navegador guarda só `slug` e
  `quantity`; `submitOrder` recarrega o catálogo e recalcula o total inteiro no
  servidor. Se um valor monetário chegou do cliente, é bug.
- **Elegibilidade por etapa é obrigatória.** Produto sem ao menos uma etapa
  autorizada não pode ser comprado com o crédito — o cadastro recusa.
  Item fora da etapa bloqueia o envio (`lib/cart/summary.ts`).
- **Entrega é sempre `shippingInCents: 0`** no fluxo do benefício, e o endereço
  recusa escola, DRE e unidade da SME (`lib/orders/schema.ts`).
- **CPF nunca é persistido em texto simples.** `lib/security/protected-data.ts`
  cifra (AES-256-GCM) e gera um índice cego para consulta.
  `ORDER_DATA_ENCRYPTION_KEY` é obrigatória em deploy e não pode aparecer em log.
- **Estoque nunca é escrito direto.** Todo ajuste vira `receipt` ou `adjustment`
  em `inventory_movements`, com motivo obrigatório, e o saldo novo nunca desce
  abaixo do que está reservado por pedidos abertos.
- **A criação do pedido é atômica e idempotente**: uma transação com bloqueio
  consultivo valida catálogo/etapa/preço/estoque, grava snapshots, endereço e
  consentimento, reserva estoque, registra movimento, cria a tentativa
  `duepay_manual` e anexa eventos + auditoria. Preserve isso ao mexer em
  `orders/repository.ts`.
- **Nenhum formulário coleta senha ou código de cartão virtual.** Em lugar nenhum.
- **Regra de negócio nova vai para um módulo puro com teste**
  (`catalog/query.ts`, `cart/summary.ts`, `orders/cpf.ts`, `orders/order.ts`,
  `orders/access-token.ts`, `panel/csv.ts`), nunca dentro de um componente.
- **Filtro de catálogo mora na URL**, não em estado local.
- Ao mexer em `next.config.ts`, confira que nenhum redirect legado passa por
  cima de `/products/:slug`, `/cart`, `/checkout` ou `/pedido/:codigo`.

## Fluxos principais

### Jornada pública

`/` → `/products` → `/products/[slug]` → `/cart` → `/checkout` → `/pedido/[codigo]`

O layout público (`app/(public)/layout.tsx`) desce um catálogo enxuto via
`getCachedCartProducts()` (`unstable_cache`, etiqueta `CATALOG_CACHE_TAG`), e o
carrinho no cliente cruza com ele para saber preço, estoque e limite atuais.

Quem grava algo que aparece nesse catálogo enxuto — preço, estoque, limite ou
etapas — precisa chamar `revalidateTag(CATALOG_CACHE_TAG, 'max')` além do
`revalidatePath`, que não alcança a entrada em cache. Hoje isso acontece ao
salvar produto, ajustar estoque, importar planilha, confirmar pagamento (baixa
`on_hand`) e criar pedido (reserva estoque). No Next 16 a forma de um argumento
está depreciada e nem compila.

### Ciclo de vida do pedido

`ORDER_TRANSITIONS` em `src/lib/orders/order.ts` declara as transições legais.
Cada seta é uma ação humana no painel; nada avança sozinho. Confirmar o
pagamento **baixa o estoque de verdade**: `on_hand` e `reserved` caem juntos, a
reserva vira `consumed` e sai um movimento `consume`. `paid` não volta para
cancelado.

Estados do pedido:
`draft | awaiting_payment_link | payment_link_sent | paid | preparing | out_for_delivery | delivered | cancelled | manual_review`

Estados do pagamento:
`not_started | awaiting_link | link_sent | authorized | declined | expired | cancelled | refunded | manual_review`

### Acesso público ao pedido

O código `BG-XXXXXX` é curto e ditável por telefone, então **não** é suficiente
para revelar dados pessoais. `src/lib/orders/access-token.ts` gera a chave longa
(32 caracteres, >155 bits, TTL de 180 dias) enviada por e-mail; sem ela a página
`/pedido/[codigo]` mostra só a situação.

### Painel `/admin`

Protegido por cookie `panel_session` assinado por HMAC
(`src/lib/panel/session.ts`), verificado no `app/admin/layout.tsx`. Telas:
visão geral (`/admin`), pedidos (`/admin/orders`), produtos com cadastro,
edição, estoque, upload de foto, importação de planilha e exportação CSV
(`/admin/products`), e funil (`/admin/funnel`).

### Funil

`funnel_counters` guarda contagem agregada por dia (etapa, origem de tráfego,
cidade aproximada, funil por produto). **Sem cookie, sem identificador, sem
registro por visitante** — por isso a loja não precisa de banner de consentimento.
Incremento atômico (`insert … on conflict do update`); falha na medição nunca
derruba a navegação. Fuso de referência: `America/Sao_Paulo`.

### Rate limit

`src/lib/security/rate-limit.ts` conta no PostgreSQL (não em memória — o site
roda serverless). Escopos: `checkout`, `events`, `panelLogin`, `orderLookup`.
Falha **aberta** de propósito: banco fora não pode derrubar o checkout.

### Manutenção

`proxy.ts` serve a página de manutenção com HTTP 503 em toda rota pública
quando `MAINTENANCE_MODE` está ligado. `robots.txt` e `sitemap.xml` ficam fora
do gate de propósito (503 em robots.txt faz o Google pausar o crawl inteiro).
`?preview=<MAINTENANCE_BYPASS_TOKEN>` destrava e grava cookie.

## Comandos

```bash
npm run dev              # Next dev (Turbopack)
npm run build
npm run lint             # eslint flat config
npm run typecheck        # tsc --noEmit

npm test                 # tudo: src/**/*.test.ts
npm run test:design      # contraste dos tokens
npm run test:balaio      # programa municipal, duepay
npm run test:loja        # catálogo, carrinho, pedido, painel
```

Contra o banco (usam `--env-file=.env.local`, **só em banco de desenvolvimento**):

```bash
npm run db:generate      # gera migration a partir de src/db/schema.ts
npm run db:migrate       # aplica (prefere DATABASE_URL_UNPOOLED)
npm run db:seed          # seed idempotente de desenvolvimento
npm run db:check
npm run db:smoke-order       # concorrência na criação do pedido
npm run db:smoke-fulfillment # baixa de estoque no pagamento
npm run db:smoke-catalog     # escrita de catálogo pelo painel
npm run db:smoke-funnel
npm run db:studio
```

**Verificação mínima antes de entregar:** rode `npm run typecheck` e `npm run lint`
sempre; rode a suíte da área alterada (`test:loja` para catálogo/carrinho/pedido/painel,
`test:balaio` para programa/pagamento) ou simplesmente `npm test`, que roda tudo
em dois segundos; rode `npm run build` quando mexer em rotas, `next.config.ts`
ou no `proxy.ts`.

`.github/workflows/ci.yml` repete typecheck, lint e testes em todo pull request.
O `build` fica fora do CI porque a coleta de dados de página consulta o
PostgreSQL — ele só passa com um banco alcançável, então continua sendo
verificação local.

## Testes

`node:test` + `node:assert/strict`, executados por `tsx --test`. Cada teste
fica ao lado do módulo (`summary.ts` → `summary.test.ts`) e testa **função
pura**, sem banco e sem render. Os nomes dos testes são frases em português
descrevendo a regra ("soma o subtotal e conta as unidades, não as linhas").

Os scripts `test:*` usam glob (`src/**/*.test.ts`), então um arquivo novo entra
sozinho — basta nomeá-lo `*.test.ts` dentro de `src/`. Antes eles listavam cada
caminho à mão, e três arquivos de teste nunca chegaram a rodar: os do token de
acesso ao pedido, do rate limit e dos templates de e-mail.

## Banco de dados

- Esquema inteiro em `src/db/schema.ts`; `casing: 'snake_case'` no
  `drizzle.config.ts` faz a ponte com os nomes do Postgres.
- Alterou o esquema → `npm run db:generate` → revise o SQL em `drizzle/` →
  `npm run db:migrate`. Não edite migration já aplicada.
- `DATABASE_URL` é a conexão **pooled** do runtime; `DATABASE_URL_UNPOOLED` é a
  direta, preferida por migrations, seed e drizzle-kit.
- `sslmode=require` é reescrito para `verify-full` tanto em `db/client.ts`
  quanto em `drizzle.config.ts` — a semântica do `pg` v8 muda no v9.
- Não execute migrations legadas de `db/migrations` contra o Neon.

## Variáveis de ambiente

Fonte da verdade: [`ENV.md`](./ENV.md). Usadas hoje pelo código:

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ALLOW_INDEXING`, `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `ORDER_DATA_ENCRYPTION_KEY`,
`ORDER_RESERVATION_TTL_MINUTES`, `ADMIN_PANEL_PASSWORD`,
`ADMIN_PANEL_SESSION_SECRET`, `ALLOW_DEVELOPMENT_CATALOG`,
`BLOB_READ_WRITE_TOKEN`, `MAINTENANCE_MODE`, `MAINTENANCE_BYPASS_TOKEN`,
`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.

Nunca versione segredo. `.env*` está no `.gitignore`.

`env.example` é o modelo para `.env.local` e já reflete essa lista. Um
descompasso conhecido continua de pé:

- **`ENV.md` lista `RESEND_API_KEY` e `EMAIL_FROM` como legado removido**, mas
  `src/lib/email/client.ts` voltou a usar exatamente essas duas. Sem elas o
  envio devolve `skipped` e a interface deixa de prometer e-mail — o pedido
  nunca falha por causa de e-mail.

## Estilo de código

- Prettier: `singleQuote`, `semi`, `printWidth: 100`, `trailingComma: 'all'`,
  com `prettier-plugin-tailwindcss`. Não há script `format`; rode
  `npx prettier --write` no que você tocou.
- Comentários explicam **por quê**, não o quê, e são frequentes nas decisões
  não óbvias (por que o alfabeto do código de pedido omite I/O/0/1, por que o
  rate limit falha aberto, por que o 503 não pega o robots.txt). Mantenha esse
  padrão: se a escolha tem uma razão que não se lê no código, escreva a razão.
- Comentários novos em português quando o arquivo já está em português; o
  repositório é misto e a regra é seguir o vizinho.
- Módulos que tocam servidor importam `'server-only'` no topo.
- Server Actions ficam em `actions.ts` ao lado da rota, com `'use server'` na
  primeira linha, e devolvem estado discriminado por `status`.
- Componentes de cliente são a exceção (27 de ~137 arquivos): prefira Server
  Component e só marque `'use client'` quando houver interação real.
- Cores vêm dos tokens `--bg`, `--fg`, `--accent`, `--sage`… em
  `app/globals.css`, usados como `rgb(var(--token))`. Não escreva hex solto.

## Estado do projeto e pendências

O catálogo do banco é **provisório**: seed `development_seed` em `draft`, com
6 categorias, 9 etapas, 47 produtos e 266 vínculos item-etapa fictícios. Sem
`ALLOW_DEVELOPMENT_CATALOG=true` a loja mostra zero produto. As ilustrações
vetoriais de `app/components/product-illustration.tsx` (22 arquétipos, coloridos
a partir do slug) saem quando as fotos reais chegarem.

Pendências completas em [`NEXT_STEPS.md`](./NEXT_STEPS.md). Em aberto: catálogo
oficial, publicação/versionamento de catálogo, expiração operacional de reservas,
revisão dos textos jurídicos, backups/observabilidade, hardening, E2E e
acessibilidade, e a avaliação de automação Personal Net.

## Mapa da documentação

| Arquivo | Para quê |
| --- | --- |
| `AGENTS.md` | regras de trabalho e limites — leia primeiro |
| `README.md` | visão geral e setup |
| `PROJECT_CONTEXT.md` | objetivo, arquitetura decidida, limites regulatórios |
| `PROJECT_SPEC.md` | jornada do MVP e estados canônicos |
| `CONTEXT_SUMMARY.md` | como o storefront está montado, em detalhe |
| `ENV.md` | variáveis de ambiente |
| `NEXT_STEPS.md` | o que está feito e o que falta |
| `SPEC.MD` | **obsoleto** — descrevia a 801 Outlet, não orienta implementação |

A fonte canônica externa fica em `C:\dev\Renei-ecommerce\docs` (`README.md` e
os documentos `01` a `10`), fora deste repositório. Se ela não estiver
disponível na sua sessão, diga isso em vez de supor o conteúdo.
