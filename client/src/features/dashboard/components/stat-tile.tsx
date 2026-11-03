'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const fmt = new Intl.NumberFormat('en-GB');

/** Counts up to `value` (from the previous value when it changes). Instant with reduced motion. */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => fmt.format(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <motion.span>{text}</motion.span>;
}

interface Delta {
  current: number;
  previous: number;
  /** "previous 30 days" */
  against: string;
  /** Neither direction is good or bad (e.g. doctors added): no green/red. */
  neutral?: boolean;
}

function DeltaLine({ current, previous, against, neutral }: Delta) {
  const diff = current - previous;
  // Icon + words + color: direction is never carried by color alone.
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
  const tone = neutral || diff === 0 ? 'text-ink-muted' : diff > 0 ? 'text-success-700' : 'text-danger-700';
  const amount =
    previous > 0
      ? `${Math.abs(Math.round((diff / previous) * 100))}%`
      : `${Math.abs(diff)}`;
  const word = diff > 0 ? 'up' : diff < 0 ? 'down' : null;

  return (
    <p className="mt-2 flex items-center gap-1.5 text-[13px]">
      <span className={cn('inline-flex items-center gap-1 font-medium', tone)}>
        <Icon className="size-3.5" aria-hidden />
        {word ? `${amount} ${word}` : 'No change'}
      </span>
      <span className="text-ink-muted">vs {against}</span>
    </p>
  );
}

interface Props {
  label: string;
  value: number;
  hint?: string;
  delta?: Delta;
}

export function StatTile({ label, value, hint, delta }: Props) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <p className="text-[13px] text-ink-muted">{label}</p>
      {/* Proportional figures for big standalone numbers (tabular is for columns). */}
      <p className="mt-1.5 text-[34px] font-semibold leading-none tracking-tight" aria-label={`${label}: ${fmt.format(value)}`}>
        <CountUp value={value} />
      </p>
      {delta ? <DeltaLine {...delta} /> : hint ? <p className="mt-2 text-[13px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}
