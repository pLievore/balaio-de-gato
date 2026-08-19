'use client';

import { useEffect } from 'react';

import type { FunnelStep } from '../../src/lib/analytics/funnel';

/**
 * Fire-and-forget funnel beacon. Sends only the step name — no identifiers,
 * no cookies — so nothing here identifies the visitor.
 */
export function trackFunnelStep(step: FunnelStep, extra?: { ref?: string; utm?: string }): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({ step, ...extra });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

const SESSION_FLAG = 'ff_session';

/**
 * Counts one visit per browser session, plus an optional step for the page
 * it is mounted on.
 */
export function TrackEvent({ step }: { step?: FunnelStep }) {
  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem(SESSION_FLAG)) {
        window.sessionStorage.setItem(SESSION_FLAG, '1');
        // Referrer/UTM travel with the visit beacon so the panel can show
        // where visitors come from; the server buckets and discards them.
        const utm = new URLSearchParams(window.location.search).get('utm_source');
        trackFunnelStep('session', {
          ref: document.referrer.slice(0, 300),
          utm: utm ? utm.slice(0, 60) : undefined,
        });
      }
    } catch {
      // Private mode without sessionStorage: skip the visit counter rather
      // than counting every page view as a new visit.
    }

    if (step) trackFunnelStep(step);
  }, [step]);

  return null;
}
