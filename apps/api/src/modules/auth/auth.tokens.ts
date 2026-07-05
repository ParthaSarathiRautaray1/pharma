import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';

interface AccessTokenPayload {
  sub: string;
  role: AuthUser['role'];
  pharmacyId: string | null;
}

export function signAccessToken(user: AuthUser): string {
  const payload: Omit<AccessTokenPayload, 'sub'> = {
    role: user.role,
    pharmacyId: user.pharmacyId,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    return { id: decoded.sub, role: decoded.role, pharmacyId: decoded.pharmacyId ?? null };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw AppError.tokenExpired();
    throw AppError.unauthorized('Invalid access token');
  }
}

/** Refresh-token lifetime in ms, derived from the env string (e.g. "7d"). */
export function refreshTokenTtlMs(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return value * unit;
}
