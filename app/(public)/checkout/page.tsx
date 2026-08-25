import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { getCachedCartProducts } from '../../../src/lib/catalog/repository';
import { CartCatalogProvider } from '../../components/shop/cart-catalog';
import { CheckoutForm } from '../../components/shop/checkout-form';
import { TrackEvent } from '../../components/track-event';
import { Container } from '../../components/ui/container';

export const metadata: Metadata = {
  title: 'Enviar pedido',
  description:
    'Informe os dados do responsável e o endereço de entrega para enviar o pedido à loja.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cartProducts = await getCachedCartProducts();

  return (
    <main>
      <TrackEvent step="checkout_start" />
      <Container size="wide" className="py-10 md:py-14">
        <nav aria-label="Você está em" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-bold text-[rgb(var(--muted))]">
            <li>
              <Link href="/cart" className="transition hover:text-[rgb(var(--fg))]">
                Carrinho
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 shrink-0" />
            </li>
            <li aria-current="page" className="text-[rgb(var(--fg))]">
              Enviar pedido
            </li>
          </ol>
        </nav>

        <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
          Último passo
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold md:text-5xl">
          Enviar pedido
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
          Nenhum pagamento acontece nesta página. A loja confere o pedido e envia um link seguro
          para você usar o crédito do Kit Escolar.
        </p>

        <div className="mt-10">
          <CartCatalogProvider products={cartProducts}>
            <CheckoutForm />
          </CartCatalogProvider>
        </div>
      </Container>
    </main>
  );
}
