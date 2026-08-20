# Próximas entregas

Ordem recomendada, alinhada a `../docs/09-plano-de-desenvolvimento.md`.

## Concluído nesta fase

1. remoção do conteúdo público, metadata e assets da 801 Outlet do storefront;
2. catálogo escolar com 47 produtos, categorias, elegibilidade por etapa,
   busca sem acento, filtros por categoria/preço/estoque e ordenação;
3. ficha de produto com especificações, etapas autorizadas, relacionados e
   dados estruturados;
4. carrinho do benefício com controle de saldo por etapa, limite por pedido e
   bloqueio de item fora da etapa;
5. envio de pedido com CPF validado no dígito verificador, endereço residencial
   obrigatório e recálculo integral no servidor;
6. acompanhamento do pedido por código.
7. PostgreSQL Neon com Drizzle/`pg`, migration inicial e seed provisório
   idempotente;
8. catálogo público lendo somente o banco, sem fallback para arquivo;
9. criação atômica e idempotente do pedido com snapshots, reserva/movimento de
   estoque, tentativa manual de pagamento, eventos e auditoria;
10. proteção do CPF persistido e smoke concorrente de pedido;
11. acesso público ao pedido por chave longa enviada por e-mail, com validade
    de 180 dias — sem ela a página do pedido mostra só a situação;
12. e-mail transacional pela Resend, que nunca derruba o pedido: sem
    configuração o envio devolve `skipped` e a tela deixa de prometer;
13. limite de requisições contado no PostgreSQL (checkout, beacon do funil,
    login do painel e consulta de pedido), que falha aberto de propósito;
14. verificação automática em pull request (`.github/workflows/ci.yml`) com
    typecheck, lint e a suíte inteira.

## Painel `/admin` — estado da migração

Migrado para o PostgreSQL do projeto, em pt-BR:

- **Visão geral** (`/admin`) — fila de ação, receita confirmada, ticket médio,
  últimos pedidos, estoque no limite e materiais mais pedidos;
- **Pedidos** (`/admin/orders`) — lista com abas por situação, busca por
  código/nome/e-mail e CPF mascarado; ficha com dados do responsável, endereço,
  itens e as transições permitidas;
- **Produtos** (`/admin/products`) — catálogo e saldo disponível, somente
  leitura.

O ciclo de vida do pedido agora vai até o fim: `ORDER_TRANSITIONS`
(`lib/orders/order.ts`) declara as transições legais, e confirmar o pagamento
**baixa o estoque de verdade** (`on_hand` e `reserved` caem juntos, a reserva
vira `consumed` e sai um movimento `consume`). Cobertura em
`npm run db:smoke-fulfillment`.

A autoria de catálogo voltou, escrita sobre o PostgreSQL: cadastro, edição,
ajuste de estoque, upload de fotos (Vercel Blob) e importação de planilha com
pré-visualização, além da exportação em CSV. Cobertura em
`npm run db:smoke-catalog`.

Duas regras que a versão antiga não tinha, porque o Shopify não modelava:

- **etapas autorizadas são obrigatórias.** Sem ao menos uma, o item não pode
  ser comprado com o crédito, então o cadastro recusa;
- **estoque nunca é escrito direto.** Todo ajuste vira `receipt` ou
  `adjustment` em `inventory_movements`, com motivo obrigatório, e o novo saldo
  nunca desce abaixo do que já está reservado por pedidos abertos.

A tela de vendas segue removida.

## Em aberto

0. **bloqueador de lançamento: nada aprova um vínculo item-etapa.**
   `isApproved` é escrito como `false` em `panel/catalog-write.ts` e no seed, e
   é filtro obrigatório sempre que o catálogo **não** é o seed de
   desenvolvimento (`catalog/repository.ts`, `orders/repository.ts`). No dia em
   que um catálogo `official`/`published` entrar, `getStagesByVariant` volta
   vazio, todo produto é descartado por não ter etapa e a vitrine fica **vazia**
   — com todo checkout morrendo em "material não disponível para a etapa". Não
   existe tela, script nem migration que aprove. Falta decidir quem aprova e
   onde, e então implementar;
