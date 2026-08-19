import type { Metadata } from 'next';
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
import { ButtonLink } from '../../components/ui/button';
import { Container } from '../../components/ui/container';

export const metadata: Metadata = {
  title: 'Como usar o crédito do Kit Escolar',
  description:
    'Veja como escolher os materiais e pagar com o crédito do Kit Escolar da Prefeitura de São Paulo.',
  alternates: { canonical: '/programa' },
};

const steps = [
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
      <section className="relative overflow-hidden border-b border-[rgb(var(--border))] bg-[rgb(var(--fg))] text-white">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-80 rounded-full border-[50px] border-white/5"
        />
        <Container size="wide" className="relative py-16 md:py-22">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--sun))] uppercase">
            Kit Escolar da Prefeitura
          </p>
          <h1 className="font-display mt-4 max-w-4xl text-4xl leading-tight font-extrabold md:text-6xl">
            Escolha os materiais e pague com o crédito do Kit Escolar.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
            A loja Balaio de Gato é credenciada pela Prefeitura de São Paulo. O Kit Escolar DUEPAY é
            o aplicativo onde você consulta seu crédito.
          </p>
        </Container>
      </section>

      <Container size="wide" className="py-14 md:py-18">
        <section aria-labelledby="passos-heading">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Passo a passo
          </p>
          <h2 id="passos-heading" className="font-display mt-3 text-3xl font-extrabold md:text-5xl">
            Comprar online é simples
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-3xl border border-[rgb(var(--border))] bg-white p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                    <step.icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-display text-2xl font-black text-[rgb(var(--border-strong))]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-2" aria-label="Regras importantes">
          <div className="rounded-3xl bg-[rgb(var(--sage-soft))] p-8 text-[rgb(var(--sage-ink))]">
            <BadgeCheck aria-hidden="true" className="size-8" />
            <h2 className="font-display mt-5 text-3xl font-extrabold">O que você pode comprar</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 font-semibold">
              <li>• Materiais que fazem parte da lista do estudante.</li>
              <li>• As quantidades permitidas para cada item.</li>
              <li>• Outros produtos devem ser comprados separadamente.</li>
            </ul>
          </div>
          <div
            id="entrega"
            className="rounded-3xl bg-[rgb(var(--sun-soft))] p-8 text-[rgb(var(--fg))]"
          >
            <Truck aria-hidden="true" className="size-8" />
            <h2 className="font-display mt-5 text-3xl font-extrabold">Entrega grátis</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 font-semibold">
              <li>• A família não paga pela entrega das compras feitas com o crédito.</li>
              <li>• Informe um endereço residencial ou comercial.</li>
              <li>• Escolas e unidades da Prefeitura não podem receber o pedido.</li>
            </ul>
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-[rgb(var(--border))] bg-white p-8 md:p-12">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Sua segurança
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold md:text-4xl">
            Proteja seus dados no pagamento.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--muted))]">
            Depois de enviar o pedido, você recebe um link seguro. Confira o nome da loja, os itens
            e o valor antes de pagar. Nunca envie sua senha ou o código do cartão pelo site, chat ou
            atendimento.
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
