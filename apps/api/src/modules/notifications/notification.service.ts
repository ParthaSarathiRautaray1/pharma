import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export const notificationService = {
  list(pharmacyId: string, userId: string, q: { page: number; pageSize: number; unread?: boolean }) {
    const where: Prisma.NotificationWhereInput = {
      pharmacyId,
      OR: [{ userId: null }, { userId }],
      ...(q.unread ? { isRead: false } : {}),
    };
    return prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { pharmacyId, OR: [{ userId: null }, { userId }], isRead: false } }),
    ]);
  },

  read(pharmacyId: string, userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, pharmacyId, OR: [{ userId: null }, { userId }] },
      data: { isRead: true },
    });
  },

  readAll(pharmacyId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { pharmacyId, OR: [{ userId: null }, { userId }], isRead: false },
      data: { isRead: true },
    });
  },
};
