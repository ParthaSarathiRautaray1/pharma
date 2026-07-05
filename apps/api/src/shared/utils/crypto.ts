import { createHash, randomBytes } from 'node:crypto';

/** Opaque token for refresh / password-reset flows. */
export function generateToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored hashed — a DB leak exposes nothing usable. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
