import { z } from 'zod';

export const DASHBOARD_RANGES = [7, 30, 90] as const;

export const statsQuery = z.object({
  days: z.coerce
    .number()
    .refine((v) => (DASHBOARD_RANGES as readonly number[]).includes(v), 'days must be 7, 30 or 90')
    .default(30),
});

export type StatsQuery = z.infer<typeof statsQuery>;
