import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { USER_ROLES } from '../../shared/constants';

const payloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export type AuthPayload = { userId: string; role: (typeof USER_ROLES)[number] };

const ALGORITHM = 'HS256' as const;

export const tokenMaxAgeMs = env.JWT_EXPIRES_IN_HOURS * 60 * 60 * 1000;

export function signToken(payload: AuthPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, {
    subject: payload.userId,
    algorithm: ALGORITHM,
    expiresIn: Math.floor(tokenMaxAgeMs / 1000),
  });
}

/** Verifies signature and expiry, then validates the payload shape. Throws on any problem. */
export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  const parsed = payloadSchema.parse(decoded);
  return { userId: parsed.sub, role: parsed.role };
}
