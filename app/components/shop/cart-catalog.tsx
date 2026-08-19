'use client';

/**
 * Faz o catálogo enxuto chegar ao carrinho.
 *
 * O carrinho guarda só slug e quantidade. Para mostrar nome, preço e estoque é
 * preciso cruzar com o catálogo, e quem tem a versão atual é o servidor. Este
 * provedor entrega essa lista uma vez por página, e daí qualquer componente
 * cliente monta o resumo sem nova ida ao servidor.
 *
 * O preço nunca vem do localStorage — só daqui.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { CartProduct } from '../../../src/lib/catalog/product';
import { buildCartSummary, type CartSummary } from '../../../src/lib/cart/summary';
import { useCartStore } from '../../../src/lib/cart/store';

const CartCatalogContext = createContext<readonly CartProduct[] | null>(null);

export function CartCatalogProvider({
  products,
  children,
}: {
  products: readonly CartProduct[];
  children: ReactNode;
}) {
  return <CartCatalogContext.Provider value={products}>{children}</CartCatalogContext.Provider>;
}

function useCartCatalog(): readonly CartProduct[] {
  const products = useContext(CartCatalogContext);
  if (products === null) {
    throw new Error(
      'Este componente precisa estar dentro de <CartCatalogProvider>. ' +
        'Envolva a página com o provedor e passe getCartProducts() do servidor.',
    );
  }
  return products;
}

/**
 * Resumo do carrinho já cruzado com o catálogo atual.
 *
 * Devolve `null` antes da hidratação: antes disso o store ainda não leu o
 * localStorage, e mostrar um carrinho vazio para depois preenchê-lo pisca.
 */
export function useCartSummary(): CartSummary | null {
  const products = useCartCatalog();
  const hydrated = useCartStore((state) => state.hydrated);
  const lines = useCartStore((state) => state.lines);
  const stage = useCartStore((state) => state.stage);

  return useMemo(
    () => (hydrated ? buildCartSummary(lines, products, stage) : null),
    [hydrated, lines, products, stage],
  );
}

/** Produto do catálogo pelo slug — usado para revalidar limites na ficha. */
export function useCartProduct(slug: string): CartProduct | undefined {
  const products = useCartCatalog();
  return useMemo(() => products.find((product) => product.slug === slug), [products, slug]);
}
