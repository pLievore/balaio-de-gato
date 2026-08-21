import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderLookupForm } from '../../components/shop/order-lookup-form';
import { Container } from '../../components/ui/container';
import { isOrderCode } from '../../../src/lib/orders/order';

export const metadata: Metadata = {
  title: 'Acompanhar pedido',
  description:
    'Consulte a situação do seu pedido na Balaio de Gato com o código recebido na confirmação.',
  alternates: { canonical: '/pedido' },
};

/**
 * Porta de entrada para acompanhar um pedido.
 *
 * Antes desta página o código do pedido só servia se a pessoa ainda tivesse o
 * e-mail em mãos: não havia link no site nem campo para digitar o código, e
 * quem anotou "BG-K7M2QX" num papel precisaria adivinhar a URL.
 *
 * `?codigo=` deixa a página do pedido mandar alguém para cá já com o código
 * preenchido, quando falta só a chave de acompanhamento.
 */
export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams?: Promise<{ codigo?: string }>;
}) {
  const { codigo } = (await searchParams) ?? {};
  const codigoInicial =
    typeof codigo === 'string' && isOrderCode(codigo.trim().toUpperCase())
      ? codigo.trim().toUpperCase()
      : '';

  return (
    <main>
      <Container size="narrow" className="py-14 md:py-20">
        <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
          Acompanhamento
        </p>
        <h1 className="font-display mt-3 text-4xl leading-[1.05] font-extrabold md:text-5xl">
          Onde está o meu pedido?
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[rgb(var(--muted))] md:text-base">
          Informe o código que você recebeu ao enviar o pedido. Se tiver também a chave de
          acompanhamento, cole-a para ver o pedido completo.
        </p>

        <OrderLookupForm codigoInicial={codigoInicial} />

        <div className="mt-12 rounded-3xl border border-[rgb(var(--border))] bg-white p-6">
          <h2 className="text-sm font-extrabold">Perdeu o código?</h2>
          <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">
            Ele está no e-mail de confirmação, que chega logo depois do envio do pedido. Se não
            encontrar, fale com a loja: com o CPF do responsável nós localizamos o pedido no
            atendimento.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex min-h-11 items-center text-xs font-extrabold text-[rgb(var(--accent))] underline decoration-current/25 underline-offset-4"
          >
            Voltar aos materiais
          </Link>
        </div>
      </Container>
    </main>
  );
}
