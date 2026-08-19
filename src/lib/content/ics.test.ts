import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAppointmentInvite } from './ics';

const baseInput = {
  date: '2026-07-27',
  time: '10:30',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  storeEmail: 'support@801outlet.com',
  organizerEmail: 'orders@801outlet.com',
  uid: 'showroom-test@801outlet.com',
};

/** Reverses RFC 5545 line folding so assertions see whole property values. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, '');
}

test('builds a request invite in store wall time with a 1-hour alarm', () => {
  const ics = unfold(buildAppointmentInvite(baseInput));

  assert.match(ics, /METHOD:REQUEST/);
  assert.match(ics, /DTSTART;TZID=America\/Denver:20260727T103000/);
  assert.match(ics, /DTEND;TZID=America\/Denver:20260727T113000/);
  assert.match(ics, /TRIGGER:-PT1H/);
  assert.match(ics, /UID:showroom-test@801outlet\.com/);
  assert.match(ics, /mailto:jane@example\.com/);
  assert.match(ics, /mailto:support@801outlet\.com/);
  // CRLF line endings are mandatory for iCalendar.
  assert.ok(buildAppointmentInvite(baseInput).includes('\r\n'));
});

test('escapes attendee names and crosses the hour boundary correctly', () => {
  const ics = unfold(
    buildAppointmentInvite({
      ...baseInput,
      time: '18:30',
      customerName: 'Family; Reunion, LLC',
    }),
  );
  assert.match(ics, /DTEND;TZID=America\/Denver:20260727T193000/);
  assert.match(ics, /Family\\; Reunion\\, LLC/);
});
