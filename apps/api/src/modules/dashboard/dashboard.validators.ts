import { z } from 'zod';

/** Day-based windows for timeseries charts. */
export const rangeQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
});

/** Month-based windows for growth/comparison charts. */
export const monthRangeQuerySchema = z.object({
  months: z.coerce.number().int().min(3).max(24).default(12),
});

export const topMedicinesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type RangeQuery = z.infer<typeof rangeQuerySchema>;
