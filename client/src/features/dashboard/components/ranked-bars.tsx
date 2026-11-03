import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BarRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  /** Link target for the label (optional). */
  href?: string;
  /** De-emphasised row (e.g. "All other doctors"): gray bar instead of the accent. */
  muted?: boolean;
}

/**
 * Ranked horizontal bars: one hue, largest first, value at the tip, one shared baseline.
 * Marks follow the dataviz spec: <= 24px thick, 4px rounded data-end, square at the baseline,
 * grows from a single baseline. Plain HTML, so it is a real list for assistive tech, and the
 * value is always printed (a tooltip is never the only way to read it).
 */
export function RankedBars({ rows, unit }: { rows: BarRow[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        const label = (
          <>
            <span className="block truncate text-sm">{r.label}</span>
            {r.sublabel && <span className="block truncate text-xs text-ink-muted">{r.sublabel}</span>}
          </>
        );
        return (
          <li key={r.key} className="group grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]" title={`${r.label}: ${r.value} ${unit}`}>
            {r.href ? (
              <Link href={r.href} className="min-w-0 rounded-input hover:text-primary-700">
                {label}
              </Link>
            ) : (
              <div className="min-w-0">{label}</div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="h-5 min-w-0 flex-1">
                <div
                  className={cn(
                    'h-5 rounded-r-[4px] transition-[width,filter] duration-500 motion-reduce:transition-none group-hover:brightness-110',
                    r.muted ? 'bg-line-strong' : 'bg-primary-600',
                  )}
                  style={{ width: r.value > 0 ? `max(4px, ${pct}%)` : 0 }}
                />
              </div>
              <span className="tabular w-9 shrink-0 text-right font-mono text-[13px]">{r.value}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
