# Resumo de contexto

- **Produto:** ecommerce de materiais escolares Balaio de Gato.
- **Operação:** uma empresa, um site e um estoque lógico; origem física não faz parte da experiência.
- **Mercado:** Brasil, `pt-BR`, BRL.
- **Diferencial inicial:** loja credenciada pela SME da Prefeitura de São Paulo para o Programa Material Escolar.
- **Público prioritário:** responsáveis por estudantes da rede municipal com crédito do benefício, sem excluir compras comuns futuras.
- **Frontend:** Next.js 16, React 19, TypeScript e Tailwind CSS 4.
- **Persistência atual:** Neon PostgreSQL em `sa-east-1`, Drizzle ORM e `pg`;
  `DATABASE_URL` pooled no runtime e conexão direta para migrations/seed.
- **Arquitetura alvo:** storefront, APIs internas e painel `/admin` no mesmo app; PostgreSQL como sistema de registro. O painel novo ainda não foi migrado.
- **Pagamento:** link DUEPAY assistido no MVP. O PDF de 2022 é manual operacional, não documentação de API.
- **Regra de segurança:** código do cartão virtual e senha nunca entram no site da Balaio de Gato.
- **Legado:** Shopify, Square, Supabase, móveis, USD, Utah, showroom e conteúdo da 801 Outlet foram **removidos do repositório**. Storefront e painel rodam apenas sobre o PostgreSQL do projeto.
- **Fonte canônica:** `C:\dev\Renei-ecommerce\docs`.

## Como o storefront está montado

O caminho público é `/` → `/products` → `/products/[slug]` → `/cart` →
`/checkout` → `/pedido/[codigo]`.

**Duas costuras isolam o armazenamento do resto do app.** Nenhuma página lê
dados direto; ambas já usam PostgreSQL:

| Costura | Persistência atual | Consumidores |
| --- | --- | --- |
| `src/lib/catalog/repository.ts` | consultas Drizzle ao catálogo no PostgreSQL | catálogo, ficha, home, sitemap, carrinho |
| `src/lib/orders/repository.ts` | transações Drizzle de pedido e estoque | envio e acompanhamento do pedido |

Não há fallback de runtime para `src/data/catalog.ts`. Esse arquivo é somente
a fonte do seed provisório `development_seed`, que permanece `draft`, com
vínculos não aprovados. Hoje o banco contém 6 categorias, 9 etapas, 47
produtos/variantes/estoques e 266 vínculos item-etapa fictícios. Catálogo,
preços, fotos, SKUs e estoque reais continuam pendentes.

**Módulos puros, com teste próprio:**

- `src/lib/catalog/query.ts` — URL ↔ consulta e pontuação da busca;
- `src/lib/cart/summary.ts` — total, saldo do benefício e o que bloqueia o pedido;
- `src/lib/orders/cpf.ts` — CPF, CEP e telefone;
- `src/lib/orders/order.ts` — código do pedido e montagem dos itens.

**Regras do programa que viraram código:**

- elegibilidade por etapa vive em `Product.stages`; item fora da etapa bloqueia
  o envio (`cart/summary.ts`);
- o crédito por etapa vem de `program/material-escolar.ts` e é exibido como
  valor publicado pela SME, nunca como saldo do responsável;
- passar do crédito **não** bloqueia o pedido — a loja resolve a diferença no
  atendimento;
- entrega é sempre `shippingInCents: 0`; o endereço recusa escola, DRE e
  unidade da SME (`orders/schema.ts`);
- nenhum campo de senha ou código de cartão existe em qualquer formulário.

**O carrinho guarda só slug e quantidade.** Preço, estoque e limite vêm sempre
do servidor, via `CartCatalogProvider` no layout público. O `submitOrder`
recarrega tudo e recalcula o total antes de gravar — o cliente não define
preço. O carrinho ainda vive no navegador; apenas o pedido é persistido.

**A criação do pedido é atômica e idempotente.** Uma transação com bloqueio
consultivo valida catálogo/etapa/preço/estoque, grava snapshots, endereço e
consentimento, reserva estoque, registra movimento, cria a tentativa
`duepay_manual` e anexa eventos/auditoria. O CPF é cifrado e recebe índice cego
para consulta; `ORDER_DATA_ENCRYPTION_KEY` é obrigatório em deploy. A duração
inicial da reserva vem de `ORDER_RESERVATION_TTL_MINUTES`.

**O catálogo é editável pelo painel.** `lib/panel/catalog-write.ts` é o único
lugar que monta um produto inteiro — produto, categoria, variante, item do
programa com as etapas e estoque —, sempre em transação, para nunca existir
produto pela metade. Fotos vão para o Vercel Blob e convivem com as
ilustrações: a loja usa a foto quando há uma e o desenho quando não há.

**A coleta de eventos vive no PostgreSQL.** `funnel_counters` guarda contagem
agregada por dia — etapa do funil, origem do tráfego, cidade aproximada e funil
por produto. Sem cookie, identificador ou registro por visitante, então a loja
não precisa de banner de consentimento. O incremento é atômico
(`insert … on conflict do update`), e uma falha na medição nunca derruba a
navegação. Fuso de referência: `America/Sao_Paulo`.

**Ilustrações no lugar de fotos.** Cada produto aponta para um dos 22
arquétipos vetoriais de `app/components/product-illustration.tsx`, coloridos a
partir do slug. Saem quando as fotos reais chegarem.
