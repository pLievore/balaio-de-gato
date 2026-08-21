'use client';

/**
 * Bloco de compra da ficha do produto.
 *
 * Junta quantidade e adição num só lugar porque as duas decisões são a mesma:
 * quanto levar. O limite mostrado vem do catálogo recarregado pelo servidor,
 * não do que estava na página quando ela abriu.
 */

import { AlertTriangle, PackageCheck, Truck } from 'lucide-react';
import { useState } from 'react';

import { useCartStore } from '../../../src/lib/cart/store';
import type { Product } from '../../../src/lib/catalog/product';
import { formatBRL } from '../../../src/lib/money';
import { AddToCartButton, limitFor } from './add-to-cart';
import { useCartProduct } from './cart-catalog';
import { QuantityStepper } from './quantity-stepper';

export function ProductPurchase({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  // A versão do provedor é a que o servidor mandou nesta navegação; se o
  // estoque mudou desde que a ficha foi gerada, é ela que vale.
  const live = useCartProduct(product.slug);
  const current = live ?? product;

  const inCart =
    useCartStore((state) => state.lines.find((line) => line.slug === product.slug)?.quantity) ?? 0;

  const limit = limitFor(current);
  const soldOut = limit === 0;
  const remaining = Math.max(0, limit - inCart);

  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display tabular-nums-tight text-3xl font-black">
          {formatBRL(current.priceInCents)}
        </span>
        {current.compareAtPriceInCents ? (
          <>
            <span className="tabular-nums-tight text-sm font-bold text-[rgb(var(--muted))] line-through">
              {formatBRL(current.compareAtPriceInCents)}
            </span>
            <span className="rounded-full bg-[rgb(var(--accent-soft))] px-2.5 py-1 text-[11px] font-black text-[rgb(var(--accent))]">
              Economize {formatBRL(current.compareAtPriceInCents - current.priceInCents)}
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-2 text-xs font-semibold text-[rgb(var(--muted))]">
        Preço à vista, já com o desconto do programa.
      </p>

      <div className="mt-6 border-t border-[rgb(var(--border))] pt-6">
        {soldOut ? (
          <div className="flex items-start gap-3 rounded-2xl bg-[rgb(var(--surface-muted))] p-4">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4.5 shrink-0 text-[rgb(var(--muted))]"
            />
            <p className="text-sm leading-6 font-semibold">
              Este item está sem estoque no momento. Continue montando o kit com os outros materiais
              da lista.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                // `remaining || limit` caía no limite cheio quando restava zero, e a
                // pessoa conseguia subir de novo para descobrir no clique que não dava.
                max={Math.max(1, remaining)}
                label={`Quantidade de ${product.name}`}
              />
              <AddToCartButton
                product={current}
                quantity={quantity}
                size="lg"
                label="Adicionar ao carrinho"
                className="w-full basis-full sm:w-auto sm:flex-1 sm:basis-auto"
              />
            </div>

            <p className="mt-3 text-xs leading-5 font-semibold text-[rgb(var(--muted))]">
              {inCart > 0 ? (
                <>
                  Você já tem <strong className="text-[rgb(var(--fg))]">{inCart}</strong> no
                  carrinho.{' '}
                </>
              ) : null}
              Limite de {current.maxPerOrder} {current.maxPerOrder === 1 ? 'unidade' : 'unidades'}{' '}
              por pedido.
            </p>
          </>
        )}
      </div>

      <ul className="mt-6 space-y-3 border-t border-[rgb(var(--border))] pt-6 text-sm">
        <li className="flex items-start gap-2.5">
          <Truck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[rgb(var(--sage-ink))]"
          />
          <span className="leading-5 font-semibold">
            Entrega grátis nas compras com o crédito do Kit Escolar.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <PackageCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[rgb(var(--sage-ink))]"
          />
          <span className="leading-5 font-semibold">
            A loja confere os itens antes de preparar o pagamento.
          </span>
        </li>
      </ul>
    </div>
  );
}
