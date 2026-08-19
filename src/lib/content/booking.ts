import { APPOINTMENT_SLOT_MINUTES, formatAppointmentTime } from './hours';

export const STORE_TIME_ZONE = 'America/Denver';
/** How far ahead visitors may book. */
export const BOOKING_WINDOW_DAYS = 21;
/** Minimum notice so the team can confirm before the visit. */
export const MIN_LEAD_TIME_MINUTES = 120;

export type BookingSlot = {
  /** HH:mm in store time. */
  value: string;
  label: string;
};

export type BookingDay = {
  /** YYYY-MM-DD in store time. */
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  slots: BookingSlot[];
};

type StoreParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Wall-clock fields of an instant as seen in the store's timezone. */
export function storeParts(instant: Date): StoreParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(instant);

  const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    // Intl renders midnight as 24 in some ICU versions.
    hour: Number(lookup('hour')) % 24,
    minute: Number(lookup('minute')),
    weekday: WEEKDAY_INDEX[lookup('weekday')] ?? 0,
  };
}

function toDateKey({ year, month, day }: StoreParts): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Bookable weekday slots, skipping anything closer than the lead time.
 * Weekends are intentionally absent: the showroom takes walk-ins then.
 */
export function getBookingDays(now: Date = new Date()): BookingDay[] {
  const today = storeParts(now);
  const minutesNow = today.hour * 60 + today.minute;
  const days: BookingDay[] = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
    const instant = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const parts = storeParts(instant);
    const isWeekday = parts.weekday >= 1 && parts.weekday <= 5;
    if (!isWeekday) continue;

    const slots = APPOINTMENT_SLOT_MINUTES.filter((minutes) => {
      if (offset > 0) return true;
      return minutes >= minutesNow + MIN_LEAD_TIME_MINUTES;
    }).map((minutes) => ({
      value: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(
        2,
        '0',
      )}`,
      label: formatAppointmentTime(minutes),
    }));

    if (slots.length === 0) continue;

    days.push({
      date: toDateKey(parts),
      weekdayLabel: new Intl.DateTimeFormat('en-US', {
        timeZone: STORE_TIME_ZONE,
        weekday: 'short',
      }).format(instant),
      dayLabel: new Intl.DateTimeFormat('en-US', {
        timeZone: STORE_TIME_ZONE,
        month: 'short',
        day: 'numeric',
      }).format(instant),
      slots,
    });
  }

  return days;
}

/** Server-side guard: the pair must exist in the freshly computed schedule. */
export function isSlotAvailable(date: string, time: string, now: Date = new Date()): boolean {
  const day = getBookingDays(now).find((entry) => entry.date === date);
  return Boolean(day?.slots.some((slot) => slot.value === time));
}

export function formatSlotForHumans(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  // Noon UTC keeps the calendar date stable across US timezones.
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(instant);
  return `${dayLabel} at ${formatAppointmentTime(hour * 60 + minute)} (Mountain Time)`;
}