0b. **reservas de estoque nunca expiram.** `expiresAt` é gravado e nunca lido;
   o status `'expired'` existe no esquema e nada o produz. Como a vitrine mostra
   `on_hand - reserved`, todo checkout abandonado em `awaiting_payment_link`
   tira a peça da prateleira para sempre, e `ORDER_RESERVATION_TTL_MINUTES` —
   obrigatório em produção — não faz nada. Precisa de quem libere: rotina
   agendada ou liberação preguiçosa na leitura;
1. substituir o seed provisório pelo catálogo oficial revisado, com SKUs,
   preços, fotos, estoque e vínculos de elegibilidade aprovados;
2. implementar publicação/versionamento operacional do catálogo e o montador
   de kits; `src/data/catalog.ts` deve continuar apenas como fonte do seed de
   desenvolvimento;
3. persistir o carrinho se a recuperação entre dispositivos/sessões entrar no
   escopo; hoje ele continua no navegador e o servidor recalcula o pedido;
4. verificar remetente e domínio na Resend e ligar `RESEND_API_KEY` /
   `EMAIL_FROM` em produção. O envio já existe (`src/lib/email/client.ts`) e a
   tela só promete e-mail quando ele está configurado; sem as variáveis o
   envio devolve `skipped`;
5. substituir as ilustrações vetoriais pelas fotos reais dos produtos;
6. expiração e liberação operacional das reservas de estoque antes do go-live.
   O acesso público ao pedido por chave longa já está feito
   (`src/lib/orders/access-token.ts`): o código `BG-XXXXXX` sozinho mostra só a
   situação;
7. autenticação por pessoa no painel. Hoje é uma senha única, então a trilha
   de auditoria não distingue quem operou — as tabelas `admin_users` e o enum
   `admin_role` já existem no esquema para isso;
8. tirar o atalho de desenvolvimento de `src/lib/security/protected-data.ts`,
   que deriva a chave do CPF de `ADMIN_PANEL_SESSION_SECRET` quando não há
   `ORDER_DATA_ENCRYPTION_KEY`. Está cercado (fora de produção, só em
   localhost e sem `VERCEL_ENV`), mas é uma segunda porta para o segredo mais
   sensível do sistema;
9. revisar textos jurídicos com o catálogo real em mãos;
10. configurar backups, restauração, observabilidade e executar hardening,
   testes E2E e acessibilidade do fluxo completo;
11. levar o `npm run build` para o CI. Hoje ele fica de fora porque a coleta de
   dados de página consulta o PostgreSQL, então exigiria um Postgres de
   serviço com migration e seed no workflow;
12. avaliar automação Personal Net somente após documentação vigente,
   credenciais e homologação.

## Achados de revisão ainda abertos

Levantados nas revisões de frontend, QA, usabilidade/acessibilidade e
performance/SEO. O que era pequeno e verificável já foi corrigido; estes
sobraram por exigirem decisão, banco ou navegador.

**Correção de conteúdo e regra**

- a regra de endereço institucional (`orders/schema.ts`) casa `escola`,
  `creche` e `ceu` em qualquer posição do logradouro, e barra endereços
  residenciais legítimos — "Rua Escola Politécnica" existe em São Paulo, e
  "Rua Ceu Azul" digitada sem acento também casa. A pessoa é acusada de
  tentar entregar na escola e não tem saída: o campo é obrigatório e não há
  exceção. Precisa casar prefixo/destinatário, e oferecer um caminho de
  exceção;
- três nomes para o mesmo benefício: a loja inteira diz "Kit Escolar", só a
  caixa de aceite do checkout diz "Programa Material Escolar" — a frase
  juridicamente relevante usa um nome que a pessoa não viu antes. E a página
  do programa expõe "DUEPAY", que é jargão do processador;
