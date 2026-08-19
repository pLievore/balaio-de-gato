import 'server-only';

import type { MenuQuery, MenuQueryVariables } from '../types/storefront.generated';
import { shopifyStorefrontRequest } from '../client';
import { shopifyCacheTags, shopifyMenuCacheTag } from '../constants';

export const MENU_QUERY = `#graphql
  query Menu($handle: String!) {
    menu(handle: $handle) {
      id
      handle
      title
      items {
        id
        resourceId
        tags
        title
        type
        url
        items {
          id
          resourceId
          tags
          title
          type
          url
          items {
            id
            resourceId
            tags
            title
            type
            url
          }
        }
      }
    }
  }
` as const;

export async function getMenu(handle: string) {
  const variables: MenuQueryVariables = { handle };
  const result = await shopifyStorefrontRequest<MenuQuery, MenuQueryVariables>(MENU_QUERY, {
    operationName: 'Menu',
    variables,
    next: {
      revalidate: 3_600,
      tags: [shopifyCacheTags.all, shopifyCacheTags.menus, shopifyMenuCacheTag(handle)],
    },
  });

  return result.data.menu;
}
