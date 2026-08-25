'use client';

import { Check, ShoppingBasket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useCartStore } from '../../../src/lib/cart/store';
import { cn } from '../../../src/lib/cn';
import type { Product } from '../../../src/lib/catalog/product';
import { trackFunnelStep } from '../track-event';
import { buttonStyles } from '../ui/button';
import { useToast } from './toast';

/**
 * O limite real é o menor entre o estoque e o teto por pedido. Calculado aqui
 * e não no store porque só o servidor conhece o produto atual.
 */
export function limitFor(product: Pick<Product, 'stock' | 'maxPerOrder'>): number {
  return Math.max(0, Math.min(product.stock, product.maxPerOrder));
}

type AddToCartProps = {
  product: Pick<Product, 'slug' | 'name' | 'stock' | 'maxPerOrder'>;
  quantity?: number;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Rótulo curto; o card usa "Adicionar", a ficha usa "Adicionar ao carrinho". */
  label?: string;
  fullWidth?: boolean;
};

export function AddToCartButton({
  product,
  quantity = 1,
  variant = 'primary',
  size = 'md',
  className,
  label = 'Adicionar',
  fullWidth = false,
}: AddToCartProps) {
  const addLine = useCartStore((state) => state.addLine);
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const limit = limitFor(product);
  const soldOut = limit === 0;

  if (soldOut) {
    return (
      <span
        className={cn(
          buttonStyles({ variant: 'secondary', size }),
          'pointer-events-none opacity-60',
          fullWidth && 'w-full',
          className,
        )}
      >
        Sem estoque
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const result = addLine(product.slug, quantity, limit);

        if (result.ok) {
          trackFunnelStep('add_to_cart');
          toast({
            tone: 'success',
            message: 'Adicionado ao carrinho',
            detail: product.name,
          });
          setJustAdded(true);
          if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
          resetTimer.current = window.setTimeout(() => setJustAdded(false), 1600);
        } else {
          toast({ tone: 'warning', message: result.reason, detail: product.name });
        }
      }}
      className={cn(
        buttonStyles({ variant, size }),
        'relative overflow-hidden',
        fullWidth && 'w-full',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center gap-2 transition duration-200',
          justAdded && 'opacity-0 motion-safe:-translate-y-6',
        )}
      >
        <ShoppingBasket className="size-4" />
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-2 transition duration-200',
          justAdded ? 'translate-y-0 opacity-100' : 'opacity-0 motion-safe:translate-y-6',
        )}
      >
        <Check className="size-4" strokeWidth={3} />
        Adicionado
      </span>
      {/* O rótulo acessível não muda de posição nem some junto da animação. */}
      <span className="sr-only">
        {label} — {product.name}
      </span>
    </button>
  );
}
