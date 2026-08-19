/**
 * Reports and applies the Shopify shipping rates that back the checkout.
 *
 * The storefront advertises the delivery prices from
 * `src/lib/content/delivery.ts`, but the checkout charges whatever Shopify has
 * configured — so the two have to be kept in step deliberately (D-021).
 *
 *   npm run shipping:rates              # read-only report
 *   npm run shipping:rates -- --apply   # create/update the rates
 *   npm run shipping:rates -- --apply --zone=gid://shopify/DeliveryZone/123
 *
 * Requires read_shipping (and write_shipping to apply) on the app token.
 */

import { DELIVERY_TIERS, EXPRESS_DELIVERY } from '../src/lib/content/delivery';

const SHOP_DOMAIN = 'xwn9c1-m8.myshopify.com';
const API_VERSION = '2026-07';
const CURRENCY = 'USD';

async function adminGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not set');

  const response = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message).join('; ') ||
        `HTTP ${response.status}`
    );
  }
  if (!payload.data) throw new Error(`No data (HTTP ${response.status})`);
  return payload.data;
}

type PlannedRate = { name: string; amount: number };

/**
 * Shipping rates in Shopify are alternatives the customer picks between, not
 * add-ons that stack. Express therefore cannot be a "+$60 checkbox": each
 * service level needs its own express twin, priced at tier + surcharge.
 */
function plannedRates(): PlannedRate[] {
  return [
    ...DELIVERY_TIERS.map((tier) => ({
      name: tier.name,
      amount: tier.priceCents / 100,
    })),
    ...DELIVERY_TIERS.map((tier) => ({
      name: `${tier.name} - ${EXPRESS_DELIVERY.name}`,
      amount: (tier.priceCents + EXPRESS_DELIVERY.surchargeCents) / 100,
    })),
  ];
}

type MethodDefinition = {
  id: string;
  name: string;
  active: boolean;
  rateProvider:
    | {
        __typename: 'DeliveryRateDefinition';
        id: string;
        price: { amount: string; currencyCode: string };
      }
    | { __typename: 'DeliveryParticipant' };
};

type Zone = {
  zone: { id: string; name: string };
  methodDefinitions: { nodes: MethodDefinition[] };
};

type Profile = {
  id: string;
  name: string;
  default: boolean;
  profileLocationGroups: Array<{
    locationGroup: { id: string };
    locationGroupZones: { nodes: Zone[] };
  }>;
};

const PROFILES_QUERY = `
  query DeliveryProfiles {
    deliveryProfiles(first: 10) {
      nodes {
        id
        name
        default
        profileLocationGroups {
          locationGroup { id }
          locationGroupZones(first: 20) {
            nodes {
              zone { id name }
              methodDefinitions(first: 50) {
                nodes {
                  id
                  name
                  active
                  rateProvider {
                    __typename
                    ... on DeliveryRateDefinition {
                      id
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const UPDATE_PROFILE = `
  mutation UpdateProfile($id: ID!, $profile: DeliveryProfileInput!) {
    deliveryProfileUpdate(id: $id, profile: $profile) {
      profile { id }
      userErrors { field message }
    }
  }
`;

function priceOf(method: MethodDefinition): string | null {
  return method.rateProvider.__typename === 'DeliveryRateDefinition'
    ? method.rateProvider.price.amount
    : null;
}

function printPlan() {
  console.log('\nRates the storefront advertises (src/lib/content/delivery.ts):');
  for (const rate of plannedRates()) {
    console.log(`    - ${rate.name} — $${rate.amount.toFixed(2)}`);
  }
  console.log(
    '\nExpress is a twin of each tier rather than a stacking surcharge:\n' +
      'Shopify shipping rates are alternatives the customer chooses between,\n' +
      'so a "+$60 express" add-on does not exist at checkout.'
  );
}

function reportProfiles(profiles: Profile[]) {
  for (const profile of profiles) {
    console.log(
      `\nProfile: ${profile.name}${profile.default ? ' (default)' : ''}`
    );
    for (const group of profile.profileLocationGroups) {
      for (const zoneNode of group.locationGroupZones.nodes) {
        console.log(`  Zone: ${zoneNode.zone.name}  ${zoneNode.zone.id}`);
        for (const method of zoneNode.methodDefinitions.nodes) {
          const price = priceOf(method);
          console.log(
            `    - ${method.name} — ${price ? `$${price}` : 'carrier-calculated'}` +
              `${method.active ? '' : ' [inactive]'}`
          );
        }
      }
    }
  }
}

/**
 * Picks the zone to write into. Rates belong to a zone (a set of countries or
 * regions), and writing the local delivery prices into the wrong one would
 * quote $60 curbside to another state — so more than one candidate stops the
 * script instead of guessing.
 */
function selectZone(
  profiles: Profile[],
  requestedZoneId: string | undefined
): { profile: Profile; locationGroupId: string; zone: Zone } {
  const profile = profiles.find((entry) => entry.default) ?? profiles[0];
  if (!profile) throw new Error('The store has no delivery profile.');

  const candidates = profile.profileLocationGroups.flatMap((group) =>
    group.locationGroupZones.nodes.map((zone) => ({
      profile,
      locationGroupId: group.locationGroup.id,
      zone,
    }))
  );

  if (candidates.length === 0) {
    throw new Error(`Profile "${profile.name}" has no delivery zones.`);
  }

  if (requestedZoneId) {
    const chosen = candidates.find(
      (candidate) => candidate.zone.zone.id === requestedZoneId
    );
    if (!chosen) throw new Error(`Zone ${requestedZoneId} is not in this profile.`);
    return chosen;
  }

  if (candidates.length > 1) {
    console.error(
      `Profile "${profile.name}" has ${candidates.length} zones. Re-run with the` +
        ' one to write into, for example:'
    );
    for (const candidate of candidates) {
      console.error(
        `  npm run shipping:rates -- --apply --zone=${candidate.zone.zone.id}   # ${candidate.zone.zone.name}`
      );
    }
    process.exit(2);
  }

  return candidates[0];
}

