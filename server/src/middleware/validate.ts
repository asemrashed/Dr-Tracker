import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate and sanitize request input with Zod.
 * - Unknown keys are stripped (Zod default), so handlers only see declared fields.
 * - Non-string values where strings are expected are rejected, which also blocks
 *   NoSQL operator injection such as { "email": { "$ne": null } }.
 * Errors bubble to the central error handler as a 400 VALIDATION_ERROR.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // In Express 5 req.query/params are getters, so redefine them with the parsed values.
      if (schemas.query) {
        Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true });
      }
      if (schemas.params) {
        Object.defineProperty(req, 'params', {
          value: schemas.params.parse(req.params),
          writable: true,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
