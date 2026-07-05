import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../shared/errors/app-error';

type Target = 'body' | 'query' | 'params';

/**
 * validate({ body: createSaleSchema, query: paginationQuerySchema })
 * Parses and REPLACES req[target] with the typed, defaulted result, so
 * controllers downstream only ever see validated data.
 */
export function validate(schemas: Partial<Record<Target, ZodSchema>>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const target of ['params', 'query', 'body'] as const) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(req[target]);
      if (!result.success) {
        return next(
          AppError.validation(
            result.error.issues.map((issue) => ({
              path: [target, ...issue.path].join('.'),
              message: issue.message,
            })),
          ),
        );
      }
      // Express 5 makes req.query a getter — define the property instead
      Object.defineProperty(req, target, { value: result.data, writable: true });
    }
    next();
  };
}
