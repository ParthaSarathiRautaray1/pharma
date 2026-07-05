import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../modules/auth/auth.tokens';
import { AppError } from '../shared/errors/app-error';
import { ROLES, type RoleGroup } from '../shared/constants/permissions';

/** Verifies the bearer token and attaches req.user. No DB hit. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized());
  }
  req.user = verifyAccessToken(header.slice('Bearer '.length));
  next();
}

/**
 * Role guard — accepts a group name or an explicit role list.
 * Must run after requireAuth.
 *   router.get('/', requireAuth, requireRoles('INVENTORY'), handler)
 */
export function requireRoles(group: RoleGroup | readonly UserRole[]) {
  const allowed: readonly UserRole[] = typeof group === 'string' ? ROLES[group] : group;
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowed.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
