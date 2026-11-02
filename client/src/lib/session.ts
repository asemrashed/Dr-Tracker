import { api } from './api';

let handling = false;

/**
 * Called when the API says the session is gone (401) or not allowed (403 ROLE_NOT_ENABLED).
 * It first asks the server to clear the cookie, otherwise the proxy would see a stale cookie
 * on /login and bounce the user back to the app, creating a redirect loop.
 */
export async function handleSessionExpired() {
  if (handling || typeof window === 'undefined') return;
  handling = true;
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore: we are leaving anyway.
  } finally {
    window.location.replace('/login');
  }
}
