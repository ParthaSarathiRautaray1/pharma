import type { UserRole } from '@prisma/client';

/**
 * Role groups used by route guards. A route declares the MINIMUM group
 * that may access it; SUPER_ADMIN and OWNER are implicitly included
 * everywhere within their pharmacy scope.
 */
export const ROLES = {
  ADMINS: ['SUPER_ADMIN', 'OWNER'],
  STAFF: ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER'],
  BILLING: ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'CASHIER'],
  INVENTORY: ['SUPER_ADMIN', 'OWNER', 'PHARMACIST', 'INVENTORY_MANAGER'],
  CLINICAL: ['SUPER_ADMIN', 'OWNER', 'PHARMACIST'],
} as const satisfies Record<string, readonly UserRole[]>;

export type RoleGroup = keyof typeof ROLES;
