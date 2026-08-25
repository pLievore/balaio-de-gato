import type { MetadataRoute } from 'next';

import { env } from '../src/config/env';
import { CATEGORIES } from '../src/lib/catalog/categories';
import { getAllProductSlugs } from '../src/lib/catalog/repository';
import { POLICY_LAST_UPDATED } from '../src/lib/content/policies';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, '');
  const now = new Date();
  const slugs = await getAllProductSlugs();

  return [
    { url: base, lastModified: now, priority: 1, changeFrequency: 'weekly' },
    { url: `${base}/products`, lastModified: now, priority: 0.9, changeFrequency: 'daily' },
    { url: `${base}/programa`, lastModified: now, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${base}/sobre`, lastModified: now, priority: 0.8, changeFrequency: 'monthly' },
    // A consulta de pedido é pública e útil de achar na busca. Os pedidos em
    // si (`/pedido/BG-XXXXXX`) continuam fora do índice, pelo robots e pelo
    // `robots: { index: false }` da própria página.
    { url: `${base}/pedido`, lastModified: now, priority: 0.5, changeFrequency: 'yearly' },

    // As categorias são filtros do catálogo, não rotas próprias — entram como
    // URLs canônicas de listagem porque é assim que as pessoas chegam nelas.
    ...CATEGORIES.map((category) => ({
      url: `${base}/products?categoria=${category.slug}`,
      lastModified: now,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
    })),

    ...slugs.map((slug) => ({
      url: `${base}/products/${slug}`,
      lastModified: now,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    })),

    {
      url: `${base}/privacy`,
      lastModified: POLICY_LAST_UPDATED,
      priority: 0.3,
      changeFrequency: 'yearly',
    },
    {
      url: `${base}/terms`,
      lastModified: POLICY_LAST_UPDATED,
      priority: 0.3,
      changeFrequency: 'yearly',
    },
  ];
}
