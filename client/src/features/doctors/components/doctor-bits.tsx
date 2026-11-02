import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

export function DoctorAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary-800',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-800',
        className,
      )}
    >
      {children}
    </span>
  );
}
