import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';

import { CATEGORIES } from '../../src/lib/catalog/categories';
import { getFeaturedProducts } from '../../src/lib/catalog/repository';
import {
  EDUCATION_STAGES,
  MATERIAL_ESCOLAR_YEAR,
  formatBRL,
} from '../../src/lib/program/material-escolar';
import HeroVideo from '../components/herovideo';
import { FadeIn, FadeMount, StaggerGrid, StaggerItem } from '../components/motion';
import { ProductCard } from '../components/shop/product-card';
import { ButtonLink } from '../components/ui/button';
import { Container } from '../components/ui/container';
import { Section } from '../components/ui/section';

/**
 * Home.
 *
 * A ordem das seções é o argumento: primeiro o que a loja é (hero), depois as
 * quatro promessas — uma vez só —, depois a mercadoria, e só então a pergunta
 * administrativa sobre a etapa do estudante. Perguntar o ano antes de mostrar
 * produto é pedir trabalho de quem ainda não sabe se quer ficar.
 */
export default async function HomePage() {
  const featured = await getFeaturedProducts(8);

  return (
    <main>
      <Hero />
      <TrustStrip />
      <Showcase products={featured} />
      <Stages />
      <HowItWorks />
      <FinalCta />
    </main>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-10 md:pt-16 md:pb-20">
      <div
        aria-hidden="true"
        className="absolute top-8 -left-28 -z-10 size-72 rounded-full bg-[rgb(var(--sun))]/18 blur-3xl"
      />
      <Container
        size="wide"
        className="grid items-center gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10"
      >
        <div className="contents lg:block lg:max-w-2xl">
          <div className="max-w-2xl">
            <FadeMount delay={0.04}>
              <p className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--sage-soft))] px-4 py-2 text-[11px] font-extrabold tracking-[0.11em] text-[rgb(var(--sage-ink))] uppercase sm:text-xs sm:tracking-[0.15em]">
                <Sparkles aria-hidden="true" className="size-4" />
                Material escolar do seu jeito
              </p>
            </FadeMount>

            <FadeMount delay={0.1}>
              {/* Tipografia fluida: a escala acompanha a largura em vez de saltar
                  nos breakpoints, e o título nunca quebra numa órfã. */}
              <h1 className="font-display mt-4 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.94] font-extrabold tracking-[-0.055em] text-balance sm:mt-6">
                Todos os materiais,
                <br />
                <span className="text-[rgb(var(--accent))]">num só balaio</span>
              </h1>
            </FadeMount>

            <FadeMount delay={0.18}>
              <p className="mt-4 max-w-xl text-base leading-7 text-[rgb(var(--muted))] sm:mt-6 md:text-lg">
                Escolha os materiais da lista e pague com o crédito do Kit Escolar da Prefeitura de
                São Paulo.
              </p>
            </FadeMount>
          </div>

          <FadeMount delay={0.25} className="order-3 lg:order-none">
            <div className="flex flex-col gap-3 sm:flex-row lg:mt-8">
              <ButtonLink href="/products" size="lg">
                Ver os materiais
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <ButtonLink href="/programa" variant="secondary" size="lg">
                Como usar o crédito
              </ButtonLink>
            </div>
            <p className="mt-5 flex max-w-lg items-start gap-2 text-xs leading-5 font-semibold text-[rgb(var(--muted))]">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[rgb(var(--sage-ink))]"
              />
              A loja nunca pede sua senha ou o código do cartão pelo site ou atendimento.
            </p>
          </FadeMount>
        </div>

        <FadeMount delay={0.12} distance={28} className="order-2 lg:order-none">
          <HeroVisual />
        </FadeMount>
      </Container>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <div
        aria-hidden="true"
        className="absolute -inset-5 -z-10 rounded-[3rem] bg-gradient-to-br from-[rgb(var(--coral))]/18 via-[rgb(var(--sun))]/14 to-[rgb(var(--sage))]/20 blur-2xl"
      />
      <div className="relative aspect-[16/10] overflow-hidden rounded-[2.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] shadow-[0_28px_80px_rgba(24,50,77,0.14)]">
        <HeroVideo />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(var(--fg))]/45 via-transparent to-white/5"
        />
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/20 bg-[rgb(var(--fg))]/80 px-4 py-2 text-xs font-extrabold tracking-[0.04em] text-white shadow-lg backdrop-blur-md sm:bottom-5 sm:left-5">
          Da lista para a sala de aula
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[2.2rem] ring-1 ring-white/20 ring-inset"
        />
      </div>
    </div>
  );
}

