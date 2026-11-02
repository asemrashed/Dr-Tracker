import rateLimit from 'express-rate-limit';

const tooMany = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

/** Broad protection for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many requests, please try again later'),
});

/**
 * Brute-force protection for login. Only FAILED attempts count, so repeated
 * successful demo logins from a shared network never lock reviewers out.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many failed login attempts, please try again in 15 minutes'),
});
