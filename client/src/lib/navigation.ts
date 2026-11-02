import { LayoutDashboard, Stethoscope, Users, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@/features/auth/api';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that can see this item. Today only admin exists; this is the hook for RBAC later. */
  roles: readonly UserRole[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['admin'] },
  { href: '/patients', label: 'Patients', icon: Users, roles: ['admin'] },
];
