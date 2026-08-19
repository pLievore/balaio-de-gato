/**
 * Delivery terms — single source of truth.
 *
 * The delivery page, the delivery policy and the pickup policy all read from
 * here so a price never disagrees with itself across the site. These values
 * must also match the shipping rates configured in Shopify: the checkout
 * charges what Shopify has, not what this file says, so the two are changed
 * together (see `docs/10-decisoes-e-premissas.md`, D-021).
 */

import { formatUsdCents } from '../format';

export type DeliveryTier = {
  id: string;
  /** Must match the shipping rate name in the Shopify delivery profile. */
  name: string;
  priceCents: number;
  summary: string;
  includes: string[];
  featured?: boolean;
};

/** The three service levels offered at checkout, cheapest first. */
export const DELIVERY_TIERS: DeliveryTier[] = [
  {
    id: 'curbside',
    name: 'Curbside / garage',
    priceCents: 6000,
    summary:
      'We bring your furniture to your driveway, doorstep or garage — perfect if you have helping hands at home.',
    includes: ['Drop-off at curb, doorstep or garage', 'You handle placement'],
  },
  {
    id: 'inside-home',
    name: 'Inside home + setup',
    priceCents: 12000,
    summary:
      'We carry everything inside, place each piece in the room you choose, set it up and take the packaging with us.',
    includes: [
      'Carried inside on the ground floor',
      'Placed and set up in the room you choose',
      'Packaging removed',
    ],
    featured: true,
  },
  {
    id: 'upstairs',
    name: 'Upstairs / basement',
    priceCents: 15000,
    summary: 'Everything in the inside-home service, for a room up or down a flight of stairs.',
    includes: [
      'Inside-home delivery and setup',
      'Stairs to an upper floor or basement',
      'Packaging removed',
    ],
  },
];

/** Rush option added on top of any tier. */
export const EXPRESS_DELIVERY = {
  surchargeCents: 6000,
  /** Delivered within this many hours of the order being confirmed. */
  windowHours: 24,
  /** Suffix on the Shopify rate name — kept short, it shows at checkout. */
  name: 'Express 24h',
} as const;

/**
 * Standard deliveries run on a fixed weekly route rather than an open
 * calendar, which is what keeps the flat rates flat.
 */
export const DELIVERY_SCHEDULE = {
  days: 'Monday or Tuesday',
  window: 'the following week',
  summary: 'Standard deliveries run Monday or Tuesday of the following week.',
} as const;

/** Haul-away of the old piece. Always quoted before it is booked. */
export const SOFA_REMOVAL = {
  startingAtCents: 5000,
  requiresQuote: true,
} as const;

/** Flat rates cover this radius; beyond it, distance is charged per mile. */
export const DELIVERY_RADIUS = {
  flatRateMiles: 40,
  extraMileCents: 300,
  /** Charged the same distance-based way as the rest of Utah. */
  extendedStates: ['Wyoming', 'Idaho', 'Nevada'],
} as const;

export const DELIVERY_STATES = ['Utah', 'Wyoming', 'Idaho', 'Nevada'];

/** `6000` → `"$60"`. Thin wrapper so pages never touch cents directly. */
export function formatDeliveryPrice(cents: number): string {
  return formatUsdCents(cents);
}
