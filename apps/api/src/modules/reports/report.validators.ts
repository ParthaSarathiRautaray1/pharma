import { z } from 'zod';

export const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'month']).default('day'),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
