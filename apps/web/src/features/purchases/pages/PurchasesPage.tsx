import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Plus, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import type { Purchase, PurchaseStatus } from '../types';
import { usePurchases } from '../api/purchase-api';
import { PurchaseFormDialog } from './PurchaseFormDialog';

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const purchases = usePurchases({ page, status });

  const columns = useMemo<ColumnDef<Purchase, unknown>[]>(
    () => [
      { header: 'PO', accessorKey: 'purchaseNumber' },
      { header: 'Supplier', cell: ({ row }) => row.original.supplier?.name ?? '-' },
      { header: 'Date', cell: ({ row }) => format(new Date(row.original.orderDate), 'dd MMM yyyy') },
      { header: 'Items', cell: ({ row }) => row.original._count?.items ?? row.original.items?.length ?? '-' },
      { header: 'Status', accessorKey: 'status' },
      { header: 'Payment', accessorKey: 'paymentStatus' },
      { header: 'Total', cell: ({ row }) => formatCurrency(amount(row.original.grandTotal)) },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Create purchase orders, receive stock into batches, and track supplier payments."
        actions={
          <>
            <Select value={status} onValueChange={(value) => { setStatus(value as PurchaseStatus | 'ALL'); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setFormOpen(true)}><Plus /> New purchase</Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={purchases.data?.rows}
        loading={purchases.isLoading}
        meta={purchases.data?.meta}
        onPageChange={setPage}
        onRowClick={(purchase) => navigate(`/app/purchases/${purchase.id}`)}
        emptyMessage="No purchases found"
        emptyIcon={<ShoppingBag className="h-8 w-8" />}
      />

      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
