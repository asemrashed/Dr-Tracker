import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const inputClasses =
  'h-11 w-full rounded-input border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle focus-visible:border-primary-600 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary-600/30 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-subtle aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus-visible:outline-danger-600/30';

/** In React 19, `ref` is a normal prop, so react-hook-form's register() works directly. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}
