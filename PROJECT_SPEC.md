# Especificação resumida — Balaio de Gato

## Proposta

“Tudo da lista, num só balaio.” A experiência deve reduzir a ansiedade de responsáveis diante da lista escolar, organizando materiais por etapa e explicando com clareza o pagamento pelo benefício.

## Público e idioma

- responsáveis por estudantes atendidos pelo Programa Material Escolar da rede municipal de São Paulo;
- compradores comuns de materiais escolares em evolução futura;
- interface em português brasileiro e valores em reais.

## Jornada MVP

1. responsável entende o credenciamento e escolhe a etapa;
2. sistema apresenta somente produtos reais e autorizados daquela lista;
3. carrinho valida elegibilidade, preço, estoque e separação fiscal;
4. responsável informa dados mínimos para nota e entrega;
5. pedido entra em `awaiting_payment_link` e reserva o estoque;
6. operador gera o link no ambiente Personal Net e registra o envio;
7. responsável valida a compra no DUEPAY;
8. operador confere a fonte oficial, registra autorização e libera preparação/entrega.

## Estados canônicos

Pedido:

`draft | awaiting_payment_link | payment_link_sent | paid | preparing | out_for_delivery | delivered | cancelled | manual_review`

Pagamento:

`not_started | awaiting_link | link_sent | authorized | declined | expired | cancelled | refunded | manual_review`

## Requisitos não negociáveis

- nenhum produto, preço, avaliação ou disponibilidade fictícia em produção;
- nenhum checkout Shopify;
- nenhuma escolha de unidade;
- nenhuma credencial DUEPAY coletada pela aplicação;
- transições financeiras idempotentes e auditáveis;
- regras de benefício revalidadas no servidor;
- política de privacidade e termos revisados antes do go-live.

A especificação completa está em [`../docs/04-especificacao-funcional.md`](../docs/04-especificacao-funcional.md).
