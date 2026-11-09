import { describe, expect, it } from 'vitest';
import { isValidBookingRange } from './bookingRules.js';

describe('isValidBookingRange', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('accepts a future range with an end after its start', () => {
    expect(isValidBookingRange(new Date('2026-01-10'), new Date('2026-02-10'), now)).toBe(true);
  });

  it('accepts a same-day move-in because booking dates have day precision', () => {
    expect(isValidBookingRange(new Date('2026-01-01'), new Date('2026-01-03'), now)).toBe(true);
  });

  it('rejects a past start date', () => {
    expect(isValidBookingRange(new Date('2025-12-31'), new Date('2026-02-10'), now)).toBe(false);
  });

  it('rejects an end date that is equal to or before the start date', () => {
    expect(isValidBookingRange(new Date('2026-01-10'), new Date('2026-01-10'), now)).toBe(false);
    expect(isValidBookingRange(new Date('2026-01-10'), new Date('2026-01-09'), now)).toBe(false);
  });
});
