import type { ErrorCode, ErrorDetail } from '../errors/app-error';

/** Pagination metadata attached to list responses. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Helpers used by controllers so envelopes are never hand-built. */
export function ok<T>(data: T, meta?: PageMeta): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}
