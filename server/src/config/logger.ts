import pino from 'pino';
import { env, isProduction } from './env';

// In serverless/cloud environments (e.g. Vercel, AWS Lambda) or production,
// pino-pretty cannot and should not be used as a worker thread transport.
const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT);

const usePretty = !isProduction && env.NODE_ENV !== 'test' && !isServerless;

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  // Never log credentials or session cookies.
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  transport: usePretty ? { target: 'pino-pretty' } : undefined,
});
