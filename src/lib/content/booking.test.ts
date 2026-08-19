import assert from 'node:assert/strict';
import test from 'node:test';

import { formatSlotForHumans, getBookingDays, isSlotAvailable, storeParts } from './booking';

// 2026-07-20 is a Monday. 18:00Z = 12:00 in Denver (MDT, UTC-6).
const MONDAY_NOON = new Date('2026-07-20T18:00:00Z');

test('reads wall-clock fields in store timezone, not UTC', () => {
  const parts = storeParts(MONDAY_NOON);
  assert.equal(parts.hour, 12);
  assert.equal(parts.weekday, 1);
  assert.equal(parts.day, 20);
});

test('offers only weekdays', () => {
  const days = getBookingDays(MONDAY_NOON);
  assert.ok(days.length > 0);
  for (const day of days) {
    const weekday = storeParts(new Date(`${day.date}T18:00:00Z`)).weekday;
    assert.ok(weekday >= 1 && weekday <= 5, `${day.date} should be a weekday`);
  }
});

test('drops slots inside the minimum lead time on the current day', () => {
  const days = getBookingDays(MONDAY_NOON);
  const today = days.find((day) => day.date === '2026-07-20');
  assert.ok(today);
  // Noon + 2h lead time: everything up to 13:30 is gone; 14:00 is the first.
  assert.equal(today.slots[0].value, '14:00');
  assert.ok(!today.slots.some((slot) => slot.value === '13:30'));
});

test('keeps the full day available for future dates', () => {
  const days = getBookingDays(MONDAY_NOON);
  const tuesday = days.find((day) => day.date === '2026-07-21');
  assert.ok(tuesday);
  assert.equal(tuesday.slots[0].value, '10:00');
  assert.equal(tuesday.slots[1].value, '10:30');
  assert.equal(tuesday.slots.at(-1)?.value, '19:00');
  // Half-hourly from 10:00 through 19:00.
  assert.equal(tuesday.slots.length, 19);
  assert.equal(tuesday.slots[1].label, '10:30 AM');
});

test('hides the current day entirely once it is too late to book', () => {
  // 2026-07-21T03:00Z = 21:00 Monday in Denver, past the last slot.
  const days = getBookingDays(new Date('2026-07-21T03:00:00Z'));
  assert.ok(!days.some((day) => day.date === '2026-07-20'));
});

test('slot validation mirrors the offered schedule', () => {
  assert.equal(isSlotAvailable('2026-07-21', '10:00', MONDAY_NOON), true);
  // Saturday is walk-in only.
  assert.equal(isSlotAvailable('2026-07-25', '10:00', MONDAY_NOON), false);
  // Outside opening hours.
  assert.equal(isSlotAvailable('2026-07-21', '21:00', MONDAY_NOON), false);
  // Already past on the current day.
  assert.equal(isSlotAvailable('2026-07-20', '10:00', MONDAY_NOON), false);
});

test('formats the slot without shifting the calendar day', () => {
  assert.equal(
    formatSlotForHumans('2026-07-21', '14:00'),
    'Tuesday, July 21 at 2:00 PM (Mountain Time)',
  );
  assert.equal(
    formatSlotForHumans('2026-07-21', '14:30'),
    'Tuesday, July 21 at 2:30 PM (Mountain Time)',
  );
});
