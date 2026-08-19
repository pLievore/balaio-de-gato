import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPanelProductDetail } from '../../../../src/lib/panel/products';
import { PageHeader, StatusPill } from '../../_components/ui';
import { ProductEditor } from './product-editor';

export const metadata: Metadata = { title: 'Edit product — 801 Outlet Panel' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getPanelProductDetail(id);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CATALOG"
        title="Edit"
        titleAccent="product"
        subtitle={product.title}
        back={{ href: '/admin/products', label: 'Back to products' }}
        actions={<StatusPill status={product.status} />}
      />
      <ProductEditor product={product} />
    </div>
  );
}
