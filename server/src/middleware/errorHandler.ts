import type { ErrorRequestHandler, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../shared/AppError';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const body = (code: string, message: string, details?: unknown): ErrorBody => ({
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body('NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Single place where every error becomes a consistent response:
 *   { error: { code, message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    res.status(400).json(body('VALIDATION_ERROR', 'Invalid request data', details));
    return;
  }

  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    res.status(401).json(body('UNAUTHORIZED', 'Session is invalid or has expired'));
    return;
  }

  // Duplicate key from a unique index
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json(body('DUPLICATE', 'A record with these details already exists'));
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json(body('BAD_REQUEST', `Invalid value for "${err.path}"`));
    return;
  }

  // Malformed JSON body or payload too large (thrown by express.json)
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 413) {
    res
      .status(status)
      .json(body(status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', 'Invalid request body'));
    return;
  }

  logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  res
    .status(500)
    .json(
      body(
        'INTERNAL_ERROR',
        isProduction ? 'Something went wrong' : String((err as Error)?.message ?? err),
      ),
    );
};
