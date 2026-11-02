import { cn } from '@/lib/utils';

/** Brand mark: a rounded square with a pulse line. Original artwork, no third-party logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[10px] bg-primary-600 text-white',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
      </svg>
    </span>
  );
}

export function Logo({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[17px] font-semibold tracking-tight', tone === 'dark' ? 'text-on-night' : 'text-ink')}>
        Doctor Tracker
      </span>
    </span>
  );
}
