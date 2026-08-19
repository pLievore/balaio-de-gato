import { ORDER_STATUS_LABEL, type OrderStatus } from '../../../src/lib/orders/order';

/**
 * Selo de situação do pedido.
 *
 * A cor agrupa por significado operacional, não por estética: âmbar é o que
 * espera alguém agir, verde é o que já foi pago e anda sozinho, cinza é
 * encerrado e vermelho é cancelado. Assim a lista se lê de relance.
 */
const TOM: Record<OrderStatus, string> = {
  draft: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--muted))]',
  awaiting_payment_link: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  payment_link_sent: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  manual_review: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
  paid: 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
  preparing: 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
  out_for_delivery: 'bg-[rgb(var(--blue-soft))] text-[rgb(var(--fg))]',
  delivered: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--fg))]',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${TOM[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
