import type { Metadata } from 'next';

import { PRODUCT_ATTRIBUTES } from '../../../../src/lib/catalog/attributes';
import { PageHeader } from '../../_components/ui';
import { ImportManager } from './import-manager';

export const metadata: Metadata = { title: 'Import products — 801 Outlet Panel' };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CATALOG"
        title="Import"
        titleAccent="spreadsheet"
        subtitle="Upload the CSV exported from this panel. Nothing is applied until you review and confirm."
        back={{ href: '/admin/products', label: 'Back to products' }}
      />

      <div className="max-w-3xl rounded-3xl border border-[rgb(var(--border))] bg-white p-6 text-sm">
        <h2 className="font-bold">How the spreadsheet works</h2>

        <dl className="mt-4 space-y-3 text-[rgb(var(--muted))]">
          <div>
            <dt className="font-semibold text-[rgb(var(--fg))]">Updating a product</dt>
            <dd className="text-xs leading-relaxed">
              Keep the <code>variant_id</code> that came with the export and edit any other column.
              You can also match by <code>sku</code> if the product already has one.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[rgb(var(--fg))]">Adding a product</dt>
            <dd className="text-xs leading-relaxed">
              Leave <code>variant_id</code> empty and fill in at least <code>product_title</code>{' '}
              and <code>price</code>. New products are created as <strong>drafts</strong> — add
              photos and publish them from the products list when they are ready.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[rgb(var(--fg))]">Columns</dt>
            <dd className="text-xs leading-relaxed">
              <code>product_title</code>, <code>sku</code>, <code>price</code>,{' '}
              <code>compare_at_price</code>, <code>quantity</code>, <code>description</code>,{' '}
              {PRODUCT_ATTRIBUTES.map((attribute) => (
                <code key={attribute.key}>{attribute.key} </code>
              ))}
              . Columns you leave out are not touched; an empty cell in a column you include clears
              that value.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[rgb(var(--fg))]">Status stays here</dt>
            <dd className="text-xs leading-relaxed">
              The <code>status</code> column is exported for reference but never applied —
              publishing or archiving a product is done in the panel, so nothing goes live from a
              spreadsheet by accident.
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-xl bg-[rgb(var(--surface-muted))] px-4 py-3 text-xs leading-relaxed">
          Working in Excel? Save as <strong>CSV UTF-8</strong>, and format the <code>sku</code>{' '}
          column as text — otherwise Excel turns codes with leading zeros into numbers.
        </p>
      </div>

      <ImportManager />
    </div>
  );
}
