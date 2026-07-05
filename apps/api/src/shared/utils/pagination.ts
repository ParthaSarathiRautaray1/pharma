import { z } from 'zod';
import type { PageMeta } from '../types/api';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Prisma skip/take pair for a validated pagination query. */
export function toSkipTake({ page, pageSize }: Pick<PaginationQuery, 'page' | 'pageSize'>) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function toPageMeta(
  { page, pageSize }: Pick<PaginationQuery, 'page' | 'pageSize'>,
  total: number,
): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
