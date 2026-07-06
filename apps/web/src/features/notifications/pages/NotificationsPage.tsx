import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationItem } from '../types';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../api/notification-api';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const notifications = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const columns = useMemo<ColumnDef<NotificationItem, unknown>[]>(
    () => [
      { header: 'Type', cell: ({ row }) => <Badge variant={row.original.isRead ? 'secondary' : 'warning'}>{row.original.type}</Badge> },
      {
        header: 'Notification',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.message}</p>
          </div>
        ),
      },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy, h:mm a') },
      {
        header: 'Action',
        cell: ({ row }) => row.original.isRead ? '-' : (
          <Button variant="outline" size="sm" onClick={() => markRead.mutate(row.original.id)}>Mark read</Button>
        ),
      },
    ],
    [markRead],
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${notifications.data?.unreadCount ?? 0} unread alert(s)`}
        actions={<Button variant="outline" loading={markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck /> Mark all read</Button>}
      />
      <DataTable
        columns={columns}
        data={notifications.data?.rows}
        loading={notifications.isLoading}
        meta={notifications.data?.meta}
        onPageChange={setPage}
        emptyMessage="No notifications"
        emptyIcon={<Bell className="h-8 w-8" />}
      />
    </div>
  );
}
