/**
 * Typed operational errors. Services throw these; the error middleware
 * maps them onto the response envelope. Anything that is NOT an AppError
 * is treated as a programmer error → 500 INTERNAL, details never leaked.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'EXPIRED_BATCH'
  | 'BUSINESS_RULE'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  // ── Factories for the common cases ────────────────────────────────
  static badRequest(message: string) {
    return new AppError(400, 'BAD_REQUEST', message);
  }
  static validation(details: ErrorDetail[]) {
    return new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static invalidCredentials() {
    return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  static tokenExpired() {
    return new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(resource = 'Resource') {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }
  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }
  static insufficientStock(medicineName: string, available: number) {
    return new AppError(
      409,
      'INSUFFICIENT_STOCK',
      `Insufficient stock for ${medicineName} — only ${available} available`,
    );
  }
  static expiredBatch(medicineName: string) {
    return new AppError(409, 'EXPIRED_BATCH', `Cannot sell ${medicineName} from an expired batch`);
  }
  static businessRule(message: string) {
    return new AppError(422, 'BUSINESS_RULE', message);
  }
}
