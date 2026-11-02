import { z } from 'zod';

/** Escape regex metacharacters so user input can never become a pattern (no injection, no ReDoS). */
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Normalized key stored next to the display name: lowercase, single spaces. */
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Prefix match on the normalized name. Anchored (^) regexes on an indexed field use the
 * index bounds, unlike contains-searches which scan the whole collection.
 */
export const namePrefixFilter = (search: string | undefined) =>
  search ? { nameLower: { $regex: `^${escapeRegex(normalizeName(search))}` } } : {};

/** `YYYY-MM-DD` filter bounds on createdAt. `to` is inclusive (end of that day, UTC). */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

export const dateRangeQuery = { from: dateOnly.optional(), to: dateOnly.optional() };

export const createdAtFilter = (from?: string, to?: string) => {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { $gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    },
  };
};

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectIdSchema });

/** Trimmed, length-bounded text field. */
export const text = (label: string, min = 2, max = 120) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

/** Digits with optional + ( ) - and spaces. Deliberately loose: real phone validation is locale-specific. */
export const phoneSchema = z
  .string({ required_error: 'Phone is required' })
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
