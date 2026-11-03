import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startSession } = vi.hoisted(() => ({ startSession: vi.fn() }));
vi.mock('mongoose', () => ({ default: { startSession } }));

import { runAtomically } from '../src/shared/transaction';

const makeSession = (withTransaction: (fn: () => Promise<void>) => Promise<void>) => ({
  withTransaction: vi.fn(withTransaction),
  endSession: vi.fn().mockResolvedValue(undefined),
});

beforeEach(() => startSession.mockReset());

describe('runAtomically', () => {
  it('runs the work inside a transaction when supported and returns its result', async () => {
    const session = makeSession(async (fn) => fn());
    startSession.mockResolvedValue(session);
    const work = vi.fn().mockResolvedValue('done');

    await expect(runAtomically(work)).resolves.toBe('done');
    expect(work).toHaveBeenCalledWith(session);
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('falls back to running without a transaction on a standalone server (code 20)', async () => {
    const session = makeSession(async () => {
      throw Object.assign(new Error('Transaction numbers are only allowed on a replica set member or mongos'), { code: 20 });
    });
    startSession.mockResolvedValue(session);
    const work = vi.fn().mockResolvedValue('fallback');

    await expect(runAtomically(work)).resolves.toBe('fallback');
    expect(work).toHaveBeenCalledWith(undefined);
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it('does NOT fall back for real errors: they propagate and the session is still closed', async () => {
    const boom = new Error('business rule broke');
    const session = makeSession(async (fn) => fn());
    startSession.mockResolvedValue(session);
    const work = vi.fn().mockRejectedValue(boom);

    await expect(runAtomically(work)).rejects.toBe(boom);
    expect(work).toHaveBeenCalledTimes(1); // never retried outside a transaction
    expect(session.endSession).toHaveBeenCalledOnce();
  });
});
