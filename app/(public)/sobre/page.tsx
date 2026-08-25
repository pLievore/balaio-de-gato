import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Gift,
  Instagram,
  Laptop,
  Mail,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Printer,
  Scissors,
  ShieldCheck,
} from 'lucide-react';

import { COMPANY, COMPANY_LOCATIONS } from '../../../src/lib/content/company';
import { BrandMark, OfficialBrandLogo } from '../../components/brand-logo';
import { FadeIn, FadeMount } from '../../components/motion';
import { ButtonLink } from '../../components/ui/button';
import { Container } from '../../components/ui/container';
import { Section } from '../../components/ui/section';

const PAGE_TITLE = 'Sobre a Balaio de Gato';
const PAGE_DESCRIPTION =
  'Conheça o Armazém Balaio de Gato e confira produtos, serviços, horários e os três endereços em São Paulo.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/sobre' },
  openGraph: {
    type: 'website',
    siteName: 'Balaio de Gato',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/sobre',
    locale: 'pt_BR',
    images: [
      {
        url: '/brand/balaio-de-gato.jpg',
        width: 2370,
        height: 1792,
        alt: 'Papelaria Armazém Balaio de Gato',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/brand/balaio-de-gato.jpg'],
  },
};

const HIGHLIGHTS = [
  { value: 'Desde 2015', label: 'em São Paulo' },
  { value: `${COMPANY_LOCATIONS.length} unidades`, label: 'na Zona Sul' },
  { value: 'Segunda a sábado', label: 'atendimento presencial' },
] as const;

const SERVICES = [
  { label: 'Material escolar e papelaria', icon: BookOpen },
  { label: 'Presentes', icon: Gift },
  { label: 'Artigos para festas', icon: PartyPopper },
  { label: 'Armarinho', icon: Scissors },
  { label: 'Informática', icon: Laptop },
  { label: 'Impressão, cópia e digitalização', icon: Printer },
] as const;

export default function AboutPage() {
  return (
    <main>
      <Hero />
      <Highlights />
      <CompanyOverview />
      <Locations />
      <ContactCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-10 md:py-16 lg:py-20">
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-20 size-80 rounded-full bg-[rgb(var(--sun))]/24 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-28 size-96 rounded-full bg-[rgb(var(--sage))]/16 blur-3xl"
      />

      <Container
        size="wide"
        className="relative grid min-w-0 items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14"
      >
        <FadeMount className="max-w-2xl min-w-0">
          <p className="inline-flex rounded-full bg-[rgb(var(--accent-soft))] px-4 py-2 text-xs font-extrabold tracking-[0.14em] text-[rgb(var(--accent))] uppercase">
            Desde 2015
          </p>
          <h1 className="font-display mt-5 text-[clamp(2.65rem,6.6vw,4.65rem)] leading-[0.96] font-extrabold tracking-[-0.05em] text-balance">
            Papelaria para escola, trabalho e dia a dia.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[rgb(var(--muted))] md:text-lg">
            Três endereços na Zona Sul, loja online e uma seleção que vai de material escolar a
            presentes e serviços de impressão.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#lojas" size="lg">
              Ver endereços
              <MapPin aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="/products" variant="secondary" size="lg">
              Comprar online
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </FadeMount>

        <FadeMount className="min-w-0">
          <figure className="relative mx-auto w-full max-w-[680px]">
            <div className="absolute -inset-4 -z-10 rotate-2 rounded-[2.75rem] bg-[rgb(var(--sun))]/22" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2.4rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] shadow-[0_28px_80px_rgba(62,43,36,0.16)]">
              <Image
                src="/brand/editorial/sobre-materiais.jpg"
                alt="Materiais escolares sendo organizados em uma mochila."
                fill
                priority
                quality={90}
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 680px, 52vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--fg))]/32 via-transparent to-white/5"
              />
              <div className="absolute right-4 bottom-4 w-[150px] rounded-2xl border border-white/70 bg-white/94 p-2.5 shadow-xl backdrop-blur sm:right-5 sm:bottom-5 sm:w-[185px]">
                <OfficialBrandLogo sizes="185px" className="rounded-xl" />
              </div>
            </div>
          </figure>
        </FadeMount>
      </Container>
    </section>
  );
}

