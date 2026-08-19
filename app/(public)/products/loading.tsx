import { ProductGridSkeleton, SkeletonBlock } from '../../components/shop/skeletons';
import { Container } from '../../components/ui/container';

export default function ProductsLoading() {
  return (
    <main aria-busy="true">
      <section className="border-b border-[rgb(var(--border))] bg-white/55">
        <Container size="wide" className="py-10 md:py-14">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Catálogo
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl leading-[1.05] font-extrabold md:text-5xl">
            Tudo da lista, num só balaio.
          </h1>
          <SkeletonBlock className="mt-4 h-4 w-full max-w-lg" />
          <SkeletonBlock className="mt-7 h-12 w-full max-w-2xl rounded-full" />
        </Container>
      </section>

      <Container size="wide" className="py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-12">
          <div className="hidden space-y-8 lg:block">
            {[6, 4, 2, 9].map((rows, group) => (
              <div key={group}>
                <SkeletonBlock className="h-3 w-24" />
                <div className="mt-4 space-y-2">
                  {Array.from({ length: rows }, (_, index) => (
                    <SkeletonBlock key={index} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-5">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-10 w-40 rounded-full" />
            </div>
            <div className="pt-11">
              <ProductGridSkeleton />
            </div>
          </div>
        </div>
      </Container>

      <p className="sr-only" aria-live="polite">
        Carregando os materiais escolares…
      </p>
    </main>
  );
}