async function apply(
  profiles: Profile[],
  requestedZoneId: string | undefined,
  deactivateNames: string[]
) {
  const { profile, locationGroupId, zone } = selectZone(profiles, requestedZoneId);
  const existing = zone.methodDefinitions.nodes;

  // Deactivated rather than deleted: turning a rate back on is one click in
  // Shopify, while recreating a deleted one is not.
  const toDeactivate = existing.filter(
    (method) =>
      method.active &&
      deactivateNames.some(
        (name) => name.trim().toLowerCase() === method.name.trim().toLowerCase()
      )
  );

  for (const name of deactivateNames) {
    const found = existing.some(
      (method) => method.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (!found) {
      console.error(`  warning: no rate named "${name}" in this zone.`);
    }
  }

  const toCreate: PlannedRate[] = [];
  const toUpdate: Array<{ method: MethodDefinition; rate: PlannedRate }> = [];

  for (const rate of plannedRates()) {
    const match = existing.find(
      (method) => method.name.trim().toLowerCase() === rate.name.toLowerCase()
    );
    if (!match) {
      toCreate.push(rate);
      continue;
    }
    const current = priceOf(match);
    if (current === null) {
      console.error(
        `  skipped "${rate.name}": it is carrier-calculated, not a flat rate.`
      );
      continue;
    }
    if (Number(current) !== rate.amount) toUpdate.push({ method: match, rate });
  }

  console.log(`\nZone: ${zone.zone.name} (profile "${profile.name}")`);
  if (toCreate.length === 0 && toUpdate.length === 0 && toDeactivate.length === 0) {
    console.log('Nothing to do: Shopify already matches the storefront.');
    return;
  }
  for (const rate of toCreate) {
    console.log(`  create  ${rate.name} — $${rate.amount.toFixed(2)}`);
  }
  for (const entry of toUpdate) {
    console.log(
      `  update  ${entry.rate.name} — $${priceOf(entry.method)} -> $${entry.rate.amount.toFixed(2)}`
    );
  }
  for (const method of toDeactivate) {
    console.log(`  disable ${method.name} — was $${priceOf(method) ?? '?'}`);
  }

  const data = await adminGraphql<{
    deliveryProfileUpdate: {
      userErrors: Array<{ field?: string[] | null; message: string }>;
    };
  }>(UPDATE_PROFILE, {
    id: profile.id,
    profile: {
      locationGroupsToUpdate: [
        {
          id: locationGroupId,
          zonesToUpdate: [
            {
              id: zone.zone.id,
              methodDefinitionsToCreate: toCreate.map((rate) => ({
                name: rate.name,
                active: true,
                rateDefinition: {
                  price: { amount: rate.amount, currencyCode: CURRENCY },
                },
              })),
              methodDefinitionsToUpdate: [
                ...toUpdate.map((entry) => ({
                  id: entry.method.id,
                  name: entry.rate.name,
                  active: true,
                  rateDefinition: {
                    price: { amount: entry.rate.amount, currencyCode: CURRENCY },
                  },
                })),
                ...toDeactivate.map((method) => ({
                  id: method.id,
                  name: method.name,
                  active: false,
                })),
              ],
            },
          ],
        },
      ],
    },
  });

  const errors = data.deliveryProfileUpdate.userErrors;
  if (errors.length > 0) {
    console.error('\nShopify rejected the update:');
    for (const error of errors) {
      console.error(`  ${error.field?.join('.') ?? ''} ${error.message}`);
    }
    process.exit(1);
  }

  console.log('\nApplied.');
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  const zoneArg = args.find((arg) => arg.startsWith('--zone='));
  const requestedZoneId = zoneArg?.slice('--zone='.length);
  const deactivateNames = args
    .filter((arg) => arg.startsWith('--deactivate='))
    .map((arg) => arg.slice('--deactivate='.length));

  let profiles: Profile[];
  try {
    const data = await adminGraphql<{ deliveryProfiles: { nodes: Profile[] } }>(
      PROFILES_QUERY
    );
    profiles = data.deliveryProfiles.nodes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Access denied')) throw error;

    console.error(
      'Cannot read delivery profiles: this app token lacks the shipping scopes.\n' +
        'Add read_shipping (plus write_shipping to apply changes) to the custom\n' +
        'app in Shopify Admin and reinstall it, or set the rates by hand under\n' +
        'Settings -> Shipping and delivery.'
    );
    printPlan();
    process.exit(2);
  }

  reportProfiles(profiles);
  printPlan();

  if (shouldApply) {
    await apply(profiles, requestedZoneId, deactivateNames);
  } else {
    console.log('\nRead-only. Re-run with --apply to write these to Shopify.');
  }
}

main().catch((error) => {
  console.error('failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