- o crédito da etapa aparece como saldo do estudante. A ressalva ("valor
  publicado pela Prefeitura; consulte o saldo no aplicativo") existe no
  `BenefitMeter`, mas some no modo compacto — que é o usado no carrinho,
  exatamente onde a pessoa decide se cabe mais um item;
- navegar por `/products?etapa=X` reescreve a etapa do carrinho sem avisar
  (`stage-benefit-banner.tsx`): quem clica num chip por curiosidade volta com
  outro crédito e itens "fora da etapa";
- o painel promete que "a primeira imagem abre a ficha do produto", mas o
  catálogo público não expõe mídia: a ficha sempre mostra a ilustração.

**Correção técnica**

- **duas fontes de verdade para o crédito da etapa**: a tela usa a constante
  `EDUCATION_STAGES`, o pedido grava `program_catalog_stages`. Concordam hoje
  só porque o seed copia uma da outra;
- **limite por pedido divergente**: o carrinho mostra `maxPerOrder` da
  variante; o pedido exige `min(maxPerOrder, programItemStages.maxQuantity)`.
  Se o programa apertar a quantidade, a família só descobre no envio;
- o guarda de hidratação do carrinho não guarda: com `localStorage`, o
  `persist` do zustand hidrata na avaliação do módulo, então `hydrated` já é
  `true` na primeira renderização do cliente e o servidor discorda;
- conteúdo acima da dobra sai do servidor com `opacity: 0` (`motion.tsx`):
  home e catálogo só aparecem depois de hidratar. É o item mais caro de
  performance e pede troca por animação em CSS;
- reencodar `public/brand/hero.mp4`: 2,4 MB, 720p, com faixa de áudio que
  nunca toca, para ocupar ~380 px no celular. O gate já barra 2G e 3G;
- `loadCatalog()` não tem memoização por requisição: a ficha de produto o roda
  três vezes, e cada vez são ~3 idas ao Neon;
- `emailSent` mente na repetição idempotente do checkout: devolve
  "configurado", não "enviado" — e emite uma chave de acompanhamento nova a
  cada repetição, sem teto;
- `updatePanelProduct` escreve na variante mais antiga, não na `isDefault`;
  latente enquanto houver uma variante por produto;
- `applyImportRows` não é atômico por linha: o produto entra numa transação e
  o estoque noutra, então o relatório pode contradizer o banco;
- código do pedido sorteado com `Math.random`; `access-token.ts` já usa
  `randomInt` e é o mesmo conserto;
- sessão do painel sem revogação: o cookie é `expiresAt.HMAC(expiresAt)`, e
  sair só apaga do navegador — uma cópia vale sete dias;
- `hydrateOrders` lança se `shippingCents !== 0`: um pedido inconsistente
  derruba a listagem inteira do painel, não só a ficha dele.

**Acessibilidade**

- a confirmação do pedido troca a tela sem mover o foco nem anunciar nada —
  o momento mais crítico da jornada, para quem usa leitor de tela;
- `Field` não repassa `required` ao controle: o `*` é `aria-hidden`, então
  quem não enxerga só descobre o obrigatório depois de falhar;
- o resumo de erro diz "confira os campos destacados" — "destacado" é
  informação visual, e não há âncora para os campos;
- a gaveta de filtros no celular não prende o `Tab` (o `ui/dialog.tsx` já tem
  a implementação certa para reaproveitar);
- controles desabilitados são `<span>` sem papel nem foco, então um produto
  esgotado é indistinguível na navegação por teclado;
- mudanças no carrinho não são anunciadas: falta uma região `aria-live`;
- alvos de toque abaixo de 24px em ações de texto, e informação decisiva a
  11px (aviso de estouro do crédito, aceite das regras, aviso de segurança).

**Plano de teste sugerido pela revisão de QA**

Os três de maior retorno: reenviar o checkout depois de um erro não pode
criar um segundo pedido (E2E); produto só aparece na loja depois de aprovado
no programa (integração, e é o item 0 acima); reserva vencida devolve o saldo
à prateleira (integração, item 0b).

## Dependências externas abertas

- documentação atual e confirmação do fluxo online pela Personal Net;
- razão social, CNPJ, contato, domínio e política comercial da Balaio de Gato;
- catálogo, SKUs, fotos, preços e estoque reais (o catálogo atual é curado
  para desenvolvimento, com marcas e preços plausíveis, não contratados);
- fornecedores de armazenamento, e-mail e hospedagem, além da política de
  backup/restauração do Neon;
- vídeo final do hero e identidade visual aprovada.
