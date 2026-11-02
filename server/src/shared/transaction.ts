import mongoose, { type ClientSession } from 'mongoose';

const isTransactionUnsupported = (err: unknown) => {
  const e = err as { code?: number; message?: string };
  return e?.code === 20 || /Transaction numbers are only allowed/i.test(e?.message ?? '');
};

/**
 * Run `work` in a MongoDB transaction when the deployment supports it (replica set / Atlas).
 * On a standalone mongod, transactions are rejected, so fall back to running `work` without one.
 * Callers must therefore order their writes so that a retry after a partial failure is safe.
 */
export async function runAtomically<T>(work: (session?: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) return work(undefined);
    throw err;
  } finally {
    await session.endSession();
  }
}
