import type { Metadata } from 'next';

import { formatPolicyDate } from '../../../src/lib/content/policies';
import { Container } from '../../components/ui/container';

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Como a loja Balaio de Gato usa e protege seus dados pessoais.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: 'Dados que usamos',
    body: 'Podemos usar nome, CPF do responsável, e-mail, telefone, endereço de entrega e informações do pedido. O site também registra dados básicos do acesso para funcionar com segurança.',
  },
  {
    title: 'Para que usamos',
    body: 'Usamos os dados para preparar o pedido, emitir a nota ou o cupom fiscal, organizar a entrega, prestar atendimento e cumprir a lei.',
  },
  {
    title: 'Com quem compartilhamos',
    body: 'Compartilhamos apenas o necessário com os serviços de pagamento, hospedagem, emissão fiscal e entrega. A loja Balaio de Gato não vende dados pessoais.',
  },
  {
    title: 'Como protegemos',
    body: 'Guardamos os dados pelo tempo necessário para atender o pedido e cumprir a lei. O acesso é limitado às pessoas e aos serviços que precisam dessas informações.',
  },
  {
    title: 'Seus direitos',
    body: 'Você pode pedir informações, acesso, correção ou exclusão de dados, conforme as regras da LGPD. Cada pedido será analisado de acordo com a lei.',
  },
] as const;

export default function PrivacyPage() {
  return (
    <main>
      <section className="border-b border-[rgb(var(--border))] bg-white/55">
        <Container className="py-12 md:py-16">
          <p className="text-xs font-extrabold tracking-[0.18em] text-[rgb(var(--accent))] uppercase">
            Privacidade e LGPD
          </p>
          <h1 className="font-display mt-3 text-4xl font-extrabold md:text-6xl">
            Seus dados são usados com cuidado.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
            Última atualização: {formatPolicyDate()}.
          </p>
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-[rgb(var(--border))] bg-white p-7"
            >
              <h2 className="text-lg font-extrabold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[rgb(var(--muted))]">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-4 rounded-3xl bg-[rgb(var(--fg))] p-7 text-white md:p-9">
          <h2 className="font-display text-2xl font-extrabold">Segurança no pagamento</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
            A loja não pede nem guarda sua senha ou o código do cartão. Nunca envie esses dados pelo
            site, chat ou atendimento.
          </p>
        </section>
      </Container>
    </main>
  );
}
