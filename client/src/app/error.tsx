'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/error-state';

/** Last-resort boundary for pages outside the signed-in shell (e.g. login). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ErrorState title="Something went wrong" message="An unexpected error occurred. Please try again." onRetry={reset} />
      </div>
    </main>
  );
}
