'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/error-state';

/** Catches render errors inside any signed-in page; the sidebar and topbar stay usable. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong on this page"
      message="An unexpected error occurred. Your data is safe. Try again, or use the menu to go elsewhere."
      onRetry={reset}
    />
  );
}
