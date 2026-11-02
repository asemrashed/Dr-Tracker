'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/shared/logo';
import type { UserRole } from '@/features/auth/api';
import { NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: UserRole;
  /** Mobile drawer state. On desktop the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close the drawer on navigation, on Escape, and lock page scroll while it is open.
  useEffect(onClose, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <>
      {/* Scrim (mobile only) */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-night/60 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-night text-on-night transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0 shadow-float' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo tone="dark" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-11 items-center justify-center rounded-full text-on-night-muted hover:bg-white/5 hover:text-on-night lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.filter((item) => item.roles.includes(role)).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-on-night-muted hover:bg-white/5 hover:text-on-night',
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <p className="px-5 py-5 text-xs text-on-night-muted">v0.1 · Admin portal</p>
      </aside>
    </>
  );
}
