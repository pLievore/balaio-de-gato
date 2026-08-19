import type { NavigationLink } from '../../navigation/types';
import type { MenuQuery } from '../types/storefront.generated';

type GeneratedMenuItem = NonNullable<MenuQuery['menu']>['items'][number];
type ShopifyMenuItem = Pick<GeneratedMenuItem, 'id' | 'title' | 'type' | 'url'> & {
  items?: ShopifyMenuItem[];
};

const pageHandleOverrides: Record<string, string> = {
  contact: '/contact',
  'test-showroom-booking': '/showroom',
};

/**
 * Hosts whose links belong to this store and must resolve to storefront
 * routes. Shopify builds menu URLs from the shop's primary domain, which
 * after the cutover is `shop.801outlet.com` (kept only to host checkout),
 * so those links have to be rewritten instead of opening the legacy theme.
 */
function isStoreHost(hostname: string): boolean {
  return (
    hostname === '801outlet.com' ||
    hostname === 'www.801outlet.com' ||
    hostname === 'shop.801outlet.com' ||
    hostname.endsWith('.myshopify.com')
  );
}

export function normalizeShopifyMenuUrl(
  url: string | null | undefined,
  type: ShopifyMenuItem['type'],
) {
  if (type === 'FRONTPAGE') return { href: '/', external: false };
  if (type === 'CATALOG') return { href: '/products', external: false };

  let parsed: URL;
  try {
    parsed = new URL(url ?? '/', 'https://801outlet.com');
  } catch {
    return { href: '/', external: false };
  }

  if (!isStoreHost(parsed.hostname)) {
    return { href: parsed.toString(), external: true };
  }

  if (parsed.pathname.startsWith('/pages/')) {
    const handle = parsed.pathname.slice('/pages/'.length).replace(/\/$/, '');
    return {
      href: pageHandleOverrides[handle] ?? `/${handle}`,
      external: false,
    };
  }

  if (parsed.pathname === '/collections/all') {
    return { href: '/products', external: false };
  }

  return {
    href: `${parsed.pathname}${parsed.search}${parsed.hash}` || '/',
    external: false,
  };
}

export function adaptMenuItem(item: ShopifyMenuItem): NavigationLink {
  const normalized = normalizeShopifyMenuUrl(item.url, item.type);

  return {
    id: item.id,
    label: item.title,
    ...normalized,
    children: (item.items ?? []).map(adaptMenuItem),
  };
}

/**
 * The Delivery page exists only on the headless storefront, so the Shopify
 * menu cannot link to it. Insert it after Contact (falling back to just
 * before the showroom link, then to the end) unless the menu already has it.
 */
export function withDeliveryLink(links: NavigationLink[]): NavigationLink[] {
  if (links.some((link) => link.href === '/delivery')) return links;

  const deliveryLink: NavigationLink = {
    id: 'storefront-delivery',
    label: 'Delivery',
    href: '/delivery',
    external: false,
    children: [],
  };

  const contactIndex = links.findIndex((link) => link.href === '/contact');
  const showroomIndex = links.findIndex((link) => link.href === '/showroom');
  const insertAt =
    contactIndex >= 0 ? contactIndex + 1 : showroomIndex >= 0 ? showroomIndex : links.length;

  return [...links.slice(0, insertAt), deliveryLink, ...links.slice(insertAt)];
}
