/**
 * Availability states shown on the storefront.
 *
 * The operator asked to stop deleting products that run out: a sold piece
 * keeps its page, its photos and its search ranking, and tells the visitor
 * what to expect instead of 404-ing. Restocking it is then a stock edit
 * rather than a re-listing.
 */

export type AvailabilityState = 'in-stock' | 'sold-out' | 'coming-soon';

/**
 * Tag the operator puts on a product in Shopify to mark it as arriving soon.
 * Matched loosely so `coming-soon`, `Coming Soon` and `COMING SOON` all work —
 * tags are typed by hand and Shopify keeps their casing.
 */
const COMING_SOON_TAG = 'coming soon';

export type AvailabilityInput = {
  availableForSale: boolean;
  tags?: string[];
};

export type Availability = {
  state: AvailabilityState;
  /** Customer-facing label. */
  label: string;
  /** Whether the piece can be put in a cart right now. */
  purchasable: boolean;
};

const AVAILABILITY: Record<AvailabilityState, Availability> = {
  'in-stock': { state: 'in-stock', label: 'In stock', purchasable: true },
  'sold-out': { state: 'sold-out', label: 'Sold out', purchasable: false },
  'coming-soon': {
    state: 'coming-soon',
    label: 'Coming soon',
    purchasable: false,
  },
};

function hasComingSoonTag(tags: string[] | undefined): boolean {
  if (!tags?.length) return false;
  return tags.some((tag) => tag.trim().toLowerCase().replace(/[-_]/g, ' ') === COMING_SOON_TAG);
}

/**
 * Real stock always wins over the tag: if a piece marked "coming soon" turns
 * out to be in stock, we sell it rather than hiding it behind a label.
 */
export function getAvailability(product: AvailabilityInput): Availability {
  if (product.availableForSale) return AVAILABILITY['in-stock'];
  if (hasComingSoonTag(product.tags)) return AVAILABILITY['coming-soon'];
  return AVAILABILITY['sold-out'];
}
