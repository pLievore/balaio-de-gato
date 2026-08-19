import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, BookOpenCheck } from 'lucide-react';

import { env } from '../../src/config/env';
import type { NavigationLink } from '../../src/lib/navigation/types';
import { getCartProducts } from '../../src/lib/catalog/repository';
import { MobileNav } from '../components/mobile-nav';
import { TrackEvent } from '../components/track-event';
import { CartButton } from '../components/shop/cart-button';
import { CartCatalogProvider } from '../components/shop/cart-catalog';
import { ToastViewport } from '../components/shop/toast';
import { ButtonLink } from '../components/ui/button';
import { Container } from '../components/ui/container';

// O layout entrega preço e estoque ao carrinho. Esses dados não podem ficar
// congelados no HTML gerado durante o build.
export const dynamic = 'force-dynamic';

const NAVIGATION: NavigationLink[] = [
  { id: 'materiais', label: 'Materiais', href: '/products', external: false, children: [] },
  { id: 'etapas', label: 'Ano ou etapa', href: '/#etapas', external: false, children: [] },
  { id: 'programa', label: 'Como funciona', href: '/programa', external: false, children: [] },
];

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // O catálogo enxuto desce uma vez por navegação; o carrinho no cliente cruza
  // com ele para saber preço, estoque e limite atuais.
  const cartProducts = await getCartProducts();

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${env.siteUrl}/#store`,
    name: 'Balaio de Gato',
    description: 'Papelaria credenciada para o Kit Escolar da Prefeitura de São Paulo.',
    url: env.siteUrl,
    logo: `${env.siteUrl}/brand/balaio-mark.svg`,
    priceRange: 'R$',
    currenciesAccepted: 'BRL',
    areaServed: { '@type': 'City', name: 'São Paulo' },
  };

  return (
    <CartCatalogProvider products={cartProducts}>
      <div className="min-h-dvh">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <a
          href="#conteudo-principal"
          className="fixed top-3 left-4 z-[100] -translate-y-24 rounded-full bg-[rgb(var(--fg))] px-5 py-3 text-sm font-bold text-white transition focus:translate-y-0"
        >
          Ir para o conteúdo
        </a>
        <AnnouncementBar />
        <SiteHeader />
        <div id="conteudo-principal" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
        <ToastViewport />
        <TrackEvent />
      </div>
    </CartCatalogProvider>
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-[rgb(var(--fg))] text-white">
      <Container className="flex min-h-10 items-center justify-center gap-2 py-2 text-center text-xs font-bold tracking-wide sm:text-sm">
        <BookOpenCheck aria-hidden="true" className="size-4 shrink-0 text-[rgb(var(--sun))]" />
        <span className="min-w-0 leading-4">
          Loja credenciada para o Kit Escolar da Prefeitura de São Paulo
        </span>
      </Container>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))]/94 backdrop-blur-xl">
      <Container size="wide" className="flex min-h-20 items-center gap-5 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-xl"
          aria-label="Página inicial da Balaio de Gato"
        >
          <span className="relative size-11 overflow-hidden rounded-[14px] shadow-sm">
            <Image
              src="/brand/balaio-mark.svg"
              alt=""
              fill
              sizes="44px"
              className="object-contain"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-lg font-extrabold tracking-tight">
              Balaio de Gato
            </span>
            <span className="hidden text-[10px] font-bold tracking-[0.16em] text-[rgb(var(--muted))] uppercase sm:block">
              Papelaria &amp; material escolar
            </span>
          </span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAVIGATION.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[rgb(var(--fg))] transition hover:bg-[rgb(var(--surface-muted))]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <ButtonLink href="/products" size="md" className="hidden sm:inline-flex">
            Montar meu kit
          </ButtonLink>
          <CartButton />
          <MobileNav links={NAVIGATION} />
        </div>
      </Container>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <Container size="wide" className="py-14 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_0.8fr_1fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative size-12 overflow-hidden rounded-2xl">
                <Image src="/brand/balaio-mark.svg" alt="" fill sizes="48px" />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold">Balaio de Gato</p>
                <p className="text-xs font-semibold text-[rgb(var(--muted))]">
                  Todos os materiais, num só balaio
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[rgb(var(--muted))]">
              Escolha os materiais da lista e pague com o crédito do Kit Escolar da Prefeitura de
              São Paulo.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-extrabold">Explore</h2>
            <ul className="mt-2 text-sm font-semibold text-[rgb(var(--muted))]">
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
                  href="/products"
                >
                  Materiais
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
                  href="/#etapas"
                >
                  Ano ou etapa
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
                  href="/programa"
                >
                  Como funciona
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-[rgb(var(--sage-soft))] p-6 text-[rgb(var(--sage-ink))]">
            <h2 className="text-sm font-extrabold">Informação oficial</h2>
            <p className="mt-3 text-sm leading-6">
              Consulte saldo, prazos e regras no site da Prefeitura de São Paulo.
            </p>
            <a
              href="https://educacao.sme.prefeitura.sp.gov.br/kit-escolar/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold underline decoration-current/30 underline-offset-4"
            >
              Ver informações oficiais
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-[rgb(var(--border))] pt-8 text-xs text-[rgb(var(--muted))] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Balaio de Gato.</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link
              className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
              href="/privacy"
            >
              Privacidade
            </Link>
            <Link
              className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
              href="/terms"
            >
              Termos
            </Link>
          </div>
        </div>
        <p className="mt-5 max-w-4xl text-[11px] leading-5 text-[rgb(var(--muted))]">
          Este é o site da loja Balaio de Gato. Saldo, cadastro e regras do Kit Escolar devem ser
          consultados nos canais da Prefeitura de São Paulo.
        </p>
      </Container>
    </footer>
  );
}
