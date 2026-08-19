/**
 * Customer-facing policy terms.
 *
 * The numbers here are contractual: they are what the store commits to in
 * writing, so they live in one place instead of being retyped into each page.
 * Changing a window or a fee is a business decision — confirm with the owners
 * before editing, and bump `POLICY_LAST_UPDATED` when you do.
 */

/**
 * Shown as "Last updated" on every policy page. Deliberately a fixed date and
 * not `new Date()`: a legal document that claims to have been updated today,
 * every day, tells the customer nothing and looks careless in a dispute.
 */
export const POLICY_LAST_UPDATED = new Date('2026-08-18T12:00:00Z');

/**
 * All sales are final — the owners' decision of 18 August 2026: no returns,
 * no exchanges and no refunds once a purchase is complete. It is why the site
 * pushes so hard on inspecting before buying: dimensions on every product
 * page, showroom visits, and photos or video on request.
 */
export const RETURN_POLICY = {
  allSalesFinal: true,
} as const;

export const PICKUP_POLICY = {
  /** Days the order is held at the showroom free of charge. */
  holdDays: 14,
} as const;

/** "18 de agosto de 2026" — formato usado nas páginas institucionais. */
export function formatPolicyDate(date: Date = POLICY_LAST_UPDATED): string {
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
