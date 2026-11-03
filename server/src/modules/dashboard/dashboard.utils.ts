const DAY_MS = 86_400_000;

export const startOfUtcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * Period bounds in UTC days. The period is the last `days` days INCLUDING today;
 * the previous period is the `days` days right before it (used for the delta on stat tiles).
 */
export function periodBounds(days: number, now = new Date()) {
  const from = new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  return { from, prevFrom };
}

/** Turn sparse per-day counts into one entry for every day of the period (missing days = 0). */
export function fillDays(rows: { _id: string; count: number }[], from: Date, days: number) {
  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(from.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, count: byDay.get(date) ?? 0 };
  });
}
