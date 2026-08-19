'use client';

import { StorefrontRouteError } from '../../components/storefront-route-error';

export default function ProductsError({ reset }: { reset: () => void }) {
  return <StorefrontRouteError reset={reset} title="Não foi possível carregar os materiais" />;
}
