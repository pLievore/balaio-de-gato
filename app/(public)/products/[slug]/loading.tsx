import { SkeletonBlock } from '../../../components/shop/skeletons';
import { Container } from '../../../components/ui/container';

export default function ProductLoading() {
  return (
    <main aria-busy="true">
      <Container size="wide" className="pt-6 pb-4">
        <SkeletonBlock className="h-3 w-64" />
      </Container>

      <Container size="wide" className="pb-14 md:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <SkeletonBlock className="aspect-square w-full rounded-[2rem]" />
            <SkeletonBlock className="mx-auto mt-4 h-3 w-64" />
          </div>

          <div>
            <SkeletonBlock className="h-3 w-40" />
            <SkeletonBlock className="mt-3 h-9 w-full" />
            <SkeletonBlock className="mt-2 h-9 w-3/5" />
            <SkeletonBlock className="mt-4 h-4 w-2/3" />

            <div className="mt-7 rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
              <SkeletonBlock className="h-8 w-36" />
              <SkeletonBlock className="mt-3 h-3 w-52" />
              <div className="mt-6 border-t border-[rgb(var(--border))] pt-6">
                <div className="flex gap-3">
                  <SkeletonBlock className="h-11 w-32 rounded-full" />
                  <SkeletonBlock className="h-11 flex-1 rounded-full" />
                </div>
              </div>
            </div>

            <SkeletonBlock className="mt-8 h-3 w-40" />
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          </div>
        </div>
      </Container>

      <p className="sr-only" aria-live="polite">
        Carregando o material…
      </p>
    </main>
  );
}
