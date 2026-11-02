import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PageMeta } from '@/lib/api';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  /** Singular noun for the count line, e.g. "doctor". */
  noun: string;
  disabled?: boolean;
}

export function Pagination({ meta, onPageChange, noun, disabled }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4">
      <p className="tabular text-[13px] text-ink-muted" aria-live="polite">
        Showing {from}–{to} of {total} {total === 1 ? noun : `${noun}s`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="tint"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Prev
        </Button>
        <span className="tabular min-w-[4.5rem] text-center text-[13px] text-ink-muted">
          {page} / {totalPages}
        </span>
        <Button
          variant="tint"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
