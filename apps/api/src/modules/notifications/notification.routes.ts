import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { notificationController } from './notification.controller';
import { notificationQuerySchema } from './notification.validators';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth, requireRoles('STAFF'));
notificationsRouter.get('/', validate({ query: notificationQuerySchema }), asyncHandler(notificationController.list));
notificationsRouter.patch('/:id/read', asyncHandler(notificationController.read));
notificationsRouter.post('/read-all', asyncHandler(notificationController.readAll));
