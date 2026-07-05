import type { UserRole } from '@prisma/client';

/** Decoded access-token identity attached to req.user by requireAuth. */
export interface AuthUser {
  id: string;
  role: UserRole;
  /** Null only for platform SUPER_ADMIN accounts. */
  pharmacyId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
