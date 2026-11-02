import { z } from 'zod';
import { PAGINATION } from './constants';

/** Reusable query fragment for every list endpoint: ?page=1&limit=10 */
export const paginationQuery = {
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
};

export const buildMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
