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

## Dependências externas abertas

- documentação atual e confirmação do fluxo online pela Personal Net;
- razão social, CNPJ, contato, domínio e política comercial da Balaio de Gato;
- catálogo, SKUs, fotos, preços e estoque reais (o catálogo atual é curado
  para desenvolvimento, com marcas e preços plausíveis, não contratados);
- fornecedores de armazenamento, e-mail e hospedagem, além da política de
  backup/restauração do Neon;
- vídeo final do hero e identidade visual aprovada.
