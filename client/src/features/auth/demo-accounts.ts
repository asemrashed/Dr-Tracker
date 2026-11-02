import type { UserRole } from './api';

/**
 * Demo logins shown on the login page.
 * Only the admin portal exists today. Doctor and patient accounts are seeded on the server
 * so the role model is real, but their buttons stay disabled until those portals are built.
 * To enable one later: set `enabled: true` here and add the role to LOGIN_ENABLED_ROLES on the server.
 */
export interface DemoAccount {
  role: UserRole;
  label: string;
  email: string;
  enabled: boolean;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'admin', label: 'Admin', email: 'admin@gmail.com', enabled: true },
  { role: 'doctor', label: 'Doctor', email: 'dr@gmail.com', enabled: false },
  { role: 'patient', label: 'Patient', email: 'patient@gmail.com', enabled: false },
];

/** Shared demo password, injected at build time. If either value is missing the section is hidden. */
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? '';
export const DEMO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true' && DEMO_PASSWORD.length > 0;
