import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = 'dt_token';

/**
 * Next.js 16 "proxy" (formerly middleware). UX ONLY:
 *  - no session cookie on an app page  -> send to /login (remembering where they were going)
 *  - session cookie on /login          -> send to /dashboard
 *
 * This is NOT a security boundary. It cannot verify the token. Every API route
 * re-validates the JWT in Express (requireAuth), so a forged cookie shows an empty
 * shell at worst and never any data.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(AUTH_COOKIE);

  if (pathname === '/login') {
    return hasSession ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip the API rewrite, Next internals and files with an extension (images, fonts, favicon).
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