// ─── As quatro promessas, uma vez só ─────────────────────────────────────────

function TrustStrip() {
  const items = [
    { label: 'Compra online', detail: 'Escolha tudo pelo site', icon: BookOpen },
    { label: 'Use seu crédito', detail: 'Pague pelo Kit Escolar', icon: CreditCard },
    { label: 'A lista certa', detail: 'Para o ano do estudante', icon: PackageCheck },
    { label: 'Entrega grátis', detail: 'Nas compras com o crédito', icon: Truck },
  ];

  return (
    <FadeIn>
      <section
        aria-label="Como a loja funciona"
        className="border-y border-[rgb(var(--border))] bg-white/65"
      >
        <Container
          size="wide"
          className="grid grid-cols-2 gap-x-5 gap-y-7 py-9 lg:grid-cols-4 lg:gap-7"
        >
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]">
                <item.icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{item.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--muted))]">{item.detail}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>
    </FadeIn>
  );
}

// ─── A mercadoria ────────────────────────────────────────────────────────────

/**
 * Vitrine: um item de cada categoria.
 *
 * No celular é uma prateleira que rola na horizontal, com o próximo card
 * aparecendo pela borda — o gesto convida a continuar, e oito cards empilhados
 * virariam uma página de rolagem morta. No desktop vira grade, onde há largura
 * para os oito de uma vez.
 */
