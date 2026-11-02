import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../../config/env';
import { AppError } from '../../shared/AppError';
import { AUTH_COOKIE_NAME } from '../../shared/constants';
import * as authService from './auth.service';
import { tokenMaxAgeMs } from './token';

/**
 * HttpOnly: not readable from JavaScript (blocks token theft via XSS).
 * SameSite=Lax: not sent on cross-site POSTs (CSRF defense). Works because the Next.js
 * rewrite makes API calls same-origin from the browser's point of view.
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { token, user } = await authService.login(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, { ...cookieOptions, maxAge: tokenMaxAgeMs });
  res.json({ data: { user } });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthorized();
  const user = await authService.getCurrentUser(req.auth.userId);
  res.json({ data: { user } });
}
