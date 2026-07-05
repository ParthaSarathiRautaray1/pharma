import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, CalendarClock, PackageX, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Batch, StockAlerts } from '../types';
import { useStockAlerts } from '../api/inventory-api';
import { ExpiryBadge } from '../components/ExpiryBadge';
import { StockBadge } from '../components/StockBadge';

type LowStock = StockAlerts['lowStock'][number];

export default function StockAlertsPage() {
  const navigate = useNavigate();
  const alerts = useStockAlerts();

  const lowStockColumns = useMemo<ColumnDef<LowStock, unknown>[]>(
    () => [
      { header: 'Medicine', accessorKey: 'name' },
      { header: 'Stock', cell: ({ row }) => <StockBadge stock={row.original.stock} minStockLevel={row.original.minStockLevel} /> },
      { header: 'Minimum', accessorKey: 'minStockLevel' },
    ],
    [],
  );

  const batchColumns = useMemo<ColumnDef<Batch, unknown>[]>(
    () => [
      { header: 'Medicine', cell: ({ row }) => row.original.medicine?.name ?? '-' },
      { header: 'Batch', accessorKey: 'batchNumber' },
      { header: 'Quantity', accessorKey: 'quantity' },
      { header: 'Expiry', cell: ({ row }) => <ExpiryBadge date={row.original.expiryDate} /> },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Stock alerts"
        description="Low-stock, near-expiry, and expired inventory that needs action."
        actions={<Button variant="outline" onClick={() => navigate('/app/inventory')}><ArrowLeft /> Inventory</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <AlertCard title="Low stock" count={alerts.data?.lowStock.length ?? 0} icon={<TriangleAlert className="h-5 w-5" />} />
        <AlertCard title="Near expiry" count={alerts.data?.nearExpiry.length ?? 0} icon={<CalendarClock className="h-5 w-5" />} />
        <AlertCard title="Expired" count={alerts.data?.expired.length ?? 0} icon={<PackageX className="h-5 w-5" />} />
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-base font-semibold">Low stock</h2>
          <DataTable columns={lowStockColumns} data={alerts.data?.lowStock} loading={alerts.isLoading} emptyMessage="No low-stock medicines" />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">Near expiry</h2>
          <DataTable columns={batchColumns} data={alerts.data?.nearExpiry} loading={alerts.isLoading} emptyMessage="No near-expiry batches" />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">Expired</h2>
          <DataTable columns={batchColumns} data={alerts.data?.expired} loading={alerts.isLoading} emptyMessage="No expired batches" />
        </section>
      </div>
    </div>
  );
}

function AlertCard({ title, count, icon }: { title: string; count: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{count}</p>
      </CardContent>
    </Card>
  );
}
