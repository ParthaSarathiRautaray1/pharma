import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination';

export const notificationQuerySchema = paginationQuerySchema.extend({
  unread: z.coerce.boolean().optional(),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
