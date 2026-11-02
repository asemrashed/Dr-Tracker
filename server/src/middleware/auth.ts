import type { RequestHandler } from 'express';
import { AuthPayload, verifyToken } from '../modules/auth/token';
import { AppError } from '../shared/AppError';
import { AUTH_COOKIE_NAME, LOGIN_ENABLED_ROLES, UserRole } from '../shared/constants';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthPayload;
  }
}

/**
 * Authentication: every protected route requires a valid session cookie.
 * This is the REAL security check. The Next.js middleware only redirects for UX.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME];
  if (!token) return next(AppError.unauthorized());

  try {
    const auth = verifyToken(token);
    // A role whose portal is disabled can never use a previously issued token.
    if (!LOGIN_ENABLED_ROLES.includes(auth.role)) {
      return next(AppError.forbidden('This portal is not available yet', 'ROLE_NOT_ENABLED'));
    }
    req.auth = auth;
    next();
  } catch {
    next(AppError.unauthorized('Session is invalid or has expired'));
  }
};

/** Authorization: restrict a route to specific roles. Use after requireAuth. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(AppError.forbidden());
    next();
  };
