import { cn } from '../../../src/lib/cn';

/**
 * Esqueletos de carregamento.
 *
 * A regra é que o esqueleto tenha a mesma forma e as mesmas medidas do que vai
 * chegar. Um bloco genérico avisa "carregando"; um bloco com o formato certo
 * evita que a página salte quando o conteúdo entra — que é o que realmente
 * incomoda quem está lendo.
 */

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton-shimmer rounded-xl', className)} />;
}

/** Espelha `ProductCard`: quadrado da ilustração, marca, nome, preço e botão. */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white"
    >
      <div className="skeleton-shimmer aspect-square" />
      <div className="p-5">
        <SkeletonBlock className="h-2.5 w-16" />
        <SkeletonBlock className="mt-2.5 h-4 w-4/5" />
        <SkeletonBlock className="mt-2 h-3 w-3/5" />
        <SkeletonBlock className="mt-5 h-6 w-24" />
        <SkeletonBlock className="mt-4 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
