import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps async controllers so rejections reach the error middleware.
 * (Express 4 does not forward rejected promises on its own.)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
