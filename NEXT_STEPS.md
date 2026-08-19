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
10. proteção do CPF persistido e smoke concorrente de pedido.

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

Removidos junto com a integração antiga: autoria de catálogo pelo painel
(`novo produto`, `edição`, `importar CSV`) e a tela de vendas. Voltam escritos
sobre o PostgreSQL — a autoria só faz sentido depois que o catálogo oficial
substituir o seed.

## Em aberto

1. substituir o seed provisório pelo catálogo oficial revisado, com SKUs,
   preços, fotos, estoque e vínculos de elegibilidade aprovados;
2. implementar publicação/versionamento operacional do catálogo e o montador
   de kits; `src/data/catalog.ts` deve continuar apenas como fonte do seed de
   desenvolvimento;
3. persistir o carrinho se a recuperação entre dispositivos/sessões entrar no
   escopo; hoje ele continua no navegador e o servidor recalcula o pedido;
4. notificações transacionais: hoje a confirmação aparece na tela, mas nenhum
   e-mail sai — a tela promete um e-mail que ainda não existe (`src/lib/email.ts`
   está pronto para isso);
5. painel `/admin` do produto novo, lendo os pedidos deste app;
6. substituir as ilustrações vetoriais pelas fotos reais dos produtos;
7. expiração/liberação operacional das reservas e acesso público ao pedido por
   token opaco, além do código, antes do go-live;
8. revisar textos jurídicos com o catálogo real em mãos;
9. configurar backups, restauração, observabilidade e executar hardening,
   testes E2E e acessibilidade do fluxo completo;
10. avaliar automação Personal Net somente após documentação vigente,
   credenciais e homologação.

## Dependências externas abertas

- documentação atual e confirmação do fluxo online pela Personal Net;
- razão social, CNPJ, contato, domínio e política comercial da Balaio de Gato;
- catálogo, SKUs, fotos, preços e estoque reais (o catálogo atual é curado
  para desenvolvimento, com marcas e preços plausíveis, não contratados);
- fornecedores de armazenamento, e-mail e hospedagem, além da política de
  backup/restauração do Neon;
- vídeo final do hero e identidade visual aprovada.
