'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingBasket } from 'lucide-react';

import { CATEGORIES } from '../../src/lib/catalog/categories';
import { useHydratedItemCount } from '../../src/lib/cart/store';
import type { NavigationLink } from '../../src/lib/navigation/types';
import { Button, buttonStyles } from './ui/button';
import { Drawer } from './ui/dialog';

export function MobileNav({ links }: { links: NavigationLink[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const cartCount = useHydratedItemCount();

  const close = () => setOpen(false);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="shrink-0 lg:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
      >
        <motion.span
          aria-hidden="true"
          className="relative block size-5"
          animate={open && !reducedMotion ? { rotate: 90 } : { rotate: 0 }}
        >
          <span className="absolute top-1 left-0 block h-px w-5 bg-current" />
          <span className="absolute top-2.5 left-0 block h-px w-5 bg-current" />
          <span className="absolute top-4 left-0 block h-px w-5 bg-current" />
        </motion.span>
      </Button>

      <Drawer
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        title="Menu"
        description="Explore o Balaio de Gato"
      >
        <nav className="flex min-h-full flex-col p-5" aria-label="Navegação mobile">
          <ul className="space-y-1">
            {links.map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className={
                      'flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-bold transition ' +
                      (active
                        ? 'bg-[rgb(var(--accent))] text-white'
                        : 'text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-muted))]')
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-7 px-4 text-[11px] font-extrabold tracking-[0.14em] text-[rgb(var(--muted))] uppercase">
            Categorias
          </h2>
          <ul className="mt-2 space-y-0.5">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/products?categoria=${category.slug}`}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-xl px-4 py-2.5 text-sm font-bold text-[rgb(var(--muted))] transition hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--fg))]"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-3 border-t border-[rgb(var(--border))] pt-6">
            <Link
              href="/cart"
              onClick={close}
              className={buttonStyles({
                variant: 'secondary',
                size: 'lg',
                className: 'w-full justify-between',
              })}
            >
              <span className="flex items-center gap-2">
                <ShoppingBasket aria-hidden="true" className="size-4" />
                Meu carrinho
              </span>
              {cartCount !== null && cartCount > 0 ? (
                <span className="tabular-nums-tight flex min-w-6 items-center justify-center rounded-full bg-[rgb(var(--accent))] px-2 py-0.5 text-xs font-black text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>

            <Link
              href="/products"
              onClick={close}
              className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full' })}
            >
              Montar meu kit
            </Link>

            <p className="text-center text-xs leading-relaxed text-[rgb(var(--muted))]">
              Escolha os materiais e pague com o crédito do Kit Escolar.
            </p>
          </div>
        </nav>
      </Drawer>
    </>
  );
}
