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

## Limites regulatórios e operacionais

- Comunicar credenciamento municipal, nunca estadual.
- Mostrar apenas itens autorizados no carrinho pago com o benefício.
- Gerar documento fiscal exclusivo no CPF do responsável.
- Não cobrar entrega da família no fluxo do benefício.
- Bloquear entrega para escola, DRE ou unidade da SME.
- Não coletar credenciais do cartão virtual.

## Situação do legado

O código Shopify/Square/Supabase ainda existe em áreas antigas do repositório e será removido incrementalmente. As rotas novas e o sitemap já não dependem de Shopify. O app separado `801-outlet-admin` não será convertido; o painel novo será construído neste projeto.

Detalhes e decisões: [`../docs/README.md`](../docs/README.md).
