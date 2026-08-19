import Link from 'next/link';

import { CATEGORY_TONE_CLASSES, getCategory } from '../../../src/lib/catalog/categories';
import {
  getAvailability,
  getDiscountPercent,
  type Product,
} from '../../../src/lib/catalog/product';
import { cn } from '../../../src/lib/cn';
import { formatBRL } from '../../../src/lib/money';
import { ProductIllustration } from '../product-illustration';
import { AddToCartButton } from './add-to-cart';

/**
 * Card do catálogo.
 *
 * O card inteiro é clicável através de um link que cobre a área, mas o botão
 * de adicionar fica acima dele na pilha — assim dá para comprar direto da
 * grade sem abrir a ficha, e ninguém abre a ficha por engano ao mirar o botão.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  /** Mostra o preço maior; usado nas vitrines curtas da home. */
  priority?: boolean;
}) {
  const category = getCategory(product.category);
  const availability = getAvailability(product);
  const discount = getDiscountPercent(product);
  const soldOut = availability === 'out-of-stock';

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white',
        'transition duration-300 motion-safe:hover:-translate-y-1',
        'hover:border-[rgb(var(--accent))]/30 hover:shadow-[0_20px_50px_rgba(24,50,77,0.10)]',
        'focus-within:border-[rgb(var(--accent))]/40',
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-[rgb(var(--surface-muted))]">
        <div
          className={cn(
            'h-full w-full transition duration-500 ease-[var(--ease-out-expo)]',
            'motion-safe:group-hover:scale-[1.06]',
            soldOut && 'opacity-55 grayscale',
          )}
        >
          <ProductIllustration illustration={product.illustration} seed={product.slug} />
        </div>

        <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {discount !== null && !soldOut ? (
            <span className="rounded-full bg-[rgb(var(--accent))] px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
              −{discount}%
            </span>
          ) : null}
          {availability === 'low-stock' ? (
            <span className="rounded-full bg-[rgb(var(--sun))] px-2.5 py-1 text-[11px] font-black text-[rgb(var(--fg))] shadow-sm">
              Últimas {product.stock}
            </span>
          ) : null}
          {soldOut ? (
            <span className="rounded-full bg-[rgb(var(--fg))] px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
              Sem estoque
            </span>
          ) : null}
        </div>

        {category ? (
          <span
            className={cn(
              'pointer-events-none absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-[11px] font-bold',
              CATEGORY_TONE_CLASSES[category.tone],
            )}
          >
            {category.shortName}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-bold tracking-[0.12em] text-[rgb(var(--muted))] uppercase">
          {product.brand}
        </p>

        <h3 className="mt-1.5 text-[15px] leading-snug font-extrabold text-balance">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[rgb(var(--muted))]">
          {product.tagline}
        </p>

        <div className="mt-4 flex flex-1 flex-col justify-end">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'tabular-nums-tight font-display font-black',
                priority ? 'text-2xl' : 'text-xl',
              )}
            >
              {formatBRL(product.priceInCents)}
            </span>
            {product.compareAtPriceInCents ? (
              <span className="tabular-nums-tight text-xs font-bold text-[rgb(var(--muted))] line-through">
                {formatBRL(product.compareAtPriceInCents)}
              </span>
            ) : null}
          </div>

          {/* Acima do link que cobre o card, para receber o clique primeiro. */}
          <div className="relative z-10 mt-4">
            <AddToCartButton product={product} size="md" fullWidth />
          </div>
        </div>
      </div>
    </article>
  );
}
