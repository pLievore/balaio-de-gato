import { NextResponse } from 'next/server';

import {
  FUNNEL_STEPS,
  classifyTrafficSource,
  isFunnelStorageConfigured,
  recordFunnelStep,
  recordSessionContext,
  type FunnelStep,
} from '../../../src/lib/analytics/funnel';

export const runtime = 'nodejs';

const ALLOWED = new Set<string>(FUNNEL_STEPS);

/**
 * Coarse visitor location from Vercel's edge headers ("City, ST" for the US,
 * "City, CC" elsewhere). Nothing else about the request is kept — the IP
 * itself is never stored.
 */
function visitorLocation(headers: Headers): string | null {
  const rawCity = headers.get('x-vercel-ip-city');
  if (!rawCity) return null;

  let city = rawCity;
  try {
    city = decodeURIComponent(rawCity);
  } catch {
    // Keep the raw value if it is not URI-encoded.
  }
  city = city
    .replace(/[^\p{L}\p{N} .'-]/gu, '')
    .trim()
    .slice(0, 40);
  if (!city) return null;

  const region = (headers.get('x-vercel-ip-country-region') ?? '')
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 6);
  const country = (headers.get('x-vercel-ip-country') ?? '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase();

  const suffix = country === 'US' ? region : country;
  return suffix ? `${city}, ${suffix}` : city;
}

/**
 * First-party funnel beacon. Accepts one known step name and increments a
 * daily counter; session beacons additionally carry the referrer/UTM, which
 * is bucketed into a source label and discarded. Always answers 204 so a
 * storage outage never surfaces in the UI.
 */
export async function POST(request: Request) {
  if (!isFunnelStorageConfigured()) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = (await request.json()) as {
      step?: unknown;
      ref?: unknown;
      utm?: unknown;
    };
    if (typeof body.step !== 'string' || !ALLOWED.has(body.step)) {
      return new NextResponse(null, { status: 204 });
    }
    const step = body.step as FunnelStep;
    await recordFunnelStep(step);

    if (step === 'session') {
      const referrer = typeof body.ref === 'string' ? body.ref.slice(0, 300) : '';
      const utm = typeof body.utm === 'string' ? body.utm.slice(0, 60) : '';
      await recordSessionContext({
        source: classifyTrafficSource(referrer, utm),
        location: visitorLocation(request.headers),
      });
    }
  } catch {
    // Beacons are best-effort by design.
  }

  return new NextResponse(null, { status: 204 });
}
