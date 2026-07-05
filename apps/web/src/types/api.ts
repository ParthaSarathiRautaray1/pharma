/** Mirrors the API response envelope (docs/API_DESIGN.md). */
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

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'PHARMACIST'
  | 'CASHIER'
  | 'INVENTORY_MANAGER';
