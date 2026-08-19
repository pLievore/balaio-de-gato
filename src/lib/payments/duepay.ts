export const DUEPAY_CAPABILITIES = {
  mode: 'operator-assisted',
  createsLinkAutomatically: false,
  confirmsPaymentAutomatically: false,
  supportsWebhook: false,
} as const;

export type DuepayPaymentStatus =
  | 'not_started'
  | 'awaiting_link'
  | 'link_sent'
  | 'authorized'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'manual_review';

const ALLOWED_TRANSITIONS: Readonly<Record<DuepayPaymentStatus, readonly DuepayPaymentStatus[]>> = {
  not_started: ['awaiting_link', 'cancelled'],
  awaiting_link: ['link_sent', 'cancelled', 'manual_review'],
  link_sent: ['authorized', 'declined', 'expired', 'cancelled', 'manual_review'],
  authorized: ['refunded', 'manual_review'],
  declined: ['awaiting_link', 'cancelled'],
  expired: ['awaiting_link', 'manual_review', 'cancelled'],
  cancelled: ['manual_review'],
  refunded: ['manual_review'],
  manual_review: ['authorized', 'declined', 'cancelled', 'refunded'],
};

export function canTransitionDuepayPayment(
  current: DuepayPaymentStatus,
  next: DuepayPaymentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

/**
 * Referência pública enviada ao portal do provedor. Ela nunca contém CPF,
 * e-mail ou qualquer outro dado pessoal.
 */
export function createDuepayOrderReference({
  orderSequence,
  attempt = 1,
  year = new Date().getFullYear(),
}: {
  orderSequence: number;
  attempt?: number;
  year?: number;
}): string {
  if (!Number.isSafeInteger(orderSequence) || orderSequence < 1) {
    throw new Error('orderSequence must be a positive safe integer');
  }

  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be a positive safe integer');
  }

  if (!Number.isSafeInteger(year) || year < 2_000 || year > 9_999) {
    throw new Error('year must have four digits');
  }

  return `BG-${year}-${String(orderSequence).padStart(6, '0')}-A${attempt}`;
}
