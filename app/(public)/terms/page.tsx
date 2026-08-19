import type { Metadata } from 'next';
import Link from 'next/link';

import { MATERIAL_ESCOLAR_SOURCE } from '../../../src/lib/program/material-escolar';
import { formatPolicyDate } from '../../../src/lib/content/policies';
import { Container } from '../../components/ui/container';

export const metadata: Metadata = {
  title: 'Termos de uso e compra',
  description: 'Regras de uso e compra na loja Balaio de Gato.',
  alternates: { canonical: '/terms' },
};

const terms = [
  {
    title: 'Uso do site',
    body: 'Informe dados verdadeiros ao fazer o pedido. A compra é confirmada depois do pagamento e da conferência das informações.',
  },
  {
    title: 'Itens do Kit Escolar',
    body: 'O crédito do Kit Escolar só pode ser usado nos materiais da lista do estudante. Outros produtos precisam ficar em uma compra separada.',
  },
  {
    title: 'Preço e disponibilidade',
    body: 'Preço e estoque são confirmados antes do pagamento. Se algo mudar, a equipe entrará em contato.',
  },
  {
    title: 'Pagamento',
    body: 'Depois do pedido, enviamos um link seguro para o pagamento. A loja nunca pede sua senha ou o código do cartão pelo site, chat ou atendimento.',
  },
  {
    title: 'Nota ou cupom fiscal',
    body: 'A compra feita com o crédito terá nota ou cupom fiscal no CPF do responsável.',
  },
  {
    title: 'Entrega',
    body: 'A família não paga taxa de entrega nas compras feitas com o crédito. Informe um endereço residencial ou comercial; escolas e unidades da Prefeitura não podem receber o pedido.',
  },
] as const;

export default function TermsPage() {
  return (
    <main>
      <section className="border-b border-[rgb(var(--border))] bg-white/55">
        <Container className="py-12 md:py-16">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Uso e compra
          </p>
          <h1 className="font-display mt-3 text-4xl font-extrabold md:text-6xl">
            Regras simples para sua compra.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
            Última atualização: {formatPolicyDate()}.
          </p>
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {terms.map((term) => (
            <section
              key={term.title}
              className="rounded-3xl border border-[rgb(var(--border))] bg-white p-7"
            >
              <h2 className="text-lg font-extrabold">{term.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[rgb(var(--muted))]">{term.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-extrabold">
          <Link
            href="/programa"
            className="inline-flex min-h-11 items-center text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
          >
            Como usar o crédito
          </Link>
          <a
            href={MATERIAL_ESCOLAR_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-[rgb(var(--sage-ink))] underline decoration-current/25 underline-offset-4"
          >
            Ver site da Prefeitura
          </a>
        </div>
      </Container>
    </main>
  );
}
