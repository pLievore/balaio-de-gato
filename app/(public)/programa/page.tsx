import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  FileText,
  LockKeyhole,
  PackageCheck,
  Truck,
} from 'lucide-react';

import { MATERIAL_ESCOLAR_SOURCE } from '../../../src/lib/program/material-escolar';
import { FadeIn, FadeMount, StaggerGrid, StaggerItem } from '../../components/motion';
import { ButtonLink } from '../../components/ui/button';
import { Container } from '../../components/ui/container';

const PAGE_TITLE = 'Como usar o crédito do Kit Escolar';
const PAGE_DESCRIPTION =
  'Veja como escolher os materiais e pagar com o crédito do Kit Escolar da Prefeitura de São Paulo.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/programa' },
  openGraph: {
    type: 'website',
    siteName: 'Balaio de Gato',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/programa',
    locale: 'pt_BR',
    images: [
      {
        url: '/brand/editorial/programa-compra.jpg',
        width: 1536,
        height: 1024,
        alt: 'Lista de materiais escolares sendo conferida ao lado de um celular.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/brand/editorial/programa-compra.jpg'],
  },
};

const STEPS = [
  {
    title: 'Escolha o ano ou a etapa',
    description: 'Veja a lista certa para o estudante.',
    icon: PackageCheck,
  },
  {
    title: 'Escolha os materiais',
    description: 'Adicione ao pedido somente o que precisa.',
    icon: FileText,
  },
  {
    title: 'Envie o pedido',
    description: 'A loja confere os itens e envia as instruções.',
    icon: CreditCard,
  },
  {
    title: 'Conclua o pagamento',
    description: 'Use o link seguro para pagar com o crédito.',
    icon: LockKeyhole,
  },
] as const;

export default function ProgramPage() {
  return (
    <main>
      <Hero />

      <Container size="wide" className="py-14 md:py-20">
        <section id="passos" className="scroll-mt-28" aria-labelledby="passos-heading">
          <FadeIn>
            <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
              Passo a passo
            </p>
            <h2
              id="passos-heading"
              className="font-display mt-3 text-3xl font-extrabold md:text-5xl"
            >
              Comprar online é simples.
            </h2>
          </FadeIn>

          <StaggerGrid className="mt-8 grid gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <StaggerItem key={step.title} className="h-full">
                <article className="flex h-full flex-col rounded-3xl border border-[rgb(var(--border))] bg-white p-7 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_38px_rgba(62,43,36,0.08)]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                      <step.icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-display text-2xl font-black text-[rgb(var(--border-strong))]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                    {step.description}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-2" aria-label="Regras importantes">
          <FadeIn className="h-full" distance={16}>
            <div className="h-full rounded-3xl bg-[rgb(var(--sage-soft))] p-8 text-[rgb(var(--sage-ink))]">
              <BadgeCheck aria-hidden="true" className="size-8" />
              <h2 className="font-display mt-5 text-3xl font-extrabold">O que você pode comprar</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 font-semibold">
                <li>• Materiais que fazem parte da lista do estudante.</li>
                <li>• As quantidades permitidas para cada item.</li>
                <li>• Outros produtos devem ser comprados separadamente.</li>
              </ul>
            </div>
          </FadeIn>
          <FadeIn className="h-full" delay={0.06} distance={16}>
            <div
              id="entrega"
              className="h-full scroll-mt-28 rounded-3xl bg-[rgb(var(--sun-soft))] p-8 text-[rgb(var(--fg))]"
            >
              <Truck aria-hidden="true" className="size-8" />
              <h2 className="font-display mt-5 text-3xl font-extrabold">Entrega grátis</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 font-semibold">
                <li>• A família não paga pela entrega das compras feitas com o crédito.</li>
                <li>• Informe um endereço residencial ou comercial.</li>
                <li>• Escolas e unidades da Prefeitura não podem receber o pedido.</li>
              </ul>
            </div>
          </FadeIn>
        </section>

        <FadeIn>
          <section className="mt-14 rounded-[2rem] border border-[rgb(var(--border))] bg-white p-8 md:p-12">
            <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
              Sua segurança
            </p>
            <h2 className="font-display mt-3 text-3xl font-extrabold md:text-4xl">
              Proteja seus dados no pagamento.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--muted))]">
              Depois de enviar o pedido, você recebe um link seguro. Confira o nome da loja, os
              itens e o valor antes de pagar. Nunca envie sua senha ou o código do cartão pelo site,
              chat ou atendimento.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/products" size="lg">
                Escolher materiais
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <a
                href={MATERIAL_ESCOLAR_SOURCE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgb(var(--border-strong))] bg-white px-7 py-3 text-sm font-extrabold transition hover:bg-[rgb(var(--surface-muted))]"
              >
                Ver site da Prefeitura
              </a>
            </div>
          </section>
        </FadeIn>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[rgb(var(--accent))]"
        >
          Voltar para a página inicial
        </Link>
      </Container>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[rgb(var(--border))] bg-[rgb(var(--fg))] text-white">
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 size-80 rounded-full border-[50px] border-white/5"
      />
      <Container
        size="wide"
        className="relative grid min-w-0 items-center gap-10 py-12 md:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:py-20"
      >
        <FadeMount className="max-w-2xl min-w-0">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--sun))] uppercase">
            Kit Escolar da Prefeitura
          </p>
          <h1 className="font-display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] leading-[0.98] font-extrabold text-balance">
            Use o crédito do Kit Escolar com segurança.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/78">
            Escolha os materiais pelo site. Depois da conferência, o pagamento é concluído pelo link
            seguro enviado pela loja.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/products" size="lg">
              Escolher materiais
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="#passos" variant="secondary" size="lg">
              Ver passo a passo
            </ButtonLink>
          </div>
        </FadeMount>

        <FadeMount className="min-w-0">
          <figure className="relative mx-auto w-full max-w-[680px]">
            <div className="absolute -inset-4 -z-10 rounded-[2.75rem] bg-[rgb(var(--sun))]/10 blur-xl" />
            <div className="relative aspect-[3/2] overflow-hidden rounded-[2.35rem] border border-white/12 bg-white/5 shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
              <Image
                src="/brand/editorial/programa-compra.jpg"
                alt="Lista de materiais escolares sendo conferida ao lado de um celular."
                fill
                priority
                quality={90}
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 680px, 52vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--fg))]/48 via-transparent to-white/5"
              />
              <figcaption className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-[rgb(var(--fg))]/82 px-4 py-2 text-xs font-extrabold text-white shadow-lg backdrop-blur sm:bottom-5 sm:left-5">
                Da lista ao pedido online
              </figcaption>
            </div>
          </figure>
        </FadeMount>
      </Container>
    </section>
  );
}
