import { api } from '@/lib/api';
import type { LoginValues } from './schemas';

export type UserRole = 'admin' | 'doctor' | 'patient';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export const login = (values: LoginValues) =>
  api<{ user: AuthUser }>('/auth/login', { method: 'POST', json: values }).then((d) => d.user);

export const logout = () => api('/auth/logout', { method: 'POST' });

export const fetchMe = () => api<{ user: AuthUser }>('/auth/me').then((d) => d.user);
