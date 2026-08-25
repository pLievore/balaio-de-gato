import type { Metadata } from 'next';
import Link from 'next/link';

import { OfficialBrandLogo } from '../components/brand-logo';

export const metadata: Metadata = {
  title: 'Site em preparação — Balaio de Gato',
  description: 'A nova loja online do Balaio de Gato está em preparação.',
};

export default function MaintenancePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-20 text-center">
      <div className="w-full max-w-[260px] overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white p-3 shadow-sm">
        <OfficialBrandLogo priority sizes="260px" />
      </div>
      <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-[rgb(var(--accent))] uppercase">
        Estamos arrumando o balaio
      </p>
      <h1 className="font-display mt-4 text-5xl leading-tight font-extrabold md:text-7xl">
        A nova papelaria online está chegando.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-6 text-[rgb(var(--muted))]">
        Em breve você poderá escolher os materiais e pagar com o crédito do Kit Escolar.
      </p>
      <Link
        href="/programa"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[rgb(var(--accent))] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[rgb(var(--accent-strong))]"
      >
        Como usar o crédito
      </Link>
    </main>
  );
}
