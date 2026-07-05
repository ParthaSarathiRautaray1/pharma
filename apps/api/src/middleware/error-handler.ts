import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../shared/errors/app-error';
import type { ApiFailure } from '../shared/types/api';

function toFailure(error: AppError): ApiFailure {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

/**
 * Final middleware: maps AppError / known Prisma errors to the envelope,
 * everything else to an opaque 500. Registered LAST in app.ts.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Known operational errors thrown by services/middleware
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, path: req.path, stack: err.stack });
    }
    res.status(err.statusCode).json(toFailure(err));
    return;
  }

  // Common Prisma failures get friendly envelopes instead of a 500
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      res.status(409).json(toFailure(AppError.conflict(`A record with this ${fields} already exists`)));
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json(toFailure(AppError.notFound()));
      return;
    }
  }

  // Programmer error — log everything, leak nothing
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
  } satisfies ApiFailure);
}
