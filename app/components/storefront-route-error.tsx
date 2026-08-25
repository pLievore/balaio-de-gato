'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';

import { buttonStyles } from './ui/button';
import { Container } from './ui/container';

export function StorefrontRouteError({
  reset,
  title = 'Não foi possível carregar esta página',
}: {
  reset: () => void;
  title?: string;
}) {
  return (
    <main>
      <Container size="narrow" className="py-20 text-center md:py-28">
        <p className="text-xs font-extrabold tracking-[0.2em] text-[rgb(var(--danger))] uppercase">
          Indisponível no momento
        </p>
        <h1 className="font-display mt-4 text-4xl leading-tight font-extrabold md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[rgb(var(--muted))]">
          Foi uma falha temporária. Tente de novo — se continuar, volte ao catálogo e siga
          escolhendo os materiais da lista.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonStyles({ size: 'lg' })}>
            <RotateCw aria-hidden="true" className="size-4" />
            Tentar novamente
          </button>
          <Link href="/products" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            Voltar aos materiais
          </Link>
        </div>
      </Container>
    </main>
  );
}
