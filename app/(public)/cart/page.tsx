import type { Metadata } from 'next';

import { getCachedCartProducts } from '../../../src/lib/catalog/repository';
import { CartCatalogProvider } from '../../components/shop/cart-catalog';
import { CartView } from '../../components/shop/cart-view';
import { Container } from '../../components/ui/container';

export const metadata: Metadata = {
  title: 'Carrinho',
  description: 'Revise os materiais escolhidos antes de enviar o pedido.',
  // A página é pessoal e muda a cada visita: não deve entrar em índice.
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const cartProducts = await getCachedCartProducts();

  return (
    <main>
      <Container size="wide" className="py-10 md:py-14">
        <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
          Seu balaio
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold md:text-5xl">
          Carrinho
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
          Confira as quantidades e o crédito disponível antes de enviar o pedido para a loja.
        </p>

        <div className="mt-10">
          <CartCatalogProvider products={cartProducts}>
            <CartView />
          </CartCatalogProvider>
        </div>
      </Container>
    </main>
  );
}