function Showcase({ products }: { products: Awaited<ReturnType<typeof getFeaturedProducts>> }) {
  if (products.length === 0) return null;

  return (
    <Section spacing="lg" className="overflow-x-clip">
      <Container size="wide">
        <FadeIn className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
              Materiais em destaque
            </p>
            <h2 className="font-display mt-3 max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] leading-[1.05] font-extrabold text-balance">
              Escolhas para o dia a dia escolar.
            </h2>
          </div>
          <ButtonLink href="/products" variant="secondary" size="md" className="shrink-0">
            Ver o catálogo
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </FadeIn>

        {/* As categorias entram como navegação, não como seção própria: são um
            atalho para o catálogo, e uma seção inteira só repetiria o pedido. */}
        <nav aria-label="Categorias" className="mt-7">
          <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
            {CATEGORIES.map((category) => (
              <li key={category.slug} className="shrink-0">
                <Link
                  href={`/products?categoria=${category.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-[rgb(var(--border))] bg-white px-4 text-sm font-bold transition hover:border-[rgb(var(--accent))]/50 hover:text-[rgb(var(--accent))]"
                >
                  {category.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="-mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
          {products.map((product) => (
            <li
              key={product.slug}
              className="w-[74%] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-auto"
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

// ─── A pergunta administrativa, depois da mercadoria ─────────────────────────

function Stages() {
  return (
    <Section id="etapas" spacing="lg" className="border-y border-[rgb(var(--border))] bg-white/55">
      <Container size="wide">
        <FadeIn className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
              Crédito por ano ou etapa
            </p>
            <h2 className="font-display mt-3 max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] leading-[1.05] font-extrabold text-balance">
              Qual é o ano do estudante?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[rgb(var(--muted))]">
              Escolher a etapa filtra o catálogo para o que está autorizado e mostra quanto crédito
              você tem para usar.
            </p>
          </div>
          <p className="self-start rounded-full border border-[rgb(var(--border))] bg-white px-4 py-2 text-xs font-bold text-[rgb(var(--muted))] md:shrink-0 md:self-auto">
            Valores oficiais de {MATERIAL_ESCOLAR_YEAR}
          </p>
        </FadeIn>

        {/* Duas colunas já no celular: são nove opções paralelas, e uma coluna
            só transformaria a escolha numa rolagem longa. */}
        <StaggerGrid className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
          {EDUCATION_STAGES.map((stage) => (
            <StaggerItem key={stage.slug} className="h-full">
              <Link
                href={`/products?etapa=${stage.slug}`}
                className="group flex h-full flex-col justify-between rounded-2xl border border-[rgb(var(--border))] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent))]/40 hover:shadow-[0_14px_36px_rgba(24,50,77,0.09)] sm:p-5"
              >
                <div>
                  <h3 className="font-display text-base leading-tight font-extrabold text-balance sm:text-lg">
                    {stage.shortName}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                    {stage.range}
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-2 border-t border-[rgb(var(--border))] pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold tracking-[0.12em] text-[rgb(var(--muted))] uppercase">
                      Crédito
                    </p>
                    <p className="tabular-nums-tight mt-0.5 text-base font-black sm:text-lg">
                      {formatBRL(stage.benefitAmountInCents)}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="mb-1 size-4 shrink-0 text-[rgb(var(--border-strong))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]"
                  />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGrid>

        <p className="mt-6 max-w-2xl text-xs leading-5 text-[rgb(var(--muted))]">
          Estes são os valores publicados pela Prefeitura para {MATERIAL_ESCOLAR_YEAR}. Consulte o
          saldo do estudante no aplicativo Kit Escolar.
        </p>
      </Container>
    </Section>
  );
}

// ─── O que é de fato desconhecido: o pagamento ───────────────────────────────

function HowItWorks() {
  const steps = [
    {
      title: 'Escolha os materiais',
      description: 'Monte o pedido com o que está na lista do estudante.',
    },
    {
      title: 'Envie o pedido',
      description: 'A loja confere os itens e a elegibilidade no programa.',
    },
    {
      title: 'Receba o link seguro',
      description: 'Um link chega por e-mail para pagar com o crédito.',
    },
    {
      title: 'Receba em casa',
      description: 'Entrega sem custo, no endereço do responsável.',
    },
  ];

  return (
    <section id="como-funciona" className="bg-[rgb(var(--fg))] text-white">
      <Container size="wide" className="py-14 md:py-20">
        <FadeIn>
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--sun))] uppercase">
            Como funciona
          </p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <h2 className="font-display max-w-xl text-[clamp(1.9rem,4.5vw,3rem)] leading-[1.05] font-extrabold text-balance">
              Da lista ao pagamento, sem complicação.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-white/70 lg:justify-self-end">
              Nenhum pagamento acontece no site. Você escolhe os materiais e recebe um link seguro
              para usar o crédito.
            </p>
          </div>
        </FadeIn>

        {/* Aqui a numeração diz algo verdadeiro: é uma sequência, e a ordem é
            exatamente a informação que falta para quem nunca usou o crédito. */}
        <StaggerGrid className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <StaggerItem key={step.title} className="h-full">
              <div className="flex h-full flex-col rounded-3xl border border-white/12 bg-white/7 p-6">
                <span
                  aria-hidden="true"
                  className="font-display text-3xl leading-none font-black text-[rgb(var(--sun))]"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-base font-extrabold">
                  <span className="sr-only">Passo {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{step.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGrid>

        <ButtonLink href="/programa" variant="secondary" size="lg" className="mt-9">
          Ver as regras do programa
          <ArrowRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </Container>
    </section>
  );
}

// ─── Fechamento ──────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <Section spacing="md">
      <Container>
        <FadeIn>
          <div className="relative overflow-hidden rounded-[2rem] bg-[rgb(var(--accent))] px-6 py-14 text-center text-white md:px-12 md:py-18">
            <div
              aria-hidden="true"
              className="absolute -top-14 -right-10 size-52 rounded-full border-[28px] border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -left-10 size-56 rounded-full bg-[rgb(var(--sun))]/35 blur-2xl"
            />
            <h2 className="font-display relative text-[clamp(1.9rem,5vw,3rem)] leading-[1.05] font-extrabold text-balance">
              Pronto para montar a lista?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-white/85">
              São {EDUCATION_STAGES.length} etapas atendidas, com entrega gratuita para quem compra
              pelo crédito do Kit Escolar.
            </p>
            <ButtonLink href="/products" variant="secondary" size="lg" className="relative mt-7">
              Ver os materiais
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </FadeIn>
      </Container>
    </Section>
  );
}
