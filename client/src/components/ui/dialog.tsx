'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  title: string;
  description?: string;
  /** `modal` is centered; `sheet` is a right-hand slide-over. */
  variant?: 'modal' | 'sheet';
  children: ReactNode;
}

/**
 * Radix handles focus trap/restore, Escape, scroll lock and aria roles.
 * Title is required (accessible name); pass `description` for the supporting line.
 */
export function DialogContent({
  title,
  description,
  variant = 'modal',
  className,
  children,
  onCloseAutoFocus,
  ...props
}: DialogContentProps) {
  // Radix returns focus to its <Trigger>. Our dialogs are opened from state (no Trigger), so
  // remember the opener while rendering for the first time (before focus moves in) and restore it.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : document.activeElement));

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-night/50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        // Radix warns when a Description is missing; opt out explicitly when none is given.
        {...(description ? {} : { 'aria-describedby': undefined })}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        }}
        className={cn(
          'fixed z-50 flex flex-col bg-surface shadow-float focus:outline-none',
          variant === 'modal' &&
            'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-card data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          variant === 'sheet' &&
            'inset-y-0 right-0 w-full max-w-[440px] data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-lg font-semibold leading-snug">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="-mr-2 -mt-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
