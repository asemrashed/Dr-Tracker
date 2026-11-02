'use client';

import { TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api';
import { handleSessionExpired } from '@/lib/session';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

/**
 * Authenticated layout. The user comes from GET /auth/me (the server is the source of truth).
 * While loading we show a skeleton of the real layout, so nothing jumps when data arrives.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, error, refetch, isFetching } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const sessionGone = error instanceof ApiError && (error.status === 401 || error.status === 403);
  useEffect(() => {
    if (sessionGone) void handleSessionExpired();
  }, [sessionGone]);

  if (!user) {
    if (error && !sessionGone) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-50 text-warning-700">
              <TriangleAlert className="size-6" aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-semibold">We couldn&apos;t load your session</h1>
            <p className="mt-1.5 text-sm text-ink-muted">{error.message}</p>
            <Button className="mt-5" onClick={() => refetch()} loading={isFetching}>
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return <ShellSkeleton />;
  }

  return (
    <div className="min-h-dvh">
      <Sidebar role={user.role} open={menuOpen} onClose={closeMenu} />
      <div className="lg:pl-[272px]">
        <Topbar user={user} onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="fixed inset-y-0 left-0 hidden w-[272px] bg-night lg:block" />
      <div className="lg:pl-[272px]">
        <div className="h-16 border-b border-line" />
        <div className="space-y-6 px-4 py-8 sm:px-8">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-line" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-line" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
