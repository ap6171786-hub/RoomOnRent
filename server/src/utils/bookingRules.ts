export function isValidBookingRange(startDate: Date, endDate: Date, now = new Date()) {
  const firstAllowedDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return startDate.getTime() >= firstAllowedDate && endDate > startDate;
}
