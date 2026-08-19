/**
 * Domínio do catálogo da Balaio de Gato.
 *
 * Os tipos aqui descrevem o produto como a loja o vende: preço em centavos de
 * real, estoque agregado (uma operação, um estoque lógico) e a lista de etapas
 * de ensino para as quais o item é autorizado dentro do Programa Material
 * Escolar. Nada aqui depende de onde os dados moram — hoje um módulo local,
 * amanhã o PostgreSQL.
 */

import type { EducationStage } from '../program/material-escolar';

export type CategorySlug =
  | 'cadernos'
  | 'escrita'
  | 'arte'
  | 'organizacao'
  | 'geometria'
  | 'papelaria';

/**
 * Arquétipo de ilustração. Cada produto aponta para um desenho vetorial
 * próprio, o que dá variedade real ao catálogo enquanto as fotos reais não
 * chegam. Ver `app/components/product-illustration.tsx`.
 */
export type IllustrationKey =
  | 'caderno'
  | 'bloco'
  | 'papel'
  | 'lapis'
  | 'caneta'
  | 'borracha'
  | 'apontador'
  | 'marcador'
  | 'lapis-cor'
  | 'giz-cera'
  | 'canetinha'
  | 'tinta'
  | 'pincel'
  | 'massinha'
  | 'tesoura'
  | 'cola'
  | 'regua'
  | 'compasso'
  | 'mochila'
  | 'estojo'
  | 'pasta'
  | 'agenda';

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: CategorySlug;
  illustration: IllustrationKey;
  /** Uma linha curta para o card — complementa o nome, não o repete. */
  tagline: string;
  description: string;
  priceInCents: number;
  /** Preço anterior, quando o item está em oferta. */
  compareAtPriceInCents?: number;
  /** Etapas de ensino autorizadas a comprar este item com o crédito. */
  stages: readonly EducationStage['slug'][];
  /** Estoque agregado. Zero significa esgotado, não oculto. */
  stock: number;
  /** Teto por pedido, quando o programa ou a operação limitam a quantidade. */
  maxPerOrder: number;
  specs: readonly ProductSpec[];
  /** Termos extras que devem casar na busca (sinônimos regionais, marcas). */
  keywords: readonly string[];
};

/**
 * A fatia do produto que o carrinho precisa.
 *
 * O carrinho vive no cliente, então o servidor manda só isto — sem descrição,
 * especificações nem palavras-chave. É o bastante para calcular total, estoque
 * e elegibilidade, e evita despejar o catálogo inteiro em toda página.
 */
export type CartProduct = Pick<
  Product,
  | 'slug'
  | 'sku'
  | 'name'
  | 'brand'
  | 'category'
  | 'illustration'
  | 'priceInCents'
  | 'compareAtPriceInCents'
  | 'stock'
  | 'maxPerOrder'
  | 'stages'
>;

export function toCartProduct(product: Product): CartProduct {
  return {
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    illustration: product.illustration,
    priceInCents: product.priceInCents,
    compareAtPriceInCents: product.compareAtPriceInCents,
    stock: product.stock,
    maxPerOrder: product.maxPerOrder,
    stages: product.stages,
  };
}

/** Produto pronto para exibição: preço derivado e estado de estoque resolvido. */
export type ProductAvailability = 'in-stock' | 'low-stock' | 'out-of-stock';

/** Abaixo deste ponto o card avisa que o estoque está acabando. */
export const LOW_STOCK_THRESHOLD = 6;

export function getAvailability(product: Product): ProductAvailability {
  if (product.stock <= 0) return 'out-of-stock';
  if (product.stock <= LOW_STOCK_THRESHOLD) return 'low-stock';
  return 'in-stock';
}

export function getDiscountPercent(product: Product): number | null {
  const compareAt = product.compareAtPriceInCents;
  if (!compareAt || compareAt <= product.priceInCents) return null;
  return Math.round(((compareAt - product.priceInCents) / compareAt) * 100);
}

export function isEligibleForStage(product: Product, stageSlug: string): boolean {
  return product.stages.includes(stageSlug);
}
