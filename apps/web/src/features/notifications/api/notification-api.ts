import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ApiSuccess, PageMeta } from '@/types/api';
import type { NotificationItem } from '../types';

export function useNotifications(page: number, unread?: boolean) {
  return useQuery({
    queryKey: ['notifications', page, unread],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (unread) p.set('unread', 'true');
      const { data } = await api.get<ApiSuccess<{ rows: NotificationItem[]; unreadCount: number }>>(`/notifications?${p}`);
      return { rows: data.data.rows, unreadCount: data.data.unreadCount, meta: data.meta as PageMeta };
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
