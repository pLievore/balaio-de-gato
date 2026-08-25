# Contexto do projeto

## Objetivo

Transformar a estrutura reutilizável do frontend existente em um ecommerce novo para a **Balaio de Gato**, papelaria credenciada no Programa Material Escolar da SME/Prefeitura de São Paulo.

O reaproveitamento é de engenharia: composição de páginas, componentes acessíveis, animação, testes e práticas de qualidade. Marca, conteúdo, catálogo, regras, dados e integrações da 801 Outlet não são reaproveitados.

## Arquitetura decidida

- Next.js 16 e React 19 como aplicação única.
- Storefront, APIs internas e painel protegido em `/admin` no mesmo código-base.
- PostgreSQL como autoridade comercial.
- Catálogo e estoque lógicos únicos, sem entidade de filial.
- Camada própria de domínio para etapas, listas, produtos, carrinho, pedidos e pagamentos.
- Adaptador DUEPAY manual no MVP, substituível por integração oficial sem remodelar pedidos.

## Identidade e presença institucional

- O arquivo oficial de marca é `public/brand/balaio-de-gato.jpg`.
- A nitidez no app é tratada no componente de marca por resolução, densidade e
  qualidade do `next/image`; o JPG oficial permanece inalterado.
- A paleta oficial parte do laranja `#A84B08`; os tokens completos vivem em
  `app/globals.css` e estão inventariados em
  [`../docs/21-inventario-identidade-landing-page.md`](../docs/21-inventario-identidade-landing-page.md).
- A landing institucional está implementada em `/sobre`.
- Os endereços Vila Isa (Av. Nossa Senhora do Sabará, 1382, CEP 04686-001,
  (11) 98035-6453, seg–sex 08h–18h e sáb 09h–16h), Jardim da Pedreira
  (Estrada do Alvarenga, 772, CEP 04462-000, (11) 91330-8379, seg–sex
  08h–18h e sáb 09h–16h) e Jequirituba (Rua Jequirituba, 1530,
  CEP 04822-000, (11) 99429-0398, seg–sáb 08h–19h) foram verificados em
  24/08/2026. Os horários foram fornecidos diretamente pela empresa.
- Esses endereços são conteúdo institucional da mesma operação: não modelar
  filiais, estoques separados, seleção de unidade ou retirada. Não afirmar um
  bairro para o endereço de Jequirituba.

## Limites regulatórios e operacionais

- Comunicar credenciamento municipal, nunca estadual.
- Mostrar apenas itens autorizados no carrinho pago com o benefício.
- Gerar documento fiscal exclusivo no CPF do responsável.
- Não cobrar entrega da família no fluxo do benefício.
- Bloquear entrega para escola, DRE ou unidade da SME.
- Não coletar credenciais do cartão virtual.

## Situação do legado

O código Shopify, Square e Supabase foi removido por completo do repositório, junto com as rotas, scripts, dependências e variáveis de ambiente que dependiam dele. O app separado `801-outlet-admin` não será convertido; o painel deste projeto roda sobre o PostgreSQL, em `/admin`.

O esquema vigente tem 26 tabelas e três migrations. A liberação preguiçosa e
idempotente de reservas vencidas já existe. O bloqueador comercial ainda
aberto é o fluxo de aprovação dos vínculos `isApproved`: sem ele, um catálogo
oficial publicado não expõe produtos elegíveis.

Detalhes e decisões: [`../docs/README.md`](../docs/README.md).
