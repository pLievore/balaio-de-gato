'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingBasket } from 'lucide-react';
import Link from 'next/link';

import { useHydratedItemCount } from '../../../src/lib/cart/store';

/**
 * Atalho para o carrinho, com o número de itens.
 *
 * O selo só aparece depois da hidratação: o servidor não sabe o que há no
 * localStorage do visitante, e renderizar zero para depois trocar por três
 * produz um salto visível em toda navegação.
 */
export function CartButton() {
  const count = useHydratedItemCount();
  const reduced = useReducedMotion();
  const hasItems = count !== null && count > 0;

  return (
    <Link
      href="/cart"
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-[rgb(var(--fg))] transition hover:bg-[rgb(var(--surface-muted))]"
      aria-label={
        hasItems ? `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'
      }
    >
      <ShoppingBasket aria-hidden="true" className="size-5" />
      {hasItems ? (
        <motion.span
          key={count}
          aria-hidden="true"
          initial={reduced ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="tabular-nums-tight absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-[rgb(var(--accent))] px-1.5 text-[11px] font-black text-white ring-2 ring-[rgb(var(--bg))]"
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      ) : null}
    </Link>
  );
}
