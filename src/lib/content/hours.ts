/**
 * Showroom hours — single source of truth for every surface that shows them.
 * Weekdays run by appointment; weekends are open for walk-ins.
 */
export type ShowroomHours = {
  days: string;
  time: string;
  mode: 'appointment' | 'walk-in';
};

export const SHOWROOM_HOURS: ShowroomHours[] = [
  { days: 'Monday – Friday', time: '10 AM – 8 PM', mode: 'appointment' },
  { days: 'Saturday', time: '10 AM – 8 PM', mode: 'walk-in' },
  { days: 'Sunday', time: '12 PM – 6 PM', mode: 'walk-in' },
];

/** Same hours in schema.org shape, for the storefront's structured data. */
export const SHOWROOM_HOURS_SCHEMA = [
  {
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '10:00',
    closes: '20:00',
  },
  { dayOfWeek: ['Sunday'], opens: '12:00', closes: '18:00' },
];

export const MODE_LABEL: Record<ShowroomHours['mode'], string> = {
  appointment: 'By appointment',
  'walk-in': 'Walk-ins welcome',
};

/** Compact one-line summary for tight spaces (footer, cards). */
export const HOURS_SUMMARY =
  'Mon – Fri: 10 AM – 8 PM (by appointment) · Sat: 10 AM – 8 PM · Sun: 12 PM – 6 PM (walk-ins)';

/**
 * Appointment slots (weekdays only — Sat/Sun are walk-in, see SHOWROOM_HOURS).
 * Every half hour from opening (10 AM) to one hour before close (7 PM),
 * expressed as minutes from midnight in store time.
 */
const FIRST_SLOT_MINUTES = 10 * 60;
const LAST_SLOT_MINUTES = 19 * 60;
const SLOT_STEP_MINUTES = 30;

export const APPOINTMENT_SLOT_MINUTES: number[] = Array.from(
  { length: (LAST_SLOT_MINUTES - FIRST_SLOT_MINUTES) / SLOT_STEP_MINUTES + 1 },
  (_, index) => FIRST_SLOT_MINUTES + index * SLOT_STEP_MINUTES,
);

/** "10:30 AM" from minutes since midnight. */
export function formatAppointmentTime(minutesFromMidnight: number): string {
  const hour24 = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}
