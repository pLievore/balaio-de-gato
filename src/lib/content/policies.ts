/**
 * Data de vigência dos textos jurídicos.
 *
 * Fica em um lugar só porque as páginas institucionais e o sitemap precisam da
 * mesma data. Mexer nos termos é decisão de negócio: confirme com os donos e
 * atualize `POLICY_LAST_UPDATED` junto com o texto.
 */

/**
 * Shown as "Last updated" on every policy page. Deliberately a fixed date and
 * not `new Date()`: a legal document that claims to have been updated today,
 * every day, tells the customer nothing and looks careless in a dispute.
 */
export const POLICY_LAST_UPDATED = new Date('2026-08-18T12:00:00Z');

/** "18 de agosto de 2026" — formato usado nas páginas institucionais. */
export function formatPolicyDate(date: Date = POLICY_LAST_UPDATED): string {
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
