import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(uri: string = env.MONGODB_URI): Promise<void> {
  // If already connected, do nothing (reuse connection in serverless / hot lambdas)
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!cachedPromise) {
    mongoose.set('strictQuery', true);
    cachedPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).then((m) => {
      logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
      return m;
    });
  }

  try {
    await cachedPromise;
  } catch (err) {
    cachedPromise = null;
    throw err;
  }
}

export async function disconnectDb(): Promise<void> {
  cachedPromise = null;
  await mongoose.disconnect();
}
