'use client';

import { ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '../api';
import { DEMO_ACCOUNTS, type DemoAccount } from '../demo-accounts';

const ICONS: Record<UserRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  doctor: Stethoscope,
  patient: UserRound,
};

interface DemoAccessProps {
  activeRole: UserRole | null;
  busy: boolean;
  onSelect: (account: DemoAccount) => void;
}

/**
 * "Quick demo access" row. Disabled roles use aria-disabled (not the disabled attribute)
 * so keyboard and screen-reader users can still focus them and hear "coming soon".
 */
export function DemoAccess({ activeRole, busy, onSelect }: DemoAccessProps) {
  return (
    <section aria-labelledby="demo-heading" className="mt-8">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <h2 id="demo-heading" className="text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">
          Quick demo access
        </h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = ICONS[account.role];
          const active = activeRole === account.role;
          return (
            <button
              key={account.role}
              type="button"
              aria-disabled={!account.enabled || (busy && !active)}
              title={account.enabled ? `Sign in as ${account.email}` : `${account.label} portal is coming soon`}
              onClick={() => account.enabled && !busy && onSelect(account)}
              className={cn(
                'flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors',
                account.enabled
                  ? 'border-primary-200 bg-primary-50 text-primary-700 hover:border-primary-300 hover:bg-primary-100'
                  : 'cursor-not-allowed border-line bg-canvas text-ink-subtle',
                active && 'border-primary-600 bg-primary-100',
                busy && !active && account.enabled && 'opacity-60',
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              <span className="text-[13px] font-medium leading-none">{account.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10.5px] font-medium leading-4',
                  account.enabled ? 'bg-primary-600 text-white' : 'bg-line text-ink-muted',
                )}
              >
                {account.enabled ? (active ? 'Signing in' : 'One click') : 'Coming soon'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
