import pino from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  // Never log credentials or session cookies.
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  transport: isProduction || env.NODE_ENV === 'test' ? undefined : { target: 'pino-pretty' },
});
