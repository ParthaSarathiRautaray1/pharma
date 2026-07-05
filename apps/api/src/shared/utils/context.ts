import type { Request } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Every tenant-scoped query derives its pharmacyId from the JWT — never
 * from client input — which makes cross-tenant access impossible.
 * Platform SUPER_ADMINs have no pharmacy of their own; they must operate
 * within a selected tenant (impersonation lands with multi-branch).
 */
export function requirePharmacyId(req: Request): string {
  const pharmacyId = req.user?.pharmacyId;
  if (!pharmacyId) {
    throw AppError.forbidden('This action must be performed within a pharmacy context');
  }
  return pharmacyId;
}
