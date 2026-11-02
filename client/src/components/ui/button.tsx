import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * Rule from DESIGN.md: one solid `primary` button per group. Everything else is `tint` or `ghost`.
 * Heights keep a 44px tap target on touch screens.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        tint: 'bg-primary-600/10 text-primary-700 hover:bg-primary-600/15 active:bg-primary-600/20',
        ghost: 'text-ink-muted hover:bg-ink/5 hover:text-ink active:bg-ink/10',
        danger: 'bg-danger-50 text-danger-700 hover:bg-danger-600/15',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        sm: 'h-9 px-4 text-[13px] max-md:h-11',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and blocks clicks. Use on every submit button. */
    loading?: boolean;
  };

export function Button({ className, variant, size, loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
