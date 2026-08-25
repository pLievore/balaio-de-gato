import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpenCheck, MapPin, Phone } from 'lucide-react';

import { env } from '../../src/config/env';
import { COMPANY, COMPANY_LOCATIONS } from '../../src/lib/content/company';
import type { NavigationLink } from '../../src/lib/navigation/types';
import { BrandMark, OFFICIAL_LOGO_PATH, OfficialBrandLogo } from '../components/brand-logo';
import { MobileNav } from '../components/mobile-nav';
import { TrackEvent } from '../components/track-event';
import { CartButton } from '../components/shop/cart-button';
import { ToastViewport } from '../components/shop/toast';
import { ButtonLink } from '../components/ui/button';
import { Container } from '../components/ui/container';

// Sem `force-dynamic`: o catálogo enxuto vem de cache com etiqueta, então
// páginas de texto continuam estáticas e as fichas de produto voltam a ser
// pré-renderizadas. O painel invalida a etiqueta quando grava.

const NAVIGATION: NavigationLink[] = [
  { id: 'materiais', label: 'Materiais', href: '/products', external: false, children: [] },
  { id: 'etapas', label: 'Ano ou etapa', href: '/#etapas', external: false, children: [] },
  { id: 'programa', label: 'Como funciona', href: '/programa', external: false, children: [] },
  { id: 'sobre', label: 'A papelaria', href: '/sobre', external: false, children: [] },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${env.siteUrl}/#store`,
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    taxID: COMPANY.taxId,
    foundingDate: COMPANY.foundedOn,
    description:
      'Papelaria com três endereços em São Paulo, ecommerce e credenciamento no Kit Escolar da SME/SP.',
    url: env.siteUrl,
    logo: `${env.siteUrl}${OFFICIAL_LOGO_PATH}`,
    image: `${env.siteUrl}${OFFICIAL_LOGO_PATH}`,
    telephone: COMPANY.phoneLabel,
    email: COMPANY.email,
    priceRange: 'R$',
    currenciesAccepted: 'BRL',
    areaServed: { '@type': 'City', name: 'São Paulo' },
    sameAs: [COMPANY.instagramHref, COMPANY.facebookHref],
    department: COMPANY_LOCATIONS.map((location) => ({
      '@type': 'Store',
      '@id': `${env.siteUrl}/sobre#${location.id}`,
      name: `${COMPANY.shortName} — ${location.name}`,
      url: `${env.siteUrl}/sobre#${location.id}`,
      telephone: location.phoneLabel,
      address: {
        '@type': 'PostalAddress',
        streetAddress: location.streetAddress,
        addressLocality: location.city,
        addressRegion: location.region,
        postalCode: location.postalCode,
        addressCountry: 'BR',
      },
    })),
  };

  return (
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
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-[rgb(var(--accent))] text-white">
      <Container className="flex min-h-10 items-center justify-center gap-2 py-2 text-center text-xs font-bold tracking-wide sm:text-sm">
        <BookOpenCheck aria-hidden="true" className="size-4 shrink-0 text-[rgb(var(--sun))]" />
        <span className="min-w-0 leading-4">
          Loja credenciada para Material Escolar e Uniforme da SME/SP
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
          <BrandMark className="size-11 rounded-[14px] shadow-sm" sizes="96px" />
          <span className="leading-tight">
            <span className="font-display block text-lg font-extrabold tracking-tight">
              Balaio de Gato
            </span>
            <span className="hidden text-[10px] font-bold tracking-[0.16em] text-[rgb(var(--muted))] uppercase sm:block">
              Papelaria Armazém
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
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.65fr_1.25fr] lg:gap-14">
          <div>
            <div className="max-w-[230px] overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-white p-2">
              <OfficialBrandLogo sizes="230px" />
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[rgb(var(--muted))]">
              Desde 2015, papelaria, presentes, artigos para festas, informática e serviços de
              impressão — nas lojas físicas e no ecommerce.
            </p>
            <a
              href={COMPANY.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[rgb(var(--accent))]"
            >
              <Phone aria-hidden="true" className="size-4" />
              {COMPANY.phoneLabel}
            </a>
          </div>

          <div>
            <h2 className="text-sm font-extrabold">Explore</h2>
            <ul className="mt-2 text-sm font-semibold text-[rgb(var(--muted))]">
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--accent))]"
                  href="/sobre"
                >
                  A papelaria e lojas
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--accent))]"
                  href="/products"
                >
                  Materiais
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--accent))]"
                  href="/#etapas"
                >
                  Ano ou etapa
                </Link>
              </li>
              <li>
                <Link
                  className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--accent))]"
                  href="/programa"
                >
                  Como funciona
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-extrabold">Nossas lojas</h2>
            <ul className="mt-3 space-y-3">
              {COMPANY_LOCATIONS.map((location) => (
                <li
                  key={location.id}
                  className="flex gap-2 text-xs leading-5 text-[rgb(var(--muted))]"
                >
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[rgb(var(--accent))]"
                  />
                  <span>
                    <span className="block font-extrabold text-[rgb(var(--fg))]">
                      {location.name}
                    </span>
                    {location.streetAddress}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/sobre#lojas"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-[rgb(var(--accent))]"
            >
              Ver endereços e rotas
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-[rgb(var(--border))] pt-8 text-xs text-[rgb(var(--muted))] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Balaio de Gato.</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link
              className="inline-flex min-h-11 items-center transition hover:text-[rgb(var(--fg))]"
              href="/pedido"
            >
              Acompanhar pedido
            </Link>
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
          consultados nos canais da Prefeitura de São Paulo.{' '}
          <a
            href={COMPANY.officialProgramHref}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline underline-offset-2"
          >
            Ver informações oficiais do programa
          </a>
          .
        </p>
      </Container>
    </footer>
  );
}
