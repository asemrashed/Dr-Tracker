'use client';

import { useEffect } from 'react';
import type { PageMeta } from './api';

/**
 * If the URL asks for a page past the end (a stale link, or the last item of the last page was just
 * deleted), move to the last page that exists instead of showing a misleading empty list.
 */
export function useClampPage(
  meta: PageMeta | undefined,
  page: number,
  settled: boolean,
  update: (patch: { page: number }) => void,
) {
  useEffect(() => {
    if (meta && settled && page > meta.totalPages) update({ page: meta.totalPages });
  }, [meta, page, settled, update]);
}
