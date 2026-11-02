'use client';

import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/features/auth/api';
import { useLogout } from '@/features/auth/hooks';

const initials = (email: string) => email.slice(0, 2).toUpperCase();

export function Topbar({ user, onMenuClick }: { user: AuthUser; onMenuClick: () => void }) {
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="size-5" aria-hidden />
      </Button>

      {/* Spacer so the user area stays right-aligned on desktop. */}
      <span className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800"
            aria-hidden
          >
            {initials(user.email)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="max-w-[200px] truncate text-[13px] font-medium">{user.email}</p>
            <p className="text-xs capitalize text-ink-muted">{user.role}</p>
          </div>
        </div>
        <Button
          variant="tint"
          size="sm"
          onClick={() => logout.mutate()}
          loading={logout.isPending}
          aria-label="Sign out"
        >
          {!logout.isPending && <LogOut className="size-4" aria-hidden />}
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
