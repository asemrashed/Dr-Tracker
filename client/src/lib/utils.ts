import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and resolve Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Only allow same-site relative redirects (blocks open-redirect via ?next=https://evil.com). */
export function safeRedirectPath(value: string | undefined | null, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value === '/login') {
    return fallback;
  }
  return value;
}
