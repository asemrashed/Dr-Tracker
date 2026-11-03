'use client';

import { cn } from '@/lib/utils';
import { DASHBOARD_RANGES, type DashboardRange } from '../api';

interface Props {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
}

/** Date-range presets. Scopes the stat tiles and the time series below it. */
export function RangeToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Time range" className="inline-flex rounded-full bg-primary-600/10 p-1">
      {DASHBOARD_RANGES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(d)}
            className={cn(
              'h-11 rounded-full px-4 text-[13px] font-medium transition-colors md:h-8',
              active ? 'bg-primary-600 text-white' : 'text-primary-800 hover:bg-primary-600/10',
            )}
          >
            {d} days
          </button>
        );
      })}
    </div>
  );
}
