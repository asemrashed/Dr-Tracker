import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  active: boolean;
  order: 'asc' | 'desc';
  onClick: () => void;
}

/** Column header button for server-side sorting. Pair the <th> with aria-sort. */
export function SortButton({ label, active, order, onClick }: Props) {
  const Icon = active ? (order === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 transition-colors hover:bg-ink/5 hover:text-ink',
        active && 'text-ink',
      )}
    >
      {label}
      <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
      <span className="sr-only">{active ? `, sorted ${order === 'asc' ? 'ascending' : 'descending'}` : ', click to sort'}</span>
    </button>
  );
}
