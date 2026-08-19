import Link from 'next/link';

export const metadata = {
  title: 'Página não encontrada — Balaio de Gato',
};

export default function NotFound() {
  return (
    <main className="relative mx-auto flex min-h-[75vh] max-w-3xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="text-xs font-extrabold tracking-[0.2em] text-[rgb(var(--accent))] uppercase">
        Erro 404
      </p>
      <h1 className="font-display mt-4 text-5xl leading-tight font-extrabold md:text-7xl">
        Este item ficou fora do balaio.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-6 text-[rgb(var(--muted))]">
        Não encontramos esta página. Você pode voltar ao início ou escolher os materiais.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[rgb(var(--fg))] px-7 py-3 text-sm font-extrabold text-white"
        >
          Escolher materiais
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgb(var(--border-strong))] bg-white px-7 py-3 text-sm font-extrabold"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