function Highlights() {
  return (
    <section aria-label="A Balaio de Gato em resumo" className="bg-[rgb(var(--fg))] text-white">
      <Container size="wide">
        <dl className="grid py-2 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="px-4 py-5 text-center sm:my-5 sm:py-1 md:px-6 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-white/12"
            >
              <dt className="font-display text-xl font-black text-[rgb(var(--sun))] md:text-2xl">
                {item.value}
              </dt>
              <dd className="mt-1 text-xs font-semibold text-white/72 md:text-sm">{item.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function CompanyOverview() {
  return (
    <Section spacing="md">
      <Container size="wide" className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-18">
        <FadeIn className="max-w-xl">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Sobre a empresa
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,5vw,3.35rem)] leading-[1.02] font-extrabold text-balance">
            Papelaria, presentes e serviços.
          </h2>
          <p className="mt-6 text-base leading-7 text-[rgb(var(--muted))]">
            O Armazém Balaio de Gato começou em 2015 e hoje atende em três endereços na Zona Sul de
            São Paulo, além da loja online.
          </p>

          <div className="mt-7 border-l-2 border-[rgb(var(--accent))] pl-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[rgb(var(--accent))]"
              />
              <div>
                <p className="text-sm leading-6 text-[rgb(var(--fg))]">
                  Os três endereços constam nos portais oficiais da SME/SP como lojas credenciadas
                  para Material Escolar e Uniforme Escolar.
                </p>
                <Link
                  href="/programa"
                  className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-extrabold text-[rgb(var(--accent))]"
                >
                  Entenda como funciona
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-7 text-xs leading-5 text-[rgb(var(--muted))]">
            {COMPANY.legalName} · CNPJ {COMPANY.taxId}
          </p>
        </FadeIn>

        <div>
          <FadeIn>
            <h3 className="text-sm font-extrabold text-[rgb(var(--fg))]">
              Principais produtos e serviços
            </h3>
          </FadeIn>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {SERVICES.map((service, index) => (
              <FadeIn as="li" key={service.label} delay={index * 0.035} distance={12}>
                <div className="flex min-h-20 items-center gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4 text-sm font-bold shadow-[0_10px_30px_rgba(62,43,36,0.04)] transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_34px_rgba(62,43,36,0.08)]">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                    <service.icon aria-hidden="true" className="size-5" />
                  </span>
                  {service.label}
                </div>
              </FadeIn>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-[rgb(var(--muted))]">
            Consulte o atendimento para confirmar a disponibilidade do produto ou serviço.
          </p>
        </div>
      </Container>
    </Section>
  );
}

function Locations() {
  return (
    <Section
      id="lojas"
      spacing="lg"
      className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-white/58"
    >
      <Container size="wide">
        <FadeIn className="max-w-3xl">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Nossos endereços
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] font-extrabold text-balance">
            Três endereços em São Paulo.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted))] md:text-base">
            Confira telefone, horário e rota antes de visitar.
          </p>
        </FadeIn>

        <ul className="mt-9 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {COMPANY_LOCATIONS.map((location, index) => (
            <FadeIn as="li" key={location.id} delay={index * 0.06} distance={18} className="h-full">
              <article
                id={location.id}
                className="flex h-full scroll-mt-28 flex-col rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[0_16px_44px_rgba(62,43,36,0.07)] transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_22px_54px_rgba(62,43,36,0.11)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                    <MapPin aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-[11px] font-extrabold tracking-[0.14em] text-[rgb(var(--muted))] uppercase">
                    Endereço
                  </span>
                </div>

                <h3 className="font-display mt-6 text-xl font-extrabold">{location.name}</h3>
                <address className="mt-3 text-sm leading-6 text-[rgb(var(--muted))] not-italic">
                  {location.streetAddress}
                  <br />
                  {location.neighborhood ? `${location.neighborhood} · ` : ''}
                  {location.city}/{location.region}
                  <br />
                  CEP {location.postalCode}
                </address>

                <dl className="mt-6 space-y-4 border-t border-[rgb(var(--border))] pt-5">
                  <div>
                    <dt className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-[rgb(var(--muted))] uppercase">
                      <Phone aria-hidden="true" className="size-4 text-[rgb(var(--accent))]" />
                      Telefone
                    </dt>
                    <dd className="mt-1 pl-6">
                      <a
                        href={location.phoneHref}
                        className="inline-flex min-h-9 items-center text-sm font-extrabold text-[rgb(var(--accent))]"
                      >
                        {location.phoneLabel}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-[rgb(var(--muted))] uppercase">
                      <Clock3 aria-hidden="true" className="size-4 text-[rgb(var(--accent))]" />
                      Horário
                    </dt>
                    <dd className="mt-2 pl-6 text-xs leading-5 text-[rgb(var(--muted))]">
                      {location.hours.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto pt-6">
                  <a
                    href={location.mapHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--accent))] px-5 text-sm font-extrabold text-white transition hover:bg-[rgb(var(--accent-strong))]"
                    aria-label={`Abrir rota para ${location.name} no mapa`}
                  >
                    Como chegar
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </a>
                </div>
              </article>
            </FadeIn>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-5 text-[rgb(var(--muted))]">
          Em feriados, confirme o horário diretamente com a unidade antes da visita.
        </p>
      </Container>
    </Section>
  );
}

function ContactCta() {
  return (
    <Section id="contato" spacing="sm" className="scroll-mt-28">
      <Container>
        <FadeIn>
          <div className="relative overflow-hidden rounded-[2.25rem] bg-[rgb(var(--accent))] px-6 py-12 text-white md:px-12 md:py-16 [&_a:focus-visible]:outline-white">
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-14 size-56 rounded-full border-[30px] border-white/10"
            />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-2xl">
                <div className="flex items-center gap-4">
                  <BrandMark className="size-14 rounded-2xl ring-1 ring-white/20" sizes="120px" />
                  <span className="text-xs font-extrabold tracking-[0.16em] text-white uppercase">
                    Atendimento
                  </span>
                </div>
                <h2 className="font-display mt-6 text-[clamp(2rem,5vw,3.5rem)] leading-[1.02] font-extrabold text-balance">
                  Fale com a gente.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 md:text-base">
                  Confirme produtos e horários pelo WhatsApp da Unidade Sabará ou ligue para o
                  endereço que deseja visitar.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <a
                  href={COMPANY.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-[rgb(var(--accent))] transition hover:bg-[rgb(var(--accent-soft))]"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  WhatsApp da Unidade Sabará
                </a>
                <Link
                  href="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-6 text-sm font-extrabold text-white transition hover:bg-white/10"
                >
                  Comprar online
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>

            <div className="relative mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 pt-6 text-sm font-bold text-white/90">
              <a href={COMPANY.emailHref} className="inline-flex min-h-11 items-center gap-2">
                <Mail aria-hidden="true" className="size-4" />
                {COMPANY.email}
              </a>
              <a
                href={COMPANY.instagramHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2"
              >
                <Instagram aria-hidden="true" className="size-4" />
                Instagram
              </a>
              <a
                href={COMPANY.facebookHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2"
              >
                <ArrowUpRight aria-hidden="true" className="size-4" />
                Facebook
              </a>
            </div>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
