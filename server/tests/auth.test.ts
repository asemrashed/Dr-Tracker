import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * HTTP-level tests for the auth flow. The User model is replaced by an in-memory fake so
 * these run anywhere without MongoDB. Persistence and index behavior are covered by the
 * manual/integration checks listed in Master-plan.md.
 */
const { users } = vi.hoisted(() => ({
  users: new Map<string, { _id: string; email: string; role: string; passwordHash: string }>(),
}));

vi.mock('../src/modules/auth/user.model', () => ({
  User: {
    findOne: ({ email }: { email: string }) => ({ select: async () => users.get(email) ?? null }),
    findById: async (id: string) => [...users.values()].find((u) => u._id === id) ?? null,
  },
}));

import { createApp } from '../src/app';
import { signToken } from '../src/modules/auth/token';

const PASSWORD = 'Asdfghjk';
const app = createApp();

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  users.set('admin@gmail.com', { _id: 'u1', email: 'admin@gmail.com', role: 'admin', passwordHash });
  users.set('dr@gmail.com', { _id: 'u2', email: 'dr@gmail.com', role: 'doctor', passwordHash });
});

const loginAs = (email: string, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

describe('POST /auth/login', () => {
  it('logs the admin in and sets a hardened HttpOnly cookie', async () => {
    const res = await loginAs('admin@gmail.com');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({ id: 'u1', email: 'admin@gmail.com', role: 'admin' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toContain('dt_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('normalizes email case and whitespace', async () => {
    const res = await loginAs('  ADMIN@Gmail.com ');
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with a generic message', async () => {
    const res = await loginAs('admin@gmail.com', 'wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'UNAUTHORIZED', message: 'Invalid email or password' });
  });

  it('gives the same response for an unknown email (no user enumeration)', async () => {
    const res = await loginAs('nobody@gmail.com');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('blocks roles whose portal is not enabled, only after a correct password', async () => {
    const ok = await loginAs('dr@gmail.com');
    expect(ok.status).toBe(403);
    expect(ok.body.error.code).toBe('ROLE_NOT_ENABLED');

    const bad = await loginAs('dr@gmail.com', 'wrong-password');
    expect(bad.status).toBe(401); // does not reveal that the account exists
  });

  it('rejects NoSQL operator injection with a validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
  });
});

describe('session', () => {
  it('requires a cookie for /auth/me', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the user for a valid session, and logout ends it', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'admin@gmail.com', password: PASSWORD });

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('admin@gmail.com');

    const out = await agent.post('/api/v1/auth/logout');
    expect(out.status).toBe(204);

    const after = await agent.get('/api/v1/auth/me');
    expect(after.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', 'dt_token=not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('rejects a validly signed token for a role that is not enabled', async () => {
    const token = signToken({ userId: 'u2', role: 'doctor' });
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', `dt_token=${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_NOT_ENABLED');
  });
});

describe('misc', () => {
  it('serves a health check without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // Keep last: it exhausts the shared in-memory login limiter.
  it('rate-limits repeated failed logins', async () => {
    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) {
      const res = await loginAs('admin@gmail.com', 'wrong-password');
      limited = res.status === 429;
    }
    expect(limited).toBe(true);
  });
});
