import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';

async function load(env: 'test' | 'production') {
  vi.stubEnv('NODE_ENV', env);
  vi.resetModules();
  vi.doMock('../src/config/logger', () => ({ logger: { error: vi.fn() } }));
  // Import both from the same reloaded module graph so `instanceof AppError` matches.
  const { AppError } = await import('../src/shared/AppError');
  const { errorHandler } = await import('../src/middleware/errorHandler');
  return Object.assign(errorHandler, { AppError });
}

function run(handler: Awaited<ReturnType<typeof load>>, err: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  handler(err, { originalUrl: '/x' } as never, res as never, vi.fn());
  return { status: res.status.mock.calls[0]?.[0] as number, body: res.json.mock.calls[0]?.[0] };
}

afterEach(() => vi.unstubAllEnvs());

describe('errorHandler', () => {
  it('formats AppError with its status, code and details', async () => {
    const handler = await load('test');
    const out = run(handler, handler.AppError.conflict('nope', 'DOCTOR_HAS_PATIENTS', { patientCount: 2 }));
    expect(out).toEqual({ status: 409, body: { error: { code: 'DOCTOR_HAS_PATIENTS', message: 'nope', details: { patientCount: 2 } } } });
  });

  it('turns Zod errors into 400 VALIDATION_ERROR with per-field details', async () => {
    const parsed = z.object({ a: z.string(), b: z.number() }).safeParse({ a: 1 });
    const out = run(await load('test'), (parsed as { error: ZodError }).error);
    expect(out.status).toBe(400);
    expect(out.body.error.code).toBe('VALIDATION_ERROR');
    expect(out.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['a', 'b']);
  });

  it('maps duplicate-key (11000), cast errors, JWT errors and body-parser errors', async () => {
    const handler = await load('test');
    expect(run(handler, Object.assign(new Error('dup'), { code: 11000 }))).toMatchObject({ status: 409, body: { error: { code: 'DUPLICATE' } } });
    expect(run(handler, new mongoose.Error.CastError('ObjectId', 'abc', '_id'))).toMatchObject({ status: 400, body: { error: { code: 'BAD_REQUEST' } } });
    expect(run(handler, new jwt.JsonWebTokenError('bad'))).toMatchObject({ status: 401 });
    expect(run(handler, Object.assign(new Error('too big'), { status: 413 }))).toMatchObject({ status: 413, body: { error: { code: 'PAYLOAD_TOO_LARGE' } } });
    expect(run(handler, Object.assign(new SyntaxError('bad json'), { status: 400 }))).toMatchObject({ status: 400 });
  });

  it('shows the real message for unexpected errors in development', async () => {
    const out = run(await load('test'), new Error('db exploded'));
    expect(out.status).toBe(500);
    expect(out.body.error.message).toBe('db exploded');
  });

  it('hides internals for unexpected errors in production', async () => {
    const err = Object.assign(new Error('connection string mongodb://user:secret@host'), { stack: 'at secret/path.ts:1' });
    const out = run(await load('production'), err);
    expect(out.status).toBe(500);
    expect(JSON.stringify(out.body)).not.toMatch(/secret|stack|path\.ts|mongodb:/);
    expect(out.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });
});
