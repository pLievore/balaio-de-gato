import type { CategorySlug } from './product';

export type Category = {
  slug: CategorySlug;
  name: string;
  /** Nome curto para chips e filtros, onde o espaço é apertado. */
  shortName: string;
  description: string;
  /** Token de cor da marca que identifica a categoria em toda a interface. */
  tone: 'coral' | 'sun' | 'sage' | 'blue' | 'accent' | 'ink';
};

export const CATEGORIES: readonly Category[] = [
  {
    slug: 'cadernos',
    name: 'Cadernos e papéis',
    shortName: 'Cadernos',
    description: 'Cadernos, blocos e papéis para as atividades do dia a dia.',
    tone: 'blue',
  },
  {
    slug: 'escrita',
    name: 'Escrita',
    shortName: 'Escrita',
    description: 'Lápis, canetas, borrachas e apontadores.',
    tone: 'accent',
  },
  {
    slug: 'arte',
    name: 'Arte e criatividade',
    shortName: 'Arte',
    description: 'Cores, tintas, massas e materiais artísticos.',
    tone: 'sun',
  },
  {
    slug: 'organizacao',
    name: 'Organização',
    shortName: 'Organização',
    description: 'Mochilas, estojos, pastas e agendas.',
    tone: 'sage',
  },
  {
    slug: 'geometria',
    name: 'Geometria e medição',
    shortName: 'Geometria',
    description: 'Réguas, esquadros, compassos e transferidores.',
    tone: 'ink',
  },
  {
    slug: 'papelaria',
    name: 'Papelaria geral',
    shortName: 'Papelaria',
    description: 'Colas, tesouras, fitas e itens de apoio.',
    tone: 'coral',
  },
] as const;

const CATEGORY_BY_SLUG = new Map<string, Category>(
  CATEGORIES.map((category) => [category.slug, category]),
);

export function getCategory(slug: string | undefined): Category | undefined {
  if (!slug) return undefined;
  return CATEGORY_BY_SLUG.get(slug);
}

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_BY_SLUG.has(value);
}

/**
 * Classes de cor por categoria. Ficam centralizadas aqui para que um chip, um
 * card e um cabeçalho de categoria nunca discordem sobre o tom.
 */
export const CATEGORY_TONE_CLASSES: Record<Category['tone'], string> = {
  coral: 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]',
  sun: 'bg-[rgb(var(--sun-soft))] text-[rgb(var(--fg))]',
  sage: 'bg-[rgb(var(--sage-soft))] text-[rgb(var(--sage-ink))]',
  blue: 'bg-[rgb(var(--blue-soft))] text-[rgb(var(--fg))]',
  accent: 'bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))]',
  ink: 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--fg))]',
};
