/**
 * Minimal iCalendar builder for showroom appointment invites. The same event
 * (same UID) goes to the store and to the customer, so both calendars stay
 * in sync, with a display reminder one hour before the visit.
 */

const STORE_ADDRESS = '2251 South 400 East, South Salt Lake, UT 84115';

/** RFC 5545 text escaping: backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 74 octets with CRLF + space, per RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function icsStamp(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function buildAppointmentInvite(input: {
  /** YYYY-MM-DD in store time. */
  date: string;
  /** HH:mm in store time. */
  time: string;
  customerName: string;
  customerEmail: string;
  storeEmail: string;
  organizerEmail: string;
  /** Stable identifier so re-sends update instead of duplicating. */
  uid: string;
  durationMinutes?: number;
}): string {
  const [hours, minutes] = input.time.split(':').map(Number);
  const compactDate = input.date.replace(/-/g, '');
  const start = `${compactDate}T${String(hours).padStart(2, '0')}${String(minutes).padStart(
    2,
    '0',
  )}00`;
  const endTotal = hours * 60 + minutes + (input.durationMinutes ?? 60);
  const end = `${compactDate}T${String(Math.floor(endTotal / 60)).padStart(
    2,
    '0',
  )}${String(endTotal % 60).padStart(2, '0')}00`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//801 Outlet//Showroom Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    // America/Denver definition so every client agrees on the wall time.
    'BEGIN:VTIMEZONE',
    'TZID:America/Denver',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0600',
    'TZNAME:MDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART;TZID=America/Denver:${start}`,
    `DTEND;TZID=America/Denver:${end}`,
    `SUMMARY:${escapeText('Showroom visit — 801 Outlet')}`,
    `LOCATION:${escapeText(STORE_ADDRESS)}`,
    `DESCRIPTION:${escapeText(
      `Showroom appointment for ${input.customerName}.\n` +
        'Need to change or cancel? Text or call (801) 854-6060.\n' +
        'https://801outlet.com/showroom',
    )}`,
    `ORGANIZER;CN=801 Outlet:mailto:${input.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(
      input.customerName,
    )};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${input.customerEmail}`,
    `ATTENDEE;CN=801 Outlet Showroom;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${input.storeEmail}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT1H',
    `DESCRIPTION:${escapeText('801 Outlet showroom visit in 1 hour')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n') + '\r\n';
}
