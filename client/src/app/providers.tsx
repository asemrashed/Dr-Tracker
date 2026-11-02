'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';
import { handleSessionExpired } from '@/lib/session';

/** A 401 from any data query means the session ended: clear the cookie and go to /login. */
const isSessionError = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.code === 'ROLE_NOT_ENABLED');

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isSessionError(error)) void handleSessionExpired();
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            // Login failures are shown inline by the form, so they must not trigger a redirect.
            if (mutation.options.mutationKey?.[0] === 'login') return;
            if (isSessionError(error)) void handleSessionExpired();
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every animation honor the OS "reduce motion" setting. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster position="bottom-right" closeButton />
    </QueryClientProvider>
  );
}
