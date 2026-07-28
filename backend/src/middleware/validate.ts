import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { Errors } from '@/utils/errors';

type Source = 'body' | 'query' | 'params';

/**
 * Validate a request segment against a Zod schema, replacing it with the parsed
 * (typed, coerced) value. Zod issues become a single friendly VALIDATION_ERROR.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first?.path.join('.');
      const message = path ? `${path}: ${first.message}` : first.message;
      return next(Errors.validation(message));
    }
    req[source] = result.data;
    next();
  };
}
